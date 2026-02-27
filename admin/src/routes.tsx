// admin/src/routes.tsx
import React from "react";
import { Link, NavLink, Route, Routes, Navigate } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage";
import ScenariosPage from "./pages/ScenariosPage";
import ActionsPage from "./pages/ActionsPage";
import SitesPage from "./pages/SitesPage";
import TemplatesPage from "./pages/TemplatesPage";
import WorkspacesPage from "./pages/WorkspacesPage";
import MediaLibraryPage from "./pages/MediaLibraryPage";
import ScenarioReviewPage from "./pages/ScenarioReviewPage";
import ScenarioAiPage from "./pages/ScenarioAiPage";

function TopNav() {
  const linkStyle: React.CSSProperties = { marginRight: 12 };
  const activeStyle: React.CSSProperties = { textDecoration: "underline", fontWeight: 700 };

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="row" style={{ alignItems: "center", gap: 10 }}>
        <Link to="/" className="h2" style={{ margin: 0 }}>
          cx-admin
        </Link>

        <div style={{ flex: 1 }} />

        <NavLink to="/dashboard" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          Dashboard
        </NavLink>
        <NavLink to="/workspaces" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          Workspaces
        </NavLink>
        <NavLink to="/sites" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          Sites
        </NavLink>
        <NavLink to="/scenarios" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          Scenarios
        </NavLink>
        <NavLink to="/actions" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          Actions
        </NavLink>
        <NavLink to="/templates" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          Templates
        </NavLink>
        <NavLink to="/media" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          Media
        </NavLink>
      </div>

      <div className="small" style={{ marginTop: 6 }}>
        フェーズ1：A/B・効果測定・見える化（30日）を最短で回す（検証優先）
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <div className="container">
      <TopNav />

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/workspaces" element={<WorkspacesPage />} />
        <Route path="/sites" element={<SitesPage />} />
        <Route path="/scenarios" element={<ScenariosPage />} />
        <Route path="/actions" element={<ActionsPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/media" element={<MediaLibraryPage />} />
        <Route path="/scenarios/:scenarioId/review" element={<ScenarioReviewPage />} />
        <Route path="/ai" element={<ScenarioAiPage />} />
        <Route
          path="*"
          element={
            <div className="card">
              <div className="h1">Not Found</div>
              <div className="small">URLが違うっぽい。メニューから移動してね。</div>
            </div>
          }
        />
      </Routes>
    </div>
  );
}