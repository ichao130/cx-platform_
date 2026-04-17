import React, { useCallback, useEffect, useState } from "react";
import { opsPost } from "../firebase";

type InvoiceLog = {
  id: string;
  workspaceId: string;
  yearMonth: string;
  invoiceId: string;
  plan: string;
  planName: string;
  amount: number;
  recipientEmail: string;
  recipientName: string;
  invoiceDate: string;
  paymentDueOn: string;
  sentAt: any;
  status: string;
};

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ja-JP", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtYearMonth(ym: string) {
  if (!ym || ym.length < 6) return ym;
  return `${ym.slice(0, 4)}年${String(Number(ym.slice(4, 6)))}月`;
}

export default function MisocaPage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<InvoiceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggerResult, setTriggerResult] = useState<any>(null);
  const [error, setError] = useState("");

  // URL パラメーターで OAuth 結果を検知
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const misoca = params.get("misoca");
    if (misoca === "connected") {
      setError("");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (misoca === "error") {
      const reason = params.get("reason") || "unknown";
      setError(`MISOCA連携に失敗しました: ${reason}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await opsPost("/v1/ops/misoca/status", {});
      setConnected(res.connected ?? false);
      setConnectedAt(res.connectedAt ?? null);
      setRecentLogs(res.recentLogs ?? []);
    } catch (e: any) {
      setError(e.message || "状態の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleConnect = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await opsPost("/v1/ops/misoca/authorize", {});
      if (res.url) {
        window.location.href = res.url;
      } else {
        setError("認可URLの取得に失敗しました");
      }
    } catch (e: any) {
      setError(e.message || "連携の開始に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (!window.confirm("MISOCAとの連携を解除します。よろしいですか？")) return;
    setLoading(true);
    setError("");
    try {
      await opsPost("/v1/ops/misoca/disconnect", {});
      setConnected(false);
      setConnectedAt(null);
    } catch (e: any) {
      setError(e.message || "連携解除に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTrigger = useCallback(async () => {
    if (!window.confirm("今月分の請求書を今すぐ発行しますか？\n（既に発行済みのワークスペースはスキップされます）")) return;
    setLoading(true);
    setError("");
    setTriggerResult(null);
    try {
      const res = await opsPost("/v1/ops/misoca/trigger", {});
      setTriggerResult(res);
      await loadStatus();
    } catch (e: any) {
      setError(e.message || "請求書発行に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [loadStatus]);

  return (
    <div style={{ maxWidth: 860 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: "#1e293b" }}>MISOCA 請求書管理</h2>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
        毎月25日に <b>provider: manual</b> かつ <b>status: active</b> のワークスペースへ請求書を自動発行します（翌月末払い）
      </p>

      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#b91c1c", fontSize: 14 }}>
          ⚠ {error}
        </div>
      )}

      {/* 接続ステータスカード */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>接続ステータス</div>
        {connected === null ? (
          <div style={{ color: "#94a3b8" }}>読み込み中…</div>
        ) : connected ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "#dcfce7", color: "#16a34a", borderRadius: 99, fontSize: 13, fontWeight: 700 }}>
                ✅ 連携済み
              </span>
              {connectedAt && <span style={{ fontSize: 12, color: "#94a3b8" }}>連携日時: {fmt(connectedAt)}</span>}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleTrigger}
                disabled={loading}
                style={{ padding: "8px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                {loading ? "処理中…" : "📄 今すぐ請求書を発行"}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                style={{ padding: "8px 16px", background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
              >
                連携解除
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "#f1f5f9", color: "#64748b", borderRadius: 99, fontSize: 13, fontWeight: 700 }}>
                ○ 未連携
              </span>
            </div>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#64748b" }}>
              事前に MISOCA の開発者設定でリダイレクトURIを登録してください：<br />
              <code style={{ background: "#f8fafc", padding: "2px 6px", borderRadius: 4, fontSize: 12, color: "#0f172a" }}>
                https://app.mokkeda.com/api/v1/ops/misoca/callback
              </code>
            </div>
            <button
              onClick={handleConnect}
              disabled={loading}
              style={{ padding: "9px 20px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 700 }}
            >
              {loading ? "移動中…" : "🔗 MISOCAと連携する"}
            </button>
          </>
        )}
      </div>

      {/* 手動トリガー結果 */}
      {triggerResult && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "16px 20px", marginBottom: 20, fontSize: 13 }}>
          <div style={{ fontWeight: 700, color: "#15803d", marginBottom: 8 }}>✅ 請求書発行完了</div>
          <div style={{ display: "flex", gap: 24, marginBottom: 12 }}>
            <span>送信: <b style={{ color: "#15803d" }}>{triggerResult.success}件</b></span>
            <span>スキップ: <b style={{ color: "#64748b" }}>{triggerResult.skipped}件</b></span>
            <span>エラー: <b style={{ color: triggerResult.errors > 0 ? "#b91c1c" : "#64748b" }}>{triggerResult.errors}件</b></span>
          </div>
          {triggerResult.details?.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#dcfce7" }}>
                  <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600 }}>WorkspaceID</th>
                  <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600 }}>状態</th>
                  <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600 }}>詳細</th>
                </tr>
              </thead>
              <tbody>
                {triggerResult.details.map((d: any, i: number) => (
                  <tr key={i} style={{ borderTop: "1px solid #bbf7d0" }}>
                    <td style={{ padding: "4px 8px", fontFamily: "monospace" }}>{d.wsId}</td>
                    <td style={{ padding: "4px 8px" }}>
                      <span style={{ color: d.status === "sent" ? "#15803d" : d.status === "error" ? "#b91c1c" : "#64748b", fontWeight: 600 }}>
                        {d.status}
                      </span>
                    </td>
                    <td style={{ padding: "4px 8px", color: "#64748b" }}>
                      {d.invoiceId ? `invoiceId: ${d.invoiceId}` : d.reason || d.error || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 発行ログ */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "20px 24px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#1e293b" }}>発行履歴（直近10件）</div>
        {recentLogs.length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: 14 }}>まだ請求書は発行されていません</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "6px 10px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>年月</th>
                <th style={{ padding: "6px 10px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>宛先</th>
                <th style={{ padding: "6px 10px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>プラン</th>
                <th style={{ padding: "6px 10px", textAlign: "right", color: "#64748b", fontWeight: 600 }}>金額</th>
                <th style={{ padding: "6px 10px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>支払期限</th>
                <th style={{ padding: "6px 10px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>送信日時</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 600, color: "#1e293b" }}>{fmtYearMonth(log.yearMonth)}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ fontWeight: 500, color: "#1e293b" }}>{log.recipientName || "—"}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{log.recipientEmail}</div>
                  </td>
                  <td style={{ padding: "8px 10px", color: "#64748b" }}>{log.planName}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "#1e293b" }}>
                    ¥{(log.amount || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: "8px 10px", color: "#64748b" }}>{log.paymentDueOn || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#64748b", fontSize: 12 }}>
                    {log.sentAt?.toDate ? fmt(log.sentAt.toDate().toISOString()) : fmt(log.sentAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
