// src/pages/ActionsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import { genId } from "../components/id";
import { uploadImageToWorkspace } from "../lib/storage";

/* =========================
 * Types
 * ========================= */
type ActionType = "modal" | "banner" | "toast";
type MountPlacement = "append" | "prepend" | "before" | "after";
type MountMode = "shadow" | "theme" | "inherit";


type ScenarioDoc = {
  workspaceId: string;
  siteId?: string;
  name?: string;
  actionRefs?: Array<{ actionId: string; enabled?: boolean; order?: number }>;
  experiment?: {
    enabled?: boolean;
    variants?: Array<{
      variantId?: string;
      actionRefs?: Array<{ actionId: string; enabled?: boolean; order?: number }>;
    }>;
  };
};

type ActionDoc = {
  workspaceId: string;
  action_id?: string;
  type: ActionType;
  templateId?: string;

  // legacy compat
  selector?: string;

  // preferred mount
  mount?: {
    selector: string;
    placement?: MountPlacement;
    mode?: MountMode;
  };

  // Media linkage
  mediaIds?: string[];

  creative: {
    title?: string;
    body?: string;
    cta_text?: string;
    cta_url?: string;
    cta_url_text?: string;
    image_url?: string;

    // primary media id (optional)
    image_media_id?: string;
  };
};

type TemplateRow = {
  id: string;
  data: { workspaceId?: string; type?: ActionType; name?: string };
};

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


/* =========================
 * Utils
 * ========================= */
function collectScenarioActionIds(s: ScenarioDoc): string[] {
  const ids = new Set<string>();
  (s.actionRefs || []).forEach((r) => r?.actionId && ids.add(String(r.actionId)));

  const variants = s.experiment?.variants || [];
  variants.forEach((v) => {
    (v.actionRefs || []).forEach((r) => r?.actionId && ids.add(String(r.actionId)));
  });

  return Array.from(ids);
}

function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function normalizeActionFromDb(a: ActionDoc) {
  const mountSel = a.mount?.selector ?? "";
  const legacySel = a.selector ?? "";
  const selector = (mountSel || legacySel || "body").trim();

  return {
    workspaceId: a.workspaceId ?? "",
    type: (a.type ?? "modal") as ActionType,
    selector,
    placement: (a.mount?.placement ?? "append") as MountPlacement,
    mode: (a.mount?.mode ?? "shadow") as MountMode,
    templateId: a.templateId ?? "",
    title: a.creative?.title ?? "",
    body: a.creative?.body ?? "",
    ctaText: a.creative?.cta_text ?? "OK",
    ctaUrl: a.creative?.cta_url ?? "",
    ctaUrlText: a.creative?.cta_url_text ?? "詳細を見る",
    imageUrl: a.creative?.image_url ?? "",
    imageMediaId: a.creative?.image_media_id ?? "",
    mediaIds: Array.isArray(a.mediaIds) ? a.mediaIds : [],
  };
}

/** フォーム→保存 payload（mount + mediaIds + primary image_media_id） */
function buildActionPayload(form: {
  workspaceId: string;
  type: ActionType;
  selector: string;
  placement: MountPlacement;
  mode: MountMode;
  templateId: string;
  creative: ActionDoc["creative"];
  mediaIds: string[];
}): ActionDoc {
  const selector = (form.selector || "").trim();
  const primary = (form.creative?.image_media_id || "").trim();
  const mediaIds = uniq([primary, ...(form.mediaIds || [])]);

  const base: ActionDoc = {
    workspaceId: form.workspaceId,
    type: form.type,
    templateId: form.templateId.trim() || undefined,
    mediaIds,
    creative: {
      title: form.creative.title ?? "",
      body: form.creative.body ?? "",
      cta_text: form.creative.cta_text ?? "OK",
      cta_url: form.creative.cta_url ?? "",
      cta_url_text: form.creative.cta_url_text ?? "詳細を見る",
      image_url: form.creative.image_url ?? "",
      image_media_id: primary || undefined,
    },
  };

  const canMount = form.type !== "modal";
  if (canMount && selector) {
    base.mount = {
      selector,
      placement: form.placement ?? "append",
      mode: form.mode ?? "shadow",
    };
    base.selector = selector; // debug/compat
  }

  return stripUndefined(base);
}

/* =========================
 * Media Picker (multi-add)
 * ========================= */
function MediaPickerModal(props: {
  open: boolean;
  workspaceId: string;
  onClose: () => void;
  onPick: (row: { id: string; data: MediaDoc }) => void; // add one
}) {
  const { open, workspaceId, onClose, onPick } = props;
  const [qText, setQText] = React.useState("");
  const [rows, setRows] = React.useState<Array<{ id: string; data: MediaDoc }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (!workspaceId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // index不要の確実版：where + limit
        const ref = query(
          collection(db, "media"),
          where("workspaceId", "==", workspaceId),
          limit(50)
        );
        const snap = await getDocs(ref);
        if (cancelled) return;

        const list = snap.docs.map((d) => ({ id: d.id, data: d.data() as MediaDoc }));
        setRows(list);
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, workspaceId]);

  if (!open) return null;

  const key = qText.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (!key) return true;
    const name = (r.data.originalName || "").toLowerCase();
    const url = (r.data.downloadURL || "").toLowerCase();
    return name.includes(key) || url.includes(key);
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(980px, 96vw)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "#111",
          color: "#fff",
          borderRadius: 16,
          padding: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Media Picker</div>
          <div style={{ marginLeft: "auto" }}>
            <button className="btn" onClick={onClose}>
              閉じる
            </button>
          </div>
        </div>

        <div style={{ height: 10 }} />

        <input
          className="input"
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          placeholder="検索（ファイル名 / URL）"
        />

        <div style={{ height: 10 }} />

        {err && (
          <div className="small" style={{ color: "#ff6b6b" }}>
            {err}
          </div>
        )}
        {loading && <div className="small">Loading...</div>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          {filtered.map((r) => {
            const isImage = (r.data.contentType || "").startsWith("image/");
            return (
              <button
                key={r.id}
                onClick={() => onPick(r)}
                style={{
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 14,
                  background: "rgba(255,255,255,.06)",
                  padding: 10,
                  textAlign: "left",
                  cursor: "pointer",
                  color: "#fff",
                }}
                title={r.data.originalName || r.id}
              >
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.85,
                    marginBottom: 6,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r.data.originalName || r.id}
                </div>

                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "rgba(0,0,0,.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isImage ? (
                    <img
                      src={r.data.downloadURL}
                      alt={r.data.originalName || r.id}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.8 }}>file</div>
                  )}
                </div>

                <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>
                  {r.data.contentType || "unknown"} / {r.id}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================
 * Page
 * ========================= */
export default function ActionsPage() {
  const deleteMediaFn = useMemo(() => httpsCallable(getFunctions(), "deleteMedia"), []);

  const [workspaces, setWorkspaces] = useState<Array<{ id: string }>>([]);
  const [rows, setRows] = useState<Array<{ id: string; data: ActionDoc }>>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);

  // media cache (by id) for thumbnails (no indexes needed)
  const [mediaById, setMediaById] = useState<Record<string, MediaDoc>>({});

  // ---- form state ----
  const [id, setId] = useState(() => genId("act"));
  const [workspaceId, setWorkspaceId] = useState("");
  const [type, setType] = useState<ActionType>("modal");

  const [selector, setSelector] = useState("body");
  const [placement, setPlacement] = useState<MountPlacement>("append");
  const [mode, setMode] = useState<MountMode>("shadow");

  const [templateId, setTemplateId] = useState<string>("");

  const [title, setTitle] = useState("テスト表示");
  const [body, setBody] = useState("これが出れば成功🔥");
  const [ctaText, setCtaText] = useState("OK");
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaUrlText, setCtaUrlText] = useState("詳細を見る");

  const [imageUrl, setImageUrl] = useState("");
  const [imageMediaId, setImageMediaId] = useState<string>("");
  const [scenarios, setScenarios] = useState<Array<{ id: string; data: ScenarioDoc }>>([]);

  const actionUsageMap = useMemo(() => {
    const map: Record<string, Array<{ scenarioId: string; name?: string }>> = {};
    scenarios.forEach((s) => {
      const ids = collectScenarioActionIds(s.data);
      ids.forEach((aid) => {
        if (!map[aid]) map[aid] = [];
        map[aid].push({ scenarioId: s.id, name: s.data.name });
      });
    });
    return map;
  }, [scenarios]);

  // multi media
  const [mediaIds, setMediaIds] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string>("");

  const [pickerOpen, setPickerOpen] = useState(false);


  useEffect(() => {
    if (!workspaceId) return;

    const q = query(
      collection(db, "scenarios"),
      where("workspaceId", "==", workspaceId),
      orderBy("__name__")
    );

    return onSnapshot(q, (snap) => {
      setScenarios(snap.docs.map((d) => ({ id: d.id, data: d.data() as any })));
    });
  }, [workspaceId]);  

  
  useEffect(() => {
    const q = query(collection(db, "workspaces"), orderBy("__name__"));
    return onSnapshot(q, (snap) => setWorkspaces(snap.docs.map((d) => ({ id: d.id }))));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "actions"), orderBy("__name__"));
    return onSnapshot(q, (snap) => setRows(snap.docs.map((d) => ({ id: d.id, data: d.data() as ActionDoc }))));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "templates"), orderBy("__name__"));
    return onSnapshot(q, (snap) =>
      setTemplates(snap.docs.map((d) => ({ id: d.id, data: d.data() as any })))
    );
  }, []);

  useEffect(() => {
    if (!workspaceId && workspaces.length) setWorkspaceId(workspaces[0].id);
  }, [workspaces, workspaceId]);

  // build media cache for thumbnails (fetch only missing ids)

  useEffect(() => {
    const needed = uniq(
      rows.flatMap((r) => {
        const ids = Array.isArray(r.data.mediaIds) ? r.data.mediaIds : [];
        const primary = r.data.creative?.image_media_id ? [String(r.data.creative.image_media_id)] : [];
        return [...primary, ...ids];
      })
    ).filter((mid) => !mediaById[mid]);

    if (!needed.length) return;

    let cancelled = false;
    (async () => {
      const fetched: Record<string, MediaDoc> = {};
      await Promise.all(
        needed.map(async (mid) => {
          try {
            const snap = await getDoc(doc(db, "media", mid));
            if (snap.exists()) fetched[mid] = snap.data() as MediaDoc;
          } catch {
            // ignore
          }
        })
      );
      if (cancelled) return;
      if (Object.keys(fetched).length) setMediaById((prev) => ({ ...prev, ...fetched }));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, mediaById]);





  // usage check (ActionsPage側で見える化)
  const usageMap = useMemo(() => {
    const m: Record<string, Array<{ actionId: string; title?: string }>> = {};
    rows.forEach((r) => {
      const ids = Array.isArray(r.data.mediaIds) ? r.data.mediaIds : [];
      ids.forEach((mid) => {
        if (!m[mid]) m[mid] = [];
        m[mid].push({ actionId: r.id, title: r.data.creative?.title });
      });
    });
    return m;
  }, [rows]);

  const payload: ActionDoc = useMemo(() => {
    return buildActionPayload({
      workspaceId,
      type,
      selector,
      placement,
      mode,
      templateId,
      creative: {
        title,
        body,
        cta_text: ctaText,
        cta_url: ctaUrl,
        cta_url_text: ctaUrlText,
        image_url: imageUrl,
        image_media_id: imageMediaId || undefined,
      },
      mediaIds,
    });
  }, [
    workspaceId,
    type,
    selector,
    placement,
    mode,
    templateId,
    title,
    body,
    ctaText,
    ctaUrl,
    ctaUrlText,
    imageUrl,
    imageMediaId,
    mediaIds,
  ]);

  async function saveToFirestore() {
    if (!workspaceId) throw new Error("workspaceId required");
    const actionId = id.trim();
    if (!actionId) throw new Error("actionId required");

    await setDoc(doc(db, "actions", actionId), payload, { merge: true });
    setId(genId("act"));
  }

  async function onDeleteMedia(workspaceId_: string, mediaId_: string) {
    const used = usageMap[mediaId_] || [];
    const msgLines = used
      .map((u) => `- ${u.actionId}${u.title ? `（${u.title}）` : ""}`)
      .join("\n");

    const ok = window.confirm(
      `このメディアを削除します。\n\n使用箇所（Actions）:\n${msgLines || "(なし)"}\n\n本当に削除する？`
    );
    if (!ok) return;

    try {
      await deleteMediaFn({ workspaceId: workspaceId_, mediaId: mediaId_ });
      alert("削除しました");
    } catch (e: any) {
      const code = e?.code;
      const message = e?.message;
      const details = e?.details;

      // Functions側でも使用中なら弾く
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

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">Actions</h1>
        <div className="small">Action（モーダル/バナー/トースト）の部品を作るページ。</div>

        <div style={{ height: 14 }} />

        <div className="row" style={{ alignItems: "flex-start" }}>
          {/* =======================
              Left: Form
          ======================= */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="h2">actionId</div>
            <input className="input" value={id} onChange={(e) => setId(e.target.value)} />

            <div style={{ height: 10 }} />
            <div className="h2">workspaceId</div>
            <select className="input" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.id}
                </option>
              ))}
            </select>

            <div style={{ height: 10 }} />
            <div className="row">
              <div style={{ flex: 1 }}>
                <div className="h2">type</div>
                <select
                  className="input"
                  value={type}
                  onChange={(e) => {
                    const t = e.target.value as ActionType;
                    setType(t);
                    setTemplateId("");
                    if (t === "modal") setSelector("body");
                  }}
                >
                  <option value="modal">modal</option>
                  <option value="banner">banner</option>
                  <option value="toast">toast</option>
                </select>
              </div>

              <div style={{ flex: 2 }}>
                <div className="h2">selector（mount.selector）</div>
                <input
                  className="input"
                  value={selector}
                  onChange={(e) => setSelector(e.target.value)}
                  placeholder="#Header など"
                />
                <div className="small">banner/toast のときだけ mount に使う（modal は無視）</div>
              </div>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <div style={{ flex: 1 }}>
                <div className="h2">placement</div>
                <select
                  className="input"
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value as MountPlacement)}
                  disabled={type === "modal"}
                >
                  <option value="append">append</option>
                  <option value="prepend">prepend</option>
                  <option value="before">before</option>
                  <option value="after">after</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div className="h2">mode</div>
                <select
                  className="input"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as MountMode)}
                  disabled={type === "modal"}
                >
                  <option value="shadow">shadow</option>
                  <option value="theme">theme</option>
                  <option value="inherit">inherit</option>
                </select>
              </div>
            </div>

            <div style={{ height: 10 }} />
            <div className="h2">templateId（任意）</div>
            <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">(default / built-in)</option>
              {templates
                .filter((t) => t.data?.workspaceId === workspaceId && t.data?.type === type)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id} — {t.data?.name || ""}
                  </option>
                ))}
            </select>

            <div style={{ height: 10 }} />
            <div className="h2">title</div>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />

            <div style={{ height: 10 }} />
            <div className="h2">body</div>
            <textarea className="input" value={body} onChange={(e) => setBody(e.target.value)} />

            <div style={{ height: 10 }} />
            <div className="row">
              <div style={{ flex: 1 }}>
                <div className="h2">cta_text</div>
                <input className="input" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
              </div>
              <div style={{ flex: 2 }}>
                <div className="h2">cta_url</div>
                <input className="input" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
              </div>
            </div>

            <div style={{ height: 10 }} />
            <div className="h2">cta_url_text（任意）</div>
            <input className="input" value={ctaUrlText} onChange={(e) => setCtaUrlText(e.target.value)} />

            <div style={{ height: 14 }} />

            {/* =======================
                Media linking UI
            ======================= */}
            <div className="h2">Media紐付け</div>

            <div className="row" style={{ alignItems: "center", gap: 10 }}>
              <button className="btn" type="button" onClick={() => setPickerOpen(true)} disabled={!workspaceId}>
                メディアから追加
              </button>

              <div className="small">
                Primary（image_media_id）:
                {imageMediaId ? (
                  <>
                    {" "}
                    <code>{imageMediaId}</code>
                    <button
                      className="btn"
                      type="button"
                      style={{ marginLeft: 8 }}
                      onClick={() => setImageMediaId("")}
                    >
                      解除
                    </button>
                  </>
                ) : (
                  <> （未設定）</>
                )}
              </div>
            </div>

            {/* selected media thumbs */}
            <div style={{ height: 10 }} />
            {uniq([imageMediaId, ...mediaIds]).filter(Boolean).length ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: 10,
                }}
              >
                {uniq([imageMediaId, ...mediaIds])
                  .filter(Boolean)
                  .map((mid) => {
                    const m = mediaById[mid];
                    const isImage = (m?.contentType || "").startsWith("image/");
                    const used = usageMap[mid] || [];
                    const usedLines = used
                      .map((u) => `- ${u.actionId}${u.title ? `（${u.title}）` : ""}`)
                      .join("\n");

                    return (
                      <div
                        key={mid}
                        style={{
                          border: "1px solid rgba(255,255,255,.12)",
                          borderRadius: 14,
                          padding: 10,
                          background: "rgba(255,255,255,.04)",
                        }}
                      >
                        <div className="small" style={{ opacity: 0.85, marginBottom: 6, wordBreak: "break-all" }}>
                          <code>{mid}</code>
                        </div>

                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "1 / 1",
                            borderRadius: 12,
                            overflow: "hidden",
                            background: "rgba(0,0,0,.25)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isImage && m?.downloadURL ? (
                            <img
                              src={m.downloadURL}
                              alt={m.originalName || mid}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              loading="lazy"
                            />
                          ) : (
                            <div className="small" style={{ opacity: 0.8 }}>
                              {m?.contentType || "file"}
                            </div>
                          )}
                        </div>

                        <div style={{ height: 8 }} />

                        <div className="small" style={{ opacity: 0.8 }}>
                          使用箇所: {used.length} Action
                        </div>

                        <div className="row" style={{ gap: 8, marginTop: 8 }}>
                          <button
                            className="btn"
                            type="button"
                            onClick={() => {
                              // primaryにする
                              setImageMediaId(mid);
                              // imageUrl も合わせる（表示の統一）
                              if (m?.downloadURL) setImageUrl(m.downloadURL);
                            }}
                          >
                            Primaryにする
                          </button>

                          <button
                            className="btn btn--danger"
                            type="button"
                            onClick={() => {
                              const ok = window.confirm(
                                `このActionから紐付け解除します。\n\n${mid}\n\n使用箇所（参考）:\n${usedLines || "(なし)"}`
                              );
                              if (!ok) return;

                              setMediaIds((prev) => prev.filter((x) => x !== mid));
                              if (imageMediaId === mid) setImageMediaId("");
                            }}
                          >
                            紐付け解除
                          </button>
                        </div>

                        <div style={{ height: 8 }} />

                        <button
                          className="btn btn--danger"
                          type="button"
                          onClick={() => onDeleteMedia(workspaceId, mid)}
                        >
                          Media自体を削除（要注意）
                        </button>

                        <div className="small" style={{ opacity: 0.7, marginTop: 6, whiteSpace: "pre-wrap" }}>
                          {used.length ? `使用中:\n${usedLines}` : "使用中のActionなし"}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="small">（まだメディア紐付けなし）</div>
            )}

            <div style={{ height: 12 }} />
            <div className="h2">image_url（任意）</div>
            <input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            <div className="small">URL直入力 or 下のアップロードで自動入力。</div>

            <div style={{ height: 10 }} />
            <div className="row" style={{ alignItems: "center", gap: 10 }}>
              <input
                type="file"
                accept="image/*"
                disabled={!workspaceId || uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!workspaceId) return;

                  setUploadErr("");
                  setUploading(true);
                  try {
                    const result = await uploadImageToWorkspace({ workspaceId, file });
                    setImageUrl(result.downloadURL);
                    // uploadImageToWorkspace が mediaId を返せる設計ならここで追加できる：
                    // setMediaIds((prev)=>uniq([...prev, result.mediaId]));
                  } catch (err: any) {
                    setUploadErr(err?.message || String(err));
                  } finally {
                    setUploading(false);
                    e.currentTarget.value = "";
                  }
                }}
              />
              {uploading && <div className="small">Uploading...</div>}
            </div>

            {uploadErr && <div className="small" style={{ color: "#ff6b6b" }}>{uploadErr}</div>}

            {imageUrl?.trim() && (
              <div style={{ marginTop: 10 }}>
                <div className="small">Preview</div>
                <img
                  src={imageUrl}
                  alt="preview"
                  style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12 }}
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                />
              </div>
            )}

            <div style={{ height: 14 }} />
            <button className="btn btn--primary" onClick={saveToFirestore}>
              保存
            </button>
          </div>

          {/* =======================
              Right: Payload Preview
          ======================= */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="h2">プレビュー（保存されるJSON）</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(payload, null, 2)}</pre>
            <div className="small" style={{ marginTop: 8 }}>
              banner/toast なら <code>mount.selector</code> が入ってるかチェック。
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      {/* =======================
          List
      ======================= */}
      <div className="card">
        <div className="h2">一覧（サムネ表示）</div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>workspaceId</th>
              <th>type</th>
              <th>title</th>
              <th>media</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ids = Array.isArray(r.data.mediaIds) ? r.data.mediaIds : [];
              const thumbIds = ids.slice(0, 4);
              const primary = r.data.creative?.image_media_id ? [String(r.data.creative.image_media_id)] : [];
              return (
                <tr key={r.id}>
                  <td><code>{r.id}</code></td>
                  <td><code>{r.data.workspaceId}</code></td>
                  <td>{r.data.type}</td>
                  <td>{r.data.creative?.title}</td>

                  {/* thumbs */}
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {thumbIds.map((mid) => {
                        const m = mediaById[mid];
                        const isImage = (m?.contentType || "").startsWith("image/");
                        if (isImage && m?.downloadURL) {
                          return (
                            <img
                              key={mid}
                              src={m.downloadURL}
                              alt={m.originalName || mid}
                              title={mid}
                              style={{
                                width: 36,
                                height: 36,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid rgba(255,255,255,.12)",
                              }}
                              loading="lazy"
                            />
                          );
                        }
                        return (
                          <span
                            key={mid}
                            title={mid}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              border: "1px solid rgba(255,255,255,.12)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              opacity: 0.8,
                            }}
                          >
                            file
                          </span>
                        );
                      })}
                      {ids.length > 4 && (
                        <span className="small" style={{ opacity: 0.8 }}>
                          +{ids.length - 4}
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <button
                      className="btn"
                      onClick={() => {
                        setId(r.id);
                        const f = normalizeActionFromDb(r.data);

                        setWorkspaceId(f.workspaceId);
                        setType(f.type);
                        setSelector(f.selector);
                        setPlacement(f.placement);
                        setMode(f.mode);

                        setTemplateId(f.templateId);
                        setTitle(f.title);
                        setBody(f.body);
                        setCtaText(f.ctaText);
                        setCtaUrl(f.ctaUrl);
                        setCtaUrlText(f.ctaUrlText);
                        setImageUrl(f.imageUrl);

                        setImageMediaId(f.imageMediaId);
                        setMediaIds(f.mediaIds);
                      }}
                    >
                      編集
                    </button>

                    <span style={{ width: 8, display: "inline-block" }} />

                      <button
                        className="btn btn--danger"
                        onClick={async () => {
                          const used = actionUsageMap[r.id] || [];
                          if (used.length) {
                            const lines = used
                              .slice(0, 30)
                              .map((x) => `- ${x.scenarioId}${x.name ? `（${x.name}）` : ""}`)
                              .join("\n");
                            alert(`このActionはScenarioで使用中なので削除できません。\n\n${lines}${used.length > 30 ? "\n...(more)" : ""}`);
                            return;
                          }
                          const ok = confirm(`Actionを削除します。\n\n${r.id}\n\n本当に削除する？`);
                          if (!ok) return;
                          await deleteDoc(doc(db, "actions", r.id));
                        }}
                      >
                        削除
                      </button>


                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <MediaPickerModal
        open={pickerOpen}
        workspaceId={workspaceId}
        onClose={() => setPickerOpen(false)}
        onPick={(row) => {
          setPickerOpen(false);

          // 追加（複数対応）
          setMediaIds((prev) => uniq([...prev, row.id]));

          // 初回なら primary にもセットしておく（便利）
          if (!imageMediaId) setImageMediaId(row.id);

          // 表示統一（URLは描画に便利）
          setImageUrl(row.data.downloadURL);
        }}
      />
    </div>
  );
}