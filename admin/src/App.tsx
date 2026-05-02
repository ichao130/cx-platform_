import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Navigate } from "react-router-dom";
import AppRoutes from "./routes";
import AnnouncementToast from "./components/AnnouncementToast";
import AdminContextHeader from "./components/AdminContextHeader";

import { auth, googleProvider, db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ||
  "https://asia-northeast1-cx-platform-v1.cloudfunctions.net/api";

type RoleKey = "owner" | "admin" | "member" | "viewer";
type AccessKey =
  | "dashboard"
  | "analytics"
  | "workspaces"
  | "sites"
  | "scenarios"
  | "actions"
  | "templates"
  | "media"
  | "ai"
  | "members"
  | "billing"
  | "rms";

type AccessMatrix = Record<RoleKey, Partial<Record<AccessKey, boolean>>>;

type WorkspaceRoleInfo = {
  workspaceId: string | null;
  role: RoleKey | null;
  access: AccessMatrix;
};

const ACCESS_KEYS: AccessKey[] = [
  "dashboard",
  "analytics",
  "workspaces",
  "sites",
  "scenarios",
  "actions",
  "templates",
  "media",
  "ai",
  "members",
  "billing",
  "rms",
];

function defaultAccessMatrix(): AccessMatrix {
  return {
    owner: {
      dashboard: true,
      analytics: true,
      workspaces: true,
      sites: true,
      scenarios: true,
      actions: true,
      templates: true,
      media: true,
      ai: true,
      members: true,
      billing: true,
      rms: true,
    },
    admin: {
      dashboard: true,
      analytics: true,
      workspaces: false,
      sites: true,
      scenarios: true,
      actions: true,
      templates: true,
      media: true,
      ai: true,
      members: true,
      billing: false,
      rms: true,
    },
    member: {
      dashboard: true,
      analytics: true,
      workspaces: false,
      sites: true,
      scenarios: true,
      actions: true,
      templates: false,
      media: false,
      ai: true,
      members: false,
      billing: false,
      rms: true,
    },
    viewer: {
      dashboard: true,
      analytics: false,
      workspaces: false,
      sites: true,
      scenarios: true,
      actions: false,
      templates: false,
      media: false,
      ai: true,
      members: false,
      billing: false,
      rms: false,
    },
  };
}

function normalizeAccessMatrix(input: any): AccessMatrix {
  const base = defaultAccessMatrix();
  (Object.keys(base) as RoleKey[]).forEach((role) => {
    ACCESS_KEYS.forEach((key) => {
      const v = input?.[role]?.[key];
      if (typeof v === "boolean") base[role][key] = v;
    });
  });
  return base;
}

function readSelectedWorkspaceId(): string | null {
  try {
    return (
      window.localStorage.getItem("cx_admin_workspace_id") ||
      window.localStorage.getItem("cx_admin_selected_workspace") ||
      window.localStorage.getItem("selectedWorkspaceId") ||
      null
    );
  } catch {
    return null;
  }
}

function workspaceKeyForUid(uid: string) {
  return `cx_workspace_id:${uid}`;
}

function siteKeyForWorkspace(workspaceId: string) {
  return `cx_admin_site_id:${workspaceId}`;
}

function readSelectedSiteId(workspaceId?: string | null): string | null {
  if (!workspaceId) return null;
  try {
    return (
      window.localStorage.getItem(siteKeyForWorkspace(workspaceId)) ||
      window.localStorage.getItem("cx_admin_site_id") ||
      null
    );
  } catch {
    return null;
  }
}

function readSelectedWorkspaceIdForUid(uid: string): string | null {
  try {
    return window.localStorage.getItem(workspaceKeyForUid(uid));
  } catch {
    return null;
  }
}

function readEffectiveWorkspaceId(uid?: string | null): string | null {
  if (uid) {
    try {
      // App.tsx形式: cx_workspace_id:{uid}
      const k1 = window.localStorage.getItem(`cx_workspace_id:${uid}`);
      if (k1) return k1;
      // 各ページ形式: cx_admin_workspace_id:{uid}
      const k2 = window.localStorage.getItem(`cx_admin_workspace_id:${uid}`);
      if (k2) return k2;
    } catch {}
    // UID指定時は汎用キーへのフォールバックを行わない（他アカウントのデータ漏洩防止）
    return null;
  }
  // UID未指定時のみ汎用キーを参照
  return readSelectedWorkspaceId();
}

function writeSelectedWorkspaceId(workspaceId: string, uid?: string) {
  try {
    window.localStorage.setItem("cx_admin_workspace_id", workspaceId);
    window.localStorage.setItem("cx_admin_selected_workspace", workspaceId);
    window.localStorage.setItem("selectedWorkspaceId", workspaceId);
    window.localStorage.setItem("cx_workspace_id", workspaceId);
    if (uid) {
      window.localStorage.setItem(workspaceKeyForUid(uid), workspaceId);          // cx_workspace_id:{uid}
      window.localStorage.setItem(`cx_admin_workspace_id:${uid}`, workspaceId);   // 各ページ互換
    }
    window.dispatchEvent(new CustomEvent("cx_admin_workspace_changed", { detail: { workspaceId } }));
  } catch {
    // ignore
  }
}

function genWorkspaceId() {
  return `ws_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

function genPublicKey() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PK${date}-${rand}`;
}


function readMemberRole(raw: any): RoleKey | null {
  if (typeof raw === "string") return raw as RoleKey;
  if (raw && typeof raw.role === "string") return raw.role as RoleKey;
  return null;
}

function canShow(canAccess: ((key: AccessKey) => boolean) | undefined, key: AccessKey) {
  if (!canAccess) return true;
  return canAccess(key);
}

function SidebarLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        textDecoration: "none",
        padding: "9px 12px",
        borderRadius: 9,
        fontWeight: isActive ? 700 : 500,
        fontSize: 13,
        background: isActive ? "rgba(89,183,198,.18)" : "transparent",
        color: isActive ? "#59cfe0" : "rgba(255,255,255,.72)",
        transition: "background .15s, color .15s",
      })}
    >
      {children}
    </NavLink>
  );
}

function McpTokenButton({ user }: { user: User }) {
  const [apiKey, setApiKey] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);

  // マウント時にAPIキーを取得
  React.useEffect(() => {
    let cancelled = false;
    user.getIdToken().then(async (token) => {
      try {
        const res = await fetch(`${API_BASE}/v1/mcp-key`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (!cancelled) setApiKey(json.key || null);
      } catch {}
    });
    return () => { cancelled = true; };
  }, [user]);

  const handleGenerate = async () => {
    if (!confirm("新しいAPIキーを発行します。既存のキーは使えなくなります。よろしいですか？")) return;
    setGenerating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/v1/mcp-key/generate`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setApiKey(json.key || null);
    } catch {
      alert("APIキーの発行に失敗しました。");
    } finally {
      setGenerating(false);
    }
  };

  const MCP_URL = apiKey
    ? `https://api-o56523at7q-an.a.run.app/mcp?key=${apiKey}`
    : null;

  const handleCopy = async () => {
    if (!MCP_URL) return;
    setLoading(true);
    try {
      await navigator.clipboard.writeText(MCP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
    setLoading(false);
  };

  return (
    <div style={{ marginTop: 10 }}>
      {apiKey ? (
        <>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.38)", fontWeight: 600, letterSpacing: ".06em", marginBottom: 4 }}>MCP URL</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={handleCopy}
              disabled={loading}
              title={MCP_URL || ""}
              style={{
                flex: 1, minWidth: 0,
                background: copied ? "rgba(73,177,184,.22)" : "rgba(255,255,255,.07)",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 8,
                color: copied ? "#59cfe0" : "rgba(255,255,255,.55)",
                fontSize: 10, fontWeight: 600,
                padding: "6px 8px",
                cursor: "pointer",
                textAlign: "left",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {copied ? "✅ コピーしました" : "🔑 MCP URLをコピー"}
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              title="APIキーを再発行する"
              style={{
                background: "rgba(255,255,255,.07)",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 8,
                color: "rgba(255,255,255,.38)",
                fontSize: 11, padding: "6px 8px",
                cursor: generating ? "wait" : "pointer",
                flexShrink: 0,
              }}
            >
              {generating ? "⏳" : "🔄"}
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            width: "100%",
            background: "rgba(255,255,255,.07)",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 8,
            color: "rgba(255,255,255,.55)",
            fontSize: 11, fontWeight: 600,
            padding: "6px 10px",
            cursor: generating ? "wait" : "pointer",
            textAlign: "left",
          }}
        >
          {generating ? "⏳ 発行中..." : "🔑 MCPキーを発行する"}
        </button>
      )}
    </div>
  );
}

const PLATFORM_ADMIN_EMAIL = "iwatanabe@branberyheag.com";
const PLATFORM_ADMIN_ONLY_PATH_PREFIXES = [
  "/ops/invoices",
  "/ops/stripe-sync",
  "/ops/billing-admin",
  "/system-settings",
];

function isPlatformAdminEmail(email?: string | null) {
  return String(email || "").trim().toLowerCase() === PLATFORM_ADMIN_EMAIL;
}

function isPlatformAdminOnlyPath(pathname: string) {
  return PLATFORM_ADMIN_ONLY_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function getWorkspaceAccentColor(data: any): string {
  return String(
    data?.theme?.accent ||
    data?.accentColor ||
    data?.accent_color ||
    "#2563eb"
  ).trim() || "#2563eb";
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = String(hex || "").trim().replace("#", "");
  const full = raw.length === 3
    ? raw.split("").map((c) => c + c).join("")
    : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(37,99,235,${alpha})`;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function getWorkspaceRailLabel(row: { id: string; data: any }) {
  return String(row?.data?.name || row?.id || "W");
}

function getWorkspaceRailIcon(row: { id: string; data: any }) {
  const logoUrl = String(row?.data?.logoUrl || row?.data?.logoURL || row?.data?.iconUrl || "").trim();
  const label = getWorkspaceRailLabel(row);
  return {
    logoUrl,
    fallback: label.slice(0, 1).toUpperCase() || "W",
  };
}

const SelectedSiteContext = React.createContext<string | null>(null);
export function useSelectedSiteId() { return React.useContext(SelectedSiteContext); }

function AppShell({ children }: { children: React.ReactNode }) {

  const { user, workspaceId, workspaceRole, canAccess, currentUid, logout } = useAuth();
  const isPlatformAdmin = isPlatformAdminEmail(user?.email);
  const [workspaceRows, setWorkspaceRows] = useState<Array<{ id: string; data: any }>>([]);
  const [siteRows, setSiteRows] = useState<Array<{ id: string; data: any }>>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUid) {
      setWorkspaceRows([]);
      return;
    }

    const q = query(
      collection(db, "workspaces"),
      where(`members.${currentUid}`, "in", ["owner", "admin", "member", "viewer"])
    );

    return onSnapshot(q, (snap) => {
      setWorkspaceRows(snap.docs.map((d) => ({ id: d.id, data: d.data() as any })));
    });
  }, [currentUid]);

  useEffect(() => {
    if (!currentUid) {
      setSiteRows([]);
      return;
    }

    const q = query(
      collection(db, "sites"),
      where("memberUids", "array-contains", currentUid)
    );

    return onSnapshot(q, (snap) => {
      setSiteRows(
        snap.docs
          .filter((d) => d.data().status !== "deleted")
          .map((d) => ({ id: d.id, data: d.data() as any }))
      );
    });
  }, [currentUid]);

  useEffect(() => {
    const applySelectedSite = (nextWorkspaceId?: string | null, nextSiteId?: string | null) => {
      const targetWorkspaceId = nextWorkspaceId ?? workspaceId;
      const remembered = nextSiteId ?? readSelectedSiteId(targetWorkspaceId);
      setSelectedSiteId(remembered || null);
    };

    applySelectedSite();

    const onWorkspaceChanged = (e?: Event) => {
      const nextWorkspaceId = (e as CustomEvent | undefined)?.detail?.workspaceId || workspaceId;
      applySelectedSite(nextWorkspaceId);
    };

    const onSiteChanged = (e?: Event) => {
      const nextSiteId = (e as CustomEvent | undefined)?.detail?.siteId;
      applySelectedSite(workspaceId, typeof nextSiteId === "string" ? nextSiteId : undefined);
    };

    const onStorage = () => applySelectedSite();

    window.addEventListener("cx_admin_workspace_changed", onWorkspaceChanged as EventListener);
    window.addEventListener("cx_admin_site_changed", onSiteChanged as EventListener);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("cx_admin_workspace_changed", onWorkspaceChanged as EventListener);
      window.removeEventListener("cx_admin_site_changed", onSiteChanged as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [workspaceId]);


  const selectedWorkspaceRow = useMemo(() => {
    return workspaceRows.find((r) => r.id === workspaceId) || null;
  }, [workspaceRows, workspaceId]);

  // 現在選択中ワークスペースの「オーナーUID」
  const currentOwnerUid = useMemo(() => {
    if (!selectedWorkspaceRow) return "";
    const members = ((selectedWorkspaceRow.data as any)?.members || {}) as Record<string, string>;
    const ownerEntry = Object.entries(members).find(([, role]) => role === "owner");
    return ownerEntry ? ownerEntry[0] : "";
  }, [selectedWorkspaceRow]);

  // サイドバーレールやワークスペース管理画面で表示するワークスペース一覧
  // 「現在選択中ワークスペースのオーナー」と同じオーナーのワークスペースのみに絞る
  // （招待されているだけの自分のワークスペースは見せない）
  const visibleWorkspaceRows = useMemo(() => {
    if (!currentOwnerUid) {
      // オーナー特定不可なら、自分がオーナーのものだけ
      return workspaceRows.filter((r) => {
        const members = ((r.data as any)?.members || {}) as Record<string, string>;
        return members[currentUid] === "owner";
      });
    }
    return workspaceRows.filter((r) => {
      const members = ((r.data as any)?.members || {}) as Record<string, string>;
      return members[currentOwnerUid] === "owner";
    });
  }, [workspaceRows, currentOwnerUid, currentUid]);

  const workspaceSiteRows = useMemo(() => {
    return siteRows.filter((row) => String(row.data?.workspaceId || "") === String(workspaceId || ""));
  }, [siteRows, workspaceId]);

  const selectedSiteRow = useMemo(() => {
    const exact = workspaceSiteRows.find((row) => row.id === selectedSiteId);
    return exact || workspaceSiteRows[0] || null;
  }, [workspaceSiteRows, selectedSiteId]);

  const selectedWorkspaceName = useMemo(() => {
    return String(selectedWorkspaceRow?.data?.name || workspaceId || "（未選択）");
  }, [selectedWorkspaceRow, workspaceId]);

  const selectedWorkspaceDescription = useMemo(() => {
    return String(
      selectedWorkspaceRow?.data?.description ||
        selectedWorkspaceRow?.data?.tagline ||
        selectedWorkspaceRow?.data?.lead ||
        ""
    );
  }, [selectedWorkspaceRow]);

  const selectedWorkspaceLogoUrl = useMemo(() => {
    return String(
      selectedWorkspaceRow?.data?.logoUrl ||
        selectedWorkspaceRow?.data?.logoURL ||
        selectedWorkspaceRow?.data?.iconUrl ||
        ""
    );
  }, [selectedWorkspaceRow]);

  const selectedWorkspaceAccent = useMemo(() => {
    return getWorkspaceAccentColor(selectedWorkspaceRow?.data);
  }, [selectedWorkspaceRow]);

  const selectedWorkspaceTintSoft = useMemo(() => {
    return hexToRgba(selectedWorkspaceAccent, 0.08);
  }, [selectedWorkspaceAccent]);

  const selectedWorkspaceTintStrong = useMemo(() => {
    return hexToRgba(selectedWorkspaceAccent, 0.18);
  }, [selectedWorkspaceAccent]);

  const selectedSiteName = useMemo(() => {
    return String(
      selectedSiteRow?.data?.name ||
      selectedSiteRow?.data?.siteName ||
      selectedSiteRow?.id ||
      ""
    );
  }, [selectedSiteRow]);

  function changeWorkspace(nextWorkspaceId: string) {
    if (!nextWorkspaceId) return;
    writeSelectedWorkspaceId(nextWorkspaceId, currentUid);
  }


  // ---- rail 並び順（ローカル保存） ----
  const RAIL_ORDER_KEY = `cx_rail_order:${currentUid || ""}`;
  const [railOrder, setRailOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`cx_rail_order:${currentUid || ""}`) || "[]"); } catch { return []; }
  });

  const sortedWorkspaceRows = useMemo(() => {
    if (!railOrder.length) return workspaceRows;
    return [...workspaceRows].sort((a, b) => {
      const ai = railOrder.indexOf(a.id);
      const bi = railOrder.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [workspaceRows, railOrder]);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function handleRailDragStart(id: string) {
    setDragId(id);
  }
  function handleRailDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (dragOverId !== id) setDragOverId(id);
  }
  function handleRailDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const ids = sortedWorkspaceRows.map((r) => r.id);
    const fromIdx = ids.indexOf(dragId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...ids];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, dragId);
    setRailOrder(next);
    try { localStorage.setItem(RAIL_ORDER_KEY, JSON.stringify(next)); } catch {}
    // 一番上のワークスペースを自動選択
    if (next[0]) changeWorkspace(next[0]);
    setDragId(null);
    setDragOverId(null);
  }
  function handleRailDragEnd() {
    setDragId(null);
    setDragOverId(null);
  }

  const showRail = workspaceRows.length > 1;

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem("cx_sidebar_open") !== "false"; } catch { return true; }
  });
  const toggleSidebar = () => setSidebarOpen((prev) => {
    const next = !prev;
    try { localStorage.setItem("cx_sidebar_open", String(next)); } catch {}
    return next;
  });

  const sidebarW = sidebarOpen ? 240 : 44;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: showRail ? `76px ${sidebarW}px minmax(0, 1fr)` : `${sidebarW}px minmax(0, 1fr)`,
        transition: "grid-template-columns .22s ease",
        background: `radial-gradient(circle at 18% 12%, ${selectedWorkspaceTintStrong}, transparent 20%), linear-gradient(180deg, ${selectedWorkspaceTintSoft}, transparent 24%), linear-gradient(180deg,var(--bg),var(--bg2))`,
      }}
    >
      <aside
        style={{
          display: showRail ? undefined : "none",
          borderRight: "1px solid rgba(15,23,42,.08)",
          background: `linear-gradient(180deg, #173040, #1d4150)`,
          padding: "14px 10px",
          position: "sticky",
          top: 0,
          alignSelf: "start",
          height: "100vh",
          overflow: "auto",
        }}
      >
        <div style={{ display: "grid", gap: 10, justifyItems: "center" }}>
          {sortedWorkspaceRows.map((w) => {
            const active = w.id === workspaceId;
            const icon = getWorkspaceRailIcon(w);
            const accent = getWorkspaceAccentColor(w.data);
            const isDragging = dragId === w.id;
            const isDragOver = dragOverId === w.id && dragId !== w.id;
            return (
              <button
                key={w.id}
                type="button"
                title={getWorkspaceRailLabel(w)}
                draggable
                onDragStart={() => handleRailDragStart(w.id)}
                onDragOver={(e) => handleRailDragOver(e, w.id)}
                onDrop={(e) => handleRailDrop(e, w.id)}
                onDragEnd={handleRailDragEnd}
                onClick={() => changeWorkspace(w.id)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: active ? 18 : 16,
                  border: isDragOver
                    ? "2px dashed rgba(255,255,255,.6)"
                    : active ? `2px solid ${accent}` : "1px solid rgba(255,255,255,.08)",
                  background: icon.logoUrl ? "#fff" : active ? hexToRgba(accent, 0.22) : "rgba(255,255,255,.06)",
                  color: "#fff",
                  cursor: "grab",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: active ? `0 10px 24px ${hexToRgba(accent, 0.28)}` : "none",
                  overflow: "hidden",
                  padding: 0,
                  opacity: isDragging ? 0.4 : 1,
                  transform: isDragOver ? "scale(1.12)" : "scale(1)",
                  transition: "transform .16s ease, border-radius .16s ease, background .16s ease, box-shadow .16s ease, opacity .16s ease",
                }}
              >
                {icon.logoUrl ? (
                  <img src={icon.logoUrl} alt={getWorkspaceRailLabel(w)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: "-0.04em" }}>{icon.fallback}</span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      <aside
        style={{
          borderRight: "1px solid rgba(15,23,42,.08)",
          background: "rgba(22,44,64,.96)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          alignSelf: "start",
          height: "100vh",
          overflow: "hidden",
          width: sidebarW,
          transition: "width .22s ease",
          flexShrink: 0,
        }}
      >
        {/* 閉じているときのトグルボタン（縦中央） */}
        {!sidebarOpen && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", paddingTop: 14 }}>
            <button
              onClick={toggleSidebar}
              title="メニューを開く"
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none",
                background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.8)",
                cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
            >
              ›
            </button>
          </div>
        )}

        {/* 開いているときのナビゲーション */}
        {sidebarOpen && (
          <div style={{ padding: 18, width: 240, boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div
                className="mokkeda-brand-slot"
                style={{
                  width: 36, height: 36, flexShrink: 0, borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, opacity: selectedWorkspaceLogoUrl ? 1 : 0.75,
                  overflow: "hidden", background: selectedWorkspaceLogoUrl ? "#fff" : "rgba(255,255,255,.1)",
                }}
              >
                {selectedWorkspaceLogoUrl ? (
                  <img src={selectedWorkspaceLogoUrl} alt={selectedWorkspaceName} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  "LOGO"
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Link to="/dashboard" style={{ margin: 0, textDecoration: "none", display: "block", color: "rgba(255,255,255,.95)", fontSize: 17, fontWeight: 800, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedWorkspaceName}
                </Link>
              </div>
              {/* 閉じるボタン */}
              <button
                onClick={toggleSidebar}
                title="メニューを閉じる"
                style={{
                  width: 28, height: 28, borderRadius: 7, border: "none", flexShrink: 0,
                  background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.5)",
                  cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background .15s, color .15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.18)"; e.currentTarget.style.color = "rgba(255,255,255,.9)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.08)"; e.currentTarget.style.color = "rgba(255,255,255,.5)"; }}
              >
                ‹
              </button>
            </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.38)", marginBottom: 8, paddingLeft: 12 }}>
            メインメニュー
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {canShow(canAccess, "dashboard") && <SidebarLink to="/dashboard">ダッシュボード</SidebarLink>}
            {canShow(canAccess, "scenarios") && <SidebarLink to="/scenarios">シナリオ</SidebarLink>}
            {canShow(canAccess, "actions") && <SidebarLink to="/actions">アクション</SidebarLink>}
            {canShow(canAccess, "templates") && <SidebarLink to="/templates">テンプレート</SidebarLink>}
            {canShow(canAccess, "media") && <SidebarLink to="/media">メディア</SidebarLink>}
            {canShow(canAccess, "analytics") && <SidebarLink to="/analytics">流入計測</SidebarLink>}
            {canShow(canAccess, "ai") && <SidebarLink to="/ai">AIインサイト</SidebarLink>}
            {canShow(canAccess, "ai") && <SidebarLink to="/ai/optimize">配信最適化</SidebarLink>}
          </div>
        </div>

        {(selectedWorkspaceRow?.data as any)?.rmsEnabled && canShow(canAccess, "rms") && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.38)", marginBottom: 8, paddingLeft: 12 }}>
              楽天RMS
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <SidebarLink to="/rms">RMSダッシュボード</SidebarLink>
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.38)", marginBottom: 8, paddingLeft: 12 }}>
            設定
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {(isPlatformAdmin || canShow(canAccess, "workspaces")) && <SidebarLink to="/workspaces">ワークスペース</SidebarLink>}
            {canShow(canAccess, "sites") && <SidebarLink to="/sites">サイト</SidebarLink>}
            {canShow(canAccess, "members") && <SidebarLink to="/workspace/members">メンバー</SidebarLink>}
            {canShow(canAccess, "billing") && <SidebarLink to="/workspace/billing">契約 / Billing</SidebarLink>}
          </div>
        </div>



        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(15,23,42,.08)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.38)", marginBottom: 8, paddingLeft: 12 }}>
            Signed in
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                overflow: "hidden",
                background: "rgba(15,23,42,.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 auto",
                fontWeight: 700,
              }}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || user.email || "user"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                String(user.displayName || user.email || "U").slice(0, 1).toUpperCase()
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "rgba(255,255,255,.9)" }}>
                {user.displayName || "Google User"}
              </div>
              <div className="small" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "rgba(255,255,255,.45)" }}>
                {user.email || ""}
              </div>
            </div>
            <button
              onClick={() => void logout()}
              title="ログアウト"
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "4px 6px",
                color: "rgba(255,255,255,.3)", fontSize: 16, lineHeight: 1, borderRadius: 6,
                flexShrink: 0, transition: "color .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,.7)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,.3)")}
            >
              ↩
            </button>
          </div>
          <McpTokenButton user={user} />
        </div>
        </div>
        )}
      </aside>

      <main style={{ minWidth: 0, width: "100%", overflowX: "hidden" }}>
        <AdminContextHeader
          workspaceName={selectedWorkspaceName}
          workspaceDescription={selectedWorkspaceDescription}
          siteName={selectedSiteName}
          role={workspaceRole}
          canAccess={canAccess}
        />
        {children}
      </main>
    </div>
  );
}

type AuthContextValue = {
  user: User;
  currentUid: string;
  /** Returns Firebase Auth ID token (JWT). */
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  /** Convenience: authorized fetch to your Functions API */
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  /** Convenience: POST JSON and return parsed JSON (or null). */
  apiPost: <T = any>(path: string, body?: any, init?: RequestInit) => Promise<{ res: Response; json: T | null }>;
  logout: () => Promise<void>;
  workspaceId: string | null;
  workspaceRole: RoleKey | null;
  workspaceAccess: AccessMatrix;
  canAccess: (key: AccessKey) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const v = React.useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used within <AuthGate>");
  return v;
}

function LoadingScreen({ label = "読み込み中..." }: { label?: string }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg, #f8fafc 0%, #f1f5f9 100%)",
      gap: 24,
    }}>
      <style>{`
        @keyframes cx-spin { to { transform: rotate(360deg); } }
        @keyframes cx-fade { 0%,100%{opacity:.3} 50%{opacity:1} }
      `}</style>
      <img src="/logo_mokkeda_v1.svg" alt="MOKKEDA" style={{ width: 160, opacity: 0.9 }} />
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: "3px solid #e2e8f0",
        borderTopColor: "#2563eb",
        animation: "cx-spin .7s linear infinite",
      }} />
      <div style={{ fontSize: 13, color: "#64748b", animation: "cx-fade 1.6s ease-in-out infinite" }}>
        {label}
      </div>
    </div>
  );
}

function AuthScreen({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(320px, 520px) minmax(420px, 1fr)",
        background: "linear-gradient(180deg,var(--bg),var(--bg2))",
      }}
    >
      <div
        style={{
          padding: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRight: "1px solid rgba(15,23,42,.08)",
          background: "rgba(255,255,255,.82)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <img
              src="/logo_mokkeda_v1.svg"
              alt="MOKKEDA"
              style={{ width: "100%", maxWidth: 260, height: "auto", display: "inline-block" }}
            />
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div className="small" style={{ lineHeight: 1.7 }}>{description}</div>
            <div style={{ height: 16 }} />
            {children}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 20%, rgba(37,99,235,.18), transparent 28%), radial-gradient(circle at 80% 30%, rgba(15,118,110,.16), transparent 24%), radial-gradient(circle at 50% 80%, rgba(99,102,241,.14), transparent 30%)",
          }}
        />
        <div style={{ position: "relative", width: "100%", maxWidth: 680 }}>
          <div className="card" style={{ padding: 24, background: "rgba(255,255,255,.72)", backdropFilter: "blur(14px)" }}>
            <div className="small" style={{ opacity: 0.72, textTransform: "uppercase", letterSpacing: ".08em" }}>Product concept</div>
            <div className="h1" style={{ marginTop: 10, marginBottom: 10 }}>AI for "Thank You" Moments</div>
            <div className="small" style={{ lineHeight: 1.8 }}>
              MOKKEDA は、サイトごとの接客シナリオ、アクション、メディア、AIインサイトを一つの管理画面で扱うための CX プラットフォームです。
              ワークスペースごとに切り替えながら、運用と改善を一気通貫で回せます。
            </div>
            <div style={{ height: 18 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 800 }}>Scenarios</div>
                <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>ターゲット条件と発火条件を分けて管理</div>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 800 }}>Actions</div>
                <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>導線・バナー・モーダルを柔軟に配信</div>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 800 }}>Workspace rail</div>
                <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>Slack風UIでブランドごとに切り替え</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string>("");

  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceRoleInfo>({
    workspaceId: null,
    role: null,
    access: defaultAccessMatrix(),
  });
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapDone, setBootstrapDone] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardName, setWizardName] = useState("");
  const [wizardContact, setWizardContact] = useState("");
  const [wizardEmail, setWizardEmail] = useState("");
  const [wizardSiteName, setWizardSiteName] = useState("");
  const [wizardSiteDomain, setWizardSiteDomain] = useState("");
  const [wizardCreatedSiteId, setWizardCreatedSiteId] = useState("");
  const [wizardCreatedPublicKey, setWizardCreatedPublicKey] = useState("");
  const [wizardCopied, setWizardCopied] = useState(false);
  const [wizardTagMode, setWizardTagMode] = useState<"direct" | "gtm" | "shopify">("direct");

  const completeWizard = useCallback(async (wsName: string, contactName: string, contactEmail: string, siteName: string, siteDomain: string) => {
    if (!user) return;
    try {
      setBootstrapping(true);
      const workspaceId = genWorkspaceId();
      const freeExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await setDoc(doc(db, "workspaces", workspaceId), {
        name: wsName.trim() || "My Workspace",
        domains: [],
        defaults: { ai: { decision: false, discovery: "suggest", copy: "approve" }, access: defaultAccessMatrix() },
        members: { [user.uid]: "owner" },
        billing: {
          plan: "free",
          status: "inactive",
          billing_company_name: wsName.trim(),
          billing_contact_name: contactName.trim(),
          billing_email: contactEmail.trim() || user.email || "",
          free_expires_at: freeExpiresAt,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
      }, { merge: true });
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email || "",
        displayName: contactName.trim() || user.displayName || "",
        photoURL: user.photoURL || "",
        primaryWorkspaceId: workspaceId,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });
      writeSelectedWorkspaceId(workspaceId, user.uid);

      // ウェルカムメール送信（失敗してもUIには影響させない）
      try {
        const idToken = await user.getIdToken();
        await fetch(`${API_BASE}/v1/welcome-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            to: contactEmail.trim() || user.email || "",
            workspaceName: wsName.trim(),
            contactName: contactName.trim(),
          }),
        });
      } catch {}

      // 最初のサイトを作成
      const publicKey = genPublicKey();
      const domains = siteDomain.trim() ? [siteDomain.trim().replace(/^https?:\/\//, "").split("/")[0]] : [];
      let createdSiteId = "";
      let createdPublicKey = publicKey;
      try {
        const idToken = await user.getIdToken();
        const siteRes = await fetch(`${API_BASE}/v1/sites/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            workspace_id: workspaceId,
            name: siteName.trim() || wsName.trim() || "My Site",
            public_key: publicKey,
            domains,
          }),
        });
        const siteJson = await siteRes.json().catch(() => ({}));
        createdSiteId = siteJson.site_id || "";
        createdPublicKey = siteJson.public_key || publicKey;
      } catch {}

      setWizardCreatedSiteId(createdSiteId);
      setWizardCreatedPublicKey(createdPublicKey);
      setWizardStep(5); // コードスニペットステップへ
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBootstrapping(false);
    }
  }, [user]);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let alive = true;

    // DevTools helpers:
    // await window.cxGetIdToken()
    // window.cxAuthUid()
    // window.cxAuthEmail()
    // await window.cxApiPost('/v1/stats/summary', {...})
    (window as any).cxGetIdToken = async (forceRefresh?: boolean) => {
      const u = auth.currentUser;
      if (!u) return null;
      return await u.getIdToken(!!forceRefresh);
    };

    (window as any).cxAuthUid = () => auth.currentUser?.uid ?? null;
    (window as any).cxAuthEmail = () => auth.currentUser?.email ?? null;

    // Authorized API helper (uses same origin rules as your admin)
    (window as any).cxApiPost = async (
      path: string,
      body: any,
      extraHeaders?: Record<string, string>
    ) => {
      const u = auth.currentUser;
      if (!u) throw new Error("Not signed in");
      const token = await u.getIdToken(false);
      const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(extraHeaders || {}),
        },
        body: JSON.stringify(body ?? {}),
      });
      const json = await res.clone().json().catch(() => null);
      return { res, json };
    };

    (async () => {
      try {
        // Keep login state across reloads.
        await setPersistence(auth, browserLocalPersistence);
      } catch (e) {
        // Not fatal (e.g., blocked third-party cookies / private mode)
        console.warn("[AuthGate] setPersistence failed", e);
      }

      if (!alive) return;

      unsub = onAuthStateChanged(
        auth,
        (u) => {
          setUser(u);
          setChecking(false);
          console.log("[AuthGate] signed in:", u ? { uid: u.uid, email: u.email } : null);
        },
        (e) => {
          console.error(e);
          setError((e as any)?.message || String(e));
          setChecking(false);
        }
      );
    })();

    return () => {
      alive = false;
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setWorkspaceInfo({ workspaceId: null, role: null, access: defaultAccessMatrix() });
      return;
    }

    let unsub: (() => void) | null = null;

    const bindWorkspace = (workspaceId: string | null) => {
      if (unsub) {
        unsub();
        unsub = null;
      }

      if (!workspaceId) {
        setWorkspaceInfo({ workspaceId: null, role: null, access: defaultAccessMatrix() });
        return;
      }

      const ref = doc(db, "workspaces", workspaceId);
      unsub = onSnapshot(
        ref,
        (snap) => {
          const data = (snap.data() || {}) as any;

          const role = readMemberRole(data?.members?.[user.uid]);
          const access = normalizeAccessMatrix(data?.defaults?.access);
          if (!role) {
            setWorkspaceInfo({ workspaceId, role: null, access: defaultAccessMatrix() });
            return;
          }
          setWorkspaceInfo({ workspaceId, role, access });

        },
        (e) => {
          console.error("[AuthGate] workspace snapshot failed", e);
          setWorkspaceInfo({ workspaceId, role: null, access: defaultAccessMatrix() });
        }
      );
    };

    bindWorkspace(readEffectiveWorkspaceId(user.uid));

    const onStorage = (e: StorageEvent) => {
      // UID固有キーの変化のみを監視（汎用キーは他アカウントが書き込む可能性があるため除外）
      if (
        e.key === workspaceKeyForUid(user.uid) ||
        e.key === `cx_admin_workspace_id:${user.uid}`
      ) {
        bindWorkspace(readEffectiveWorkspaceId(user.uid));
      }
    };


    const onWorkspaceChanged = (e: any) => {
      const next = e?.detail?.workspaceId || readEffectiveWorkspaceId(user.uid);
      bindWorkspace(next || null);
    };


    window.addEventListener("storage", onStorage);
    window.addEventListener("cx_admin_workspace_changed" as any, onWorkspaceChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cx_admin_workspace_changed" as any, onWorkspaceChanged);
      if (unsub) unsub();
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setBootstrapDone(false);
      return;
    }

    let cancelled = false;
    setBootstrapDone(false);

    const ensureBootstrap = async () => {
      try {
        setBootstrapping(true);

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const u = (userSnap.data() || {}) as any;
          const primaryWorkspaceId = String(u.primaryWorkspaceId || "");
          if (primaryWorkspaceId) {
            const wRef = doc(db, "workspaces", primaryWorkspaceId);
            const wSnap = await getDoc(wRef);
            if (wSnap.exists()) {
              const w = (wSnap.data() || {}) as any;
              const currentMember = readMemberRole(w?.members?.[user.uid]);
              if (currentMember) {
                // 既にlocalStorageにワークスペースが保存されている場合は上書きしない（キー同期だけ行う）
                const existingId = readEffectiveWorkspaceId(user.uid);
                if (existingId) {
                  // 保存されているワークスペースに現在のユーザーがメンバーかどうか確認する
                  // （他アカウントの汎用キーが残っている場合の漏洩を防ぐ）
                  let memberOfExisting = false;
                  try {
                    const exSnap = await getDoc(doc(db, "workspaces", existingId));
                    if (exSnap.exists()) {
                      const exData = (exSnap.data() || {}) as any;
                      memberOfExisting = !!readMemberRole(exData?.members?.[user.uid]);
                    }
                  } catch {}

                  if (memberOfExisting) {
                    // メンバーである場合のみキーを同期
                    try {
                      window.localStorage.setItem("cx_admin_workspace_id", existingId);
                      window.localStorage.setItem("cx_admin_selected_workspace", existingId);
                      window.localStorage.setItem("selectedWorkspaceId", existingId);
                      window.localStorage.setItem("cx_workspace_id", existingId);
                      window.localStorage.setItem(`cx_workspace_id:${user.uid}`, existingId);
                      window.localStorage.setItem(`cx_admin_workspace_id:${user.uid}`, existingId);
                    } catch {}
                    return;
                  } else {
                    // メンバーでない（他ユーザーのキーが残っている）→ クリアしてprimaryを使う
                    try {
                      window.localStorage.removeItem("cx_admin_workspace_id");
                      window.localStorage.removeItem("cx_admin_selected_workspace");
                      window.localStorage.removeItem("selectedWorkspaceId");
                      window.localStorage.removeItem("cx_workspace_id");
                    } catch {}
                    writeSelectedWorkspaceId(primaryWorkspaceId, user.uid);
                    return;
                  }
                } else {
                  // localStorageにワークスペースがない場合のみprimaryを設定してイベント発火
                  writeSelectedWorkspaceId(primaryWorkspaceId, user.uid);
                }
                return;
              }
            }
          }
        }

        // 初回ログイン → ウィザードでワークスペース名を入力させる
        if (!cancelled) {
          setWizardName(user.displayName ? `${user.displayName}のワークスペース` : "My Workspace");
          setShowWizard(true);
          setBootstrapping(false);
        }
        return;
      } catch (e: any) {
        console.error("[AuthGate] bootstrap wizard failed", e);
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
          setBootstrapDone(true);
        }
      }
    };

    ensureBootstrap();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const getIdToken = useCallback(async (forceRefresh?: boolean) => {
    const u = auth.currentUser;
    if (!u) throw new Error("Not signed in");
    return await u.getIdToken(!!forceRefresh);
  }, []);

  const apiFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getIdToken(false);
      const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

      const headers = new Headers(init?.headers || {});
      if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

      return await fetch(url, {
        ...init,
        headers,
      });
    },
    [getIdToken]
  );

  const apiPost = useCallback(
    async <T = any>(path: string, body?: any, init?: RequestInit) => {
      const res = await apiFetch(path, {
        method: "POST",
        ...init,
        body: JSON.stringify(body ?? {}),
      });
      const json = (await res.clone().json().catch(() => null)) as T | null;
      return { res, json };
    },
    [apiFetch]
  );

  async function login() {
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || String(e));
    }
  }

  const logout = useCallback(async () => {
    setError("");
    try {
      // ログアウト前にUID非依存の汎用キーを削除（次のユーザーが引き継がないように）
      try {
        window.localStorage.removeItem("cx_admin_workspace_id");
        window.localStorage.removeItem("cx_admin_selected_workspace");
        window.localStorage.removeItem("selectedWorkspaceId");
        window.localStorage.removeItem("cx_workspace_id");
      } catch {}
      await signOut(auth);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || String(e));
    }
  }, []);

  const canAccess = useCallback(
    (key: AccessKey) => {
      const role = workspaceInfo.role;
      if (!role) return bootstrapping;
      return !!workspaceInfo.access?.[role]?.[key];
    },
    [workspaceInfo, bootstrapping]
  );

  const ctxValue = useMemo<AuthContextValue | null>(() => {
    if (!user) return null;

    return {
      user,
      currentUid: user.uid,
      getIdToken,
      apiFetch,
      apiPost,
      logout,
      workspaceId: workspaceInfo.workspaceId,
      workspaceRole: workspaceInfo.role,
      workspaceAccess: workspaceInfo.access,
      canAccess,
    };

  }, [user, getIdToken, apiFetch, apiPost, logout, workspaceInfo, canAccess]);

  if (checking || (user && !bootstrapDone)) {
    return <LoadingScreen label={bootstrapping ? "ワークスペースを初期化しています..." : "読み込み中..."} />;
  }

  if (!user || !ctxValue) {
    return (
      <AuthScreen
        title="MOKKEDA にログイン"
        description="管理画面を利用するには Google ログインが必要です。初回ログイン時は、そのアカウント用のワークスペースが自動作成され、作成者はオーナーとして登録されます。"
      >
        <button
          onClick={login}
          style={{
            display: "inline-flex", alignItems: "center", gap: 12,
            background: "#fff", color: "#3c4043",
            border: "1px solid #dadce0", borderRadius: 4,
            padding: "0 16px 0 12px", height: 40,
            fontFamily: "'Google Sans', Roboto, Arial, sans-serif",
            fontSize: 14, fontWeight: 500, letterSpacing: ".25px",
            cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,.12)",
            transition: "box-shadow .15s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.18)")}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,.12)")}
        >
          {/* Google 公式ロゴ SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Google でログイン
        </button>
        <div className="small" style={{ marginTop: 12, opacity: 0.72 }}>
          接客シナリオ、アクション、メディア、AIインサイトを一つの管理画面で扱えます。
        </div>
        {error ? (
          <>
            <div style={{ height: 10 }} />
            <div className="small" style={{ color: "salmon" }}>
              {error}
            </div>
          </>
        ) : null}
      </AuthScreen>
    );
  }

  // 初回ログインウィザード（モーダル）
  if (showWizard) {
    const STEPS = [
      { label: "ショップ情報", icon: "🏪" },
      { label: "担当者", icon: "👤" },
      { label: "メールアドレス", icon: "✉️" },
      { label: "サイト登録", icon: "🌐" },
      { label: "コードをはりつける", icon: "📋" },
    ];
    const canNext =
      (wizardStep === 1 && !!wizardName.trim()) ||
      (wizardStep === 2 && !!wizardContact.trim()) ||
      (wizardStep === 3 && !!wizardEmail.trim()) ||
      (wizardStep === 4 && !!wizardSiteName.trim() && !bootstrapping) ||
      wizardStep === 5;

    return (
      <>
        <AuthContext.Provider value={ctxValue}>{children}</AuthContext.Provider>
        {/* オーバーレイ */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(15,23,42,.55)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 20,
            width: "100%",
            maxWidth: 480,
            boxShadow: "0 24px 64px rgba(15,23,42,.22)",
            overflow: "hidden",
          }}>
            {/* ヘッダー */}
            <div style={{
              background: "linear-gradient(135deg, var(--brand) 0%, #1a6b7c 100%)",
              padding: "28px 32px 24px",
              textAlign: "center",
              color: "#fff",
            }}>
              <img
                src="/logo_mokkeda_v1.svg"
                alt="MOKKEDA"
                style={{ width: 140, height: "auto", filter: "brightness(0) invert(1)", marginBottom: 16, display: "block", margin: "0 auto 16px" }}
              />
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
                ようこそ！🎉
              </div>
              <div style={{ fontSize: 13, opacity: .85 }}>
                はじめに、いくつか教えてください（30秒で完了）
              </div>
            </div>

            {/* ステップインジケーター */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(15,23,42,.07)" }}>
              {STEPS.map((st, i) => {
                const step = i + 1;
                const isActive = step === wizardStep;
                const isDone = step < wizardStep;
                return (
                  <div key={step} style={{
                    flex: 1,
                    padding: "12px 8px",
                    textAlign: "center",
                    borderBottom: isActive ? "2px solid #2563eb" : "2px solid transparent",
                    transition: "border-color .2s",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      margin: "0 auto 4px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: isDone ? 14 : 13,
                      background: isDone ? "#2563eb" : isActive ? "#eff6ff" : "#f1f5f9",
                      color: isDone ? "#fff" : isActive ? "#2563eb" : "#94a3b8",
                      fontWeight: 700,
                      transition: "all .2s",
                    }}>
                      {isDone ? "✓" : st.icon}
                    </div>
                    <div style={{ fontSize: 11, color: isActive ? "#2563eb" : isDone ? "#64748b" : "#94a3b8", fontWeight: isActive ? 700 : 400 }}>
                      {st.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* コンテンツ */}
            <div style={{ padding: "28px 32px 24px" }}>
              {wizardStep === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                    会社名・ショップ名 <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="例：山田商店 / 株式会社〇〇"
                    value={wizardName}
                    onChange={(e) => setWizardName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && wizardName.trim()) setWizardStep(2); }}
                    autoFocus
                    style={{ fontSize: 15, padding: "11px 14px" }}
                  />
                  <div style={{ fontSize: 12, color: "#6b7280" }}>ワークスペース名として使用されます。後から変更できます。</div>
                </div>
              )}
              {wizardStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                    担当者名 <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="例：山田 太郎"
                    value={wizardContact}
                    onChange={(e) => setWizardContact(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && wizardContact.trim()) setWizardStep(3); }}
                    autoFocus
                    style={{ fontSize: 15, padding: "11px 14px" }}
                  />
                  <div style={{ fontSize: 12, color: "#6b7280" }}>サービスのご案内やサポート連絡時にご利用します。</div>
                </div>
              )}
              {wizardStep === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                    連絡先メールアドレス <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    className="input"
                    type="email"
                    placeholder="例：yamada@example.com"
                    value={wizardEmail}
                    onChange={(e) => setWizardEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && wizardEmail.trim()) setWizardStep(4); }}
                    autoFocus
                    style={{ fontSize: 15, padding: "11px 14px" }}
                  />
                  <div style={{ fontSize: 12, color: "#6b7280" }}>請求書や重要なお知らせをお送りします。</div>
                </div>
              )}
              {wizardStep === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                      サイト名 <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      className="input"
                      placeholder="例：山田商店 公式サイト"
                      value={wizardSiteName}
                      onChange={(e) => setWizardSiteName(e.target.value)}
                      autoFocus
                      style={{ fontSize: 15, padding: "11px 14px" }}
                    />
                    <div style={{ fontSize: 12, color: "#6b7280" }}>管理画面でサイトを識別するための名前です。</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                      サイトURL <span style={{ color: "#94a3b8", fontWeight: 400 }}>（任意）</span>
                    </label>
                    <input
                      className="input"
                      placeholder="例：https://example.com"
                      value={wizardSiteDomain}
                      onChange={(e) => setWizardSiteDomain(e.target.value)}
                      style={{ fontSize: 15, padding: "11px 14px" }}
                    />
                    <div style={{ fontSize: 12, color: "#6b7280" }}>後から追加・変更できます。</div>
                  </div>
                </div>
              )}
              {wizardStep === 5 && (() => {
                const siteId = wizardCreatedSiteId;
                const pubKey = wizardCreatedPublicKey;
                const apiBase = "https://asia-northeast1-cx-platform-v1.cloudfunctions.net/api/v1/serve";
                const copyCode =
                  wizardTagMode === "gtm"
                    ? `(function() {\n  var s = document.createElement('script');\n  s.src = 'https://app.mokkeda.com/sdk.js';\n  s.setAttribute('data-site-id', '${siteId}');\n  s.setAttribute('data-site-key', '${pubKey}');\n  s.setAttribute('data-api-base', '${apiBase}');\n  document.head.appendChild(s);\n})();`
                    : wizardTagMode === "shopify"
                    ? `{% comment %}Mokkeda{% endcomment %}\n<script\n  src="https://app.mokkeda.com/sdk.js"\n  data-site-id="${siteId}"\n  data-site-key="${pubKey}"\n  data-api-base="${apiBase}"\n  defer\n></script>`
                    : `<script\n  src="https://app.mokkeda.com/sdk.js"\n  data-site-id="${siteId}"\n  data-site-key="${pubKey}"\n  data-api-base="${apiBase}"\n  defer\n></script>`;

                const TAB_STYLES = (active: boolean) => ({
                  flex: 1, padding: "7px 4px", fontSize: 12, fontWeight: active ? 700 : 400,
                  background: active ? "#2563eb" : "#f1f5f9",
                  color: active ? "#fff" : "#64748b",
                  border: "none", borderRadius: 6, cursor: "pointer", transition: "all .15s",
                });

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* タブ切り替え */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["direct", "gtm", "shopify"] as const).map((mode) => (
                        <button key={mode} style={TAB_STYLES(wizardTagMode === mode)} onClick={() => setWizardTagMode(mode)}>
                          {mode === "direct" ? "🌐 通常" : mode === "gtm" ? "📦 GTM" : "🛒 Shopify"}
                        </button>
                      ))}
                    </div>

                    {/* 説明文 */}
                    <div style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>
                      {wizardTagMode === "direct" && <>サイトの <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4 }}>&lt;head&gt;</code> タグ内にはりつけてください。</>}
                      {wizardTagMode === "gtm" && <>Google Tag Manager の <b>カスタムHTML タグ</b> に貼り付けてください。</>}
                      {wizardTagMode === "shopify" && <>Shopify管理画面 → <b>テーマ → テーマの編集 → theme.liquid</b> の <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4 }}>&lt;/head&gt;</code> の直前に貼り付けてください。</>}
                    </div>

                    {/* コードブロック */}
                    <div style={{ position: "relative" }}>
                      <pre style={{
                        margin: 0, padding: "16px",
                        background: "#1a2a3a", color: "#e2f0f5",
                        borderRadius: 10, fontSize: 12, lineHeight: 1.75,
                        overflowX: "auto", whiteSpace: "pre", userSelect: "all",
                        border: "1px solid rgba(255,255,255,.06)",
                      }}>
                        {wizardTagMode === "gtm" ? (
                          <>
                            <span style={{ color: "#94a3b8" }}>{"(function() {"}</span>{"\n"}
                            {"  "}<span style={{ color: "#94a3b8" }}>var s = </span><span style={{ color: "#a8d8a8" }}>document</span><span style={{ color: "#94a3b8" }}>.createElement(</span><span style={{ color: "#ffd580" }}>'script'</span><span style={{ color: "#94a3b8" }}>);</span>{"\n"}
                            {"  "}<span style={{ color: "#94a3b8" }}>s.src = </span><span style={{ color: "#ffd580" }}>'https://app.mokkeda.com/sdk.js'</span><span style={{ color: "#94a3b8" }}>;</span>{"\n"}
                            {"  "}<span style={{ color: "#94a3b8" }}>s.setAttribute(</span><span style={{ color: "#ffd580" }}>'data-site-id'</span><span style={{ color: "#94a3b8" }}>, </span><span style={{ color: "#ffd580" }}>'{siteId}'</span><span style={{ color: "#94a3b8" }}>);</span>{"\n"}
                            {"  "}<span style={{ color: "#94a3b8" }}>s.setAttribute(</span><span style={{ color: "#ffd580" }}>'data-site-key'</span><span style={{ color: "#94a3b8" }}>, </span><span style={{ color: "#ffd580" }}>'{pubKey}'</span><span style={{ color: "#94a3b8" }}>);</span>{"\n"}
                            {"  "}<span style={{ color: "#94a3b8" }}>s.setAttribute(</span><span style={{ color: "#ffd580" }}>'data-api-base'</span><span style={{ color: "#94a3b8" }}>, </span><span style={{ color: "#ffd580" }}>'{apiBase}'</span><span style={{ color: "#94a3b8" }}>);</span>{"\n"}
                            {"  "}<span style={{ color: "#a8d8a8" }}>document</span><span style={{ color: "#94a3b8" }}>.head.appendChild(s);</span>{"\n"}
                            <span style={{ color: "#94a3b8" }}>{"})();"}</span>
                          </>
                        ) : wizardTagMode === "shopify" ? (
                          <>
                            <span style={{ color: "#94a3b8" }}>{"{%"} comment {"%}"}</span><span style={{ color: "#a8d8a8" }}>Mokkeda</span><span style={{ color: "#94a3b8" }}>{"{%"} endcomment {"%}"}</span>{"\n"}
                            <span style={{ color: "#7ec8e3" }}>&lt;script</span>{"\n"}
                            {"  "}<span style={{ color: "#a8d8a8" }}>src</span><span style={{ color: "#e2f0f5" }}>="</span><span style={{ color: "#ffd580" }}>https://app.mokkeda.com/sdk.js</span><span style={{ color: "#e2f0f5" }}>"</span>{"\n"}
                            {"  "}<span style={{ color: "#a8d8a8" }}>data-site-id</span><span style={{ color: "#e2f0f5" }}>="</span><span style={{ color: "#ffd580" }}>{siteId}</span><span style={{ color: "#e2f0f5" }}>"</span>{"\n"}
                            {"  "}<span style={{ color: "#a8d8a8" }}>data-site-key</span><span style={{ color: "#e2f0f5" }}>="</span><span style={{ color: "#ffd580" }}>{pubKey}</span><span style={{ color: "#e2f0f5" }}>"</span>{"\n"}
                            {"  "}<span style={{ color: "#a8d8a8" }}>data-api-base</span><span style={{ color: "#e2f0f5" }}>="</span><span style={{ color: "#ffd580" }}>{apiBase}</span><span style={{ color: "#e2f0f5" }}>"</span>{"\n"}
                            {"  "}<span style={{ color: "#a8d8a8" }}>defer</span>{"\n"}
                            <span style={{ color: "#7ec8e3" }}>&gt;&lt;/script&gt;</span>
                          </>
                        ) : (
                          <>
                            <span style={{ color: "#7ec8e3" }}>&lt;script</span>{"\n"}
                            {"  "}<span style={{ color: "#a8d8a8" }}>src</span><span style={{ color: "#e2f0f5" }}>="</span><span style={{ color: "#ffd580" }}>https://app.mokkeda.com/sdk.js</span><span style={{ color: "#e2f0f5" }}>"</span>{"\n"}
                            {"  "}<span style={{ color: "#a8d8a8" }}>data-site-id</span><span style={{ color: "#e2f0f5" }}>="</span><span style={{ color: "#ffd580" }}>{siteId}</span><span style={{ color: "#e2f0f5" }}>"</span>{"\n"}
                            {"  "}<span style={{ color: "#a8d8a8" }}>data-site-key</span><span style={{ color: "#e2f0f5" }}>="</span><span style={{ color: "#ffd580" }}>{pubKey}</span><span style={{ color: "#e2f0f5" }}>"</span>{"\n"}
                            {"  "}<span style={{ color: "#a8d8a8" }}>data-api-base</span><span style={{ color: "#e2f0f5" }}>="</span><span style={{ color: "#ffd580" }}>{apiBase}</span><span style={{ color: "#e2f0f5" }}>"</span>{"\n"}
                            {"  "}<span style={{ color: "#a8d8a8" }}>defer</span>{"\n"}
                            <span style={{ color: "#7ec8e3" }}>&gt;&lt;/script&gt;</span>
                          </>
                        )}
                      </pre>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(copyCode).then(() => {
                            setWizardCopied(true);
                            setTimeout(() => setWizardCopied(false), 2000);
                          }).catch(() => {});
                        }}
                        style={{
                          position: "absolute", top: 10, right: 10,
                          background: wizardCopied ? "#22c55e" : "rgba(255,255,255,.12)",
                          color: "#fff", border: "none", borderRadius: 6,
                          padding: "5px 12px", fontSize: 12, cursor: "pointer",
                          transition: "background .2s",
                        }}
                      >
                        {wizardCopied ? "✓ コピー済み" : "📋 コピー"}
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                      このコードはサイト管理画面からいつでも確認できます。
                    </div>
                  </div>
                );
              })()}

              {error && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#dc2626" }}>
                  {error}
                </div>
              )}

              {/* ボタン */}
              <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
                {wizardStep > 1 && wizardStep < 5 && (
                  <button
                    className="btn"
                    onClick={() => setWizardStep((s) => s - 1)}
                    style={{ padding: "11px 20px", fontSize: 14 }}
                  >
                    ← 戻る
                  </button>
                )}
                <button
                  className="btn btn--primary"
                  disabled={!canNext}
                  onClick={() => {
                    if (wizardStep < 4) setWizardStep((s) => s + 1);
                    else if (wizardStep === 4) completeWizard(wizardName, wizardContact, wizardEmail, wizardSiteName, wizardSiteDomain);
                    else setShowWizard(false);
                  }}
                  style={{ minWidth: 160, marginLeft: "auto", padding: "11px 24px", fontSize: 15, fontWeight: 700, display: "inline-flex", justifyContent: "flex-end", alignItems: "center", textAlign: "right" }}
                >
                  {wizardStep < 4 ? "次へ →" : wizardStep === 4 ? (bootstrapping ? "作成中..." : "はじめる 🚀") : "完了 →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return <AuthContext.Provider value={ctxValue}>{children}</AuthContext.Provider>;
}

function AppRoutesGuarded() {
  const { user, workspaceId } = useAuth();
  const isPlatformAdmin = isPlatformAdminEmail(user?.email);
  const selectedSiteId = useSelectedSiteId();
  const pathname = window.location.pathname || "/";

  if (!isPlatformAdmin && isPlatformAdminOnlyPath(pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AppRoutes isPlatformAdmin={isPlatformAdmin} workspaceId={workspaceId || ""} siteId={selectedSiteId || ""} />;
}

export default function App() {
  return (
    <AuthGate>
      <AppShell>
        {/* platform-admin only: plans, 請求書関連, Stripe同期, 全workspace横断の請求管理, system settings */}
        <AppRoutesGuarded />
      </AppShell>
      <AnnouncementToast />
    </AuthGate>
  );
}
