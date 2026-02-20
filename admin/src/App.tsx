import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import WorkspacesPage from './pages/WorkspacesPage';
import SitesPage from './pages/SitesPage';
import ActionsPage from './pages/ActionsPage';
import ScenariosPage from './pages/ScenariosPage';
import TemplatesPage from './pages/TemplatesPage';
import DashboardPage from './pages/DashboardPage';

function Login() {
  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: '60px auto' }}>
        <h1 className="h1">cx-platform admin</h1>
        <p className="small">Google アカウントでログイン（Firestore rules はログイン必須になっています）</p>
        <div style={{ height: 12 }} />
        <button
          className="btn btn--primary"
          onClick={() => signInWithPopup(auth, googleProvider)}
        >
          Googleでログイン
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<null | { email?: string | null }>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u ? { email: u.email } : null);
      setReady(true);
    });
  }, []);

  const isAuthed = useMemo(() => !!user, [user]);

  if (!ready) return null;
  if (!isAuthed) return <Login />;

  return (
    <>
      <div className="nav">
        <div className="row">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/workspaces">Workspaces</NavLink>
          <NavLink to="/sites">Sites</NavLink>
          <NavLink to="/actions">Actions</NavLink>
          <NavLink to="/templates">Templates</NavLink>
          <NavLink to="/scenarios">Scenarios</NavLink>
        </div>
        <div className="row">
          <span className="badge">{user?.email}</span>
          <button className="btn" onClick={() => signOut(auth)}>Logout</button>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/workspaces" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/workspaces" element={<WorkspacesPage />} />
        <Route path="/sites" element={<SitesPage />} />
        <Route path="/actions" element={<ActionsPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/scenarios" element={<ScenariosPage />} />
        <Route path="*" element={<Navigate to="/workspaces" replace />} />
      </Routes>
    </>
  );
}
