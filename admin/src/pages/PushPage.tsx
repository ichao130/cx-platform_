// admin/src/pages/PushPage.tsx
import React, { useEffect, useState, useCallback } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db, apiPostJson } from "../firebase";

// ─── 型 ─────────────────────────────────────────────────────────────────
type Site = { id: string; name?: string; workspaceId?: string; domains?: string[] };

function siteIconUrl(site?: Site): string {
  const domain = site?.domains?.[0];
  if (!domain) return "";
  try {
    const host = new URL(domain.startsWith("http") ? domain : `https://${domain}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch { return ""; }
}

function workspaceKeyForUid(uid: string) { return `cx_admin_workspace_id:${uid}`; }
function readSelectedWorkspaceId(uid?: string) {
  if (!uid) return "";
  try { return localStorage.getItem(workspaceKeyForUid(uid)) || ""; } catch { return ""; }
}

type Campaign = {
  id: string;
  title: string;
  body?: string;
  url?: string;
  icon?: string;
  status: string;
  sentAt?: any;
  stats?: { sent: number; failed: number };
};

// ─── ユーティリティ ───────────────────────────────────────────────────────
function formatTs(ts: any): string {
  if (!ts) return "";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
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
  const [countLoading, setCountLoading] = useState(false);

  // フォーム
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [sendErr, setSendErr] = useState("");

  // 送信履歴
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

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

  // ワークスペース内のサイト一覧取得（memberUids で権限絞り）
  useEffect(() => {
    if (!currentUid || !workspaceId) { setSites([]); setSiteId(""); return; }
    const q = query(
      collection(db, "sites"),
      where("memberUids", "array-contains", currentUid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .filter((d) => d.data().workspaceId === workspaceId)
        .map((d) => ({ id: d.id, ...(d.data() as any) }));
      setSites(list);
      setSiteId((prev) => (list.find((s) => s.id === prev) ? prev : list[0]?.id || ""));
    });
    return unsub;
  }, [currentUid, workspaceId]);

  // 購読者数
  const loadCount = useCallback(async (sid: string) => {
    if (!sid) return;
    setCountLoading(true);
    setSubCount(null);
    try {
      const res = await apiPostJson<{ ok: boolean; count: number }>("/v1/push/subscribers/count", { site_id: sid });
      setSubCount(res.count);
    } catch { setSubCount(0); }
    finally { setCountLoading(false); }
  }, []);

  // 送信履歴
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
    // サイトのファビコンをアイコンに自動セット
    const site = sites.find((s) => s.id === siteId);
    setIcon(siteIconUrl(site));
  }, [siteId, sites]);

  // 送信
  const handleSend = async () => {
    if (!siteId || !title.trim()) return;
    setSending(true);
    setSendResult(null);
    setSendErr("");
    try {
      const res = await apiPostJson<{ ok: boolean; sent: number; failed: number }>("/v1/push/send", {
        site_id: siteId,
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || "/",
        icon: icon.trim(),
      });
      setSendResult({ sent: res.sent, failed: res.failed });
      setTitle("");
      setBody("");
      setUrl("");
      setIcon("");
      loadCount(siteId);
      loadCampaigns(siteId);
    } catch (e: any) {
      setSendErr(e?.message || "送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const selectedSite = sites.find((s) => s.id === siteId);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div className="h1" style={{ marginBottom: 4 }}>Webプッシュ通知</div>
        <div className="small" style={{ color: "var(--text-muted, #888)" }}>
          購読者へプッシュ通知を送信できます。
        </div>
      </div>

      {/* サイト選択 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 12, fontWeight: 600 }}>サイト</div>
        <select
          className="input"
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          style={{ maxWidth: 360 }}
        >
          {sites.map((s) => (
            <option key={s.id} value={s.id}>{s.name || s.id}</option>
          ))}
        </select>

        {siteId && (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="small" style={{ color: "var(--text-muted, #888)" }}>購読者数：</span>
            {countLoading ? (
              <span className="small">読み込み中…</span>
            ) : (
              <span style={{ fontWeight: 700, fontSize: 20 }}>{subCount ?? "—"}</span>
            )}
            <button
              className="btn-ghost"
              style={{ fontSize: 12, padding: "2px 8px" }}
              onClick={() => loadCount(siteId)}
            >更新</button>
          </div>
        )}
      </div>

      {/* 通知作成 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16, fontWeight: 600 }}>通知を作成して送信</div>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="small" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              タイトル <span style={{ color: "#e53e3e" }}>*</span>
            </label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: セール開催中！"
              maxLength={100}
            />
          </div>

          <div>
            <label className="small" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>本文</label>
            <input
              className="input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="例: 本日23:59まで全品20%OFF"
              maxLength={200}
            />
          </div>

          <div>
            <label className="small" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              クリック先URL
            </label>
            <input
              className="input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="例: https://example.com/sale"
            />
          </div>

          <div>
            <label className="small" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              アイコン <span style={{ color: "var(--text-muted, #888)", fontWeight: 400 }}>(サイトのファビコンを自動取得)</span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {icon && (
                <img
                  src={icon}
                  alt=""
                  style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border, #e2e8f0)" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <input
                className="input"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="自動取得されます（URLで上書き可）"
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </div>

        {/* プレビュー */}
        {(title || body) && (
          <div style={{
            marginTop: 16,
            padding: "12px 16px",
            background: "var(--bg-surface, #f8f9fa)",
            borderRadius: 8,
            border: "1px solid var(--border, #e2e8f0)",
          }}>
            <div className="small" style={{ color: "var(--text-muted, #888)", marginBottom: 8 }}>プレビュー</div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              {icon && (
                <img
                  src={icon}
                  alt=""
                  style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{title || "（タイトル）"}</div>
                {body && <div style={{ fontSize: 13, color: "var(--text-muted, #555)", marginTop: 2 }}>{body}</div>}
                {url && <div style={{ fontSize: 11, color: "var(--text-muted, #888)", marginTop: 2 }}>{url}</div>}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
          <button
            className="btn-primary"
            onClick={handleSend}
            disabled={sending || !title.trim() || !siteId}
          >
            {sending ? "送信中…" : `送信する（${subCount ?? "—"}人）`}
          </button>

          {sendResult && (
            <span style={{ fontSize: 13, color: "#38a169" }}>
              ✓ 送信完了 — {sendResult.sent}件成功 / {sendResult.failed}件失敗
            </span>
          )}
          {sendErr && (
            <span style={{ fontSize: 13, color: "#e53e3e" }}>⚠ {sendErr}</span>
          )}
        </div>
      </div>

      {/* 送信履歴 */}
      <div className="card">
        <div style={{ marginBottom: 16, fontWeight: 600 }}>送信履歴</div>

        {campaignsLoading ? (
          <div className="small" style={{ color: "var(--text-muted, #888)" }}>読み込み中…</div>
        ) : campaigns.length === 0 ? (
          <div className="small" style={{ color: "var(--text-muted, #888)" }}>まだ送信履歴がありません</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border, #e2e8f0)" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>タイトル</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>本文</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>送信</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>失敗</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>日時</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border, #f0f0f0)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</td>
                  <td style={{ padding: "8px 12px", color: "var(--text-muted, #555)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.body || "—"}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{c.stats?.sent ?? "—"}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: (c.stats?.failed ?? 0) > 0 ? "#e53e3e" : undefined }}>{c.stats?.failed ?? "—"}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-muted, #888)" }}>{formatTs(c.sentAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 実装メモ */}
      <div style={{ marginTop: 20, padding: "16px", background: "var(--bg-surface, #f8f9fa)", borderRadius: 8, border: "1px solid var(--border, #e2e8f0)" }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>📋 購読してもらうには</div>
        <div style={{ fontSize: 13, color: "var(--text-muted, #555)", lineHeight: 1.7 }}>
          シナリオのアクション（ボタンクリックなど）から <code style={{ background: "#eee", padding: "1px 4px", borderRadius: 3 }}>window.mokkeda.push.requestPermission()</code> を呼ぶと許可ダイアログが表示されます。
          接客ポップアップで「通知を受け取る」ボタンを作って、クリック時にこの関数を呼ぶのがおすすめです。
        </div>
      </div>
    </div>
  );
}
