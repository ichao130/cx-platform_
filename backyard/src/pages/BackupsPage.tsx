import React, { useCallback, useEffect, useMemo, useState } from "react";
import { opsPost } from "../firebase";

type BackupSettings = {
  enabled: boolean;
  hour_jst: number;
  retention_days: number;
  updated_at: string;
  updated_by: string;
};

type BackupRunSummary = {
  totalWorkspaces: number;
  collections: Record<string, number>;
};

type BackupRun = {
  id: string;
  mode: "manual" | "scheduled";
  status: "queued" | "running" | "succeeded" | "failed";
  scope: "all" | "workspace";
  workspaceId: string | null;
  workspaceName: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  createdBy: string;
  scheduledDateJst: string | null;
  artifactPath: string | null;
  artifactDeletedAt: string | null;
  artifactSizeBytes: number | null;
  summary: BackupRunSummary | null;
  errorMessage: string;
};

type WorkspaceOption = {
  id: string;
  name: string;
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtBytes(size: number | null | undefined) {
  if (!size || size <= 0) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function statusBadge(status: BackupRun["status"]) {
  if (status === "succeeded") return { bg: "#dcfce7", border: "#86efac", color: "#15803d", label: "成功" };
  if (status === "running") return { bg: "#dbeafe", border: "#93c5fd", color: "#1d4ed8", label: "実行中" };
  if (status === "queued") return { bg: "#fef3c7", border: "#fcd34d", color: "#b45309", label: "待機中" };
  return { bg: "#fee2e2", border: "#fca5a5", color: "#b91c1c", label: "失敗" };
}

const hourOptions = Array.from({ length: 24 }, (_, hour) => hour);
const retentionOptions = [7, 14, 30, 60, 90, 180];

export default function BackupsPage() {
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [includedCollections, setIncludedCollections] = useState<string[]>([]);
  const [omittedCollections, setOmittedCollections] = useState<string[]>([]);
  const [scope, setScope] = useState<"all" | "workspace">("all");
  const [workspaceId, setWorkspaceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadSettings = useCallback(async () => {
    const res = await opsPost<{
      settings: BackupSettings;
      scope: { included_collections: string[]; omitted_collections: string[] };
    }>("/v1/ops/backups/settings/get", {});
    setSettings(res.settings);
    setIncludedCollections(res.scope?.included_collections || []);
    setOmittedCollections(res.scope?.omitted_collections || []);
  }, []);

  const loadRuns = useCallback(async () => {
    const res = await opsPost<{ runs: BackupRun[] }>("/v1/ops/backups/list", { limit: 30 });
    setRuns(res.runs || []);
  }, []);

  const loadWorkspaces = useCallback(async () => {
    const res = await opsPost<{ workspaces: Array<{ id: string; name: string }> }>("/v1/ops/workspaces", {});
    setWorkspaces((res.workspaces || []).map((w) => ({ id: w.id, name: w.name || w.id })));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadSettings(), loadRuns(), loadWorkspaces()]);
    } catch (e: any) {
      setError(e.message || "バックアップ情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [loadRuns, loadSettings, loadWorkspaces]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const hasActiveRun = useMemo(
    () => runs.some((run) => run.status === "queued" || run.status === "running"),
    [runs]
  );

  useEffect(() => {
    if (!hasActiveRun) return;
    const timer = window.setInterval(() => {
      loadRuns().catch(() => {});
    }, 10000);
    return () => window.clearInterval(timer);
  }, [hasActiveRun, loadRuns]);

  const latestSuccess = useMemo(
    () => runs.find((run) => run.status === "succeeded") || null,
    [runs]
  );

  const saveSettings = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await opsPost<{ settings: BackupSettings }>("/v1/ops/backups/settings/upsert", {
        enabled: settings.enabled,
        hour_jst: settings.hour_jst,
        retention_days: settings.retention_days,
      });
      setSettings(res.settings);
      setMessage("自動バックアップ設定を保存しました。");
    } catch (e: any) {
      setError(e.message || "設定の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const runBackup = useCallback(async () => {
    if (scope === "workspace" && !workspaceId) {
      setError("ワークスペースを選択してください。");
      return;
    }
    setRunning(true);
    setError("");
    setMessage("");
    try {
      const res = await opsPost<{ run_id: string }>("/v1/ops/backups/run", {
        scope,
        workspace_id: scope === "workspace" ? workspaceId : undefined,
      });
      setMessage(`バックアップをキューに追加しました（Run ID: ${res.run_id}）`);
      await loadRuns();
    } catch (e: any) {
      setError(e.message || "手動バックアップに失敗しました");
    } finally {
      setRunning(false);
    }
  }, [loadRuns, scope, workspaceId]);

  const downloadBackup = useCallback(async (runId: string) => {
    setError("");
    try {
      const res = await opsPost<{ url: string }>("/v1/ops/backups/download-url", { run_id: runId });
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setError(e.message || "ダウンロードURLの取得に失敗しました");
    }
  }, []);

  return (
    <div style={{ maxWidth: 1160 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: "#1e293b" }}>バックアップ管理</h2>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
            `/ops` から手動実行と自動実行を管理します。MVP では設定系データを毎日 JSON で退避します。
          </p>
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
        >
          {loading ? "更新中…" : "最新化"}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#b91c1c", fontSize: 14 }}>
          ⚠ {error}
        </div>
      )}
      {message && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, color: "#166534", fontSize: 14 }}>
          {message}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 72, color: "#94a3b8" }}>読み込み中…</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>現在の状態</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: settings?.enabled ? "#dcfce7" : "#f1f5f9", color: settings?.enabled ? "#15803d" : "#64748b", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
                  {settings?.enabled ? "自動バックアップ ON" : "自動バックアップ OFF"}
                </span>
                {hasActiveRun && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "#dbeafe", color: "#1d4ed8", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
                    実行中のジョブあり
                  </span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, fontSize: 13, color: "#475569" }}>
                <div>実行時刻: <strong style={{ color: "#0f172a" }}>毎日 {String(settings?.hour_jst ?? 0).padStart(2, "0")}:00 JST</strong></div>
                <div>保持期間: <strong style={{ color: "#0f172a" }}>{settings?.retention_days ?? 30} 日</strong></div>
                <div>最終成功: <strong style={{ color: "#0f172a" }}>{latestSuccess ? fmtDate(latestSuccess.finishedAt) : "まだありません"}</strong></div>
                <div>最終成果物: <strong style={{ color: "#0f172a" }}>{latestSuccess ? fmtBytes(latestSuccess.artifactSizeBytes) : "—"}</strong></div>
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>MVP のバックアップ対象</div>
              <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.75 }}>
                <div>含む: {includedCollections.join(", ") || "—"}</div>
                <div>除外: {omittedCollections.join(", ") || "—"}</div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16, marginBottom: 20 }}>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>自動バックアップ設定</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#334155" }}>
                  <input
                    type="checkbox"
                    checked={!!settings?.enabled}
                    onChange={(e) => setSettings((prev) => (prev ? { ...prev, enabled: e.target.checked } : prev))}
                  />
                  毎日バックアップを自動実行する
                </label>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 220 }}>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>実行時刻（JST）</div>
                    <select
                      value={settings?.hour_jst ?? 3}
                      onChange={(e) => setSettings((prev) => (prev ? { ...prev, hour_jst: Number(e.target.value) } : prev))}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontSize: 13 }}
                    >
                      {hourOptions.map((hour) => (
                        <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ minWidth: 220 }}>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>保持期間</div>
                    <select
                      value={settings?.retention_days ?? 30}
                      onChange={(e) => setSettings((prev) => (prev ? { ...prev, retention_days: Number(e.target.value) } : prev))}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontSize: 13 }}
                    >
                      {retentionOptions.map((days) => (
                        <option key={days} value={days}>{days}日</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  設定変更は次回スケジュール実行から反映されます。
                </div>
                <div>
                  <button
                    onClick={saveSettings}
                    disabled={!settings || saving}
                    style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? "保存中…" : "設定を保存"}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>手動バックアップ</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>対象</div>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as "all" | "workspace")}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontSize: 13 }}
                  >
                    <option value="all">全ワークスペース</option>
                    <option value="workspace">単一ワークスペース</option>
                  </select>
                </div>
                {scope === "workspace" && (
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>ワークスペース</div>
                    <select
                      value={workspaceId}
                      onChange={(e) => setWorkspaceId(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontSize: 13 }}
                    >
                      <option value="">選択してください</option>
                      {workspaces.map((workspace) => (
                        <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  onClick={runBackup}
                  disabled={running}
                  style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#0f766e", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: running ? 0.7 : 1 }}
                >
                  {running ? "キュー投入中…" : "今すぐバックアップ"}
                </button>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  実際の JSON 生成はサーバー側 worker が行い、履歴にステータスが反映されます。
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>実行履歴</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>新しい順に 30 件表示しています。</div>
              </div>
              {hasActiveRun && (
                <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 700 }}>
                  10秒ごとに自動更新中
                </div>
              )}
            </div>

            {runs.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: 14 }}>まだバックアップ履歴はありません。</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                      {["状態", "種別", "対象", "作成", "完了", "サイズ", "内容", "操作"].map((label) => (
                        <th key={label} style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => {
                      const badge = statusBadge(run.status);
                      const counts = run.summary?.collections || {};
                      const detail = [
                        counts.workspaces ? `WS ${counts.workspaces}` : "",
                        counts.sites ? `Sites ${counts.sites}` : "",
                        counts.scenarios ? `Scn ${counts.scenarios}` : "",
                        counts.actions ? `Act ${counts.actions}` : "",
                      ].filter(Boolean).join(" / ");

                      return (
                        <tr key={run.id} style={{ borderBottom: "1px solid #f1f5f9", verticalAlign: "top" }}>
                          <td style={{ padding: "10px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999, background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, fontWeight: 700 }}>
                              {badge.label}
                            </span>
                            {run.errorMessage && (
                              <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 6, maxWidth: 220 }}>
                                {run.errorMessage}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "10px", color: "#334155" }}>
                            <div>{run.mode === "scheduled" ? "自動" : "手動"}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                              {run.scheduledDateJst ? `予定日 ${run.scheduledDateJst}` : run.createdBy || "—"}
                            </div>
                          </td>
                          <td style={{ padding: "10px", color: "#334155" }}>
                            <div>{run.scope === "all" ? "全ワークスペース" : run.workspaceName || run.workspaceId || "単一ワークスペース"}</div>
                            {run.workspaceId && (
                              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{run.workspaceId}</div>
                            )}
                          </td>
                          <td style={{ padding: "10px", color: "#334155", whiteSpace: "nowrap" }}>{fmtDate(run.createdAt)}</td>
                          <td style={{ padding: "10px", color: "#334155", whiteSpace: "nowrap" }}>{fmtDate(run.finishedAt || run.startedAt)}</td>
                          <td style={{ padding: "10px", color: "#334155", whiteSpace: "nowrap" }}>{fmtBytes(run.artifactSizeBytes)}</td>
                          <td style={{ padding: "10px", color: "#334155" }}>
                            <div>{run.summary ? `${run.summary.totalWorkspaces} WS` : "—"}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                              {detail || "集計前"}
                            </div>
                          </td>
                          <td style={{ padding: "10px" }}>
                            <button
                              onClick={() => downloadBackup(run.id)}
                              disabled={run.status !== "succeeded" || !run.artifactPath || !!run.artifactDeletedAt}
                              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1", background: run.status === "succeeded" && run.artifactPath && !run.artifactDeletedAt ? "#fff" : "#f8fafc", color: run.status === "succeeded" && run.artifactPath && !run.artifactDeletedAt ? "#0f172a" : "#94a3b8", cursor: run.status === "succeeded" && run.artifactPath && !run.artifactDeletedAt ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 600 }}
                            >
                              {run.artifactDeletedAt ? "期限切れ" : "ダウンロード"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
