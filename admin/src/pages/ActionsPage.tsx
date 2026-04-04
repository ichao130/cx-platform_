// src/pages/ActionsPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBeforeUnload } from '../hooks/useBeforeUnload';
import { getAuth, onAuthStateChanged } from "firebase/auth";
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
import { db, apiPostJson, assertPlanLimit } from "../firebase";
import { usePlanLimit } from "../hooks/usePlanLimit";
import { genId } from "../components/id";
import { uploadImageToWorkspace } from "../lib/storage";

/* =========================
 * Types
 * ========================= */
type ActionType = "modal" | "banner" | "toast" | "launcher";
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
  siteId?: string;
  action_id?: string;
  type: ActionType;
  templateId?: string;
  modalTemplateId?: string; // launcher用: クリック後に開くモーダルのテンプレート

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
    launcher_image_url?: string; // ランチャーボタン専用画像

    // primary media id (optional)
    image_media_id?: string;
  };
};

type TemplateRow = {
  id: string;
  data: { workspaceId?: string; type?: ActionType; name?: string };
};

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

function workspaceKeyForUid(uid: string) {
  return `cx_admin_workspace_id:${uid}`;
}

function readSelectedWorkspaceId(uid?: string): string {
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
    modalTemplateId: a.modalTemplateId ?? "",
    title: a.creative?.title ?? "",
    body: a.creative?.body ?? "",
    ctaText: a.creative?.cta_text ?? "OK",
    ctaUrl: a.creative?.cta_url ?? "",
    ctaUrlText: a.creative?.cta_url_text ?? "詳細を見る",
    imageUrl: a.creative?.image_url ?? "",
    launcherImageUrl: a.creative?.launcher_image_url ?? "",
    imageMediaId: a.creative?.image_media_id ?? "",
    mediaIds: Array.isArray(a.mediaIds) ? a.mediaIds : [],
  };
}

function workspaceLabel(workspaces: Array<{ id: string; data?: { name?: string } }>, workspaceId: string) {
  const hit = workspaces.find((w) => w.id === workspaceId);
  return String(hit?.data?.name || hit?.id || workspaceId || "");
}

function actionTypeLabel(type: ActionType) {
  if (type === "modal") return "モーダル";
  if (type === "banner") return "バナー";
  if (type === "toast") return "トースト";
  return "ランチャー";
}

function placementLabel(v: MountPlacement) {
  if (v === "append") return "末尾に追加";
  if (v === "prepend") return "先頭に追加";
  if (v === "before") return "要素の前";
  return "要素の後";
}

function modeLabel(v: MountMode) {
  if (v === "shadow") return "CSS分離";
  if (v === "theme") return "テーマ適用";
  return "スタイル継承";
}

/** フォーム→保存 payload（mount + mediaIds + primary image_media_id） */
function buildActionPayload(form: {
  workspaceId: string;
  siteId?: string;
  type: ActionType;
  selector: string;
  placement: MountPlacement;
  mode: MountMode;
  templateId: string;
  modalTemplateId: string;
  creative: ActionDoc["creative"];
  mediaIds: string[];
}): ActionDoc {
  const selector = (form.selector || "").trim();
  const primary = (form.creative?.image_media_id || "").trim();
  const mediaIds = uniq([primary, ...(form.mediaIds || [])]);

  const base: ActionDoc = {
    workspaceId: form.workspaceId,
    siteId: form.siteId || undefined,
    type: form.type,
    templateId: form.templateId.trim() || undefined,
    modalTemplateId: (form.type === "launcher" && form.modalTemplateId.trim()) ? form.modalTemplateId.trim() : undefined,
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
  siteId: string;
  onClose: () => void;
  onPick: (row: { id: string; data: MediaDoc }) => void; // add one
}) {
  const { open, siteId, onClose, onPick } = props;
  const [qText, setQText] = React.useState("");
  const [rows, setRows] = React.useState<Array<{ id: string; data: MediaDoc }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (!siteId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // index不要の確実版：where + limit
        const ref = query(
          collection(db, "media"),
          where("siteId", "==", siteId),
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
  }, [open, siteId]);

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

  const [workspaces, setWorkspaces] = useState<Array<{ id: string; data?: { name?: string } }>>([]);
  const [rows, setRows] = useState<Array<{ id: string; data: ActionDoc }>>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);

  // media cache (by id) for thumbnails (no indexes needed)
  const [mediaById, setMediaById] = useState<Record<string, MediaDoc>>({});

  // ---- site state ----
  const [siteId, setSiteId] = useState("");
  const [sites, setSites] = useState<Array<{ id: string; data: { name?: string; siteName?: string } }>>([]);

  const migratedWs = useRef<Set<string>>(new Set());
  const runMigration = useCallback(async (wsId: string) => {
    if (!wsId || migratedWs.current.has(wsId)) return;
    migratedWs.current.add(wsId);
    try {
      await apiPostJson("/v1/sites/migrate-member-uids", { workspace_id: wsId });
    } catch (e) { /* fire-and-forget */ }
  }, []);

  // ---- form state ----
  const [id, setId] = useState(() => genId("act"));
  const [workspaceId, setWorkspaceId] = useState("");
  const [currentUid, setCurrentUid] = useState("");
  const actionLimit = usePlanLimit(workspaceId, "actions");
  const [type, setType] = useState<ActionType>("modal");

  const [selector, setSelector] = useState("body");
  const [placement, setPlacement] = useState<MountPlacement>("append");
  const [mode, setMode] = useState<MountMode>("shadow");

  const [templateId, setTemplateId] = useState<string>("");
  const [modalTemplateId, setModalTemplateId] = useState<string>("");

  const [title, setTitle] = useState("テスト表示");
  const [body, setBody] = useState("これが出れば成功🔥");
  const [ctaText, setCtaText] = useState("OK");
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaUrlText, setCtaUrlText] = useState("詳細を見る");

  const [launcherPosition, setLauncherPosition] = useState<"left" | "right">("right");
  const [imageUrl, setImageUrl] = useState("");
  const [launcherImageUrl, setLauncherImageUrl] = useState("");
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
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const [launcherUploading, setLauncherUploading] = useState(false);
  const [isLauncherImageDragOver, setIsLauncherImageDragOver] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedWorkspaceName = useMemo(() => workspaceLabel(workspaces, workspaceId), [workspaces, workspaceId]);
  const siteName = useMemo(() => {
    const s = sites.find((s) => s.id === siteId);
    return s?.data?.name || s?.data?.siteName || siteId || "（未選択）";
  }, [sites, siteId]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  useBeforeUnload(isModalOpen);

  // toast / delete confirm
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

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

    const onStorage = () => applySelectedWorkspace();

    window.addEventListener("cx_admin_workspace_changed", onWorkspaceChanged as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("cx_admin_workspace_changed", onWorkspaceChanged as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [currentUid]);

  useEffect(() => {
    if (!workspaceId || !currentUid) return;
    writeSelectedWorkspaceId(workspaceId, currentUid);
  }, [workspaceId, currentUid]);

  // Load sites for current user (memberUids-based)
  useEffect(() => {
    if (!currentUid) { setSites([]); setSiteId(""); return; }
    if (workspaceId) runMigration(workspaceId);
    if (workspaceId) setSiteId(readSelectedSiteId(workspaceId));
    const q = query(collection(db, "sites"), where("memberUids", "array-contains", currentUid));
    return onSnapshot(q, (snap) => {
      const list = snap.docs
        .filter((d) => d.data().status !== "deleted")
        .map((d) => ({ id: d.id, data: d.data() as any }));
      setSites(list);
      setSiteId((prev) => prev || list[0]?.id || "");
    });
  }, [currentUid, workspaceId, runMigration]);

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

  function resetEditor() {
    setId(genId("act"));
    setType("modal");
    setSelector("body");
    setPlacement("append");
    setMode("shadow");
    setTemplateId("");
    setTitle("テスト表示");
    setBody("これが出れば成功🔥");
    setCtaText("OK");
    setCtaUrl("");
    setCtaUrlText("詳細を見る");
    setImageUrl("");
    setImageMediaId("");
    setMediaIds([]);
    setUploading(false);
    setUploadErr("");
  }

  function openCreateModal() {
    resetEditor();
    setIsModalOpen(true);
  }

  function openEditModal(row: { id: string; data: ActionDoc }) {
    setId(row.id);
    const f = normalizeActionFromDb(row.data);
    setWorkspaceId(f.workspaceId);
    writeSelectedWorkspaceId(f.workspaceId, currentUid);
    setType(f.type);
    setSelector(f.selector);
    setPlacement(f.placement);
    setMode(f.mode);
    setTemplateId(f.templateId);
    setModalTemplateId(f.modalTemplateId);
    setTitle(f.title);
    setBody(f.body);
    setCtaText(f.ctaText);
    setCtaUrl(f.ctaUrl);
    setCtaUrlText(f.ctaUrlText);
    setImageUrl(f.imageUrl);
    setLauncherImageUrl(f.launcherImageUrl);
    setImageMediaId(f.imageMediaId);
    setMediaIds(f.mediaIds);
    setUploadErr("");
    setIsModalOpen(true);
  }

  useEffect(() => {
    if (!workspaceId) {
      setScenarios([]);
      return;
    }

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
    if (!siteId) {
      setRows([]);
      return;
    }

    const q = query(
      collection(db, "actions"),
      where("siteId", "==", siteId),
      orderBy("__name__")
    );
    return onSnapshot(q, (snap) =>
      setRows(snap.docs.map((d) => ({ id: d.id, data: d.data() as ActionDoc })))
    );
  }, [siteId]);

  useEffect(() => {
    if (!workspaceId) {
      setTemplates([]);
      return;
    }

    const q = query(
      collection(db, "templates"),
      where("workspaceId", "==", workspaceId),
      orderBy("__name__")
    );
    return onSnapshot(q, (snap) =>
      setTemplates(snap.docs.map((d) => ({ id: d.id, data: d.data() as any })))
    );
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaces.length) return;
    const exists = !!workspaceId && workspaces.some((w) => w.id === workspaceId);
    if (!exists) {
      const nextWorkspaceId = workspaces[0]?.id || "";
      setWorkspaceId(nextWorkspaceId);
      if (nextWorkspaceId) writeSelectedWorkspaceId(nextWorkspaceId, currentUid);
    }
  }, [workspaces, workspaceId, currentUid]);

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
      siteId,
      type,
      selector,
      placement,
      mode,
      templateId,
      modalTemplateId,
      creative: {
        title,
        body,
        cta_text: ctaText,
        cta_url: ctaUrl,
        cta_url_text: ctaUrlText,
        image_url: imageUrl,
        launcher_image_url: type === "launcher" ? (launcherImageUrl || undefined) : undefined,
        image_media_id: imageMediaId || undefined,
        ...(type === "launcher" ? { launcher_position: launcherPosition } : {}),
      },
      mediaIds,
    });
  }, [
    workspaceId,
    siteId,
    type,
    selector,
    placement,
    mode,
    templateId,
    modalTemplateId,
    title,
    body,
    ctaText,
    ctaUrl,
    ctaUrlText,
    imageUrl,
    launcherImageUrl,
    imageMediaId,
    mediaIds,
  ]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function saveToFirestore() {
    if (!workspaceId) { showToast("ワークスペースが未設定です", "error"); return; }
    if (!siteId) { showToast("サイトが未設定です", "error"); return; }
    const actionId = id.trim();
    if (!actionId) { showToast("アクションIDが未設定です", "error"); return; }
    try {
      const isNew = !rows.some((r) => r.id === actionId);
      if (isNew) await assertPlanLimit(workspaceId, "actions");

      await setDoc(doc(db, "actions", actionId), payload, { merge: true });
      showToast("アクションを保存しました ✓");
      resetEditor();
      setIsModalOpen(false);
    } catch (e: any) {
      showToast(`保存に失敗しました: ${e?.message || String(e)}`, "error");
    }
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

  async function uploadActionImage(file: File) {
    if (!workspaceId) return;
    if (!file) return;
    if (!(file.type || '').startsWith('image/')) {
      setUploadErr('画像ファイルを選択してください。');
      return;
    }

    setUploadErr('');
    setUploading(true);
    try {
      const result = await uploadImageToWorkspace({ workspaceId, file });
      setImageUrl(result.downloadURL);
    } catch (err: any) {
      setUploadErr(err?.message || String(err));
    } finally {
      setUploading(false);
      setIsImageDragOver(false);
    }
  }

  async function uploadLauncherImage(file: File) {
    if (!workspaceId || !file) return;
    if (!(file.type || '').startsWith('image/')) {
      setUploadErr('画像ファイルを選択してください。');
      return;
    }
    setUploadErr('');
    setLauncherUploading(true);
    try {
      const result = await uploadImageToWorkspace({ workspaceId, file });
      setLauncherImageUrl(result.downloadURL);
    } catch (err: any) {
      setUploadErr(err?.message || String(err));
    } finally {
      setLauncherUploading(false);
      setIsLauncherImageDragOver(false);
    }
  }

  return (
    <div className="container liquid-page">
      <div className="page-header">
        <div className="page-header__meta">
          <div className="small" style={{ marginBottom: 6, opacity: 0.7 }}>MOKKEDA / Main</div>
          <h1 className="h1">アクション</h1>
          <div className="small">モーダル・バナー・トーストなど、実際に表示する部品を管理する画面です。まずは一覧で確認し、必要なときだけ登録・編集します。</div>
          <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>
            対象サイト: <b>{siteName || '（未選択）'}</b>
            {siteId ? <span style={{ opacity: 0.62 }}> / ID: <code>{siteId}</code></span> : null}
          </div>
        </div>
        <div className="page-header__actions">
          <button
            className="btn btn--primary"
            onClick={openCreateModal}
            disabled={!actionLimit.allowed}
            title={!actionLimit.allowed ? `プランの上限に達しています（${actionLimit.current}/${actionLimit.limit}）` : undefined}
          >
            新規アクション{actionLimit.limit !== null ? ` (${actionLimit.current}/${actionLimit.limit})` : ""}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="list-toolbar">
          <div className="list-toolbar__filters">
            <div className="small" style={{ opacity: 0.74 }}>
              名前を中心に一覧化しています。表示位置やメディア設定は編集時に確認します。
            </div>
          </div>
          <div className="list-toolbar__actions">
            <div style={{ minWidth: 240 }}>
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
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.data?.name || s.id}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn" onClick={openCreateModal}>作成</button>
          </div>
        </div>

        <div className="liquid-scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th>アクション</th>
                <th>サイト</th>
                <th>表示タイプ</th>
                <th>表示位置</th>
                <th>メディア</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
            {rows.map((r) => {
              const ids = Array.isArray(r.data.mediaIds) ? r.data.mediaIds : [];
              const thumbIds = ids.slice(0, 4);
              const selectorText = r.data.mount?.selector || r.data.selector || "body";
              return (
                <React.Fragment key={r.id}>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.data.creative?.title || "名称未設定"}</div>
                      <div className="small" style={{ opacity: 0.72 }}>
                        ID: <code>{r.id}</code>
                      </div>
                      <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>
                        本文: {r.data.creative?.body ? String(r.data.creative.body).slice(0, 36) : "-"}
                      </div>
                    </td>
                    <td>
                      <div>{sites.find(s => s.id === r.data.siteId)?.data?.name || r.data.siteId || "-"}</div>
                      <div className="small" style={{ opacity: 0.72 }}>
                        <code>{r.data.siteId}</code>
                      </div>
                    </td>
                    <td>
                      <div>{actionTypeLabel(r.data.type)}</div>
                      {r.data.templateId ? (
                        <div className="small" style={{ opacity: 0.72 }}>template: <code>{r.data.templateId}</code></div>
                      ) : null}
                    </td>
                    <td>
                      <div>{selectorText}</div>
                      <div className="small" style={{ opacity: 0.72 }}>
                        {placementLabel((r.data.mount?.placement ?? "append") as MountPlacement)} / {modeLabel((r.data.mount?.mode ?? "shadow") as MountMode)}
                      </div>
                    </td>
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
                                  border: "1px solid rgba(15,23,42,.12)",
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
                                border: "1px solid rgba(15,23,42,.12)",
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
                        {!ids.length ? <span className="small" style={{ opacity: 0.72 }}>未設定</span> : null}
                      </div>
                    </td>
                    <td>
                      <button className="btn" onClick={() => openEditModal(r)}>
                        編集
                      </button>
                      <span style={{ width: 8, display: 'inline-block' }} />
                      <button
                        className="btn btn--danger"
                        onClick={() => {
                          const used = actionUsageMap[r.id] || [];
                          if (used.length) {
                            const lines = used
                              .slice(0, 30)
                              .map((x) => `- ${x.scenarioId}${x.name ? `（${x.name}）` : ""}`)
                              .join(", ");
                            showToast(`このActionはScenarioで使用中なので削除できません: ${lines}${used.length > 30 ? "..." : ""}`, "error");
                            return;
                          }
                          setDeleteTarget({ id: r.id, name: String(r.data?.creative?.title || r.id) });
                        }}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen ? (
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
          onClick={() => {
            if (!window.confirm('保存されていない変更があります。閉じますか？')) return;
            setIsModalOpen(false);
            setUploadErr('');
          }}
        >
          <div
            className="card liquid-page"
            style={{ width: 'min(1100px, 100%)', maxHeight: '88vh', overflow: 'auto', minWidth: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-header" style={{ marginBottom: 10 }}>
              <div className="page-header__meta">
                <h2 className="h1" style={{ fontSize: 22 }}>{rows.some((r) => r.id === id) ? 'アクションを編集' : 'アクションを作成'}</h2>
                <div className="small">新規登録・編集はモーダルで行います。メディア設定は必要な時だけ確認してください。</div>
              </div>
              <div className="page-header__actions">
                <button className="btn" onClick={() => { setIsModalOpen(false); setUploadErr(''); }}>
                  閉じる
                </button>
              </div>
            </div>

            <div className="row liquid-page" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div className="h2">アクション名</div>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
                <div className="small" style={{ opacity: 0.72, marginTop: 6, marginBottom: 8 }}>
                  アクションID: <code>{id}</code>
                </div>
                <div className="small" style={{ opacity: 0.72, marginBottom: 8 }}>
                  対象サイト: <b>{siteName || "-"}</b>
                </div>

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
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.data?.name || s.id}
                    </option>
                  ))}
                </select>

                <div style={{ height: 10 }} />
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <div className="h2">表示タイプ</div>
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
                      <option value="modal">モーダル（画面中央ポップアップ）</option>
                      <option value="banner">バナー（画面下フローティングバー）</option>
                      <option value="toast">トースト（画面端の小通知）</option>
                      <option value="launcher">ランチャー（固定ボタン→クリックでモーダル）</option>
                    </select>
                  </div>

                  <div style={{ flex: 2 }}>
                    <div className="h2">表示位置セレクタ</div>
                    <input
                      className="input"
                      value={selector}
                      onChange={(e) => setSelector(e.target.value)}
                      placeholder="#Header など"
                    />
                    <div className="small">バナー / トーストで使う表示位置です。モーダルでは無視されます。</div>
                  </div>
                </div>

                <div className="row" style={{ marginTop: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div className="h2">挿入位置</div>
                    <select
                      className="input"
                      value={placement}
                      onChange={(e) => setPlacement(e.target.value as MountPlacement)}
                      disabled={type === "modal"}
                    >
                      <option value="append">末尾に追加（セレクター内の一番下）</option>
                      <option value="prepend">先頭に追加（セレクター内の一番上）</option>
                      <option value="before">要素の直前に挿入</option>
                      <option value="after">要素の直後に挿入</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="h2">スタイル適用方法</div>
                    <select
                      className="input"
                      value={mode}
                      onChange={(e) => setMode(e.target.value as MountMode)}
                      disabled={type === "modal"}
                    >
                      <option value="shadow">サイトのCSSと分離する（推奨）</option>
                      <option value="theme">サイトのテーマを適用する</option>
                      <option value="inherit">サイトのスタイルをそのまま継承</option>
                    </select>
                    <div className="small" style={{ marginTop: 4, opacity: 0.65 }}>
                      {mode === "shadow" && "サイトのCSSに影響されず、デザインが崩れにくい"}
                      {mode === "theme" && "サイトのフォントや色などのテーマが適用される"}
                      {mode === "inherit" && "サイトのすべてのスタイルをそのまま引き継ぐ"}
                    </div>
                  </div>
                </div>

                <div style={{ height: 10 }} />
                {type === "launcher" ? (
                  <>
                    <div className="h2">ランチャーボタン テンプレート（任意）</div>
                    <div className="small" style={{ opacity: 0.72, marginBottom: 6 }}>画面隅に常駐するボタンのデザイン。未選択の場合はビルトインデザインが使われます。</div>
                    <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                      <option value="">（標準 / built-in）</option>
                      {templates
                        .filter((t) => t.data?.workspaceId === workspaceId && t.data?.type === "launcher")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.id} — {t.data?.name || ""}
                          </option>
                        ))}
                    </select>
                    <div style={{ height: 10 }} />
                    <div className="h2">クリック後モーダル テンプレート（任意）</div>
                    <div className="small" style={{ opacity: 0.72, marginBottom: 6 }}>ボタンをクリックしたときに開くモーダルのデザイン。未選択の場合はビルトインモーダルが使われます。</div>
                    <select className="input" value={modalTemplateId} onChange={(e) => setModalTemplateId(e.target.value)}>
                      <option value="">（標準 / built-in）</option>
                      {templates
                        .filter((t) => t.data?.workspaceId === workspaceId && t.data?.type === "modal")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.id} — {t.data?.name || ""}
                          </option>
                        ))}
                    </select>
                  </>
                ) : (
                  <>
                    <div className="h2">テンプレート（任意）</div>
                    <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                      <option value="">（標準 / built-in）</option>
                      {templates
                        .filter((t) => t.data?.workspaceId === workspaceId && t.data?.type === type)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.id} — {t.data?.name || ""}
                          </option>
                        ))}
                    </select>
                  </>
                )}

                <div style={{ height: 10 }} />

                <div style={{ height: 10 }} />
                <div className="h2">本文</div>
                <textarea className="input" value={body} onChange={(e) => setBody(e.target.value)} />

                {type === "launcher" && (
                  <>
                    <div style={{ height: 10 }} />
                    <div className="row">
                      <div style={{ flex: 1 }}>
                        <div className="h2">ボタン位置</div>
                        <select className="input" value={launcherPosition} onChange={(e) => setLauncherPosition(e.target.value as "left" | "right")}>
                          <option value="right">右下</option>
                          <option value="left">左下</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div style={{ height: 10 }} />
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <div className="h2">{type === "launcher" ? "ボタン文言" : "閉じるボタン文言"}</div>
                    <input className="input" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
                  </div>
                </div>

                <div style={{ height: 10 }} />
                <div className="row">
                  <div style={{ flex: 2 }}>
                    <div className="h2">リンクURL（任意）</div>
                    <input className="input" placeholder="https://example.com" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="h2">リンクボタン文言</div>
                    <input className="input" value={ctaUrlText} onChange={(e) => setCtaUrlText(e.target.value)} />
                  </div>
                </div>

                <div style={{ height: 14 }} />
                <button className="btn btn--primary" onClick={saveToFirestore}>
                  保存
                </button>
              </div>

              <div style={{ flex: 1, minWidth: 280 }}>
                <div className="h2">メディア設定</div>

                <div className="row" style={{ alignItems: "center", gap: 10 }}>
                  <button className="btn" type="button" onClick={() => setPickerOpen(true)} disabled={!workspaceId}>
                    メディアを追加
                  </button>

                  <div className="small">
                    メイン画像:
                    {imageMediaId ? (
                      <>
                        {' '}<code>{imageMediaId}</code>
                        <button
                          className="btn"
                          type="button"
                          style={{ marginLeft: 8 }}
                          onClick={() => setImageMediaId("")}
                        >
                          クリア
                        </button>
                      </>
                    ) : (
                      <> （未設定）</>
                    )}
                  </div>
                </div>

                <div style={{ height: 10 }} />
                {uniq([imageMediaId, ...mediaIds]).filter(Boolean).length ? (
                  <div
                    className="liquid-page"
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
                              border: "1px solid rgba(15,23,42,.12)",
                              borderRadius: 14,
                              padding: 10,
                              background: "linear-gradient(180deg,#ffffff,#f8fbff)",
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
                                background: "rgba(15,23,42,.06)",
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
                                  setImageMediaId(mid);
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
                  <div className="small">（まだメディアは設定されていません）</div>
                )}

                <div style={{ height: 12 }} />
                {type === "launcher" && (
                  <>
                    <div className="h2">ランチャーボタン画像URL（任意）</div>
                    <input className="input" value={launcherImageUrl} onChange={(e) => setLauncherImageUrl(e.target.value)} placeholder="https://..." />
                    <div className="small">ボタン専用の画像。テンプレートで <code>{"{{launcher_image_url}}"}</code> として使えます。</div>
                    <div style={{ height: 8 }} />
                    <div
                      style={{
                        border: isLauncherImageDragOver ? '2px dashed rgba(37,99,235,.55)' : '1px dashed rgba(15,23,42,.18)',
                        borderRadius: 14,
                        padding: 12,
                        background: isLauncherImageDragOver ? 'rgba(37,99,235,.06)' : 'rgba(15,23,42,.02)',
                        transition: 'border-color .15s ease, background .15s ease',
                      }}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); if (!workspaceId || launcherUploading) return; setIsLauncherImageDragOver(true); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (!workspaceId || launcherUploading) return; if (!isLauncherImageDragOver) setIsLauncherImageDragOver(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); const next = e.relatedTarget as Node | null; if (next && e.currentTarget.contains(next)) return; setIsLauncherImageDragOver(false); }}
                      onDrop={async (e) => { e.preventDefault(); e.stopPropagation(); if (!workspaceId || launcherUploading) { setIsLauncherImageDragOver(false); return; } const file = e.dataTransfer?.files?.[0]; if (!file) { setIsLauncherImageDragOver(false); return; } await uploadLauncherImage(file); }}
                    >
                      <div className="row" style={{ alignItems: "center", gap: 10 }}>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={!workspaceId || launcherUploading}
                          onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; await uploadLauncherImage(file); e.currentTarget.value = ""; }}
                        />
                        {launcherUploading && <div className="small">アップロード中...</div>}
                      </div>
                      <div className="small" style={{ marginTop: 8, opacity: 0.74 }}>ファイル選択またはここへ画像をドラッグ＆ドロップできます。</div>
                    </div>
                    {launcherImageUrl?.trim() && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src={launcherImageUrl} alt="preview" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: "50%" }} onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
                        <div className="small" style={{ opacity: 0.7 }}>ボタンプレビュー</div>
                      </div>
                    )}
                    <div style={{ height: 12 }} />
                    <div className="h2">モーダル画像URL（任意）</div>
                  </>
                )}
                {type !== "launcher" && <div className="h2">画像URL（任意）</div>}
                <input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                <div className="small">{type === "launcher" ? "クリック後に開くモーダル専用の画像。" : ""}直接入力するか、下のアップロードで自動入力できます。</div>

                <div style={{ height: 10 }} />
                <div
                  style={{
                    border: isImageDragOver ? '2px dashed rgba(37,99,235,.55)' : '1px dashed rgba(15,23,42,.18)',
                    borderRadius: 14,
                    padding: 12,
                    background: isImageDragOver ? 'rgba(37,99,235,.06)' : 'rgba(15,23,42,.02)',
                    transition: 'border-color .15s ease, background .15s ease',
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!workspaceId || uploading) return;
                    setIsImageDragOver(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!workspaceId || uploading) return;
                    if (!isImageDragOver) setIsImageDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const next = e.relatedTarget as Node | null;
                    if (next && e.currentTarget.contains(next)) return;
                    setIsImageDragOver(false);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!workspaceId || uploading) {
                      setIsImageDragOver(false);
                      return;
                    }
                    const file = e.dataTransfer?.files?.[0];
                    if (!file) {
                      setIsImageDragOver(false);
                      return;
                    }
                    await uploadActionImage(file);
                  }}
                >
                  <div className="row" style={{ alignItems: "center", gap: 10 }}>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!workspaceId || uploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await uploadActionImage(file);
                        e.currentTarget.value = "";
                      }}
                    />
                    {uploading && <div className="small">アップロード中...</div>}
                  </div>
                  <div className="small" style={{ marginTop: 8, opacity: 0.74 }}>
                    ファイル選択またはここへ画像をドラッグ＆ドロップできます。
                  </div>
                  {isImageDragOver ? (
                    <div className="small" style={{ marginTop: 6, color: '#2563eb', fontWeight: 700 }}>
                      ここにドロップして画像をアップロード
                    </div>
                  ) : null}
                </div>

                {uploadErr && <div className="small" style={{ color: "#ff6b6b" }}>{uploadErr}</div>}

                {imageUrl?.trim() && (
                  <div style={{ marginTop: 10 }}>
                    <div className="small">プレビュー</div>
                    <img
                      src={imageUrl}
                      alt="preview"
                      style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12 }}
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      ) : null}

      <MediaPickerModal
        open={pickerOpen}
        siteId={siteId}
        onClose={() => setPickerOpen(false)}
        onPick={(row) => {
          setPickerOpen(false);
          setMediaIds((prev) => uniq([...prev, row.id]));
          if (!imageMediaId) setImageMediaId(row.id);
          setImageUrl(row.data.downloadURL);
        }}
      />

      {/* トースト通知 */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "success" ? "#16a34a" : "#dc2626",
          color: "#fff", padding: "12px 24px", borderRadius: 12,
          fontWeight: 700, fontSize: 14, zIndex: 9999,
          boxShadow: "0 8px 24px rgba(0,0,0,.18)",
          animation: "fadeInUp .2s ease",
        }}>
          {toast.msg}
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ padding: 28, maxWidth: 400, width: "92vw", background: "#fff" }}>
            <div className="h2" style={{ marginBottom: 12 }}>アクションを削除しますか？</div>
            <div className="small" style={{ marginBottom: 20 }}>
              「<b>{deleteTarget.name}</b>」を削除します。この操作は元に戻せません。
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setDeleteTarget(null)}>キャンセル</button>
              <button
                className="btn"
                style={{ background: "#dc2626", color: "#fff" }}
                onClick={async () => {
                  try {
                    await deleteDoc(doc(db, "actions", deleteTarget.id));
                    showToast("アクションを削除しました");
                  } catch (e: any) {
                    showToast(`削除に失敗: ${e?.message || String(e)}`, "error");
                  }
                  setDeleteTarget(null);
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}