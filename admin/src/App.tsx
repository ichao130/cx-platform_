import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import AppRoutes from "./routes";

import { auth, googleProvider, db } from "./firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
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

type AuthContextValue = {
  user: User;
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
      <div className="container">
        <div className="card">
          <div className="h1">読み込み中...</div>
          <div className="small">ログイン状態とワークスペース設定を確認しています。</div>
        </div>
      </div>
    );
  }

  if (user && bootstrapping) {
    return (
      <div className="container">
        <div className="card">
          <div className="h1">初期設定を準備しています...</div>
          <div className="small">初回ログイン時は、ユーザー情報・ワークスペース・オーナー権限を自動で作成しています。</div>
          <div className="small" style={{ marginTop: 8, opacity: 0.72 }}>
            ワークスペースの選択状態は、ログイン中のアカウントごとに分かれて管理されます。
          </div>
        </div>
      </div>
    );
  }

  if (!user || !ctxValue) {
    return (
      <div className="container">
        <div className="card">
          <div className="h1">CX Platform 管理画面</div>
          <div className="small">管理画面を利用するにはログインが必要です。</div>
          <div className="small" style={{ marginTop: 8, opacity: 0.72 }}>
            初回ログイン時は、そのアカウント用のワークスペースが自動作成され、作成者はオーナーとして登録されます。
          </div>
          <div style={{ height: 12 }} />
          <button className="btn btn--primary" onClick={login}>
            Googleでログイン
          </button>
          {error ? (
            <>
              <div style={{ height: 10 }} />
              <div className="small" style={{ color: "salmon" }}>
                {error}
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }



  return <AuthContext.Provider value={ctxValue}>{children}</AuthContext.Provider>;
}

export default function App() {
  return (
    <AuthGate>
      <AppRoutes />
    </AuthGate>
  );
}