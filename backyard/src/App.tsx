import React, { useEffect, useState } from "react";
import { auth, db, signInWithGoogle, signOutNow, OPS_EMAIL, authReady } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import WorkspacesPage from "./pages/WorkspacesPage";
import TrialsPage from "./pages/TrialsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import PlansPage from "./pages/PlansPage";
import AdminsPage from "./pages/AdminsPage";
import UsersPage from "./pages/UsersPage";
import MisocaPage from "./pages/MisocaPage";
import BackupsPage from "./pages/BackupsPage";

const s: Record<string, React.CSSProperties> = {
  layout: { minHeight: "100vh", display: "flex", flexDirection: "column" },
  nav: { background: "#1e293b", borderBottom: "1px solid rgba(255,255,255,.08)", padding: "0 24px", display: "flex", alignItems: "center", gap: 0, height: 52 },
  logo: { fontWeight: 800, fontSize: 15, letterSpacing: "-.02em", color: "#fff", marginRight: 32, display: "flex", alignItems: "center", gap: 8 },
  main: { flex: 1, padding: "32px 28px", maxWidth: 1200, margin: "0 auto", width: "100%" },
  loginBox: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  card: { background: "#1e293b", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: 40, textAlign: "center", maxWidth: 380, width: "90vw" },
};

type Page = "workspaces" | "trials" | "announcements" | "plans" | "admins" | "users" | "misoca" | "backups";

async function loadOpsAdmins(): Promise<string[]> {
  try {
    const snap = await getDocs(collection(db, "ops_admins"));
    return snap.docs.map((d) => d.data().email as string).filter(Boolean);
  } catch {
    return [];
  }
}

export default function App() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page>("workspaces");
  const [opsAdmins, setOpsAdmins] = useState<string[]>([]);

  useEffect(() => {
    authReady.then(async () => {
      const u = auth.currentUser;
      setEmail(u?.email ?? null);
      if (u?.email) {
        const admins = await loadOpsAdmins();
        setOpsAdmins(admins);
      }
      setLoading(false);
    });

    return onAuthStateChanged(auth, async (u) => {
      setEmail(u?.email ?? null);
      if (u?.email) {
        const admins = await loadOpsAdmins();
        setOpsAdmins(admins);
      } else {
        setOpsAdmins([]);
      }
    });
  }, []);

  const isSuperAdmin = email === OPS_EMAIL;
  const isAllowed = isSuperAdmin || opsAdmins.includes(email ?? "");

  if (loading) return (
    <div style={s.loginBox}>
      <div style={{ opacity: 0.5 }}>読み込み中...</div>
    </div>
  );

  if (!email) return (
    <div style={s.loginBox}>
      <div style={s.card}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Backyard Ops</div>
        <div style={{ opacity: 0.55, fontSize: 13, marginBottom: 28 }}>社内管理ツール</div>
        <button onClick={signInWithGoogle} style={{ width: "100%", padding: "12px 0", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Googleでログイン
        </button>
      </div>
    </div>
  );

  if (!isAllowed) return (
    <div style={s.loginBox}>
      <div style={s.card}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚫</div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>アクセス権限がありません</div>
        <div style={{ opacity: 0.55, fontSize: 13, marginBottom: 24 }}>{email}</div>
        <button onClick={signOutNow} style={{ padding: "8px 20px", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, color: "#fff", cursor: "pointer" }}>
          ログアウト
        </button>
      </div>
    </div>
  );

  const NavBtn = ({ id, label }: { id: Page; label: string }) => (
    <button
      onClick={() => setPage(id)}
      style={{ padding: "0 16px", height: 52, border: "none", borderBottom: page === id ? "2px solid #3b82f6" : "2px solid transparent", background: "transparent", color: page === id ? "#fff" : "rgba(255,255,255,.5)", fontWeight: page === id ? 700 : 500, fontSize: 13, cursor: "pointer", transition: "all .15s" }}
    >
      {label}
    </button>
  );

  return (
    <div style={s.layout}>
      <nav style={s.nav}>
        <div style={s.logo}>⚙️ Backyard</div>
        <NavBtn id="workspaces" label="ワークスペース管理" />
        <NavBtn id="trials" label="特別トライアル" />
        <NavBtn id="plans" label="プラン管理" />
        {isSuperAdmin && <NavBtn id="backups" label="バックアップ" />}
        {isSuperAdmin && <NavBtn id="misoca" label="MISOCA請求書" />}
        <NavBtn id="announcements" label="お知らせ管理" />
        <NavBtn id="users" label="ユーザー管理" />
        {isSuperAdmin && <NavBtn id="admins" label="管理者" />}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, opacity: 0.45, marginRight: 12 }}>{email}</span>
        <button onClick={signOutNow} style={{ fontSize: 12, padding: "5px 12px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 6, color: "rgba(255,255,255,.6)", cursor: "pointer" }}>
          ログアウト
        </button>
      </nav>
      <main style={s.main}>
        {page === "workspaces" && <WorkspacesPage />}
        {page === "trials" && <TrialsPage />}
        {page === "plans" && <PlansPage />}
        {page === "backups" && isSuperAdmin && <BackupsPage />}
        {page === "announcements" && <AnnouncementsPage />}
        {page === "users" && <UsersPage />}
        {page === "misoca" && isSuperAdmin && <MisocaPage />}
        {page === "admins" && isSuperAdmin && <AdminsPage />}
      </main>
    </div>
  );
}
