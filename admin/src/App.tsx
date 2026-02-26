import React, { useEffect, useMemo, useState } from "react";
import AppRoutes from "./routes";

import { auth, googleProvider } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";

function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      (u) => {
        setUser(u);
        setChecking(false);
      },
      (e) => {
        console.error(e);
        setError(e?.message || String(e));
        setChecking(false);
      }
    );
    return () => unsub();
  }, []);

  const email = user?.email || "";

  async function login() {
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || String(e));
    }
  }

  async function logout() {
    setError("");
    try {
      await signOut(auth);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || String(e));
    }
  }

  if (checking) {
    return (
      <div className="container">
        <div className="card">
          <div className="h1">Loading...</div>
          <div className="small">Auth checking...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <div className="card">
          <div className="h1">cx-admin</div>
          <div className="small">管理画面に入るにはログインが必要です。</div>
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

  return (
    <>
      <div className="container" style={{ marginBottom: 10 }}>
        <div className="card">
          <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
            <div className="small">
              Logged in as <b>{email || user.uid}</b>
            </div>
            <button className="btn" onClick={logout}>
              ログアウト
            </button>
          </div>
        </div>
      </div>

      {children}
    </>
  );
}

export default function App() {
  return (
    <AuthGate>
      <AppRoutes />
    </AuthGate>
  );
}