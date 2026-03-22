import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { db } from "../firebase";

// ---- helpers ----
function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function safeNum(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function fmtInt(n: any) {
  return safeNum(n).toLocaleString("ja-JP");
}

function pct(num: number, denom: number) {
  if (!denom) return "—";
  return (Math.round((num / denom) * 1000) / 10).toFixed(1) + "%";
}

function workspaceKeyForUid(uid: string) {
  return `cx_admin_workspace_id:${uid}`;
}

function readSelectedWorkspaceId(uid?: string) {
  if (!uid) return "";
  try {
    return localStorage.getItem(workspaceKeyForUid(uid)) || "";
  } catch {
    return "";
  }
}

// ---- MiniBar: シンプルな横棒グラフ ----
function MiniBar({ value, max, color = "#59b7c6" }: { value: number; max: number; color?: string }) {
  const pctVal = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ height: 8, background: "rgba(15,23,42,.07)", borderRadius: 99, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${pctVal}%`, background: color, borderRadius: 99, transition: "width .4s ease" }} />
    </div>
  );
}

// ---- FunnelBar ----
function FunnelStep({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const w = total > 0 ? Math.max(4, Math.round((count / total) * 100)) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span className="small">{label}</span>
        <span className="small" style={{ fontWeight: 700 }}>
          {fmtInt(count)}
          <span style={{ opacity: 0.55, fontWeight: 400, marginLeft: 6 }}>{pct(count, total)}</span>
        </span>
      </div>
      <div style={{ height: 12, background: "rgba(15,23,42,.07)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 99, transition: "width .5s ease" }} />
      </div>
    </div>
  );
}

// ---- StatCard ----
function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="card" style={{ padding: 18, background: "#fff", border: "1px solid rgba(15,23,42,.08)", minWidth: 0 }}>
      <div className="small" style={{ opacity: 0.68 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1, marginTop: 6, letterSpacing: "-.03em", color: accent || "inherit" }}>
        {value}
      </div>
      {sub && <div className="small" style={{ opacity: 0.6, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ---- Event badge color ----
const EVENT_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  pageview:   { bg: "#f1f5f9", text: "#64748b", label: "PV" },
  impression: { bg: "#eff6ff", text: "#2563eb", label: "表示" },
  click:      { bg: "#fffbeb", text: "#d97706", label: "クリック" },
  click_link: { bg: "#fff7ed", text: "#ea580c", label: "リンク" },
  conversion: { bg: "#f0fdf4", text: "#16a34a", label: "CV ✓" },
  close:      { bg: "#f8fafc", text: "#94a3b8", label: "閉じる" },
  pageleave:  { bg: "#faf5ff", text: "#7c3aed", label: "離脱" },
};

function EventBadge({ event }: { event: string }) {
  const c = EVENT_COLOR[event] || { bg: "#f1f5f9", text: "#64748b", label: event };
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 700,
      padding: "2px 8px", borderRadius: 20,
      background: c.bg, color: c.text, whiteSpace: "nowrap",
    }}>
      {c.label}
    </span>
  );
}

// ---- Live dot ----
function LiveDot() {
  return (
    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: "#22c55e", marginRight: 6, boxShadow: "0 0 0 2px rgba(34,197,94,.28)", animation: "pulse 1.6s ease infinite" }} />
  );
}

// ---- RecentEventRow ----
function RecentEventRow({ ev }: { ev: any }) {
  const eventColor: Record<string, string> = {
    pageview: "#6b7280",
    impression: "#2563eb",
    click: "#f59e0b",
    click_link: "#f97316",
    conversion: "#16a34a",
    close: "#9ca3af",
  };
  const color = eventColor[ev.event] || "#6b7280";
  const time = ev.createdAt ? new Date(ev.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(15,23,42,.05)" }}>
      <span style={{ display: "inline-block", minWidth: 72, fontSize: 11, fontWeight: 700, color, background: `${color}18`, borderRadius: 6, padding: "2px 7px", textAlign: "center" }}>
        {ev.event}
      </span>
      <span className="small" style={{ flex: 1, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {ev.path || ev.url || "—"}
      </span>
      <span className="small" style={{ opacity: 0.45, flex: "0 0 auto" }}>{time}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [uid, setUid] = useState<string>("");
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [sites, setSites] = useState<Array<{ id: string; data: any }>>([]);
  const [siteId, setSiteId] = useState<string>("");
  const [scenarios, setScenarios] = useState<Array<{ id: string; data: any }>>([]);
  const [dateRange, setDateRange] = useState<7 | 14 | 30>(14);

  // ---- リアルタイムログ ----
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  // ---- pageview logs（流入元用） ----
  const [pvLogs, setPvLogs] = useState<any[]>([]);
  const [pvLoading, setPvLoading] = useState(false);

  // ---- stats_daily（ファネル用） ----
  const [statRows, setStatRows] = useState<any[]>([]);

  // ---- 訪問者ジャーニー ----
  const [journeyLogs, setJourneyLogs] = useState<any[]>([]);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [selectedVid, setSelectedVid] = useState<string | null>(null);

  // auth
  useEffect(() => {
    return onAuthStateChanged(getAuth(), (u) => {
      if (u) {
        setUid(u.uid);
        const wid = readSelectedWorkspaceId(u.uid);
        setWorkspaceId(wid);
      }
    });
  }, []);

  useEffect(() => {
    const onChanged = (e: any) => {
      const wid = e?.detail?.workspaceId || readSelectedWorkspaceId(uid);
      if (wid) setWorkspaceId(wid);
    };
    window.addEventListener("cx_admin_workspace_changed" as any, onChanged);
    return () => window.removeEventListener("cx_admin_workspace_changed" as any, onChanged);
  }, [uid]);

  // sites
  useEffect(() => {
    if (!workspaceId) return;
    const q = query(collection(db, "sites"), where("workspaceId", "==", workspaceId), orderBy("__name__"));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
      setSites(list);
      if (!siteId && list.length) setSiteId(list[0].id);
    });
  }, [workspaceId]);

  // scenarios
  useEffect(() => {
    if (!siteId) { setScenarios([]); return; }
    const q = query(collection(db, "scenarios"), where("siteId", "==", siteId), orderBy("__name__"));
    return onSnapshot(q, (snap) => {
      setScenarios(snap.docs.map((d) => ({ id: d.id, data: d.data() })));
    });
  }, [siteId]);

  // ---- リアルタイムログ（onSnapshot: 直近50件） ----
  useEffect(() => {
    if (!siteId) { setRecentLogs([]); return; }
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const q = query(
      collection(db, "logs"),
      where("site_id", "==", siteId),
      where("createdAt", ">", since),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    return onSnapshot(q, (snap) => {
      setRecentLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [siteId]);

  // ---- pageview logs（流入元用） ----
  useEffect(() => {
    if (!siteId) { setPvLogs([]); return; }
    setPvLoading(true);
    const since = daysAgo(dateRange).toISOString();
    getDocs(
      query(
        collection(db, "logs"),
        where("site_id", "==", siteId),
        where("event", "==", "pageview"),
        where("createdAt", ">", since),
        limit(2000)
      )
    ).then((snap) => {
      setPvLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPvLoading(false);
    }).catch(() => setPvLoading(false));
  }, [siteId, dateRange]);

  // ---- 訪問者ジャーニー用ログ（全イベント取得） ----
  useEffect(() => {
    if (!siteId) { setJourneyLogs([]); setSelectedVid(null); return; }
    setJourneyLoading(true);
    const since = daysAgo(dateRange).toISOString();
    getDocs(
      query(
        collection(db, "logs"),
        where("site_id", "==", siteId),
        where("createdAt", ">", since),
        orderBy("createdAt", "desc"),
        limit(3000)
      )
    ).then((snap) => {
      setJourneyLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setJourneyLoading(false);
    }).catch(() => setJourneyLoading(false));
  }, [siteId, dateRange]);

  // ---- stats_daily ----
  useEffect(() => {
    if (!siteId) { setStatRows([]); return; }
    const days: string[] = [];
    for (let i = 0; i < dateRange; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(isoDay(d));
    }
    const q = query(
      collection(db, "stats_daily"),
      where("siteId", "==", siteId),
      where("day", "in", days.slice(0, 30))
    );
    return onSnapshot(q, (snap) => {
      setStatRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [siteId, dateRange]);

  // ---- computed: リアルタイム ----
  const activeVisitors = useMemo(() => {
    const vids = new Set(recentLogs.map((l) => l.vid).filter(Boolean));
    return vids.size;
  }, [recentLogs]);

  const todayStr = isoDay(new Date());
  const todayPvCount = useMemo(() => pvLogs.filter((l) => (l.createdAt || "").startsWith(todayStr)).length, [pvLogs, todayStr]);
  const todayImpCount = useMemo(() => {
    return statRows.filter((r) => r.day === todayStr && r.event === "impression").reduce((s, r) => s + safeNum(r.count), 0);
  }, [statRows, todayStr]);
  const todayCvCount = useMemo(() => {
    return statRows.filter((r) => r.day === todayStr && r.event === "conversion").reduce((s, r) => s + safeNum(r.count), 0);
  }, [statRows, todayStr]);

  // ---- computed: 流入元（utm_source or ref） ----
  const referrerData = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of pvLogs) {
      const src = l.utm_source || (l.ref ? (new URL(l.ref, "http://x").hostname || l.ref) : "") || "直接流入";
      map.set(src, (map.get(src) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([src, count]) => ({ src, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [pvLogs]);

  const referrerMax = useMemo(() => Math.max(...referrerData.map((r) => r.count), 1), [referrerData]);

  // ---- computed: UTM campaign ----
  const campaignData = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of pvLogs) {
      const c = l.utm_campaign || "（なし）";
      map.set(c, (map.get(c) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([campaign, count]) => ({ campaign, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [pvLogs]);

  // ---- computed: ページ別PV ----
  const pageData = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of pvLogs) {
      const p = l.path || "/";
      map.set(p, (map.get(p) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [pvLogs]);

  const pageMax = useMemo(() => Math.max(...pageData.map((r) => r.count), 1), [pageData]);

  // ---- computed: シナリオファネル ----
  const funnelData = useMemo(() => {
    return scenarios.map((sc) => {
      const rows = statRows.filter((r) => r.scenarioId === sc.id);
      const imp = rows.filter((r) => r.event === "impression").reduce((s, r) => s + safeNum(r.count), 0);
      const clk = rows.filter((r) => r.event === "click" || r.event === "click_link").reduce((s, r) => s + safeNum(r.count), 0);
      const cv = rows.filter((r) => r.event === "conversion").reduce((s, r) => s + safeNum(r.count), 0);
      const cvr = imp > 0 ? Math.round((cv / imp) * 1000) / 10 : 0;
      return { id: sc.id, name: String(sc.data?.name || sc.id), imp, clk, cv, cvr };
    }).sort((a, b) => b.cvr - a.cvr);
  }, [scenarios, statRows]);

  // ---- computed: 施策比較テーブル ----
  const comparisonData = useMemo(() => [...funnelData], [funnelData]);

  // ---- computed: 最近のセッション ----
  const sessionData = useMemo(() => {
    const map = new Map<string, { sid: string; vid: string; pages: string[]; events: string[]; start: string; last: string }>();
    const sorted = [...recentLogs].sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    for (const l of sorted) {
      const sid = l.sid || l.vid || "unknown";
      if (!map.has(sid)) map.set(sid, { sid, vid: l.vid || "", pages: [], events: [], start: l.createdAt || "", last: l.createdAt || "" });
      const s = map.get(sid)!;
      if (l.path && (s.pages.length === 0 || s.pages[s.pages.length - 1] !== l.path)) s.pages.push(l.path);
      s.events.push(l.event);
      s.last = l.createdAt || s.last;
    }
    return Array.from(map.values())
      .sort((a, b) => String(b.last || "").localeCompare(String(a.last || "")))
      .slice(0, 8);
  }, [recentLogs]);

  // ---- computed: 訪問者リスト（vid別集計） ----
  const visitorList = useMemo(() => {
    const map = new Map<string, {
      vid: string; firstSeen: string; lastSeen: string;
      pvCount: number; totalDuration: number;
      hasConversion: boolean; hasImpression: boolean;
      pages: string[]; eventCount: number;
    }>();
    const sorted = [...journeyLogs].sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    for (const l of sorted) {
      const vid = l.vid || "unknown";
      if (!map.has(vid)) {
        map.set(vid, { vid, firstSeen: l.createdAt || "", lastSeen: l.createdAt || "", pvCount: 0, totalDuration: 0, hasConversion: false, hasImpression: false, pages: [], eventCount: 0 });
      }
      const v = map.get(vid)!;
      v.lastSeen = l.createdAt || v.lastSeen;
      v.eventCount++;
      if (l.event === "pageview") {
        v.pvCount++;
        if (l.path && !v.pages.includes(l.path)) v.pages.push(l.path);
      }
      if (l.event === "conversion") v.hasConversion = true;
      if (l.event === "impression") v.hasImpression = true;
      if (l.event === "pageleave" && l.duration_sec) v.totalDuration += Number(l.duration_sec);
    }
    return Array.from(map.values())
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
      .slice(0, 50);
  }, [journeyLogs]);

  // ---- computed: 選択中訪問者のイベント一覧 ----
  const selectedJourney = useMemo(() => {
    if (!selectedVid) return [];
    return journeyLogs
      .filter((l) => l.vid === selectedVid)
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  }, [journeyLogs, selectedVid]);

  const selectedSiteName = useMemo(() => {
    const s = sites.find((s) => s.id === siteId);
    return String(s?.data?.name || s?.data?.siteName || siteId || "");
  }, [sites, siteId]);

  return (
    <div style={{ padding: "28px 0 48px" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="h1" style={{ margin: 0 }}>流入計測</div>
          <div className="small" style={{ opacity: 0.64, marginTop: 4 }}>
            どこから来たか・どこで動いたか・施策の効果をリアルタイムで確認できます
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* サイト選択 */}
          <select
            className="input"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            style={{ minWidth: 160 }}
          >
            {sites.length === 0 && <option value="">（サイトなし）</option>}
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {String(s.data?.name || s.data?.siteName || s.id)}
              </option>
            ))}
          </select>
          {/* 期間選択 */}
          <div style={{ display: "flex", border: "1px solid rgba(15,23,42,.12)", borderRadius: 10, overflow: "hidden" }}>
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDateRange(d)}
                style={{
                  padding: "7px 14px",
                  border: "none",
                  background: dateRange === d ? "#1f6573" : "transparent",
                  color: dateRange === d ? "#fff" : "inherit",
                  fontWeight: dateRange === d ? 700 : 500,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {d}日
              </button>
            ))}
          </div>
        </div>
      </div>

      {!siteId && (
        <div className="card" style={{ padding: 24, textAlign: "center", opacity: 0.7 }}>
          <div className="small">サイトを選択してください</div>
        </div>
      )}

      {siteId && (
        <>
          {/* ===== Section 1: リアルタイム ===== */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <LiveDot />
              <div className="h2" style={{ margin: 0 }}>リアルタイム <span className="small" style={{ fontWeight: 400, opacity: 0.6 }}>（過去30分）</span></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
              <StatCard label="アクティブ訪問者" value={fmtInt(activeVisitors)} sub="ユニーク訪問者数" accent="#22c55e" />
              <StatCard label="今日のPV" value={fmtInt(todayPvCount)} sub="ページビュー" />
              <StatCard label="今日の施策表示" value={fmtInt(todayImpCount)} sub="インプレッション" accent="#2563eb" />
              <StatCard label="今日のCV" value={fmtInt(todayCvCount)} sub="コンバージョン" accent="#f59e0b" />
            </div>
            {/* 直近のイベントフィード */}
            <div className="card" style={{ padding: 18, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div className="small" style={{ fontWeight: 700 }}>直近のイベント</div>
                <div className="small" style={{ opacity: 0.5 }}>{recentLogs.length} 件</div>
              </div>
              {recentLogs.length === 0 ? (
                <div className="small" style={{ opacity: 0.55, textAlign: "center", padding: "12px 0" }}>
                  直近30分のイベントはありません
                </div>
              ) : (
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {recentLogs.slice(0, 30).map((ev) => (
                    <RecentEventRow key={ev.id} ev={ev} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== Section 2: 流入元 ===== */}
          <div style={{ marginBottom: 32 }}>
            <div className="h2" style={{ marginBottom: 14 }}>
              流入元 <span className="small" style={{ fontWeight: 400, opacity: 0.6 }}>（過去{dateRange}日間）</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* 流入元（utm_source / リファラー） */}
              <div className="card" style={{ padding: 18, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                  <div className="small" style={{ fontWeight: 700 }}>流入元（utm_source / リファラー）</div>
                  <div className="small" style={{ opacity: 0.5 }}>PV数</div>
                </div>
                {pvLoading ? (
                  <div className="small" style={{ opacity: 0.55 }}>読み込み中...</div>
                ) : referrerData.length === 0 ? (
                  <div className="small" style={{ opacity: 0.55 }}>データなし（SDKをv5以降に更新するとUTM計測が有効になります）</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {referrerData.map((r) => (
                      <div key={r.src} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="small" style={{ minWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.82 }} title={r.src}>{r.src}</div>
                        <MiniBar value={r.count} max={referrerMax} color="#59b7c6" />
                        <div className="small" style={{ minWidth: 40, textAlign: "right", fontWeight: 700 }}>{fmtInt(r.count)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ページ別PV */}
              <div className="card" style={{ padding: 18, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                  <div className="small" style={{ fontWeight: 700 }}>よく見られたページ</div>
                  <div className="small" style={{ opacity: 0.5 }}>PV数</div>
                </div>
                {pvLoading ? (
                  <div className="small" style={{ opacity: 0.55 }}>読み込み中...</div>
                ) : pageData.length === 0 ? (
                  <div className="small" style={{ opacity: 0.55 }}>データなし</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {pageData.map((r) => (
                      <div key={r.path} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="small" style={{ minWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.82 }} title={r.path}>{r.path}</div>
                        <MiniBar value={r.count} max={pageMax} color="#6366f1" />
                        <div className="small" style={{ minWidth: 40, textAlign: "right", fontWeight: 700 }}>{fmtInt(r.count)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* UTMキャンペーン */}
            {campaignData.some((c) => c.campaign !== "（なし）") && (
              <div className="card" style={{ padding: 18, background: "#fff", marginTop: 16 }}>
                <div className="small" style={{ fontWeight: 700, marginBottom: 14 }}>UTMキャンペーン別</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {campaignData.filter((c) => c.campaign !== "（なし）").map((c) => (
                    <div key={c.campaign} className="badge" style={{ background: "rgba(89,183,198,.12)", color: "#1f6573" }}>
                      {c.campaign}
                      <span style={{ marginLeft: 6, fontWeight: 700 }}>{fmtInt(c.count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ===== Section 3: 施策ファネル ===== */}
          <div style={{ marginBottom: 32 }}>
            <div className="h2" style={{ marginBottom: 14 }}>
              施策ファネル <span className="small" style={{ fontWeight: 400, opacity: 0.6 }}>（過去{dateRange}日間）</span>
            </div>
            {funnelData.length === 0 ? (
              <div className="card" style={{ padding: 20, opacity: 0.7 }}>
                <div className="small">シナリオがないか、まだデータがありません</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {funnelData.slice(0, 6).map((sc) => (
                  <div key={sc.id} className="card" style={{ padding: 18, background: "#fff" }}>
                    <div style={{ fontWeight: 700, marginBottom: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={sc.name}>
                      {sc.name}
                    </div>
                    <FunnelStep label="表示（インプレッション）" count={sc.imp} total={sc.imp} color="#2563eb" />
                    <FunnelStep label="クリック" count={sc.clk} total={sc.imp} color="#f59e0b" />
                    <FunnelStep label="コンバージョン" count={sc.cv} total={sc.imp} color="#16a34a" />
                    <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                      <span className="badge" style={{ background: "rgba(22,163,74,.1)", color: "#16a34a", fontWeight: 700 }}>
                        CVR {sc.cvr}%
                      </span>
                      <span className="badge" style={{ background: "rgba(37,99,235,.08)", color: "#2563eb" }}>
                        CTR {pct(sc.clk, sc.imp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ===== Section 4: 施策比較テーブル ===== */}
          <div style={{ marginBottom: 32 }}>
            <div className="h2" style={{ marginBottom: 14 }}>
              施策比較 <span className="small" style={{ fontWeight: 400, opacity: 0.6 }}>CVR順</span>
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden", background: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(15,23,42,.08)", background: "rgba(15,23,42,.02)" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, opacity: 0.7 }}>施策名</th>
                    <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, opacity: 0.7 }}>表示</th>
                    <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, opacity: 0.7 }}>クリック</th>
                    <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, opacity: 0.7 }}>CV</th>
                    <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, opacity: 0.7 }}>CVR</th>
                    <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, opacity: 0.7 }}>CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "20px 16px", textAlign: "center", opacity: 0.55 }}>データなし</td>
                    </tr>
                  ) : (
                    comparisonData.map((sc, i) => (
                      <tr key={sc.id} style={{ borderBottom: "1px solid rgba(15,23,42,.05)", background: i === 0 && sc.cvr > 0 ? "rgba(22,163,74,.03)" : undefined }}>
                        <td style={{ padding: "10px 16px", fontWeight: 600 }}>
                          {i === 0 && sc.cvr > 0 && <span style={{ marginRight: 6, fontSize: 12 }}>🏆</span>}
                          {sc.name}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>{fmtInt(sc.imp)}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>{fmtInt(sc.clk)}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: sc.cv > 0 ? "#16a34a" : undefined }}>{fmtInt(sc.cv)}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: sc.cvr > 0 ? "#16a34a" : undefined }}>{sc.cvr}%</td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>{pct(sc.clk, sc.imp)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== Section 5: セッション行動 ===== */}
          <div style={{ marginBottom: 32 }}>
            <div className="h2" style={{ marginBottom: 14 }}>
              セッション行動 <span className="small" style={{ fontWeight: 400, opacity: 0.6 }}>（過去30分・最新8セッション）</span>
            </div>
            {sessionData.length === 0 ? (
              <div className="card" style={{ padding: 20, opacity: 0.7 }}>
                <div className="small">直近30分のセッションデータがありません</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {sessionData.map((s) => {
                  const hasConversion = s.events.includes("conversion");
                  const hasImpression = s.events.includes("impression");
                  return (
                    <div key={s.sid} className="card" style={{ padding: 14, background: "#fff", display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ flex: "0 0 auto" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 99, background: hasConversion ? "rgba(22,163,74,.12)" : hasImpression ? "rgba(37,99,235,.1)" : "rgba(15,23,42,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                          {hasConversion ? "✅" : hasImpression ? "👤" : "👁"}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                          {hasConversion && <span className="badge" style={{ background: "rgba(22,163,74,.12)", color: "#16a34a" }}>CV済み</span>}
                          {hasImpression && !hasConversion && <span className="badge" style={{ background: "rgba(37,99,235,.08)", color: "#2563eb" }}>施策表示</span>}
                          <span className="badge">{s.events.filter((e) => e === "pageview").length} PV</span>
                          <span className="small" style={{ opacity: 0.5, alignSelf: "center" }}>
                            {s.last ? new Date(s.last).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                          {s.pages.map((p, i) => (
                            <React.Fragment key={i}>
                              <span className="small" style={{ background: "rgba(15,23,42,.05)", borderRadius: 6, padding: "2px 8px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p}>
                                {p}
                              </span>
                              {i < s.pages.length - 1 && <span style={{ opacity: 0.35, fontSize: 11 }}>→</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* ===== Section 6: 訪問者ジャーニー ===== */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div className="h2" style={{ margin: 0 }}>
                  訪問者ジャーニー
                  <span className="small" style={{ fontWeight: 400, opacity: 0.6, marginLeft: 8 }}>（過去{dateRange}日間・匿名ID別）</span>
                </div>
                <div className="small" style={{ opacity: 0.55, marginTop: 2 }}>
                  訪問者を選択すると行動タイムラインが表示されます
                </div>
              </div>
              {journeyLoading && <div className="small" style={{ opacity: 0.5 }}>読み込み中...</div>}
            </div>

            {visitorList.length === 0 && !journeyLoading ? (
              <div className="card" style={{ padding: 20, opacity: 0.7 }}>
                <div className="small">期間内の訪問データがありません</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>

                {/* 左: 訪問者リスト */}
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(15,23,42,.07)", background: "rgba(15,23,42,.02)" }}>
                    <div className="small" style={{ fontWeight: 700 }}>訪問者 {visitorList.length}人</div>
                  </div>
                  <div style={{ maxHeight: 560, overflowY: "auto" }}>
                    {visitorList.map((v) => {
                      const isSelected = selectedVid === v.vid;
                      const durationMin = Math.round(v.totalDuration / 60);
                      const lastTime = v.lastSeen ? new Date(v.lastSeen).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
                      const vidShort = v.vid.slice(0, 8) + "…";
                      // vid から色を生成
                      const hue = v.vid.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
                      return (
                        <div
                          key={v.vid}
                          onClick={() => setSelectedVid(isSelected ? null : v.vid)}
                          style={{
                            padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid rgba(15,23,42,.05)",
                            background: isSelected ? `hsla(${hue},60%,96%,1)` : "transparent",
                            borderLeft: isSelected ? `3px solid hsl(${hue},60%,50%)` : "3px solid transparent",
                            transition: "background .15s",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {/* アバター */}
                            <div style={{
                              width: 32, height: 32, borderRadius: 99, flexShrink: 0,
                              background: `hsl(${hue},60%,88%)`, color: `hsl(${hue},60%,35%)`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontWeight: 800, fontSize: 13,
                            }}>
                              {v.vid.slice(0, 1).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                <code style={{ fontSize: 11, opacity: 0.7 }}>{vidShort}</code>
                                {v.hasConversion && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: "#f0fdf4", color: "#16a34a" }}>CV</span>
                                )}
                                {v.hasImpression && !v.hasConversion && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: "#eff6ff", color: "#2563eb" }}>施策</span>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <span className="small" style={{ opacity: 0.55 }}>{v.pvCount} PV</span>
                                {v.totalDuration > 0 && (
                                  <span className="small" style={{ opacity: 0.55 }}>
                                    {durationMin > 0 ? `${durationMin}分` : `${v.totalDuration}秒`}滞在
                                  </span>
                                )}
                                <span className="small" style={{ opacity: 0.4 }}>{lastTime}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 右: タイムライン */}
                <div className="card" style={{ padding: 0, overflow: "hidden", minHeight: 200 }}>
                  {!selectedVid ? (
                    <div style={{ padding: 32, textAlign: "center", opacity: 0.5 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>👈</div>
                      <div className="small">左の訪問者を選択してください</div>
                    </div>
                  ) : (
                    <>
                      {/* タイムラインヘッダー */}
                      <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(15,23,42,.07)", background: "rgba(15,23,42,.02)", display: "flex", alignItems: "center", gap: 10 }}>
                        {(() => {
                          const v = visitorList.find((x) => x.vid === selectedVid);
                          const hue = selectedVid.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
                          return (
                            <>
                              <div style={{ width: 28, height: 28, borderRadius: 99, background: `hsl(${hue},60%,88%)`, color: `hsl(${hue},60%,35%)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>
                                {selectedVid.slice(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700 }}><code>{selectedVid}</code></div>
                                {v && (
                                  <div className="small" style={{ opacity: 0.55 }}>
                                    {v.pvCount} ページ閲覧 · {v.eventCount} イベント
                                    {v.totalDuration > 0 && ` · 計${Math.round(v.totalDuration / 60) > 0 ? Math.round(v.totalDuration / 60) + "分" : v.totalDuration + "秒"}滞在`}
                                    {v.hasConversion && " · CV達成 ✓"}
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* タイムライン本体 */}
                      <div style={{ maxHeight: 520, overflowY: "auto", padding: "16px 20px" }}>
                        {selectedJourney.length === 0 ? (
                          <div className="small" style={{ opacity: 0.5 }}>イベントがありません</div>
                        ) : (
                          <div style={{ position: "relative" }}>
                            {/* 縦線 */}
                            <div style={{ position: "absolute", left: 15, top: 8, bottom: 8, width: 2, background: "rgba(15,23,42,.07)", borderRadius: 99 }} />
                            <div style={{ display: "grid", gap: 0 }}>
                              {selectedJourney.map((ev, i) => {
                                const isConversion = ev.event === "conversion";
                                const isPageleave = ev.event === "pageleave";
                                const time = ev.createdAt
                                  ? new Date(ev.createdAt).toLocaleTimeString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })
                                  : "—";
                                const dotColor = isConversion ? "#16a34a" : EVENT_COLOR[ev.event]?.text || "#94a3b8";
                                return (
                                  <div key={ev.id || i} style={{ display: "flex", gap: 16, paddingBottom: 16, position: "relative" }}>
                                    {/* ドット */}
                                    <div style={{ flexShrink: 0, width: 32, display: "flex", justifyContent: "center", paddingTop: 2 }}>
                                      <div style={{
                                        width: isConversion ? 14 : 10, height: isConversion ? 14 : 10,
                                        borderRadius: 99, background: dotColor,
                                        border: isConversion ? `2px solid #fff` : "none",
                                        boxShadow: isConversion ? `0 0 0 3px ${dotColor}40` : "none",
                                        marginTop: isConversion ? -2 : 0,
                                        zIndex: 1, position: "relative",
                                      }} />
                                    </div>
                                    {/* コンテンツ */}
                                    <div style={{
                                      flex: 1, background: isConversion ? "#f0fdf4" : "rgba(15,23,42,.025)",
                                      borderRadius: 8, padding: "8px 12px",
                                      border: isConversion ? "1px solid #bbf7d0" : "1px solid transparent",
                                    }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                        <EventBadge event={ev.event} />
                                        <span className="small" style={{ opacity: 0.5, fontSize: 11 }}>{time}</span>
                                      </div>
                                      {ev.path && (
                                        <div className="small" style={{ fontWeight: 600, opacity: 0.8, marginBottom: isPageleave || ev.scenario_id ? 4 : 0 }}>
                                          {ev.path}
                                        </div>
                                      )}
                                      {isPageleave && ev.duration_sec != null && (
                                        <div className="small" style={{ opacity: 0.55 }}>
                                          滞在時間: {ev.duration_sec >= 60 ? `${Math.floor(ev.duration_sec / 60)}分${ev.duration_sec % 60}秒` : `${ev.duration_sec}秒`}
                                        </div>
                                      )}
                                      {ev.scenario_id && (
                                        <div className="small" style={{ opacity: 0.55 }}>
                                          シナリオ: <code style={{ fontSize: 10 }}>{ev.scenario_id}</code>
                                        </div>
                                      )}
                                      {ev.utm_source && (
                                        <div className="small" style={{ opacity: 0.55 }}>
                                          流入: {[ev.utm_source, ev.utm_medium, ev.utm_campaign].filter(Boolean).join(" / ")}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .6; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
