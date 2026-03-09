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
import WorkspaceMembersPage from "./pages/WorkspaceMembersPage";
import WorkspaceBillingPage from "./pages/WorkspaceBillingPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";

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

type AppRoutesProps = {
  canAccess?: (key: AccessKey) => boolean;
  workspaceRole?: string | null;
};

function canShow(canAccess: AppRoutesProps["canAccess"], key: AccessKey) {
  return typeof canAccess === "function" ? !!canAccess(key) : true;
}

function Guard({
  allow,
  title,
  children,
}: {
  allow: boolean;
  title: string;
  children: React.ReactNode;
}) {
  if (allow) return <>{children}</>;

  return (
    <div className="card">
      <div className="h1">この画面は表示できません</div>
      <div className="small">{title} を表示する権限がありません。</div>
    </div>
  );
}

function TopNav({ canAccess, workspaceRole }: { canAccess?: (key: AccessKey) => boolean; workspaceRole?: string | null }) {
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.62,
    fontWeight: 700,
    letterSpacing: ".04em",
    textTransform: "uppercase",
    marginBottom: 8,
  };

  const linkStyle: React.CSSProperties = {
    display: "block",
    textDecoration: "none",
    opacity: 0.88,
    padding: "10px 12px",
    borderRadius: 10,
  };

  const activeStyle: React.CSSProperties = {
    display: "block",
    textDecoration: "none",
    fontWeight: 700,
    padding: "10px 12px",
    borderRadius: 10,
    background: "rgba(124,92,255,.14)",
  };

  return (
    <div
      className="card"
      style={{
        marginBottom: 14,
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        gap: 16,
        alignItems: "stretch",
      }}
    >
      <div
        style={{
          borderRight: "1px solid rgba(255,255,255,.08)",
          paddingRight: 16,
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              border: "1px dashed rgba(255,255,255,.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              opacity: 0.72,
              flexShrink: 0,
            }}
          >
            LOGO
          </div>
          <div style={{ minWidth: 0 }}>
            <Link to="/" className="h2" style={{ margin: 0, textDecoration: "none", display: "block" }}>
              MOKKEDA
            </Link>
            <div className="small" style={{ marginTop: 4 }}>
              AI接客・運用改善プラットフォーム
            </div>
          </div>
        </div>

        <div className="small" style={{ lineHeight: 1.6, opacity: 0.76 }}>
          ロゴは後から正式な画像 / SVG に差し替え予定です。今はブランド枠として配置しています。
        </div>
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
            gap: 18,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={sectionTitleStyle}>メインメニュー</div>
            <div style={{ display: "grid", gap: 6 }}>
              {canShow(canAccess, "dashboard") && (
                <NavLink to="/dashboard" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
                  ダッシュボード
                </NavLink>
              )}

              {canShow(canAccess, "sites") && (
                <NavLink to="/sites" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
                  サイト
                </NavLink>
              )}

              {canShow(canAccess, "scenarios") && (
                <NavLink to="/scenarios" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
                  シナリオ
                </NavLink>
              )}

              {canShow(canAccess, "actions") && (
                <NavLink to="/actions" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
                  アクション
                </NavLink>
              )}

              {canShow(canAccess, "templates") && (
                <NavLink to="/templates" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
                  テンプレート
                </NavLink>
              )}

              {canShow(canAccess, "media") && (
                <NavLink to="/media" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
                  メディア
                </NavLink>
              )}

              {canShow(canAccess, "ai") && (
                <NavLink to="/ai" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
                  AIインサイト
                </NavLink>
              )}
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={sectionTitleStyle}>設定</div>
            <div style={{ display: "grid", gap: 6 }}>
              {canShow(canAccess, "workspaces") && (
                <NavLink to="/workspaces" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
                  ワークスペース
                </NavLink>
              )}

              {canShow(canAccess, "members") && (
                <NavLink to="/workspace/members" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
                  メンバー
                </NavLink>
              )}

              {canShow(canAccess, "billing") && (
                <NavLink to="/workspace/billing" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
                  契約 / Billing
                </NavLink>
              )}
            </div>

            <div className="small" style={{ marginTop: 14, lineHeight: 1.6, opacity: 0.74 }}>
              現在のロール: <b>{workspaceRole || "none"}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppRoutes({ canAccess, workspaceRole }: AppRoutesProps) {
  return (
    <div className="container">
      <TopNav canAccess={canAccess} workspaceRole={workspaceRole} />

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/invite" element={<AcceptInvitePage />} />

        <Route path="/dashboard" element={<Guard allow={canShow(canAccess, "dashboard")} title="ダッシュボード"><DashboardPage /></Guard>} />
        <Route path="/workspaces" element={<Guard allow={canShow(canAccess, "workspaces")} title="ワークスペース"><WorkspacesPage /></Guard>} />
        <Route path="/sites" element={<Guard allow={canShow(canAccess, "sites")} title="サイト"><SitesPage /></Guard>} />
        <Route path="/scenarios" element={<Guard allow={canShow(canAccess, "scenarios")} title="シナリオ"><ScenariosPage /></Guard>} />
        <Route path="/actions" element={<Guard allow={canShow(canAccess, "actions")} title="アクション"><ActionsPage /></Guard>} />
        <Route path="/templates" element={<Guard allow={canShow(canAccess, "templates")} title="テンプレート"><TemplatesPage /></Guard>} />
        <Route path="/media" element={<Guard allow={canShow(canAccess, "media")} title="メディア"><MediaLibraryPage /></Guard>} />
        {/* シナリオ関連 */}
        <Route path="/scenarios/:scenarioId/review" element={<Guard allow={canShow(canAccess, "ai")} title="AIレビュー"><ScenarioReviewPage /></Guard>} />
        <Route path="/scenarios/:scenarioId/ai" element={<Guard allow={canShow(canAccess, "ai")} title="AIインサイト"><ScenarioAiPage /></Guard>} />
        <Route path="/ai" element={<Guard allow={canShow(canAccess, "ai")} title="AIインサイト"><ScenarioAiPage /></Guard>} />

        {/* ワークスペース関連 */}
        <Route path="/workspace/members" element={<Guard allow={canShow(canAccess, "members")} title="メンバー"><WorkspaceMembersPage /></Guard>} />
        <Route path="/workspace/billing" element={<Guard allow={canShow(canAccess, "billing")} title="契約 / Billing"><WorkspaceBillingPage /></Guard>} />

        {/* 旧URL互換 */}
        <Route path="/admin/workspace/members" element={<Guard allow={canShow(canAccess, "members")} title="メンバー"><WorkspaceMembersPage /></Guard>} />
        <Route path="/admin/workspace/billing" element={<Guard allow={canShow(canAccess, "billing")} title="契約 / Billing"><WorkspaceBillingPage /></Guard>} />

        <Route
          path="*"
          element={
            <div className="card">
              <div className="h1">ページが見つかりません</div>
              <div className="small">URLが違う可能性があります。メニューから移動してください。</div>
            </div>
          }
        />
      </Routes>
    </div>
  );
}