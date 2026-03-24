// src/pages/MediaPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db, apiPostJson } from "../firebase";
import { uploadMediaToWorkspace } from "../lib/media";

/* =========================
 * Site helpers
 * ========================= */
function siteKeyForWs(workspaceId: string) {
  return `cx_admin_site_id:${workspaceId}`;
}
function readSelectedSiteId(workspaceId: string) {
  try {
    return localStorage.getItem(siteKeyForWs(workspaceId)) || "";
  } catch {
    return "";
  }
}
function writeSelectedSiteId(workspaceId: string, siteId: string) {
  try {
    localStorage.setItem(siteKeyForWs(workspaceId), siteId);
  } catch {
    // ignore
  }
}

type MediaDoc = {
  workspaceId: string;
  siteId?: string | null;
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

function isUnresolvedTempMediaRow(row: Row<MediaDoc>) {
  const id = String(row.id || "");
  const storagePath = String(row.data?.storagePath || "");
  const downloadURL = String(row.data?.downloadURL || "");
  return id.startsWith("temp_") && !storagePath && !downloadURL;
}

function isLocalOnlyOptimisticMediaRow(row: Row<MediaDoc>) {
  const id = String(row.id || "");
  const storagePath = String(row.data?.storagePath || "");
  const downloadURL = String(row.data?.downloadURL || "");

  if (isUnresolvedTempMediaRow(row)) return true;
  if (!id) return true;
  if (id === storagePath || id === downloadURL) return true;
  if (id.includes("/")) return true;
  if (/^https?:\/\//i.test(id)) return true;
  return false;
}


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

function workspaceKeyForUid(uid: string) {
  return `cx_admin_workspace_id:${uid}`;
}

function readSelectedWorkspaceId(uid?: string) {
  if (!uid) return "";
  try {
    return localStorage.getItem(workspaceKeyForUid(uid)) || "";
  } catch {
    return "";
  }
}

function writeSelectedWorkspaceId(workspaceId: string, uid?: string) {
  if (!uid) return;
  try {
    localStorage.setItem(workspaceKeyForUid(uid), workspaceId);
    window.dispatchEvent(new CustomEvent("cx_admin_workspace_changed", { detail: { workspaceId } }));
  } catch {
    // ignore
  }
}

function mediaCacheKey(siteId: string) {
  return `cx_admin_media_cache_site:${siteId}`;
}

function readMediaCache(siteId?: string): Row<MediaDoc>[] {
  if (!siteId) return [];
  try {
    const raw = sessionStorage.getItem(mediaCacheKey(siteId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Row<MediaDoc>[]).filter((row) => !isUnresolvedTempMediaRow(row));
  } catch {
    return [];
  }
}

function writeMediaCache(siteId: string, rows: Row<MediaDoc>[]) {
  try {
    sessionStorage.setItem(mediaCacheKey(siteId), JSON.stringify(rows));
  } catch {
    // ignore
  }
}

function removeMediaFromCache(siteId: string, mediaId: string) {
  const nextRows = readMediaCache(siteId).filter((row) => String(row.id) !== String(mediaId));
  writeMediaCache(siteId, nextRows);
}

function mergeMediaRows(primary: Row<MediaDoc>[], secondary: Row<MediaDoc>[]) {
  const merged = [...primary, ...secondary];
  const byKey = new Map<string, Row<MediaDoc>>();
  merged.forEach((row) => {
    if (isUnresolvedTempMediaRow(row)) return;
    const key = String(row.id || row.data.downloadURL || row.data.storagePath || "");
    if (!key) return;
    if (!byKey.has(key)) byKey.set(key, row);
  });
  return Array.from(byKey.values()).sort((a, b) => {
    const av = (a.data as any)?.createdAt?.seconds ?? 0;
    const bv = (b.data as any)?.createdAt?.seconds ?? 0;
    return bv - av;
  });
}

export default function MediaPage() {
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; data?: { name?: string } }>>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [currentUid, setCurrentUid] = useState("");

  const [siteId, setSiteId] = useState("");
  const [sites, setSites] = useState<Array<{ id: string; data: { name?: string; siteName?: string } }>>([]);

  const [mediaRows, setMediaRows] = useState<Row<MediaDoc>[]>([]);
  const [actionRows, setActionRows] = useState<Row<ActionDoc>[]>([]);

  const [qText, setQText] = useState("");
  const [selected, setSelected] = useState<Row<MediaDoc> | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [deleteMediaTarget, setDeleteMediaTarget] = useState<string | null>(null);

  // upload state
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [uploadInfo, setUploadInfo] = useState<{ ok: number; total: number } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const selectedWorkspaceName = useMemo(() => workspaceLabel(workspaces, workspaceId), [workspaces, workspaceId]);
  const siteName = useMemo(() => {
    const s = sites.find((s) => s.id === siteId);
    return s?.data?.name || s?.data?.siteName || siteId || "（未選択）";
  }, [sites, siteId]);

  // 最新追加を自動選択したい
  const lastUploadedRef = useRef<{ workspaceId: string; downloadURL: string } | null>(null);

  useEffect(() => {
    return onAuthStateChanged(getAuth(), (user) => {
      const uid = user?.uid || "";
      setCurrentUid(uid);
      setWorkspaceId(readSelectedWorkspaceId(uid));
    });
  }, []);

  useEffect(() => {
    if (!currentUid) {
      setWorkspaceId("");
      return;
    }

    const applySelectedWorkspace = () => {
      setWorkspaceId(readSelectedWorkspaceId(currentUid));
    };

    applySelectedWorkspace();

    const onWorkspaceChanged = (e?: Event) => {
      const next = (e as CustomEvent | undefined)?.detail?.workspaceId;
      if (typeof next === "string") {
        setWorkspaceId(next);
        return;
      }
      applySelectedWorkspace();
    };

    const onStorageChanged = () => applySelectedWorkspace();

    window.addEventListener("cx_admin_workspace_changed", onWorkspaceChanged as EventListener);
    window.addEventListener("storage", onStorageChanged);
    return () => {
      window.removeEventListener("cx_admin_workspace_changed", onWorkspaceChanged as EventListener);
      window.removeEventListener("storage", onStorageChanged);
    };
  }, [currentUid]);

  // Workspaces
  useEffect(() => {
    if (!currentUid) {
      setWorkspaces([]);
      return;
    }

    const q = query(
      collection(db, "workspaces"),
      where(`members.${currentUid}`, "in", ["owner", "admin", "member", "viewer"])
    );
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, data: d.data() as any }));
      setWorkspaces(list);
    });
  }, [currentUid]);

  useEffect(() => {
    if (!currentUid) return;
    if (!workspaces.length) return;

    const exists = !!workspaceId && workspaces.some((w) => w.id === workspaceId);
    if (!exists) {
      const nextId = workspaces[0]?.id || "";
      setWorkspaceId(nextId);
      if (nextId) writeSelectedWorkspaceId(nextId, currentUid);
    }
  }, [workspaces, workspaceId, currentUid]);

  // Load sites for current workspace
  useEffect(() => {
    if (!workspaceId) { setSites([]); setSiteId(""); return; }
    setSiteId(readSelectedSiteId(workspaceId));
    const q = query(collection(db, "sites"), where("workspaceId", "==", workspaceId));
    return onSnapshot(q, (snap) => {
      const list = snap.docs
        .filter((d) => d.data().status !== "deleted")
        .map((d) => ({ id: d.id, data: d.data() as any }));
      setSites(list);
      setSiteId((prev) => prev || list[0]?.id || "");
    });
  }, [workspaceId]);

  // Listen for site changes from other pages
  useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent)?.detail?.siteId;
      if (next) setSiteId(next);
    };
    window.addEventListener("cx_admin_site_changed", handler);
    return () => window.removeEventListener("cx_admin_site_changed", handler);
  }, []);

  // Persist siteId to localStorage
  useEffect(() => {
    if (workspaceId && siteId) writeSelectedSiteId(workspaceId, siteId);
  }, [workspaceId, siteId]);

  // Media list
  useEffect(() => {
    if (!siteId) {
      setMediaRows([]);
      return;
    }

    const q = query(
      collection(db, "media"),
      where("siteId", "==", siteId),
      limit(200)
    );

    return onSnapshot(
      q,
      (snap) => {
        const firestoreRows = snap.docs.map((d) => ({ id: d.id, data: d.data() as MediaDoc }));
        const cachedRows = readMediaCache(siteId);
        const list = mergeMediaRows(firestoreRows, cachedRows);
        setMediaRows(list);
        writeMediaCache(siteId, list);

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
  }, [siteId]);

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

  useEffect(() => {
    if (!workspaceId) return;

    const nowSec = Math.floor(Date.now() / 1000);
    const tempIds = mediaRows
      .filter((row) => {
        if (!isUnresolvedTempMediaRow(row)) return false;
        const createdSec = Number((row.data as any)?.createdAt?.seconds || 0);
        return !createdSec || nowSec - createdSec > 15;
      })
      .map((row) => String(row.id));

    if (!tempIds.length) return;

    setMediaRows((prev) => {
      const nextRows = prev.filter((row) => {
        const createdSec = Number((row.data as any)?.createdAt?.seconds || 0);
        const staleTemp = isUnresolvedTempMediaRow(row) && (!createdSec || nowSec - createdSec > 15);
        return !staleTemp;
      });
      writeMediaCache(siteId, nextRows);
      return nextRows;
    });

    setSelected((prev) => {
      if (!prev) return prev;
      return tempIds.includes(String(prev.id)) ? null : prev;
    });
  }, [mediaRows, siteId]);


  async function onDelete(mediaId: string) {
    if (!workspaceId) return;

    const targetRow =
      mediaRows.find((row) => String(row.id) === String(mediaId)) ||
      (selected && String(selected.id) === String(mediaId) ? selected : null);

      if (targetRow && isLocalOnlyOptimisticMediaRow(targetRow)) {
        setMediaRows((prev) => {
          const nextRows = prev.filter((row) => String(row.id) !== String(mediaId));
          writeMediaCache(siteId, nextRows);
          return nextRows;
        });
        removeMediaFromCache(siteId, mediaId);
        setSelected((prev) => (prev && String(prev.id) === String(mediaId) ? null : prev));
        return;
      }

    try {
      const result = await apiPostJson<any>("/v1/media/delete", {
        workspace_id: workspaceId,
        media_id: mediaId,
        storage_path: String(targetRow?.data?.storagePath || ""),
        download_url: String(targetRow?.data?.downloadURL || ""),
      });

      if (!result?.ok) {
        if (result?.usedIn?.length) {
          setMediaError(`このメディアは使用中のため削除できません。\n使用アクション: ${result.usedIn.map((x: any) => x.actionId).join(", ")}`);
          setTimeout(() => setMediaError(null), 5000);
          return;
        }

        throw new Error(result?.message || result?.error || "delete_failed");
      }

      setMediaRows((prev) => {
        const nextRows = prev.filter((row) => String(row.id) !== String(mediaId));
        writeMediaCache(siteId, nextRows);
        return nextRows;
      });

      removeMediaFromCache(siteId, mediaId);
      setSelected((prev) => (prev && String(prev.id) === String(mediaId) ? null : prev));
    } catch (e: any) {
      if (e?.message === "media_not_found") {
        setMediaRows((prev) => {
          const nextRows = prev.filter((row) => String(row.id) !== String(mediaId));
          writeMediaCache(siteId, nextRows);
          return nextRows;
        });

        removeMediaFromCache(siteId, mediaId);
        setSelected((prev) => (prev && String(prev.id) === String(mediaId) ? null : prev));
        return;
      }

      setMediaError(`削除に失敗: ${e?.message || String(e)}`);
      setTimeout(() => setMediaError(null), 5000);
    }
  }

  const selectedUsedIn = selected ? usedInMap.get(selected.id) || [] : [];
  const pendingPreviewUrls = useMemo(() => {
    return pendingFiles.map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      url: URL.createObjectURL(file),
    }));
  }, [pendingFiles]);

  useEffect(() => {
    return () => {
      pendingPreviewUrls.forEach((x) => URL.revokeObjectURL(x.url));
    };
  }, [pendingPreviewUrls]);

  function acceptFiles(files: File[]) {
    const imageFiles = files.filter((file) => (file.type || '').startsWith('image/'));
    setUploadErr('');
    setUploadInfo(null);
    setPendingFiles(imageFiles);
    if (files.length && !imageFiles.length) {
      setUploadErr('画像ファイルを選択してください。');
    }
  }

  async function uploadPendingFiles() {
    if (!workspaceId || !pendingFiles.length) return;

    setUploadErr("");
    setUploadInfo(null);
    setUploading(true);

    let ok = 0;
    const optimisticRows: Row<MediaDoc>[] = [];

    try {
      for (const file of pendingFiles) {
        try {
          const result: any = await uploadMediaToWorkspace({ workspaceId, file });
          ok += 1;

          const mediaId = String(result?.mediaId || "");
          const rowData = (result?.data || {}) as Partial<MediaDoc>;
          const downloadURL = String(rowData.downloadURL || "");
          const storagePath = String(rowData.storagePath || "");

          if (mediaId && (storagePath || downloadURL)) {
            optimisticRows.push({
              id: mediaId,
              data: {
                workspaceId: String(rowData.workspaceId || workspaceId),
                siteId: String(rowData.siteId || siteId || ""),
                storagePath,
                downloadURL,
                originalName: String(rowData.originalName || file.name || ""),
                contentType: String(rowData.contentType || file.type || 'image/*'),
                size: Number(rowData.size || file.size || 0),
                createdAt: (rowData as any).createdAt || { seconds: Math.floor(Date.now() / 1000) },
                createdBy: String(rowData.createdBy || ""),
              },
            });
          }

          if (downloadURL) {
            lastUploadedRef.current = { workspaceId, downloadURL };
          }

        } catch (err: any) {
          console.error(err);
          setUploadErr((prev) => {
            const line = `アップロード失敗: ${file.name}\n${err?.message || String(err)}`;
            return prev ? `${prev}\n\n${line}` : line;
          });
        }
      }
    } finally {
      if (optimisticRows.length) {
        setMediaRows((prev) => {
          const nextRows = mergeMediaRows(optimisticRows, prev);
          writeMediaCache(siteId, nextRows);
          return nextRows;
        });

        setSelected(optimisticRows[0]);
      }

      setUploadInfo({ ok, total: pendingFiles.length });
      setUploading(false);
      setPendingFiles([]);
    }
  }


  return (
    <div className="container liquid-page">
      <div className="page-header">
        <div className="page-header__meta">
          <div className="small" style={{ marginBottom: 6, opacity: 0.7 }}>MOKKEDA / Main</div>
          <h1 className="h1">メディアライブラリ</h1>
          <div className="small">画像などのメディアをサイトごとに管理する画面です。まずは一覧で確認し、必要なときだけ詳細を開きます。</div>
          <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>
            現在のサイト: <b>{siteName || '（未選択）'}</b>
            {siteId ? (
              <React.Fragment>
                {' '}<span style={{ opacity: 0.62 }}> / ID: <code>{siteId}</code></span>
              </React.Fragment>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="list-toolbar">
          <div className="list-toolbar__filters" style={{ flex: 1 }}>
            <div style={{ minWidth: 200, flex: '1 1 220px' }}>
              <div className="h2">サイト</div>
              <select
                className="input"
                value={siteId}
                onChange={(e) => {
                  const next = e.target.value;
                  setSiteId(next);
                  writeSelectedSiteId(workspaceId, next);
                }}
              >
                {sites.length === 0 && <option value="">（サイトなし）</option>}
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.data?.name || s.data?.siteName || s.id}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: 240, flex: '1 1 320px' }}>
              <div className="h2">検索</div>
              <input className="input" value={qText} onChange={(e) => setQText(e.target.value)} placeholder="ファイル名 / タイプ / ID で検索" />
            </div>
          </div>

          <div className="list-toolbar__actions">
            <div className="small">
              メディア: <b>{filtered.length}</b> / 参照アクション: <b>{actionRows.length}</b>
            </div>
          </div>
        </div>
      </div>

      <div
        className="card"
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!siteId || uploading) return;
          setIsDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!siteId || uploading) return;
          if (!isDragOver) setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const next = e.relatedTarget as Node | null;
          if (next && e.currentTarget.contains(next)) return;
          setIsDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          if (!siteId || uploading) return;
          const files = Array.from(e.dataTransfer?.files || []);
          acceptFiles(files);
        }}
        style={{
          marginBottom: 14,
          border: isDragOver ? '2px dashed rgba(37,99,235,.55)' : '1px solid rgba(15,23,42,.08)',
          background: isDragOver ? 'linear-gradient(180deg,#eff6ff,#f8fbff)' : 'linear-gradient(180deg,#ffffff,#f8fbff)',
          boxShadow: isDragOver ? '0 0 0 4px rgba(37,99,235,.08)' : undefined,
          transition: 'border-color .15s ease, box-shadow .15s ease, background .15s ease',
        }}
      >
        <div className="h2">メディアを追加</div>
        <div className="small" style={{ opacity: 0.75 }}>
          ここから直接メディアライブラリに追加できます。現在は画像アップロードに対応しています。
        </div>
        <div className="small" style={{ opacity: 0.72, marginTop: 6 }}>
          ファイル選択またはこの枠へドラッグ＆ドロップしてください。選択後にプレビューを確認して保存できます。
        </div>

        <div style={{ height: 10 }} />

        <div className="row" style={{ gap: 10, alignItems: 'center' }}>

          <input
            type="file"
            accept="image/*"
            multiple
            disabled={!siteId || uploading}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              acceptFiles(files);
              e.currentTarget.value = "";
            }}
          />

          {uploading ? <div className="small">アップロード中...</div> : null}
        </div>

        {isDragOver ? (
          <div className="small" style={{ marginTop: 10, color: '#2563eb', fontWeight: 700 }}>
            ここにドロップして画像を追加
          </div>
        ) : null}

        {pendingPreviewUrls.length ? (
          <div style={{ marginTop: 12 }}>
            <div className="h2">プレビュー</div>
            <div className="small" style={{ opacity: 0.75, marginBottom: 8 }}>
              選択中ファイル: <b>{pendingPreviewUrls.length}</b>
            </div>

            <div
              style={{
                display: 'grid',
                gap: 8,
                maxHeight: 260,
                overflow: 'auto',
                padding: 10,
                border: '1px solid rgba(15,23,42,.08)',
                borderRadius: 12,
                background: 'rgba(15,23,42,.02)',
              }}
            >
              {pendingPreviewUrls.map(({ key, file, url }) => (
                <div
                  key={key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '64px minmax(0,1fr) auto',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <img
                    src={url}
                    alt={file.name}
                    style={{
                      width: 64,
                      height: 64,
                      objectFit: 'cover',
                      borderRadius: 12,
                      border: '1px solid rgba(15,23,42,.12)',
                      background: '#fff',
                    }}
                  />
                  <div className="small" style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, wordBreak: 'break-all' }}>{file.name}</div>
                    <div style={{ opacity: 0.7 }}>{file.type || 'image/*'}</div>
                  </div>
                  <div className="small" style={{ opacity: 0.7, whiteSpace: 'nowrap' }}>{fmtSize(file.size)}</div>
                </div>
              ))}
            </div>

            <div className="row" style={{ gap: 10, marginTop: 10 }}>
              <button
                className="btn btn--primary"
                disabled={!workspaceId || uploading || !pendingPreviewUrls.length}
                onClick={uploadPendingFiles}
              >
                アップロードして保存
              </button>
              <button
                className="btn"
                disabled={uploading}
                onClick={() => setPendingFiles([])}
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : null}

        {uploadInfo ? (
          <div className="small" style={{ marginTop: 8, opacity: 0.85 }}>
            アップロード完了: <b>{uploadInfo.ok}</b> / {uploadInfo.total}
          </div>
        ) : null}

        {uploadErr ? (
          <div className="small" style={{ color: '#d93025', marginTop: 8, whiteSpace: 'pre-wrap' }}>
            {uploadErr}
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="list-toolbar">
          <div className="list-toolbar__filters">
            <div className="small" style={{ opacity: 0.74 }}>
              ファイル名を中心に確認できます。使用中の素材は削除前に参照先を確認してください。
            </div>
          </div>
        </div>

        <div className="liquid-scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>サムネイル</th>
                <th>ファイル</th>
                <th style={{ width: 180 }}>サイト</th>
                <th style={{ width: 160 }}>種類</th>
                <th style={{ width: 120 }}>サイズ</th>
                <th style={{ width: 120 }}>使用数</th>
                <th style={{ width: 200 }}></th>
              </tr>
            </thead>
            <tbody>
            {filtered.map((r) => {
              const used = usedInMap.get(r.id)?.length || 0;
              return (
                <React.Fragment key={r.id}>
                  <tr>
                    <td>
                      {isImage(r.data) ? (
                        <img
                          src={r.data.downloadURL}
                          alt={r.data.originalName || r.id}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            objectFit: 'cover',
                            border: '1px solid rgba(15,23,42,.12)',
                          }}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: 'rgba(15,23,42,.06)',
                            border: '1px solid rgba(15,23,42,.14)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            opacity: 0.8,
                          }}
                        >
                          file
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ fontWeight: 800 }}>{r.data.originalName || '名称未設定'}</div>
                        <div className="small" style={{ opacity: 0.72 }}><code>{r.id}</code></div>
                      </div>
                    </td>
                    <td>
                      <div>{sites.find((s) => s.id === (r.data.siteId || ""))?.data?.name || r.data.siteId || "-"}</div>
                      <div className="small" style={{ opacity: 0.72 }}><code>{r.data.siteId || "-"}</code></div>
                    </td>
                    <td className="small">{contentTypeLabel(r.data.contentType)}</td>
                    <td className="small">{fmtSize(r.data.size)}</td>
                    <td className="small">{used ? <b>{used}</b> : <span style={{ opacity: 0.65 }}>0</span>}</td>
                    <td>
                      <button className="btn" onClick={() => setSelected(r)}>詳細を見る</button>
                      <span style={{ width: 8, display: 'inline-block' }} />
                      <button className="btn btn--danger" onClick={() => {
                        if (isLocalOnlyOptimisticMediaRow(r)) { onDelete(r.id); return; }
                        setDeleteMediaTarget(r.id);
                      }}>
                        {isLocalOnlyOptimisticMediaRow(r) ? "一覧から外す" : "削除"}
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}

            {!filtered.length ? (
              <tr>
                <td colSpan={8} className="small" style={{ opacity: 0.7 }}>
                  該当するメディアはありません
                </td>
              </tr>
            ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.24)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 50,
          }}
          onClick={() => setSelected(null)}
        >
          <div
            className="card liquid-page"
            style={{ width: 'min(860px, 100%)', maxHeight: '88vh', overflow: 'auto', minWidth: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-header" style={{ marginBottom: 10 }}>
              <div className="page-header__meta">
                <h2 className="h1" style={{ fontSize: 22 }}>メディア詳細</h2>
                <div className="small">使用箇所や保存先を確認できます。削除前に参照先を確認してください。</div>
              </div>
              <div className="page-header__actions">
                <button className="btn" onClick={() => setSelected(null)}>閉じる</button>
              </div>
            </div>

            <div className="row liquid-page" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {isImage(selected.data) ? (
                    <img
                      src={selected.data.downloadURL}
                      alt={selected.data.originalName || selected.id}
                      style={{
                        width: 84,
                        height: 84,
                        borderRadius: 18,
                        objectFit: 'cover',
                        border: '1px solid rgba(15,23,42,.14)',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 84,
                        height: 84,
                        borderRadius: 18,
                        background: 'rgba(15,23,42,.06)',
                        border: '1px solid rgba(15,23,42,.14)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        opacity: 0.8,
                      }}
                    >
                      file
                    </div>
                  )}

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900 }}>{selected.data.originalName || '名称未設定'}</div>
                    <div className="small"><code>{selected.id}</code></div>
                    <div className="small" style={{ opacity: 0.75 }}>
                      {selected.data.contentType || '-'} / {fmtSize(selected.data.size)}
                    </div>
                  </div>
                </div>

                <div style={{ height: 12 }} />
                <div className="h2">サイト</div>
                <div>{sites.find((s) => s.id === (selected.data.siteId || ""))?.data?.name || selected.data.siteId || "-"}</div>
                <div className="small" style={{ opacity: 0.72 }}><code>{selected.data.siteId || "-"}</code></div>

                <div style={{ height: 12 }} />
                <div className="h2">ダウンロードURL</div>
                <div className="small" style={{ wordBreak: 'break-all', opacity: 0.85 }}>
                  {selected.data.downloadURL}
                </div>

                <div style={{ height: 12 }} />
                <div className="h2">保存先パス</div>
                <div className="small" style={{ wordBreak: 'break-all', opacity: 0.85 }}>
                  {selected.data.storagePath}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 280 }}>
                <div className="h2">使用箇所（アクション）</div>
                {selectedUsedIn.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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

                <button className="btn btn--danger" onClick={() => {
                  if (isLocalOnlyOptimisticMediaRow(selected)) { onDelete(selected.id); return; }
                  setDeleteMediaTarget(selected.id);
                }}>
                  {isLocalOnlyOptimisticMediaRow(selected) ? "この項目を一覧から外す" : "このメディアを削除する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {mediaError && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#dc2626", color: "#fff", padding: "12px 24px", borderRadius: 12, fontWeight: 600, fontSize: 13, zIndex: 9999, maxWidth: "80vw", textAlign: "center", whiteSpace: "pre-line", boxShadow: "0 8px 24px rgba(0,0,0,.18)" }}>
          {mediaError}
        </div>
      )}

      {deleteMediaTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ padding: 28, maxWidth: 400, width: "92vw", background: "#fff" }}>
            <div className="h2" style={{ marginBottom: 12 }}>メディアを削除しますか？</div>
            <div className="small" style={{ marginBottom: 20 }}>
              このメディアを削除します。この操作は元に戻せません。
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setDeleteMediaTarget(null)}>キャンセル</button>
              <button
                className="btn"
                style={{ background: "#dc2626", color: "#fff" }}
                onClick={async () => {
                  const id = deleteMediaTarget;
                  setDeleteMediaTarget(null);
                  await onDelete(id);
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}