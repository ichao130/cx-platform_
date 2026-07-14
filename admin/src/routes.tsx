// admin/src/routes.tsx
import React, { Suspense, lazy } from "react";
import { Route, Routes, Navigate } from "react-router-dom";

// ページ単位の code-split（初期バンドルを軽量化。各ページは遷移時に読み込む）
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ScenariosPage = lazy(() => import("./pages/ScenariosPage"));
const ActionsPage = lazy(() => import("./pages/ActionsPage"));
const QuestionsPage = lazy(() => import("./pages/QuestionsPage"));
const SitesPage = lazy(() => import("./pages/SitesPage"));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage"));
const WorkspacesPage = lazy(() => import("./pages/WorkspacesPage"));
const MediaLibraryPage = lazy(() => import("./pages/MediaLibraryPage"));
const ScenarioReviewPage = lazy(() => import("./pages/ScenarioReviewPage"));
const ScenarioAiPage = lazy(() => import("./pages/ScenarioAiPage"));
const WorkspaceMembersPage = lazy(() => import("./pages/WorkspaceMembersPage"));
const WorkspaceBillingPage = lazy(() => import("./pages/WorkspaceBillingPage"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvitePage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const OptimizePage = lazy(() => import("./pages/OptimizePage"));
const RmsPage = lazy(() => import("./pages/RmsPage"));
const PushPage = lazy(() => import("./pages/PushPage"));

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
  | "rms"
  | "push";

type AppRoutesProps = {
  canAccess?: (key: AccessKey) => boolean;
  workspaceRole?: string | null;
  isPlatformAdmin?: boolean;
  workspaceId?: string;
  siteId?: string;
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

export default function AppRoutes({ canAccess, workspaceRole, isPlatformAdmin, workspaceId, siteId }: AppRoutesProps) {
  return (
    <div className="container">
      <Suspense fallback={<div className="card"><div className="small" style={{ opacity: 0.6 }}>読み込み中…</div></div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/invite" element={<AcceptInvitePage />} />

        <Route path="/dashboard" element={<Guard allow={canShow(canAccess, "dashboard")} title="ダッシュボード"><DashboardPage /></Guard>} />
        <Route path="/analytics" element={<Guard allow={canShow(canAccess, "analytics")} title="流入計測"><AnalyticsPage /></Guard>} />
        <Route path="/workspaces" element={<Guard allow={isPlatformAdmin || canShow(canAccess, "workspaces")} title="ワークスペース"><WorkspacesPage /></Guard>} />
        <Route path="/sites" element={<Guard allow={canShow(canAccess, "sites")} title="サイト"><SitesPage /></Guard>} />
        <Route path="/scenarios" element={<Guard allow={canShow(canAccess, "scenarios")} title="シナリオ"><ScenariosPage /></Guard>} />
        <Route path="/actions" element={<Guard allow={canShow(canAccess, "actions")} title="アクション"><ActionsPage /></Guard>} />
        <Route path="/questions" element={<Guard allow={canShow(canAccess, "actions")} title="質問接客"><QuestionsPage /></Guard>} />
        <Route path="/templates" element={<Guard allow={canShow(canAccess, "templates")} title="テンプレート"><TemplatesPage /></Guard>} />
        <Route path="/media" element={<Guard allow={canShow(canAccess, "media")} title="メディア"><MediaLibraryPage /></Guard>} />
        {/* シナリオ関連 */}
        <Route path="/scenarios/:scenarioId/review" element={<Guard allow={canShow(canAccess, "ai")} title="AIレビュー"><ScenarioReviewPage /></Guard>} />
        <Route path="/scenarios/:scenarioId/ai" element={<Guard allow={canShow(canAccess, "ai")} title="AIインサイト"><ScenarioAiPage /></Guard>} />
        <Route path="/ai" element={<Guard allow={canShow(canAccess, "ai")} title="AIインサイト"><ScenarioAiPage /></Guard>} />
        <Route path="/ai/optimize" element={<Guard allow={canShow(canAccess, "ai")} title="配信最適化"><OptimizePage /></Guard>} />
        <Route path="/rms" element={<Guard allow={canShow(canAccess, "rms")} title="楽天RMS"><RmsPage siteId={siteId || ""} /></Guard>} />
        <Route path="/push" element={<Guard allow={canShow(canAccess, "push")} title="Webプッシュ"><PushPage /></Guard>} />

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
      </Suspense>
    </div>
  );
}