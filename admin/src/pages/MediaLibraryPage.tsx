// src/pages/MediaPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { uploadImageToWorkspace } from "../lib/storage";

type MediaDoc = {
  workspaceId: string;
  storagePath: string;
  downloadURL: string;
  originalName?: string;
  contentType?: string;
  size?: number;
  createdAt?: any;
  createdBy?: string;
};

type ActionDoc = {
  workspaceId: string;
  creative?: { title?: string; image_media_id?: string };
  mediaIds?: string[];
};

type Row<T> = { id: string; data: T };

const deleteMediaFn = httpsCallable(getFunctions(), "deleteMedia");

function isImage(m: MediaDoc) {
  return (m.contentType || "").startsWith("image/");
}
function fmtSize(n?: number) {
  if (!n) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function workspaceLabel(workspaces: Array<{ id: string; data?: { name?: string } }>, workspaceId: string) {
  const hit = workspaces.find((w) => w.id === workspaceId);
  return String(hit?.data?.name || hit?.id || workspaceId || "");
}

function contentTypeLabel(contentType?: string) {
  if (!contentType) return "-";
  if (contentType.startsWith("image/")) return `画像 (${contentType})`;
  return contentType;
}

export default function MediaPage() {
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; data?: { name?: string } }>>([]);
  const [workspaceId, setWorkspaceId] = useState("");

  const [mediaRows, setMediaRows] = useState<Row<MediaDoc>[]>([]);
  const [actionRows, setActionRows] = useState<Row<ActionDoc>[]>([]);

  const [qText, setQText] = useState("");
  const [selected, setSelected] = useState<Row<MediaDoc> | null>(null);

  // upload state
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [uploadInfo, setUploadInfo] = useState<{ ok: number; total: number } | null>(null);
  const selectedWorkspaceName = useMemo(() => workspaceLabel(workspaces, workspaceId), [workspaces, workspaceId]);

  // 最新追加を自動選択したい
  const lastUploadedRef = useRef<{ workspaceId: string; downloadURL: string } | null>(null);

  // Workspaces
  useEffect(() => {
    const q = query(collection(db, "workspaces"), orderBy("__name__"));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, data: d.data() as any }));
      setWorkspaces(list);
      if (!workspaceId && list.length) setWorkspaceId(list[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Media list
  useEffect(() => {
    if (!workspaceId) return;

    const q = query(
      collection(db, "media"),
      where("workspaceId", "==", workspaceId),
      orderBy("createdAt", "desc"),
      limit(200)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, data: d.data() as MediaDoc }));
        setMediaRows(list);

        // アップロード直後に該当を選択（downloadURL一致で探す）
        const last = lastUploadedRef.current;
        if (last && last.workspaceId === workspaceId) {
          const hit = list.find((r) => r.data.downloadURL === last.downloadURL);
          if (hit) {
            setSelected(hit);
            lastUploadedRef.current = null;
          }
        }
      },
      (err) => console.error(err)
    );
  }, [workspaceId]);

  // Actions for usage map
  useEffect(() => {
    if (!workspaceId) return;
    const q = query(collection(db, "actions"), where("workspaceId", "==", workspaceId), limit(500));
    return onSnapshot(q, (snap) => setActionRows(snap.docs.map((d) => ({ id: d.id, data: d.data() as ActionDoc }))));
  }, [workspaceId]);

  // usage map
  const usedInMap = useMemo(() => {
    const map = new Map<string, Array<{ actionId: string; title?: string }>>();
    actionRows.forEach((a) => {
      const ids = new Set<string>();
      (a.data.mediaIds || []).forEach((x) => x && ids.add(String(x)));
      const primary = a.data.creative?.image_media_id;
      if (primary) ids.add(String(primary));

      ids.forEach((mid) => {
        const arr = map.get(mid) || [];
        arr.push({ actionId: a.id, title: a.data.creative?.title });
        map.set(mid, arr);
      });
    });

    map.forEach((arr, k) => {
      const uniq = new Map<string, { actionId: string; title?: string }>();
      arr.forEach((x) => uniq.set(x.actionId, x));
      map.set(k, Array.from(uniq.values()));
    });

    return map;
  }, [actionRows]);

  const filtered = useMemo(() => {
    const key = qText.trim().toLowerCase();
    return mediaRows.filter((r) => {
      if (!key) return true;
      const n = (r.data.originalName || "").toLowerCase();
      const id = r.id.toLowerCase();
      const ct = (r.data.contentType || "").toLowerCase();
      return n.includes(key) || id.includes(key) || ct.includes(key);
    });
  }, [mediaRows, qText]);

  async function onDelete(mediaId: string) {
    if (!workspaceId) return;
    if (!confirm("このメディアを削除します。よろしいですか？")) return;

    try {
      await deleteMediaFn({ workspaceId, mediaId });
      if (selected?.id === mediaId) setSelected(null);
    } catch (e: any) {
      const code = e?.code;
      const message = e?.message;
      const details = e?.details;

      if (code === "failed-precondition" && details?.usedIn) {
        const lines = details.usedIn
          .map((x: any) => `- ${x.actionId}${x.title ? `（${x.title}）` : ""}`)
          .join("\n");
        alert(`このメディアは使用中なので削除できません。\n\n${lines}`);
        return;
      }

      alert(`削除に失敗: ${message || String(e)}`);
    }
  }

  const selectedUsedIn = selected ? usedInMap.get(selected.id) || [] : [];

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">メディアライブラリ</h1>
        <div className="small">画像などのメディアをアップロードし、一覧確認、使用箇所の確認、削除ができます。</div>
        <div className="small" style={{ opacity: 0.72 }}>アクションやテンプレートで使う素材を、ワークスペースごとにまとめて管理します。</div>

        <div style={{ height: 12 }} />

        <div className="small" style={{ opacity: 0.72, marginBottom: 8 }}>
          現在のワークスペース: <b>{selectedWorkspaceName || workspaceId || "-"}</b>
        </div>

        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="h2">ワークスペース</div>
            <select className="input" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
            {workspaces.map((w) => {
              const label = workspaceLabel(workspaces, w.id);
              return (
                <option key={w.id} value={w.id}>
                  {label}{label !== w.id ? ` (${w.id})` : ""}
                </option>
              );
            })}
            </select>
          </div>

          <div style={{ flex: 2, minWidth: 240 }}>
            <div className="h2">検索</div>
            <input className="input" value={qText} onChange={(e) => setQText(e.target.value)} placeholder="ファイル名 / タイプ / ID で検索" />
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="h2">件数</div>
            <div className="small">
              メディア: <b>{filtered.length}</b> / 参照アクション: <b>{actionRows.length}</b>
            </div>
          </div>
        </div>

        {/* ===== Upload area ===== */}
        <div style={{ height: 14 }} />
        <div
          style={{
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 16,
            padding: 12,
            background: "rgba(255,255,255,.06)",
          }}
        >
          <div className="h2">メディアを追加</div>
          <div className="small" style={{ opacity: 0.75 }}>
            ここから直接メディアライブラリに追加できます。現在は画像アップロードに対応しています。
          </div>

          <div style={{ height: 10 }} />

          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={!workspaceId || uploading}
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                if (!workspaceId) return;

                setUploadErr("");
                setUploadInfo(null);
                setUploading(true);

                let ok = 0;
                try {
                  // 安定重視：逐次アップロード（失敗したファイルが分かる）
                  for (const file of files) {
                    try {
                      const result = await uploadImageToWorkspace({ workspaceId, file });
                      ok += 1;
                      // 最後の成功を記録して、一覧更新後に自動選択
                      lastUploadedRef.current = { workspaceId, downloadURL: result.downloadURL };
                    } catch (err: any) {
                      console.error(err);
                      setUploadErr(`アップロード失敗: ${file.name}\n${err?.message || String(err)}`);
                      // 続行する（1枚コケても他は上げる）
                    }
                  }
                } finally {
                  setUploadInfo({ ok, total: files.length });
                  setUploading(false);
                  e.currentTarget.value = "";
                }
              }}
            />
            {uploading ? <div className="small">アップロード中...</div> : null}
          </div>

          {uploadInfo ? (
            <div className="small" style={{ marginTop: 8, opacity: 0.85 }}>
              アップロード完了: <b>{uploadInfo.ok}</b> / {uploadInfo.total}
            </div>
          ) : null}

          {uploadErr ? (
            <div className="small" style={{ color: "#ff6b6b", marginTop: 8, whiteSpace: "pre-wrap" }}>
              {uploadErr}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
        <div className="card" style={{ flex: 2, minWidth: 520 }}>
          <div className="h2">メディア一覧</div>
          <div className="small" style={{ opacity: 0.72, marginBottom: 8 }}>
            ファイル名を中心に確認できます。使用中の素材は削除前に参照先を確認してください。
          </div>

          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>サムネイル</th>
                <th>ファイル</th>
                <th style={{ width: 160 }}>種類</th>
                <th style={{ width: 120 }}>サイズ</th>
                <th style={{ width: 120 }}>使用数</th>
                <th style={{ width: 160 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const used = usedInMap.get(r.id)?.length || 0;
                return (
                  <tr key={r.id}>
                    <td>
                      {isImage(r.data) ? (
                        <img
                          src={r.data.downloadURL}
                          alt={r.data.originalName || r.id}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            objectFit: "cover",
                            border: "1px solid rgba(255,255,255,.14)",
                          }}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: "rgba(255,255,255,.06)",
                            border: "1px solid rgba(255,255,255,.14)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            opacity: 0.8,
                          }}
                        >
                          file
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontWeight: 800 }}>{r.data.originalName || "名称未設定"}</div>
                        <div className="small" style={{ opacity: 0.72 }}><code>{r.id}</code></div>
                      </div>
                    </td>
                    <td className="small">{contentTypeLabel(r.data.contentType)}</td>
                    <td className="small">{fmtSize(r.data.size)}</td>
                    <td className="small">{used ? <b>{used}</b> : <span style={{ opacity: 0.65 }}>0</span>}</td>
                    <td>
                      <button className="btn" onClick={() => setSelected(r)}>詳細を見る</button>
                      <span style={{ width: 8, display: "inline-block" }} />
                      <button className="btn btn--danger" onClick={() => onDelete(r.id)}>削除する</button>
                    </td>
                  </tr>
                );
              })}

              {!filtered.length ? (
                <tr>
                  <td colSpan={6} className="small" style={{ opacity: 0.7 }}>
                    該当するメディアはありません
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          <div className="h2">詳細</div>

          {!selected ? (
            <div className="small" style={{ opacity: 0.7 }}>左の一覧からメディアを選択してください</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {isImage(selected.data) ? (
                  <img
                    src={selected.data.downloadURL}
                    alt={selected.data.originalName || selected.id}
                    style={{
                      width: 84,
                      height: 84,
                      borderRadius: 18,
                      objectFit: "cover",
                      border: "1px solid rgba(255,255,255,.14)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 84,
                      height: 84,
                      borderRadius: 18,
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(255,255,255,.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      opacity: 0.8,
                    }}
                  >
                    file
                  </div>
                )}

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>{selected.data.originalName || "名称未設定"}</div>
                  <div className="small"><code>{selected.id}</code></div>
                  <div className="small" style={{ opacity: 0.75 }}>
                    {selected.data.contentType || "-"} / {fmtSize(selected.data.size)}
                  </div>
                </div>
              </div>

              <div style={{ height: 10 }} />

              <div className="h2">ダウンロードURL</div>
              <div className="small" style={{ wordBreak: "break-all", opacity: 0.85 }}>
                {selected.data.downloadURL}
              </div>

              <div style={{ height: 10 }} />

              <div className="h2">保存先パス</div>
              <div className="small" style={{ wordBreak: "break-all", opacity: 0.85 }}>
                {selected.data.storagePath}
              </div>

              <div style={{ height: 12 }} />

              <div className="h2">使用箇所（アクション）</div>
              {selectedUsedIn.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selectedUsedIn.map((x) => (
                    <div key={x.actionId} className="small">
                      <code>{x.actionId}</code>
                      {x.title ? <span style={{ opacity: 0.85 }}> — {x.title}</span> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="small" style={{ opacity: 0.7 }}>（まだ使われていません）</div>
              )}

              <div style={{ height: 12 }} />

              <button className="btn btn--danger" onClick={() => onDelete(selected.id)}>
                このメディアを削除する
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}