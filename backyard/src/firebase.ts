import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

setPersistence(auth, browserLocalPersistence).catch(() => {});

export const authReady: Promise<void> = new Promise((resolve) => {
  const unsub = onAuthStateChanged(auth, () => { unsub(); resolve(); });
});

export async function getIdTokenOrThrow(): Promise<string> {
  await authReady;
  const u = auth.currentUser;
  if (!u) throw new Error("not_logged_in");
  return await u.getIdToken();
}

const API_BASE = (import.meta.env.VITE_API_BASE || "https://asia-northeast1-cx-platform-v1.cloudfunctions.net/api").replace(/\/$/, "");

export async function opsPost<T = any>(path: string, body?: any): Promise<T> {
  const token = await getIdTokenOrThrow();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP_${res.status}`);
  return json as T;
}

export async function signInWithGoogle() { await signInWithPopup(auth, googleProvider); }
export async function signOutNow() { await signOut(auth); }

export const OPS_EMAIL = "iwatanabe@branberyheag.com";
