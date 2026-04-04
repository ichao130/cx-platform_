import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,

  // ★これも入れておくのが安全（storage/no-default-bucket 回避）
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

export const app = initializeApp(firebaseConfig);

// =============================
// Firebase App Check
// =============================
if (import.meta.env.DEV) {
  (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider("6LfUAKYsAAAAAG7UJQE__VpjBLhCRArdiwClGkTu"),
  isTokenAutoRefreshEnabled: true,
});

export const auth = getAuth(app);
export const db = getFirestore(app);

// =============================
// Auth persistence + debug helpers
// =============================
// Ensure auth state persists across reloads (so currentUser/getIdToken works reliably)
setPersistence(auth, browserLocalPersistence).catch((e) => {
  // non-fatal (e.g., in some privacy modes)
  console.warn("[firebase] setPersistence failed", e);
});

// Devtools helpers: `await window.cxGetIdToken()` / `await window.cxApiPost('/v1/...', {...})`
// (Returns null if not logged in yet)
declare global {
  interface Window {
    cxGetIdToken?: () => Promise<string | null>;
    cxAuthUid?: () => string | null;
    cxAuthEmail?: () => string | null;
    cxApiPost?: (path: string, body: any, opts?: ApiPostOptions) => Promise<any>;
  }
}

if (typeof window !== "undefined") {
  window.cxGetIdToken = async () => {
    return await getIdTokenSafe(false);
  };
  window.cxAuthUid = () => auth.currentUser?.uid ?? null;
  window.cxAuthEmail = () => auth.currentUser?.email ?? null;
}

// Optional: log auth transitions in dev
if (import.meta.env.DEV) {
  onAuthStateChanged(auth, (u) => {
    console.log("[firebase] auth state", u ? { uid: u.uid, email: u.email } : null);
  });
}

// ★これが無いと今のエラーになる
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();

// =============================
// API helpers (Cloud Functions v1)
// =============================
const API_BASE = (import.meta.env.VITE_API_BASE || "https://asia-northeast1-cx-platform-v1.cloudfunctions.net/api").replace(/\/$/, "");

type ApiPostOptions = {
  /** Optional site header used by some endpoints */
  siteId?: string;
  /** Force refresh Firebase ID token */
  forceRefreshToken?: boolean;
  /** Extra headers */
  headers?: Record<string, string>;
};

/**
 * Authenticated JSON POST to backend.
 * - Adds `Authorization: Bearer <ID_TOKEN>`
 * - Adds `Content-Type: application/json`
 * - Adds optional `x-site-id`
 */
export async function apiPostJson<T = any>(
  path: string,
  body: any,
  opts: ApiPostOptions = {}
): Promise<T> {
  const token = await getIdTokenOrThrow(!!opts.forceRefreshToken);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...(opts.siteId ? { "x-site-id": opts.siteId } : {}),
    ...(opts.headers || {}),
  };

  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // non-json response
  }

  if (!res.ok) {
    const errMsg = (json && (json.message || json.error)) || text || `HTTP_${res.status}`;
    throw new Error(errMsg);
  }

  return (json ?? ({} as any)) as T;
}

// =============================
// Plan limit check helper
// =============================
import type { LimitResource } from "./hooks/usePlanLimit";

const LIMIT_RESOURCE_LABEL: Record<LimitResource, string> = {
  workspaces: "ワークスペース",
  sites: "サイト",
  scenarios: "シナリオ",
  actions: "アクション",
  templates: "テンプレート",
  media: "メディア",
  members: "メンバー",
  aiInsights: "AIインサイト",
};

/**
 * リソース作成前のプラン上限チェック。
 * 超えていたら Error を throw する。
 */
export async function assertPlanLimit(workspaceId: string, resource: LimitResource): Promise<void> {
  try {
    const res = await apiPostJson<{ ok: boolean; allowed: boolean; current: number; limit: number | null }>(
      "/v1/check-can-create",
      { workspace_id: workspaceId, resource }
    );
    if (!res.allowed) {
      throw new Error(`プランの上限に達しました（${LIMIT_RESOURCE_LABEL[resource]}: ${res.current}/${res.limit}）`);
    }
  } catch (e: any) {
    // check-can-create 自体が失敗した場合は通す（フォールスルー）
    if (String(e?.message || "").includes("プランの上限")) throw e;
    console.warn("[assertPlanLimit] check failed, allowing:", e?.message);
  }
}

// Devtools helpers:
//   await window.cxApiPost('/v1/workspaces/billing/get', { workspace_id: 'ws_xxx' })
//   await window.cxGetIdToken()

if (typeof window !== "undefined") {
  window.cxApiPost = async (path: string, body: any, opts?: ApiPostOptions) => {
    return await apiPostJson(path, body, opts || {});
  };
}

// =============================
// Auth helpers for app code
// =============================

/** Wait until Firebase Auth has resolved the initial user (logged-in or null). */
export const authReady: Promise<void> = new Promise((resolve) => {
  const unsub = onAuthStateChanged(auth, () => {
    unsub();
    resolve();
  });
});

/** Wait for a logged-in user to appear (or time out). */
export async function waitForUser(timeoutMs = 8000): Promise<import("firebase/auth").User> {
  await authReady;
  const existing = auth.currentUser;
  if (existing) return existing;

  return await new Promise<import("firebase/auth").User>((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        clearTimeout(timer);
        unsub();
        resolve(u);
      }
    });

    const timer = setTimeout(() => {
      unsub();
      reject(new Error(`auth_user_timeout:${timeoutMs}`));
    }, timeoutMs);
  });
}

/** Get ID token or throw (helps API calls avoid silent undefined). */
export async function getIdTokenOrThrow(forceRefresh = false, timeoutMs = 8000): Promise<string> {
  const u = await waitForUser(timeoutMs);
  const token = await u.getIdToken(forceRefresh);
  if (!token) throw new Error("id_token_missing");
  return token;
}

/** Get ID token (force refresh optionally). Returns null if not logged in. */
export async function getIdTokenSafe(forceRefresh = false): Promise<string | null> {
  await authReady;
  const u = auth.currentUser;
  if (!u) return null;
  try {
    return await u.getIdToken(forceRefresh);
  } catch (e) {
    console.warn("[firebase] getIdToken failed", e);
    return null;
  }
}

/** Google sign-in (popup). */
export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, googleProvider);
}

/** Sign out. */
export async function signOutNow(): Promise<void> {
  await signOut(auth);
}