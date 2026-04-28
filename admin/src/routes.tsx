// admin/src/routes.tsx
import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";

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
import AnalyticsPage from "./pages/AnalyticsPage";
import OptimizePage from "./pages/OptimizePage";
import RmsPage from "./pages/RmsPage";

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

type AppRoutesProps = {
  canAccess?: (key: AccessKey) => boolean;
  workspaceRole?: string | null;
  isPlatformAdmin?: boolean;
  workspaceId?: string;
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

export default function AppRoutes({ canAccess, workspaceRole, isPlatformAdmin, workspaceId }: AppRoutesProps) {
  return (
    <div className="container">
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/invite" element={<AcceptInvitePage />} />

        <Route path="/dashboard" element={<Guard allow={canShow(canAccess, "dashboard")} title="ダッシュボード"><DashboardPage /></Guard>} />
        <Route path="/analytics" element={<Guard allow={canShow(canAccess, "analytics")} title="流入計測"><AnalyticsPage /></Guard>} />
        <Route path="/workspaces" element={<Guard allow={isPlatformAdmin || canShow(canAccess, "workspaces")} title="ワークスペース"><WorkspacesPage /></Guard>} />
        <Route path="/sites" element={<Guard allow={canShow(canAccess, "sites")} title="サイト"><SitesPage /></Guard>} />
        <Route path="/scenarios" element={<Guard allow={canShow(canAccess, "scenarios")} title="シナリオ"><ScenariosPage /></Guard>} />
        <Route path="/actions" element={<Guard allow={canShow(canAccess, "actions")} title="アクション"><ActionsPage /></Guard>} />
        <Route path="/templates" element={<Guard allow={canShow(canAccess, "templates")} title="テンプレート"><TemplatesPage /></Guard>} />
        <Route path="/media" element={<Guard allow={canShow(canAccess, "media")} title="メディア"><MediaLibraryPage /></Guard>} />
        {/* シナリオ関連 */}
        <Route path="/scenarios/:scenarioId/review" element={<Guard allow={canShow(canAccess, "ai")} title="AIレビュー"><ScenarioReviewPage /></Guard>} />
        <Route path="/scenarios/:scenarioId/ai" element={<Guard allow={canShow(canAccess, "ai")} title="AIインサイト"><ScenarioAiPage /></Guard>} />
        <Route path="/ai" element={<Guard allow={canShow(canAccess, "ai")} title="AIインサイト"><ScenarioAiPage /></Guard>} />
        <Route path="/ai/optimize" element={<Guard allow={canShow(canAccess, "ai")} title="配信最適化"><OptimizePage /></Guard>} />
        <Route path="/rms" element={<Guard allow={canShow(canAccess, "rms")} title="楽天RMS"><RmsPage workspaceId={workspaceId || ""} /></Guard>} />

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