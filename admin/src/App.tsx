import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Navigate } from "react-router-dom";
import AppRoutes from "./routes";

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
  | "billing";

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

function readSelectedWorkspaceIdForUid(uid: string): string | null {
  try {
    return window.localStorage.getItem(workspaceKeyForUid(uid));
  } catch {
    return null;
  }
}

function readEffectiveWorkspaceId(uid?: string | null): string | null {
  if (uid) {
    return readSelectedWorkspaceIdForUid(uid);
  }
  return readSelectedWorkspaceId();
}

function writeSelectedWorkspaceId(workspaceId: string, uid?: string) {
  try {
    window.localStorage.setItem("cx_admin_workspace_id", workspaceId);
    window.localStorage.setItem("cx_admin_selected_workspace", workspaceId);
    window.localStorage.setItem("selectedWorkspaceId", workspaceId);
    window.localStorage.setItem("cx_workspace_id", workspaceId);
    if (uid) {
      window.localStorage.setItem(workspaceKeyForUid(uid), workspaceId);
    }
    window.dispatchEvent(new CustomEvent("cx_admin_workspace_changed", { detail: { workspaceId } }));
  } catch {
    // ignore
  }
}

function genWorkspaceId() {
  return `ws_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
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

const PLATFORM_ADMIN_EMAIL = "iwatanabe@branberyheag.com";
const PLATFORM_ADMIN_ONLY_PATH_PREFIXES = [
  "/plans",
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

function AppShell({ children }: { children: React.ReactNode }) {

  const { user, workspaceId, workspaceRole, canAccess, currentUid, logout } = useAuth();
  const isPlatformAdmin = isPlatformAdminEmail(user?.email);
  const [workspaceRows, setWorkspaceRows] = useState<Array<{ id: string; data: any }>>([]);

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

  const selectedWorkspaceRow = useMemo(() => {
    return workspaceRows.find((r) => r.id === workspaceId) || null;
  }, [workspaceRows, workspaceId]);

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

  function changeWorkspace(nextWorkspaceId: string) {
    if (!nextWorkspaceId) return;
    writeSelectedWorkspaceId(nextWorkspaceId, currentUid);
  }


  const showRail = workspaceRows.length > 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: showRail ? "76px 280px minmax(0, 1fr)" : "280px minmax(0, 1fr)",
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
          {workspaceRows.map((w) => {
            const active = w.id === workspaceId;
            const icon = getWorkspaceRailIcon(w);
            const accent = getWorkspaceAccentColor(w.data);
            return (
              <button
                key={w.id}
                type="button"
                title={getWorkspaceRailLabel(w)}
                onClick={() => changeWorkspace(w.id)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: active ? 18 : 16,
                  border: active ? `2px solid ${accent}` : "1px solid rgba(255,255,255,.08)",
                  background: icon.logoUrl ? "#fff" : active ? hexToRgba(accent, 0.22) : "rgba(255,255,255,.06)",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: active ? `0 10px 24px ${hexToRgba(accent, 0.28)}` : "none",
                  overflow: "hidden",
                  padding: 0,
                  transition: "transform .16s ease, border-radius .16s ease, background .16s ease, box-shadow .16s ease",
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
          padding: 18,
          position: "sticky",
          top: 0,
          alignSelf: "start",
          height: "100vh",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div
            className="mokkeda-brand-slot"
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              opacity: selectedWorkspaceLogoUrl ? 1 : 0.75,
              overflow: "hidden",
              background: selectedWorkspaceLogoUrl ? "#fff" : "rgba(255,255,255,.1)",
            }}
          >
            {selectedWorkspaceLogoUrl ? (
              <img
                src={selectedWorkspaceLogoUrl}
                alt={selectedWorkspaceName}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              "LOGO"
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <Link to="/dashboard" style={{ margin: 0, textDecoration: "none", display: "block", color: "rgba(255,255,255,.95)", fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>
              {selectedWorkspaceName}
            </Link>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.38)", marginBottom: 8, paddingLeft: 12 }}>
            メインメニュー
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {canShow(canAccess, "dashboard") && <SidebarLink to="/dashboard">ダッシュボード</SidebarLink>}
            {canShow(canAccess, "analytics") && <SidebarLink to="/analytics">流入計測</SidebarLink>}
            {canShow(canAccess, "sites") && <SidebarLink to="/sites">サイト</SidebarLink>}
            {canShow(canAccess, "scenarios") && <SidebarLink to="/scenarios">シナリオ</SidebarLink>}
            {canShow(canAccess, "actions") && <SidebarLink to="/actions">アクション</SidebarLink>}
            {canShow(canAccess, "templates") && <SidebarLink to="/templates">テンプレート</SidebarLink>}
            {canShow(canAccess, "media") && <SidebarLink to="/media">メディア</SidebarLink>}
            {canShow(canAccess, "ai") && <SidebarLink to="/ai">AIインサイト</SidebarLink>}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.38)", marginBottom: 8, paddingLeft: 12 }}>
            設定
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {(isPlatformAdmin || canShow(canAccess, "workspaces")) && <SidebarLink to="/workspaces">ワークスペース</SidebarLink>}
            {canShow(canAccess, "members") && <SidebarLink to="/workspace/members">メンバー</SidebarLink>}
            {canShow(canAccess, "billing") && <SidebarLink to="/workspace/billing">契約 / Billing</SidebarLink>}
            {isPlatformAdmin ? <SidebarLink to="/plans">Plans / マスタ管理</SidebarLink> : null}
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
        </div>
      </aside>

      <main style={{ minWidth: 0, width: "100%", overflowX: "hidden" }}>
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
      if (
        !e.key ||
        [
          "cx_admin_workspace_id",
          "cx_admin_selected_workspace",
          "selectedWorkspaceId",
          workspaceKeyForUid(user.uid),
        ].includes(e.key)
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
    if (!user) return;

    let cancelled = false;

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
                writeSelectedWorkspaceId(primaryWorkspaceId, user.uid);
                return;
              }
            }
          }
        }

        const workspaceId = genWorkspaceId();
        const workspaceRef = doc(db, "workspaces", workspaceId);

        await setDoc(
          workspaceRef,
          {
            name: user.displayName ? `${user.displayName} Workspace` : "My Workspace",
            domains: [],
            defaults: {
              ai: { decision: false, discovery: "suggest", copy: "approve" },
              log_sample_rate: 1,
              access: defaultAccessMatrix(),
            },
            members: {
              [user.uid]: "owner",
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: user.uid,
          },
          { merge: true }
        );

        await setDoc(
          userRef,
          {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            primaryWorkspaceId: workspaceId,
            updatedAt: serverTimestamp(),
            createdAt: userSnap.exists() ? (userSnap.data() as any)?.createdAt || serverTimestamp() : serverTimestamp(),
          },
          { merge: true }
        );

        if (!cancelled) {
          writeSelectedWorkspaceId(workspaceId, user.uid);
        }
      } catch (e: any) {
        console.error("[AuthGate] bootstrap failed", e);
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setBootstrapping(false);
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

  if (checking) {
    return (
      <AuthScreen
        title="読み込み中..."
        description="ログイン状態とワークスペース設定を確認しています。MOKKEDA の管理画面を起動する準備をしています。"
      >
        <div className="small" style={{ opacity: 0.72 }}>認証状態 / ワークスペース / 権限を順番に初期化しています。</div>
      </AuthScreen>
    );
  }

  if (user && bootstrapping) {
    return (
      <AuthScreen
        title="初期設定を準備しています..."
        description="初回ログイン時は、ユーザー情報・ワークスペース・オーナー権限を自動で作成しています。ログイン中のアカウントごとにワークスペース選択状態も分けて管理されます。"
      >
        <div className="small" style={{ opacity: 0.72 }}>
          あと少しで管理画面が利用できます。ワークスペースの土台を自動で整えています。
        </div>
      </AuthScreen>
    );
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



  return <AuthContext.Provider value={ctxValue}>{children}</AuthContext.Provider>;
}

function AppRoutesGuarded() {
  const { user } = useAuth();
  const isPlatformAdmin = isPlatformAdminEmail(user?.email);
  const pathname = window.location.pathname || "/";

  if (!isPlatformAdmin && isPlatformAdminOnlyPath(pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AppRoutes isPlatformAdmin={isPlatformAdmin} />;
}

export default function App() {
  return (
    <AuthGate>
      <AppShell>
        {/* platform-admin only: plans, 請求書関連, Stripe同期, 全workspace横断の請求管理, system settings */}
        <AppRoutesGuarded />
      </AppShell>
    </AuthGate>
  );
}