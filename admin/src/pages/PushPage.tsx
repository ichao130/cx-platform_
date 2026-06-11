// admin/src/pages/PushPage.tsx
import React, { useEffect, useState, useCallback } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db, apiPostJson } from "../firebase";
import RightDrawer from "../components/RightDrawer";

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

function localDatetimeMin() {
  const d = new Date(Date.now() + 60000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

// ─── コンポーネント ───────────────────────────────────────────────────────
export default function PushPage() {
  const [currentUid, setCurrentUid] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState("");
  const [subCount, setSubCount] = useState<number | null>(null);
  const [tab, setTab] = useState<"scheduled" | "sent">("scheduled");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // ドロワー
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // 認証 + ワークスペース
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

  // サイト一覧
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

  const openDrawer = () => {
    setSendResult(null);
    setSendErr("");
    setTitle("");
    setBody("");
    setUrl("");
    setScheduleMode("now");
    setScheduledAt("");
    const site = sites.find((s) => s.id === siteId);
    setIcon(siteIconUrl(site));
    setDrawerOpen(true);
  };

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
      loadCount(siteId);
      loadCampaigns(siteId);
      setTab(res.scheduled ? "scheduled" : "sent");
      setDrawerOpen(false);
    } catch (e: any) {
      setSendErr(e?.message || "送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const scheduledList = campaigns.filter((c) => c.status === "scheduled" || c.status === "sending");
  const sentList = campaigns.filter((c) => c.status === "sent");
  const tabList = tab === "scheduled" ? scheduledList : sentList;
  const selectedSite = sites.find((s) => s.id === siteId);

  return (
    <div className="container liquid-page">
      {/* ページヘッダー */}
      <div className="page-header">
        <div className="page-header__meta">
          <div className="small" style={{ marginBottom: 6, opacity: 0.7 }}>MOKKEDA / Push</div>
          <h1 className="h1">Webプッシュ通知</h1>
          <div className="small">購読者へプッシュ通知を送信・予約できます。</div>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={openDrawer} disabled={!siteId}>
            通知を作成
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        {/* ツールバー */}
        <div className="list-toolbar">
          <div className="list-toolbar__filters" style={{ flex: 1 }}>
            <div style={{ minWidth: 280, flex: "1 1 320px" }}>
              <div className="h2">サイト</div>
              <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name || s.id}</option>
                ))}
              </select>
            </div>
            <div style={{ paddingTop: 20 }}>
              <span className="small" style={{ opacity: 0.6 }}>購読者数：</span>
              <b>{subCount ?? "—"}</b>
              <button className="btn" style={{ marginLeft: 8, fontSize: 11, padding: "2px 10px" }} onClick={() => loadCount(siteId)}>更新</button>
            </div>
          </div>
          <div className="list-toolbar__actions">
            <button className="btn" onClick={openDrawer} disabled={!siteId}>作成</button>
          </div>
        </div>

        {/* タブ */}
        <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
          {([
            { key: "scheduled" as const, label: `配信予定 (${scheduledList.length})` },
            { key: "sent" as const,      label: `配信済み (${sentList.length})` },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "5px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                background: tab === t.key ? "#0f172a" : "rgba(15,23,42,.07)",
                color: tab === t.key ? "#fff" : "#64748b",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* テーブル */}
        <div className="liquid-scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th>タイトル</th>
                <th>本文</th>
                <th>URL</th>
                <th>状態</th>
                <th style={{ textAlign: "center" }}>送信</th>
                <th style={{ textAlign: "center" }}>失敗</th>
                <th>{tab === "scheduled" ? "配信予定日時" : "配信日時"}</th>
              </tr>
            </thead>
            <tbody>
              {campaignsLoading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", opacity: 0.5, padding: 24 }}>読み込み中…</td></tr>
              ) : tabList.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", opacity: 0.5, padding: 24 }}>
                  {tab === "scheduled" ? "配信予定の通知はありません" : "配信済みの通知はありません"}
                </td></tr>
              ) : tabList.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {c.icon && <img src={c.icon} alt="" style={{ width: 20, height: 20, borderRadius: 3, objectFit: "cover", flexShrink: 0 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                      <span style={{ fontWeight: 700 }}>{c.title}</span>
                    </div>
                  </td>
                  <td className="small" style={{ opacity: 0.72 }}>{c.body || "—"}</td>
                  <td className="small" style={{ opacity: 0.72, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.url || "—"}</td>
                  <td>
                    {c.status === "scheduled" && <span className="badge" style={{ background: "#e0e7ff", color: "#4338ca", borderColor: "#c7d2fe" }}>予約中</span>}
                    {c.status === "sending"   && <span className="badge" style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" }}>送信中</span>}
                    {c.status === "sent"      && <span className="badge" style={{ background: "#dcfce7", color: "#15803d", borderColor: "#bbf7d0" }}>送信済</span>}
                  </td>
                  <td style={{ textAlign: "center" }}>{c.stats?.sent ?? "—"}</td>
                  <td style={{ textAlign: "center", color: (c.stats?.failed ?? 0) > 0 ? "#dc2626" : undefined }}>
                    {c.status === "scheduled" ? "—" : (c.stats?.failed ?? "—")}
                  </td>
                  <td className="small" style={{ opacity: 0.72, whiteSpace: "nowrap" }}>
                    {c.status === "scheduled" ? formatTs(c.scheduledAt) : formatTs(c.sentAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 送信結果トースト */}
      {sendResult && (
        <div className="card" style={{ marginBottom: 14, background: "#f0fdf4", borderColor: "#bbf7d0" }}>
          <span style={{ color: "#15803d", fontWeight: 600 }}>
            {sendResult.scheduled ? "✓ 予約完了 — 指定日時に自動送信されます" : `✓ 送信完了 — ${sendResult.sent}件送信しました`}
          </span>
        </div>
      )}

      {/* 作成ドロワー */}
      <RightDrawer
        open={drawerOpen}
        width={560}
        title="通知を作成"
        description="タイトルと本文を入力して、購読者へ通知を送信します。"
        onClose={() => setDrawerOpen(false)}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <div className="h2">送信先サイト</div>
            <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name || s.id}</option>
              ))}
            </select>
            <div className="small" style={{ opacity: 0.6, marginTop: 4 }}>購読者数: <b>{subCount ?? "—"}</b> 人</div>
          </div>

          <div>
            <div className="h2">タイトル <span style={{ color: "#e53e3e" }}>*</span></div>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="例: セール開催中！" maxLength={100} />
          </div>

          <div>
            <div className="h2">本文</div>
            <input className="input" value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="例: 本日23:59まで全品20%OFF" maxLength={200} />
          </div>

          <div>
            <div className="h2">クリック先URL</div>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="例: https://example.com/sale" />
          </div>

          <div>
            <div className="h2">アイコン <span className="small" style={{ opacity: 0.6, fontWeight: 400 }}>(自動取得・上書き可)</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {icon && <img src={icon} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover", flexShrink: 0, border: "1px solid rgba(0,0,0,.1)" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
              <input className="input" value={icon} onChange={(e) => setIcon(e.target.value)}
                placeholder="https://..." style={{ flex: 1 }} />
            </div>
          </div>

          {/* プレビュー */}
          {(title || body) && (
            <div style={{ padding: "12px 16px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
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

          <div>
            <div className="h2">配信タイミング</div>
            <div style={{ display: "flex", gap: 8, marginBottom: scheduleMode === "scheduled" ? 10 : 0 }}>
              {(["now", "scheduled"] as const).map((m) => (
                <button key={m} onClick={() => setScheduleMode(m)} style={{
                  padding: "5px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                  background: scheduleMode === m ? "#0f172a" : "rgba(15,23,42,.07)",
                  color: scheduleMode === m ? "#fff" : "#64748b",
                }}>
                  {m === "now" ? "今すぐ送信" : "日時指定"}
                </button>
              ))}
            </div>
            {scheduleMode === "scheduled" && (
              <input type="datetime-local" className="input" value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={localDatetimeMin()}
                style={{ maxWidth: 260 }} />
            )}
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", paddingTop: 8 }}>
            <button className="btn btn--primary" onClick={handleSend}
              disabled={sending || !title.trim() || !siteId || (scheduleMode === "scheduled" && !scheduledAt)}>
              {sending
                ? (scheduleMode === "scheduled" ? "予約中…" : "送信中…")
                : scheduleMode === "scheduled" ? "予約する" : `今すぐ送信（${subCount ?? "—"}人）`}
            </button>
            <button className="btn btn--ghost" onClick={() => setDrawerOpen(false)}>キャンセル</button>
            {sendErr && <span style={{ fontSize: 13, color: "#e53e3e" }}>⚠ {sendErr}</span>}
          </div>
        </div>
      </RightDrawer>
    </div>
  );
}
