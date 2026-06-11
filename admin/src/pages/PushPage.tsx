// admin/src/pages/PushPage.tsx
import React, { useEffect, useState, useCallback } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db, apiPostJson } from "../firebase";

// ─── 型 ─────────────────────────────────────────────────────────────────
type Site = { id: string; name?: string; workspaceId?: string; domains?: string[] };

type Campaign = {
  id: string;
  title: string;
  body?: string;
  url?: string;
  icon?: string;
  status: string;
  sentAt?: any;
  scheduledAt?: any;
  stats?: { sent: number; failed: number };
};

// ─── ユーティリティ ───────────────────────────────────────────────────────
function workspaceKeyForUid(uid: string) { return `cx_admin_workspace_id:${uid}`; }
function readSelectedWorkspaceId(uid?: string) {
  if (!uid) return "";
  try { return localStorage.getItem(workspaceKeyForUid(uid)) || ""; } catch { return ""; }
}

function formatTs(ts: any): string {
  if (!ts) return "";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function siteIconUrl(site?: Site): string {
  const domain = site?.domains?.[0];
  if (!domain) return "";
  try {
    const host = new URL(domain.startsWith("http") ? domain : `https://${domain}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch { return ""; }
}

// ─── コンポーネント ───────────────────────────────────────────────────────
export default function PushPage() {
  // ワークスペース・ユーザー
  const [currentUid, setCurrentUid] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");

  // サイト選択
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState("");

  // 購読者数
  const [subCount, setSubCount] = useState<number | null>(null);

  // タブ
  const [tab, setTab] = useState<"scheduled" | "sent">("scheduled");

  // キャンペーン一覧
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // フォーム
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent?: number; failed?: number; scheduled?: boolean } | null>(null);
  const [sendErr, setSendErr] = useState("");

  // 認証状態 + ワークスペース選択
  useEffect(() => {
    return onAuthStateChanged(getAuth(), (user) => {
      const uid = user?.uid || "";
      setCurrentUid(uid);
      setWorkspaceId(readSelectedWorkspaceId(uid));
    });
  }, []);

  useEffect(() => {
    if (!currentUid) return;
    const onWsChanged = (e?: Event) => {
      const next = (e as CustomEvent | undefined)?.detail?.workspaceId;
      setWorkspaceId(typeof next === "string" ? next : readSelectedWorkspaceId(currentUid));
    };
    window.addEventListener("cx_admin_workspace_changed", onWsChanged as EventListener);
    window.addEventListener("storage", () => onWsChanged());
    return () => {
      window.removeEventListener("cx_admin_workspace_changed", onWsChanged as EventListener);
      window.removeEventListener("storage", () => onWsChanged());
    };
  }, [currentUid]);

  // ワークスペース内のサイト一覧
  useEffect(() => {
    if (!currentUid) { setSites([]); setSiteId(""); return; }
    const q = query(collection(db, "sites"), where("memberUids", "array-contains", currentUid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .filter((d) => !workspaceId || d.data().workspaceId === workspaceId)
        .map((d) => ({ id: d.id, ...(d.data() as any) }));
      setSites(list);
      setSiteId((prev) => (list.find((s) => s.id === prev) ? prev : list[0]?.id || ""));
    });
    return unsub;
  }, [currentUid, workspaceId]);

  // 購読者数
  const loadCount = useCallback(async (sid: string) => {
    if (!sid) return;
    try {
      const res = await apiPostJson<{ ok: boolean; count: number }>("/v1/push/subscribers/count", { site_id: sid });
      setSubCount(res.count);
    } catch { setSubCount(0); }
  }, []);

  // キャンペーン一覧
  const loadCampaigns = useCallback(async (sid: string) => {
    if (!sid) return;
    setCampaignsLoading(true);
    try {
      const res = await apiPostJson<{ ok: boolean; campaigns: Campaign[] }>("/v1/push/campaigns/list", { site_id: sid });
      setCampaigns(res.campaigns || []);
    } catch { setCampaigns([]); }
    finally { setCampaignsLoading(false); }
  }, []);

  useEffect(() => {
    if (!siteId) return;
    loadCount(siteId);
    loadCampaigns(siteId);
    setSendResult(null);
    setSendErr("");
    const site = sites.find((s) => s.id === siteId);
    setIcon(siteIconUrl(site));
  }, [siteId, sites]);

  // 送信
  const handleSend = async () => {
    if (!siteId || !title.trim()) return;
    if (scheduleMode === "scheduled" && !scheduledAt) return;
    setSending(true);
    setSendResult(null);
    setSendErr("");
    try {
      const payload: any = {
        site_id: siteId,
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || "/",
        icon: icon.trim(),
      };
      if (scheduleMode === "scheduled" && scheduledAt) {
        payload.scheduled_at = new Date(scheduledAt).toISOString();
      }
      const res = await apiPostJson<{ ok: boolean; sent?: number; failed?: number; scheduled?: boolean }>("/v1/push/send", payload);
      setSendResult({ sent: res.sent, failed: res.failed, scheduled: res.scheduled });
      setTitle("");
      setBody("");
      setUrl("");
      setScheduledAt("");
      setScheduleMode("now");
      const site = sites.find((s) => s.id === siteId);
      setIcon(siteIconUrl(site));
      loadCount(siteId);
      loadCampaigns(siteId);
      // 送信済なら送信済タブへ、予約なら予約タブへ
      setTab(res.scheduled ? "scheduled" : "sent");
    } catch (e: any) {
      setSendErr(e?.message || "送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const scheduledCampaigns = campaigns.filter((c) => c.status === "scheduled" || c.status === "sending");
  const sentCampaigns = campaigns.filter((c) => c.status === "sent");

  const tabCampaigns = tab === "scheduled" ? scheduledCampaigns : sentCampaigns;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 480px) minmax(360px, 1fr)", minHeight: "100vh", gap: 0 }}>

      {/* 左: リスト */}
      <div style={{ borderRight: "1px solid var(--border, #e2e8f0)", padding: "28px 24px", overflowY: "auto" }}>

        {/* サイト選択 + 購読者数 */}
        <div style={{ marginBottom: 20 }}>
          <select
            className="input"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            style={{ width: "100%", marginBottom: 10 }}
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name || s.id}</option>
            ))}
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="small" style={{ opacity: 0.6 }}>購読者数</span>
            <span style={{ fontWeight: 700, fontSize: 18 }}>{subCount ?? "—"}</span>
            <button className="btn-ghost" style={{ fontSize: 11, padding: "1px 8px", marginLeft: 4 }} onClick={() => loadCount(siteId)}>更新</button>
          </div>
        </div>

        {/* タブ */}
        <div style={{ display: "flex", borderBottom: "2px solid var(--border, #e2e8f0)", marginBottom: 16 }}>
          {([
            { key: "scheduled", label: "配信予定", count: scheduledCampaigns.length },
            { key: "sent",      label: "配信済み", count: sentCampaigns.length },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "8px 16px", fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
                border: "none", background: "transparent", cursor: "pointer",
                borderBottom: tab === t.key ? "2px solid var(--accent, #6366f1)" : "2px solid transparent",
                marginBottom: -2, color: tab === t.key ? "var(--accent, #6366f1)" : "inherit",
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, background: tab === t.key ? "var(--accent, #6366f1)" : "#e2e8f0", color: tab === t.key ? "#fff" : "#555", borderRadius: 10, padding: "1px 6px" }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* キャンペーン一覧 */}
        {campaignsLoading ? (
          <div className="small" style={{ opacity: 0.5, padding: "20px 0" }}>読み込み中…</div>
        ) : tabCampaigns.length === 0 ? (
          <div className="small" style={{ opacity: 0.5, padding: "20px 0" }}>
            {tab === "scheduled" ? "配信予定の通知はありません" : "配信済みの通知はありません"}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {tabCampaigns.map((c) => (
              <div key={c.id} className="card" style={{ padding: "12px 14px", cursor: "default" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  {c.icon && (
                    <img src={c.icon} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover", flexShrink: 0, marginTop: 2 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
                    {c.body && <div className="small" style={{ opacity: 0.6, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.body}</div>}
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                      {c.status === "scheduled" && (
                        <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, background: "#e0e7ff", color: "#4338ca", fontWeight: 600 }}>予約中</span>
                      )}
                      {c.status === "sending" && (
                        <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, background: "#fef3c7", color: "#92400e", fontWeight: 600 }}>送信中</span>
                      )}
                      {c.status === "sent" && (
                        <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, background: "#dcfce7", color: "#15803d", fontWeight: 600 }}>送信済</span>
                      )}
                      <span className="small" style={{ opacity: 0.5 }}>
                        {c.status === "scheduled" ? formatTs(c.scheduledAt) : formatTs(c.sentAt)}
                      </span>
                      {c.status === "sent" && c.stats && (
                        <span className="small" style={{ opacity: 0.5 }}>{c.stats.sent}件</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 右: 作成フォーム */}
      <div style={{ padding: "28px 32px", overflowY: "auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div className="h1" style={{ marginBottom: 4 }}>通知を作成</div>
          <div className="small" style={{ opacity: 0.6 }}>購読者 {subCount ?? "—"} 人に送信されます</div>
        </div>

        <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
          <div>
            <label className="small" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              タイトル <span style={{ color: "#e53e3e" }}>*</span>
            </label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="例: セール開催中！" maxLength={100} />
          </div>

          <div>
            <label className="small" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>本文</label>
            <input className="input" value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="例: 本日23:59まで全品20%OFF" maxLength={200} />
          </div>

          <div>
            <label className="small" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>クリック先URL</label>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="例: https://example.com/sale" />
          </div>

          <div>
            <label className="small" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              アイコン <span style={{ opacity: 0.6, fontWeight: 400 }}>(自動取得・上書き可)</span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {icon && (
                <img src={icon} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border, #e2e8f0)" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <input className="input" value={icon} onChange={(e) => setIcon(e.target.value)}
                placeholder="https://..." style={{ flex: 1 }} />
            </div>
          </div>

          {/* プレビュー */}
          {(title || body) && (
            <div style={{ padding: "12px 16px", background: "var(--bg-surface, #f8f9fa)", borderRadius: 8, border: "1px solid var(--border, #e2e8f0)" }}>
              <div className="small" style={{ opacity: 0.5, marginBottom: 8 }}>プレビュー</div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {icon && <img src={icon} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{title || "（タイトル）"}</div>
                  {body && <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>{body}</div>}
                  {url && <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{url}</div>}
                </div>
              </div>
            </div>
          )}

          {/* 配信タイミング */}
          <div>
            <label className="small" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>配信タイミング</label>
            <div style={{ display: "flex", gap: 8, marginBottom: scheduleMode === "scheduled" ? 10 : 0 }}>
              {(["now", "scheduled"] as const).map((m) => (
                <button key={m} onClick={() => setScheduleMode(m)} style={{
                  padding: "6px 16px", borderRadius: 6, fontSize: 13, cursor: "pointer", border: "1px solid",
                  borderColor: scheduleMode === m ? "var(--accent, #6366f1)" : "var(--border, #e2e8f0)",
                  background: scheduleMode === m ? "var(--accent, #6366f1)" : "transparent",
                  color: scheduleMode === m ? "#fff" : "inherit",
                  fontWeight: scheduleMode === m ? 600 : 400,
                }}>
                  {m === "now" ? "今すぐ送信" : "日時指定"}
                </button>
              ))}
            </div>
            {scheduleMode === "scheduled" && (
              <input type="datetime-local" className="input" value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={(() => { const d = new Date(Date.now() + 60000); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })()}
                style={{ maxWidth: 260 }} />
            )}
          </div>

          {/* 送信ボタン */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn-primary" onClick={handleSend}
              disabled={sending || !title.trim() || !siteId || (scheduleMode === "scheduled" && !scheduledAt)}>
              {sending
                ? (scheduleMode === "scheduled" ? "予約中…" : "送信中…")
                : scheduleMode === "scheduled" ? "予約する" : `今すぐ送信（${subCount ?? "—"}人）`}
            </button>
            {sendResult && (
              <span style={{ fontSize: 13, color: "#16a34a" }}>
                {sendResult.scheduled ? "✓ 予約完了" : `✓ 送信完了 — ${sendResult.sent}件`}
              </span>
            )}
            {sendErr && <span style={{ fontSize: 13, color: "#e53e3e" }}>⚠ {sendErr}</span>}
          </div>

          {/* 使い方メモ */}
          <div style={{ marginTop: 8, padding: "14px 16px", background: "var(--bg-surface, #f8f9fa)", borderRadius: 8, border: "1px solid var(--border, #e2e8f0)" }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>📋 購読してもらうには</div>
            <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.7 }}>
              シナリオのボタンクリック時に <code style={{ background: "#eee", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>window.mokkeda.push.requestPermission()</code> を呼ぶと許可ダイアログが表示されます。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
