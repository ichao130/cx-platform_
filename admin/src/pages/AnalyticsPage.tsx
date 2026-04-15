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
import {
  AreaChart,
  Area,
  BarChart,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
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

// UTC ISO文字列をJST日付文字列に変換（UTC+9）
function utcIsoToJstDay(createdAt: string): string {
  if (!createdAt) return "";
  return isoDay(new Date(new Date(createdAt).getTime() + 9 * 60 * 60 * 1000));
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

function siteKey(workspaceId: string) {
  return `cx_admin_site_id:${workspaceId}`;
}
function readSelectedSiteId(workspaceId: string) {
  return localStorage.getItem(siteKey(workspaceId)) || "";
}
function writeSelectedSiteId(workspaceId: string, siteId: string) {
  localStorage.setItem(siteKey(workspaceId), siteId);
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

// ---- BarRow: ラベル＋横棒＋%付きグラフ行 ----
function BarRow({ label, value, max, total, color, href }: {
  label: string; value: number; max: number; total: number; color: string; href?: string;
}) {
  const barPct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  const totalPct = total > 0 ? Math.round((value / total) * 100) : 0;
  const labelEl = href ? (
    <a href={href} target="_blank" rel="noreferrer" className="small"
      style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "inherit", textDecoration: "underline", textDecorationColor: "rgba(99,102,241,.35)" }}
      title={label}>{label}</a>
  ) : (
    <span className="small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.82 }} title={label}>{label}</span>
  );
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, gap: 6 }}>
        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>{labelEl}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexShrink: 0 }}>
          <span className="small" style={{ opacity: 0.45, fontSize: 11 }}>{totalPct}%</span>
          <span className="small" style={{ fontWeight: 700, minWidth: 28, textAlign: "right" }}>{value.toLocaleString()}</span>
        </div>
      </div>
      <div style={{ height: 10, background: "rgba(15,23,42,.07)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${barPct}%`, background: color, borderRadius: 99, transition: "width .5s ease" }} />
      </div>
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
  purchase:   { bg: "#fefce8", text: "#ca8a04", label: "💰 購入" },
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

// ---- TrendChart: SVG折れ線グラフ ----
type TrendLine = { key: string; label: string; color: string };
type TrendPoint = { day: string; label: string; [key: string]: number | string };

function TrendChart({ data, lines }: { data: TrendPoint[]; lines: TrendLine[] }) {
  const W = 560, H = 160;
  const pad = { t: 14, r: 12, b: 28, l: 38 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;
  const n = data.length;

  if (n < 2) {
    return (
      <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4, fontSize: 13 }}>
        データ不足
      </div>
    );
  }

  const maxVal = Math.max(...data.flatMap((d) => lines.map((l) => Number(d[l.key]) || 0)), 1);
  const px = (i: number) => pad.l + (i / (n - 1)) * iW;
  const py = (v: number) => pad.t + iH - (Math.min(v, maxVal) / maxVal) * iH;

  const yTicks = [0, Math.ceil(maxVal / 2), maxVal];
  const step = Math.max(1, Math.floor(n / 6));
  const xLabels = data
    .map((d, i) => (i % step === 0 || i === n - 1 ? { i, label: d.label as string } : null))
    .filter(Boolean) as { i: number; label: string }[];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      {/* グリッド */}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={py(v)} y2={py(v)} stroke="rgba(15,23,42,.07)" strokeWidth={1} />
          <text x={pad.l - 5} y={py(v) + 4} textAnchor="end" fontSize={9} fill="rgba(15,23,42,.38)">
            {v >= 1000 ? `${(Math.round(v / 100) / 10).toFixed(1)}k` : v}
          </text>
        </g>
      ))}
      {/* 折れ線 */}
      {lines.map((line) => {
        const pts = data.map((d, i) => `${px(i).toFixed(1)},${py(Number(d[line.key]) || 0).toFixed(1)}`).join(" L ");
        return (
          <g key={line.key}>
            <path d={`M ${pts}`} fill="none" stroke={line.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
            {data.map((d, i) =>
              Number(d[line.key]) > 0 ? (
                <circle key={i} cx={px(i)} cy={py(Number(d[line.key]))} r={3.5} fill={line.color} stroke="#fff" strokeWidth={1.5} />
              ) : null
            )}
          </g>
        );
      })}
      {/* X軸ラベル */}
      {xLabels.map(({ i, label }) => (
        <text key={i} x={px(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="rgba(15,23,42,.42)">
          {label}
        </text>
      ))}
    </svg>
  );
}

// ---- Live dot ----
function formatRef(ref: string | null | undefined): string {
  if (!ref) return "直接流入";
  try { return new URL(ref).hostname || ref; } catch { return ref; }
}

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
  const [dateRange, setDateRange] = useState<7 | 14 | 30 | "custom">(14);

  const [customFrom, setCustomFrom] = useState<string>(isoDay(daysAgo(13))); // 2週間前
  const [customTo, setCustomTo] = useState<string>(isoDay(new Date()));

  // 今日の日付（深夜0時に自動更新してクエリを再実行させる）
  const [todayStr, setTodayStr] = useState<string>(isoDay(new Date()));
  useEffect(() => {
    const id = setInterval(() => {
      const newDay = isoDay(new Date());
      setTodayStr((prev) => (prev !== newDay ? newDay : prev));
    }, 60_000); // 1分おきにチェック
    return () => clearInterval(id);
  }, []);

  // 実効的な開始・終了日
  const effectiveFrom = useMemo(() => {
    if (dateRange === "custom") {
      const d = new Date(customFrom + "T00:00:00");
      return isNaN(d.getTime()) ? daysAgo(13) : d;
    }
    return daysAgo(dateRange);
  }, [dateRange, customFrom, todayStr]);

  const effectiveTo = useMemo(() => {
    if (dateRange === "custom") {
      const d = new Date(customTo + "T23:59:59");
      return isNaN(d.getTime()) ? new Date() : d;
    }
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, [dateRange, customTo, todayStr]);

  const effectiveDays = useMemo(() => {
    const ms = effectiveTo.getTime() - effectiveFrom.getTime();
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }, [effectiveFrom, effectiveTo]);

  const dateRangeLabel = useMemo(() => {
    if (dateRange !== "custom") return `過去${dateRange}日間`;
    const f = customFrom.replace(/-/g, "/");
    const t = customTo.replace(/-/g, "/");
    return f === t ? f : `${f}〜${t}`;
  }, [dateRange, customFrom, customTo]);

  // ---- リアルタイムログ ----
  const [recentLogs, setRecentLogs] = useState<any[]>([]);


  // ---- stats_daily（ファネル用） ----
  const [statRows, setStatRows] = useState<any[]>([]);

  // ---- 訪問者ジャーニー ----
  const [journeyLogs, setJourneyLogs] = useState<any[]>([]);
  const [journeyLoading, setJourneyLoading] = useState(false);

  // ---- 購入ログ（売上計測） ----
  const [purchaseLogs, setPurchaseLogs] = useState<any[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [selectedVid, setSelectedVid] = useState<string | null>(null);

  // ---- 訪問者ジャーニーフィルター ----
  const [visitorFilter, setVisitorFilter] = useState<"all" | "purchase" | "cv" | "new" | "repeat">("all");
  const [journeyFilterFrom, setJourneyFilterFrom] = useState<string>("");
  const [journeyFilterTo, setJourneyFilterTo] = useState<string>("");

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
      // localStorage から復元、なければ先頭を選択
      const saved = readSelectedSiteId(workspaceId);
      const validId = saved && list.some((s) => s.id === saved) ? saved : list[0]?.id || "";
      setSiteId(validId);
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
    const q = query(
      collection(db, "logs"),
      where("site_id", "==", siteId),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    return onSnapshot(q, (snap) => {
      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const logs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() as any }))
        .filter((l) => (l.createdAt || "") > since);
      setRecentLogs(logs);
    });
  }, [siteId]);


  // ---- サイト変更時にフィルターをリセット（日付変更では非リセット） ----
  useEffect(() => {
    setVisitorFilter("all");
    setJourneyFilterFrom("");
    setJourneyFilterTo("");
    setSelectedVid(null);
  }, [siteId]);

  // ---- 訪問者ジャーニー用ログ（全イベント取得） ----
  useEffect(() => {
    setJourneyLogs([]);
    if (!siteId) { return; }
    setJourneyLoading(true);
    const since = effectiveFrom.toISOString();
    getDocs(
      query(
        collection(db, "logs"),
        where("site_id", "==", siteId),
        where("createdAt", ">", since),
        orderBy("createdAt", "desc"),
        limit(3000)
      )
    ).then((snap) => {
      const to = effectiveTo.toISOString();
      setJourneyLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((l) => (l.createdAt || "") <= to));
      setJourneyLoading(false);
    }).catch(() => setJourneyLoading(false));
  }, [siteId, effectiveFrom, effectiveTo]);

  // ---- 購入ログ取得（リアルタイム） ----
  useEffect(() => {
    setPurchaseLogs([]); // siteId 変更時に即クリア（古データ混入防止）
    if (!siteId) { return; }
    setPurchaseLoading(true);
    const since = effectiveFrom.toISOString();
    const to = effectiveTo.toISOString();
    const unsub = onSnapshot(
      query(
        collection(db, "logs"),
        where("site_id", "==", siteId),
        where("event", "==", "purchase"),
        where("createdAt", ">", since),
        limit(1000)
      ),
      (snap) => {
        setPurchaseLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((l) => (l.createdAt || "") <= to));
        setPurchaseLoading(false);
      },
      (err) => {
        console.error("[purchaseLogs] query error:", err);
        setPurchaseLoading(false);
      }
    );
    return unsub;
  }, [siteId, effectiveFrom, effectiveTo]);

  // ---- stats_daily ----
  useEffect(() => {
    if (!siteId) { setStatRows([]); return; }
    const days: string[] = [];
    const cur = new Date(effectiveFrom);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(effectiveTo);
    end.setHours(0, 0, 0, 0);
    while (cur <= end && days.length < 30) {
      days.push(isoDay(cur));
      cur.setDate(cur.getDate() + 1);
    }
    if (!days.length) return;
    const q = query(
      collection(db, "stats_daily"),
      where("siteId", "==", siteId),
      where("day", "in", days)
    );
    return onSnapshot(q, (snap) => {
      setStatRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [siteId, effectiveFrom, effectiveTo]);

  // pvLogs は journeyLogs から派生（pageview のみ）
  const pvLogs = useMemo(() => journeyLogs.filter((l: any) => l.event === "pageview"), [journeyLogs]);

  // ---- computed: リアルタイム ----
  const activeVisitors = useMemo(() => {
    const vids = new Set(recentLogs.map((l) => l.vid).filter(Boolean));
    return vids.size;
  }, [recentLogs]);

  // stats_daily は JST で集計されているため todayStr（JST今日）と一致する
  const todayPvCount = useMemo(() => {
    return statRows.filter((r) => r.day === todayStr && r.event === "pageview").reduce((s: number, r: any) => s + safeNum(r.count), 0);
  }, [statRows, todayStr]);
  const todayImpCount = useMemo(() => {
    return statRows.filter((r) => r.day === todayStr && r.event === "impression").reduce((s, r) => s + safeNum(r.count), 0);
  }, [statRows, todayStr]);
  const todayCvCount = useMemo(() => {
    return statRows.filter((r) => r.day === todayStr && r.event === "conversion").reduce((s, r) => s + safeNum(r.count), 0);
  }, [statRows, todayStr]);

  // ---- computed: 売上 ----
  const totalRevenue = useMemo(() => purchaseLogs.reduce((s, l) => s + (typeof l.revenue === "number" ? l.revenue : 0), 0), [purchaseLogs]);
  const purchaseCount = useMemo(() => purchaseLogs.length, [purchaseLogs]);
  const avgOrderValue = useMemo(() => purchaseCount > 0 ? totalRevenue / purchaseCount : 0, [totalRevenue, purchaseCount]);

  // シナリオ別売上（vid紐付けによるラストタッチ帰属）
  const revenueByScenario = useMemo(() => {
    if (!purchaseLogs.length || !journeyLogs.length) return [];
    // vid → 最後に見たシナリオIDを特定
    const vidToScenario = new Map<string, string>();
    const sorted = [...journeyLogs]
      .filter((l) => l.event === "impression" && l.scenario_id)
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    for (const l of sorted) {
      if (l.vid) vidToScenario.set(l.vid, l.scenario_id);
    }
    const map = new Map<string, { id: string | null; name: string; revenue: number; count: number }>();
    for (const purchase of purchaseLogs) {
      const scenarioId = vidToScenario.get(purchase.vid || "") || null;
      const key = scenarioId || "__none__";
      const sc = scenarios.find((s) => s.id === scenarioId);
      const name = sc ? String(sc.data?.name || sc.id) : "（施策なし）";
      if (!map.has(key)) map.set(key, { id: scenarioId, name, revenue: 0, count: 0 });
      const entry = map.get(key)!;
      entry.revenue += typeof purchase.revenue === "number" ? purchase.revenue : 0;
      entry.count++;
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [purchaseLogs, journeyLogs, scenarios]);

  // ---- computed: 商品別売上（施策帰属付き） ----
  const revenueByProduct = useMemo(() => {
    // vid → 最後に接触した施策ID
    const vidToScenario = new Map<string, string>();
    const sorted = [...journeyLogs].sort((a, b) => (a.createdAt || "") < (b.createdAt || "") ? -1 : 1);
    for (const l of sorted) {
      if (l.vid && l.scenario_id) vidToScenario.set(l.vid, l.scenario_id);
    }

    const map = new Map<string, { title: string; qty: number; revenue: number; qtyAttributed: number; revenueAttributed: number; scenarioIds: Set<string> }>();
    for (const log of purchaseLogs) {
      if (!Array.isArray(log.items)) continue;
      const scenarioId = vidToScenario.get(log.vid || "") || null;
      for (const item of log.items) {
        const title = String(item.title || "（不明）");
        if (!map.has(title)) map.set(title, { title, qty: 0, revenue: 0, qtyAttributed: 0, revenueAttributed: 0, scenarioIds: new Set() });
        const entry = map.get(title)!;
        const itemRevenue = (Number(item.qty) || 0) * (Number(item.price) || 0);
        entry.qty += Number(item.qty) || 0;
        entry.revenue += itemRevenue;
        if (scenarioId) {
          entry.qtyAttributed += Number(item.qty) || 0;
          entry.revenueAttributed += itemRevenue;
          entry.scenarioIds.add(scenarioId);
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [purchaseLogs, journeyLogs]);

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
  const referrerTotal = useMemo(() => referrerData.reduce((s, r) => s + r.count, 0), [referrerData]);

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

  // ---- computed: 離脱ページ（セッションの最終ページ） ----
  const exitData = useMemo(() => {
    const sessions = new Map<string, string[]>();
    const sorted = [...pvLogs]
      .filter((l) => l.event === "pageview")
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    for (const l of sorted) {
      const sid = l.sid || l.vid || "";
      if (!sid) continue;
      if (!sessions.has(sid)) sessions.set(sid, []);
      sessions.get(sid)!.push(l.path || "/");
    }
    const exitMap = new Map<string, number>();
    for (const pages of sessions.values()) {
      if (!pages.length) continue;
      const last = pages[pages.length - 1];
      exitMap.set(last, (exitMap.get(last) || 0) + 1);
    }
    return Array.from(exitMap.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [pvLogs]);

  const exitTotal = useMemo(() => exitData.reduce((s, r) => s + r.count, 0), [exitData]);
  const exitMax = useMemo(() => Math.max(...exitData.map((r) => r.count), 1), [exitData]);

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

  // ---- computed: 日別トレンド ----
  const dailyTrend = useMemo<TrendPoint[]>(() => {
    const result: TrendPoint[] = [];
    const cur = new Date(effectiveFrom);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(effectiveTo);
    end.setHours(0, 0, 0, 0);
    while (cur <= end) {
      const day = isoDay(cur);
      const label = `${cur.getMonth() + 1}/${cur.getDate()}`;
      // PVはstats_dailyから（JST集計で正確）、UVはjourneyLogsをUTC→JST変換して集計
      const pv = statRows.filter((r) => r.day === day && r.event === "pageview").reduce((s: number, r: any) => s + safeNum(r.count), 0);
      const uv = new Set(pvLogs.filter((l) => utcIsoToJstDay(l.createdAt || "") === day).map((l) => l.vid).filter(Boolean)).size;
      const imp = statRows.filter((r) => r.day === day && r.event === "impression").reduce((s, r) => s + safeNum(r.count), 0);
      const cv = statRows.filter((r) => r.day === day && r.event === "conversion").reduce((s, r) => s + safeNum(r.count), 0);
      result.push({ day, label, pv, uv, imp, cv });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [pvLogs, statRows, effectiveFrom, effectiveTo]);

  // ---- computed: 最近のセッション ----
  const sessionData = useMemo(() => {
    const map = new Map<string, { sid: string; vid: string; pages: string[]; events: string[]; start: string; last: string; ref: string }>();
    const sorted = [...recentLogs].sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    for (const l of sorted) {
      const sid = l.sid || l.vid || "unknown";
      if (!map.has(sid)) map.set(sid, { sid, vid: l.vid || "", pages: [], events: [], start: l.createdAt || "", last: l.createdAt || "", ref: "" });
      const s = map.get(sid)!;
      if (l.path && (s.pages.length === 0 || s.pages[s.pages.length - 1] !== l.path)) s.pages.push(l.path);
      s.events.push(l.event);
      s.last = l.createdAt || s.last;
      if (l.event === "pageview" && !s.ref && l.ref) s.ref = l.ref;
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
      hasConversion: boolean; hasImpression: boolean; hasPurchase: boolean;
      purchaseRevenue: number; purchaseCount: number;
      pages: string[]; eventCount: number; firstRef: string;
      isNew: boolean | null; // true=新規, false=リピート, null=不明（古いログ）
    }>();
    const sorted = [...journeyLogs].sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    for (const l of sorted) {
      const vid = l.vid || "unknown";
      if (!map.has(vid)) {
        map.set(vid, { vid, firstSeen: l.createdAt || "", lastSeen: l.createdAt || "", pvCount: 0, totalDuration: 0, hasConversion: false, hasImpression: false, hasPurchase: false, purchaseRevenue: 0, purchaseCount: 0, pages: [], eventCount: 0, firstRef: "", isNew: null });
      }
      const v = map.get(vid)!;
      v.lastSeen = l.createdAt || v.lastSeen;
      v.eventCount++;
      if (l.event === "pageview") {
        v.pvCount++;
        if (l.path && !v.pages.includes(l.path)) v.pages.push(l.path);
        if (!v.firstRef && l.ref) v.firstRef = l.ref;
        // 最初の pageview の is_new を採用（null=古いログで情報なし）
        if (v.isNew === null && typeof l.is_new === "boolean") v.isNew = l.is_new;
      }
      if (l.event === "conversion") v.hasConversion = true;
      if (l.event === "impression") v.hasImpression = true;
      if (l.event === "pageleave" && l.duration_sec) v.totalDuration += Number(l.duration_sec);
    }
    // 購入ログを紐付け（vid が明示されているものだけ紐付ける）
    for (const p of purchaseLogs) {
      if (!p.vid) continue;
      if (!map.has(p.vid)) continue;
      const v = map.get(p.vid)!;
      v.hasPurchase = true;
      v.purchaseRevenue += typeof p.revenue === "number" ? p.revenue : 0;
      v.purchaseCount++;
    }
    return Array.from(map.values())
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
      .slice(0, 500);
  }, [journeyLogs, purchaseLogs]);

  // ---- computed: 新規/リピート 日別集計（visitorListの後に宣言が必要） ----
  const newRepeatTrend = useMemo(() => {
    return dailyTrend.map((d) => ({
      ...d,
      newCount: visitorList.filter((v) => v.isNew === true && utcIsoToJstDay(v.firstSeen) === d.day).length,
      repeatCount: visitorList.filter((v) => v.isNew === false && utcIsoToJstDay(v.firstSeen) === d.day).length,
    }));
  }, [dailyTrend, visitorList]);

  // ---- computed: フィルター済み訪問者リスト ----
  const filteredVisitorList = useMemo(() => {
    let list = visitorList;
    if (visitorFilter === "purchase") list = list.filter((v) => v.hasPurchase);
    if (visitorFilter === "cv") list = list.filter((v) => v.hasConversion || v.hasPurchase);
    if (visitorFilter === "new") list = list.filter((v) => v.isNew === true);
    if (visitorFilter === "repeat") list = list.filter((v) => v.isNew === false);
    if (journeyFilterFrom) {
      const from = new Date(journeyFilterFrom + "T00:00:00").getTime();
      list = list.filter((v) => v.lastSeen && new Date(v.lastSeen).getTime() >= from);
    }
    if (journeyFilterTo) {
      const to = new Date(journeyFilterTo + "T23:59:59").getTime();
      list = list.filter((v) => v.firstSeen && new Date(v.firstSeen).getTime() <= to);
    }
    return list.slice(0, 100);
  }, [visitorList, visitorFilter, journeyFilterFrom, journeyFilterTo]);

  // ---- computed: 選択中訪問者のイベント一覧（購入ログ含む） ----
  const selectedJourney = useMemo(() => {
    if (!selectedVid) return [];
    // journeyLogs は全イベントを含むため purchase を除外（purchaseLogs と重複しないように）
    const logs = journeyLogs.filter((l) => l.vid === selectedVid && l.event !== "purchase");
    // 購入ログを purchase イベントとして混ぜる（revenue/order_id 等の詳細情報を持つ purchaseLogs を使う）
    const purchases = purchaseLogs
      .filter((p) => p.vid && p.vid === selectedVid)
      .map((p) => ({ ...p, event: "purchase", id: p.id || p.order_id || String(p.createdAt) }));
    return [...logs, ...purchases]
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  }, [journeyLogs, purchaseLogs, selectedVid]);

  // ---- computed: vid → 直前のシナリオID（購入時の施策特定用） ----
  const vidToLastScenario = useMemo(() => {
    const map = new Map<string, string>();
    const sorted = [...journeyLogs].sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    for (const l of sorted) {
      if (l.vid && l.scenario_id) map.set(l.vid, l.scenario_id);
    }
    return map;
  }, [journeyLogs]);

  const selectedSiteName = useMemo(() => {
    const s = sites.find((s) => s.id === siteId);
    return String(s?.data?.name || s?.data?.siteName || siteId || "");
  }, [sites, siteId]);

  // サイトのドメイン（URLリンク生成用）
  const siteDomain = useMemo(() => {
    const s = sites.find((s) => s.id === siteId);
    const d = (s?.data?.domains || [])[0] || "";
    if (!d) return "";
    return d.startsWith("http") ? d.replace(/\/$/, "") : `https://${d.replace(/\/$/, "")}`;
  }, [sites, siteId]);

  function toPageUrl(path: string) {
    if (!siteDomain) return null;
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${siteDomain}${p}`;
  }


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
            onChange={(e) => {
              setSiteId(e.target.value);
              writeSelectedSiteId(workspaceId, e.target.value);
            }}
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
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
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
              <button
                type="button"
                onClick={() => setDateRange("custom")}
                style={{
                  padding: "7px 14px",
                  border: "none",
                  borderLeft: "1px solid rgba(15,23,42,.1)",
                  background: dateRange === "custom" ? "#1f6573" : "transparent",
                  color: dateRange === "custom" ? "#fff" : "inherit",
                  fontWeight: dateRange === "custom" ? 700 : 500,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                カスタム
              </button>
            </div>
            {dateRange === "custom" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="date"
                  className="input"
                  value={customFrom}
                  max={customTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  style={{ padding: "6px 10px", fontSize: 13, width: 140 }}
                />
                <span className="small" style={{ opacity: 0.5 }}>〜</span>
                <input
                  type="date"
                  className="input"
                  value={customTo}
                  min={customFrom}
                  max={isoDay(new Date())}
                  onChange={(e) => setCustomTo(e.target.value)}
                  style={{ padding: "6px 10px", fontSize: 13, width: 140 }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 管理者除外ブックマークレット */}
      {siteDomain && (
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="small" style={{ opacity: 0.5 }}>🚫 自分の訪問を除外:</span>
          {siteDomain ? (
            <>
              <button
                className="small"
                onClick={() => window.open(`${siteDomain}${siteDomain.includes("?") ? "&" : "?"}cx_exclude=1`, "_blank")}
                style={{ padding: "2px 12px", borderRadius: 20, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontWeight: 700, cursor: "pointer" }}
              >
                🚫 除外ON
              </button>
              <button
                className="small"
                onClick={() => window.open(`${siteDomain}${siteDomain.includes("?") ? "&" : "?"}cx_exclude=0`, "_blank")}
                style={{ padding: "2px 12px", borderRadius: 20, background: "#f0fdf4", border: "1px solid #86efac", color: "#16a34a", fontWeight: 700, cursor: "pointer" }}
              >
                ✅ 除外OFF
              </button>
              <span className="small" style={{ opacity: 0.4 }}>（クリックするとサイトが開いて自動で設定されます）</span>
            </>
          ) : (
            <a
              href={`javascript:(function(){var k='cx_no_track',v=localStorage.getItem(k)==='1';localStorage.setItem(k,v?'0':'1');alert(v?'✅ 計測を再開しました（除外OFF）':'🚫 管理者として除外しました（除外ON）');})();`}
              onClick={(e) => e.preventDefault()}
              className="small"
              style={{ padding: "2px 10px", borderRadius: 20, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)", color: "#6366f1", textDecoration: "none", cursor: "grab", fontWeight: 600, whiteSpace: "nowrap" }}
              title="ブックマークバーにドラッグ → サイト閲覧中にクリックで除外ON/OFF"
            >
              🔖 ブックマークへドラッグ
            </a>
          )}
        </div>
      )}

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

          {/* ===== Section 1.5: 売上計測 ===== */}
          {(purchaseLogs.length > 0 || purchaseLoading) && (
            <div style={{ marginBottom: 32 }}>
              <div className="h2" style={{ marginBottom: 14 }}>
                💰 売上計測 <span className="small" style={{ fontWeight: 400, opacity: 0.6 }}>（{dateRangeLabel} · Shopify Web Pixel）</span>
              </div>
              {purchaseLoading ? (
                <div className="card" style={{ padding: 24, textAlign: "center", opacity: 0.5, fontSize: 13 }}>読み込み中…</div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
                    <StatCard label="売上合計" value={`¥${Math.round(totalRevenue).toLocaleString()}`} sub={`${purchaseCount}件の購入`} accent="#22c55e" />
                    <StatCard label="平均注文額" value={`¥${Math.round(avgOrderValue).toLocaleString()}`} sub="AOV" accent="#0891b2" />
                    <StatCard label="購入件数" value={fmtInt(purchaseCount)} sub="ユニーク注文" accent="#7c3aed" />
                  </div>
                  {/* デバッグ: 購入ログのvid確認 */}
                  <details style={{ marginBottom: 10 }}>
                    <summary style={{ fontSize: 11, color: "#94a3b8", cursor: "pointer" }}>🔍 デバッグ情報（帰属が出ない場合はここを確認）</summary>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginTop: 6, fontSize: 11, fontFamily: "monospace" }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>📦 直近の購入ログ（vid が空なら cookie未取得）</div>
                      {purchaseLogs.slice(0, 5).map((l, i) => (
                        <div key={i} style={{ marginBottom: 4, color: l.vid ? "#16a34a" : "#dc2626" }}>
                          {l.vid ? "✅" : "❌"} vid: <b>{l.vid || "（空）"}</b> / order: {l.order_id || "—"} / {String(l.createdAt || "").slice(0, 16)}
                        </div>
                      ))}
                      <div style={{ fontWeight: 700, margin: "10px 0 6px" }}>📺 直近のimpression（scenario_id必須）</div>
                      {journeyLogs.filter((l: any) => l.event === "impression" && l.scenario_id).slice(0, 5).map((l: any, i: number) => (
                        <div key={i} style={{ marginBottom: 4, color: "#0891b2" }}>
                          vid: <b>{l.vid || "（空）"}</b> / scenario: {l.scenario_id}
                        </div>
                      ))}
                      {journeyLogs.filter((l: any) => l.event === "impression" && l.scenario_id).length === 0 && (
                        <div style={{ color: "#dc2626" }}>❌ impressionログなし（シナリオが表示されていないか、ログが取れていない）</div>
                      )}
                    </div>
                  </details>
                  {revenueByScenario.length > 0 && (
                    <div className="card" style={{ padding: 18, background: "#fff" }}>
                      <div className="small" style={{ fontWeight: 700, marginBottom: 12 }}>施策別売上（ラストタッチ帰属）</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {revenueByScenario.map((r) => {
                          const pct = totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0;
                          return (
                            <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ minWidth: 140, fontSize: 13, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                              <div style={{ flex: 1, height: 8, background: "rgba(15,23,42,.07)", borderRadius: 99, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: r.name === "（施策なし）" ? "#94a3b8" : "#22c55e", borderRadius: 99, transition: "width .4s ease" }} />
                              </div>
                              <div style={{ minWidth: 100, fontSize: 13, fontWeight: 600, textAlign: "right" }}>¥{Math.round(r.revenue).toLocaleString()}</div>
                              <div style={{ minWidth: 40, fontSize: 12, color: "#94a3b8", textAlign: "right" }}>{r.count}件</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {revenueByProduct.length > 0 && (
                    <div className="card" style={{ padding: 18, background: "#fff", marginTop: 12 }}>
                      <div className="small" style={{ fontWeight: 700, marginBottom: 12 }}>🛍️ 商品別売上</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {revenueByProduct.map((r) => {
                          const maxRev = revenueByProduct[0]?.revenue || 1;
                          const pct = (r.revenue / maxRev) * 100;
                          const attrPct = r.qty > 0 ? Math.round((r.qtyAttributed / r.qty) * 100) : 0;
                          return (
                            <div key={r.title}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                                <div style={{ minWidth: 180, fontSize: 13, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                                <div style={{ flex: 1, height: 8, background: "rgba(15,23,42,.07)", borderRadius: 99, overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`, background: "#f59e0b", borderRadius: 99, transition: "width .4s ease" }} />
                                </div>
                                <div style={{ minWidth: 100, fontSize: 13, fontWeight: 600, textAlign: "right" }}>¥{Math.round(r.revenue).toLocaleString()}</div>
                                <div style={{ minWidth: 50, fontSize: 12, color: "#94a3b8", textAlign: "right" }}>{r.qty}個</div>
                              </div>
                              {r.qtyAttributed > 0 && (
                                <div style={{ marginLeft: 180, display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11 }}>
                                  <span style={{ color: "#22c55e", fontWeight: 600 }}>施策経由 {r.qtyAttributed}個 (¥{Math.round(r.revenueAttributed).toLocaleString()})</span>
                                  {Array.from(r.scenarioIds).map((scId) => {
                                    const scName = scenarios.find((s) => s.id === scId)?.data?.name || scId;
                                    return <span key={scId} style={{ background: "#dcfce7", color: "#15803d", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>📢 {scName}</span>;
                                  })}
                                  {r.qty - r.qtyAttributed > 0 && <span style={{ color: "#94a3b8" }}>直接 {r.qty - r.qtyAttributed}個</span>}
                                  <span style={{ color: "#94a3b8" }}>施策貢献率 {attrPct}%</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ===== Section 1.5: 日別トレンド ===== */}
          <div style={{ marginBottom: 32 }}>
            <div className="h2" style={{ marginBottom: 14 }}>
              日別トレンド <span className="small" style={{ fontWeight: 400, opacity: 0.6 }}>（{dateRangeLabel}）</span>
            </div>

            {journeyLoading ? (
              <div className="card" style={{ padding: 24, textAlign: "center", opacity: 0.5, fontSize: 13 }}>読み込み中…</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                {/* ① PV & ユニーク訪問者 */}
                <div className="card" style={{ padding: "20px 20px 8px", background: "#fff" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 16 }}>📈 ページビュー / ユニーク訪問者</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={dailyTrend} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradPv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradUv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0891b2" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,.06)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(15,23,42,.45)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "rgba(15,23,42,.45)" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(15,23,42,.1)", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}
                        labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Area type="monotone" dataKey="pv" name="ページビュー" stroke="#2563eb" strokeWidth={2} fill="url(#gradPv)" dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      <Area type="monotone" dataKey="uv" name="ユニーク訪問者" stroke="#0891b2" strokeWidth={2} fill="url(#gradUv)" dot={{ r: 3, fill: "#0891b2", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* ② 施策表示 & CV */}
                <div className="card" style={{ padding: "20px 20px 8px", background: "#fff" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 16 }}>🔄 施策表示数 / CV数</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={dailyTrend} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,.06)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(15,23,42,.45)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "rgba(15,23,42,.45)" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(15,23,42,.1)", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}
                        labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar dataKey="imp" name="施策表示" fill="#7c3aed" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
                      <Line type="monotone" dataKey="cv" name="CV" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3, fill: "#16a34a", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ③ 新規 / リピート訪問者 */}
            {!journeyLoading && (
              <div className="card" style={{ padding: "20px 20px 8px", background: "#fff", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>👤 新規 / リピート訪問者</div>
                  {(() => {
                    const totalNew = visitorList.filter((v) => v.isNew === true).length;
                    const totalRepeat = visitorList.filter((v) => v.isNew === false).length;
                    const total = totalNew + totalRepeat;
                    return total > 0 ? (
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#15803d" }}>新規 {totalNew}人 ({Math.round(totalNew / total * 100)}%)</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>リピート {totalRepeat}人 ({Math.round(totalRepeat / total * 100)}%)</span>
                      </div>
                    ) : <span className="small" style={{ opacity: 0.5 }}>データなし（SDK更新後から計測開始）</span>;
                  })()}
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={newRepeatTrend} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(15,23,42,.45)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "rgba(15,23,42,.45)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(15,23,42,.1)", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}
                      labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar dataKey="newCount" name="新規" stackId="a" fill="#22c55e" fillOpacity={0.8} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="repeatCount" name="リピート" stackId="a" fill="#94a3b8" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 施策別CVトレンド（シナリオがある場合） */}
            {!journeyLoading && scenarios.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                {scenarios.slice(0, 4).map((sc) => {
                  const scTrend = dailyTrend.map((d) => {
                    const scRows = statRows.filter((r) => r.scenarioId === sc.id && r.day === d.day);
                    const imp = scRows.filter((r) => r.event === "impression").reduce((s, r) => s + safeNum(r.count), 0);
                    const cv  = scRows.filter((r) => r.event === "conversion").reduce((s, r) => s + safeNum(r.count), 0);
                    return { ...d, imp, cv };
                  });
                  const scRevenue = revenueByScenario.find((r) => r.id === sc.id);
                  return (
                    <div key={sc.id} className="card" style={{ padding: "16px 16px 8px", background: "#fff" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.8 }} title={sc.data?.name}>
                        📊 {sc.data?.name || sc.id}
                      </div>
                      {scRevenue && scRevenue.count > 0 ? (
                        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                          <div style={{ background: "#f0fdf4", borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
                            <span style={{ color: "#15803d", fontWeight: 700 }}>¥{Math.round(scRevenue.revenue).toLocaleString()}</span>
                            <span style={{ color: "#86efac", fontSize: 11, marginLeft: 4 }}>売上</span>
                          </div>
                          <div style={{ background: "#eff6ff", borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
                            <span style={{ color: "#1d4ed8", fontWeight: 700 }}>{scRevenue.count}件</span>
                            <span style={{ color: "#93c5fd", fontSize: 11, marginLeft: 4 }}>購入</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginBottom: 10 }} />
                      )}
                      <ResponsiveContainer width="100%" height={140}>
                        <ComposedChart data={scTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,.06)" />
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "rgba(15,23,42,.4)" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: "rgba(15,23,42,.4)" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                          <Bar dataKey="imp" name="表示" fill="#7c3aed" fillOpacity={0.65} radius={[2, 2, 0, 0]} />
                          <Line type="monotone" dataKey="cv" name="CV" stroke="#16a34a" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== Section 2: 流入元 ===== */}
          <div style={{ marginBottom: 32 }}>
            <div className="h2" style={{ marginBottom: 14 }}>
              流入元・離脱 <span className="small" style={{ fontWeight: 400, opacity: 0.6 }}>（{dateRangeLabel}）</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>

              {/* 流入元 */}
              <div className="card" style={{ padding: 18, background: "#fff" }}>
                <div style={{ marginBottom: 14 }}>
                  <div className="small" style={{ fontWeight: 700 }}>🔀 流入元</div>
                  <div className="small" style={{ opacity: 0.5, marginTop: 2 }}>utm_source またはリファラー</div>
                </div>
                {journeyLoading ? (
                  <div className="small" style={{ opacity: 0.55 }}>読み込み中...</div>
                ) : referrerData.length === 0 ? (
                  <div className="small" style={{ opacity: 0.55 }}>データなし</div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {referrerData.map((r) => (
                      <BarRow key={r.src} label={r.src} value={r.count} max={referrerMax} total={referrerTotal} color="#59b7c6" />
                    ))}
                  </div>
                )}
              </div>

              {/* 離脱ページ */}
              <div className="card" style={{ padding: 18, background: "#fff" }}>
                <div style={{ marginBottom: 14 }}>
                  <div className="small" style={{ fontWeight: 700 }}>🚪 離脱ページ</div>
                  <div className="small" style={{ opacity: 0.5, marginTop: 2 }}>セッションの最後に見たページ</div>
                </div>
                {journeyLoading ? (
                  <div className="small" style={{ opacity: 0.55 }}>読み込み中...</div>
                ) : exitData.length === 0 ? (
                  <div className="small" style={{ opacity: 0.55 }}>データなし</div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {exitData.map((r) => (
                      <BarRow key={r.path} label={r.path} value={r.count} max={exitMax} total={exitTotal} color="#f97316" href={toPageUrl(r.path) || undefined} />
                    ))}
                  </div>
                )}
              </div>

              {/* よく見られたページ */}
              <div className="card" style={{ padding: 18, background: "#fff" }}>
                <div style={{ marginBottom: 14 }}>
                  <div className="small" style={{ fontWeight: 700 }}>📄 よく見られたページ</div>
                  <div className="small" style={{ opacity: 0.5, marginTop: 2 }}>PV数の多い順</div>
                </div>
                {journeyLoading ? (
                  <div className="small" style={{ opacity: 0.55 }}>読み込み中...</div>
                ) : pageData.length === 0 ? (
                  <div className="small" style={{ opacity: 0.55 }}>データなし</div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {pageData.map((r) => (
                      <BarRow key={r.path} label={r.path} value={r.count} max={pageMax} total={pageData.reduce((s, x) => s + x.count, 0)} color="#6366f1" href={toPageUrl(r.path) || undefined} />
                    ))}
                  </div>
                )}
              </div>

              {/* UTMキャンペーン */}
              {campaignData.some((c) => c.campaign !== "（なし）") && (
                <div className="card" style={{ padding: 18, background: "#fff" }}>
                  <div style={{ marginBottom: 14 }}>
                    <div className="small" style={{ fontWeight: 700 }}>🎯 UTMキャンペーン</div>
                  </div>
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
          </div>

          {/* ===== Section 3: 施策ファネル ===== */}
          <div style={{ marginBottom: 32 }}>
            <div className="h2" style={{ marginBottom: 14 }}>
              施策ファネル <span className="small" style={{ fontWeight: 400, opacity: 0.6 }}>（{dateRangeLabel}）</span>
            </div>
            {funnelData.length === 0 ? (
              <div className="card" style={{ padding: 20, opacity: 0.7 }}>
                <div className="small">シナリオがないか、まだデータがありません</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {funnelData.slice(0, 6).map((sc) => {
                  const scRev = revenueByScenario.find((r) => r.id === sc.id);
                  return (
                  <div key={sc.id} className="card" style={{ padding: 18, background: "#fff" }}>
                    <div style={{ fontWeight: 700, marginBottom: scRev && scRev.revenue > 0 ? 8 : 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={sc.name}>
                      {sc.name}
                    </div>
                    {scRev && scRev.count > 0 && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                        <div style={{ background: "#f0fdf4", borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
                          <span style={{ color: "#15803d", fontWeight: 700 }}>¥{Math.round(scRev.revenue).toLocaleString()}</span>
                          <span style={{ color: "#86efac", fontSize: 11, marginLeft: 4 }}>売上</span>
                        </div>
                        <div style={{ background: "#eff6ff", borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
                          <span style={{ color: "#1d4ed8", fontWeight: 700 }}>{scRev.count}件</span>
                          <span style={{ color: "#93c5fd", fontSize: 11, marginLeft: 4 }}>購入</span>
                        </div>
                      </div>
                    )}
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
                  );
                })}
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
                        {s.ref && (
                          <div className="small" style={{ opacity: 0.5, marginTop: 5 }}>
                            🔗 流入元: <span style={{ fontWeight: 600 }}>{formatRef(s.ref)}</span>
                          </div>
                        )}
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
                  <span className="small" style={{ fontWeight: 400, opacity: 0.6, marginLeft: 8 }}>（{dateRangeLabel}・匿名ID別）</span>
                </div>
                <div className="small" style={{ opacity: 0.55, marginTop: 2 }}>
                  訪問者を選択すると行動タイムラインが表示されます
                </div>
              </div>
              {journeyLoading && <div className="small" style={{ opacity: 0.5 }}>読み込み中...</div>}
            </div>

            {/* フィルターバー */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12, padding: "10px 14px", background: "rgba(15,23,42,.03)", borderRadius: 10, border: "1px solid rgba(15,23,42,.07)" }}>
              {/* 絞り込みタイプ */}
              <div style={{ display: "flex", border: "1px solid rgba(15,23,42,.12)", borderRadius: 8, overflow: "hidden" }}>
                {([["all", "全員"], ["new", "🆕 新規"], ["repeat", "🔁 リピート"], ["purchase", "💰 購入あり"], ["cv", "✅ CV あり"]] as const).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => { setVisitorFilter(val); setSelectedVid(null); }} style={{ padding: "6px 12px", border: "none", fontSize: 12, fontWeight: visitorFilter === val ? 700 : 500, background: visitorFilter === val ? "#1f6573" : "transparent", color: visitorFilter === val ? "#fff" : "inherit", cursor: "pointer", whiteSpace: "nowrap" }}>
                    {label}
                  </button>
                ))}
              </div>
              {/* 日付 from/to */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="small" style={{ opacity: 0.6 }}>期間</span>
                <input type="date" value={journeyFilterFrom} onChange={(e) => { setJourneyFilterFrom(e.target.value); setSelectedVid(null); }} style={{ fontSize: 12, padding: "5px 8px", border: "1px solid rgba(15,23,42,.14)", borderRadius: 7, background: "#fff", cursor: "pointer" }} />
                <span className="small" style={{ opacity: 0.5 }}>〜</span>
                <input type="date" value={journeyFilterTo} onChange={(e) => { setJourneyFilterTo(e.target.value); setSelectedVid(null); }} style={{ fontSize: 12, padding: "5px 8px", border: "1px solid rgba(15,23,42,.14)", borderRadius: 7, background: "#fff", cursor: "pointer" }} />
                {(journeyFilterFrom || journeyFilterTo) && (
                  <button type="button" onClick={() => { setJourneyFilterFrom(""); setJourneyFilterTo(""); }} style={{ fontSize: 11, padding: "4px 8px", border: "1px solid rgba(15,23,42,.14)", borderRadius: 6, background: "transparent", cursor: "pointer", opacity: 0.6 }}>
                    クリア
                  </button>
                )}
              </div>
              {/* 件数表示 */}
              <div className="small" style={{ opacity: 0.55, marginLeft: "auto" }}>
                {filteredVisitorList.length}人表示
                {visitorFilter !== "all" || journeyFilterFrom || journeyFilterTo ? ` / ${visitorList.length}人中` : ""}
              </div>
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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div className="small" style={{ fontWeight: 700 }}>
                        {filteredVisitorList.length === 0 ? "条件に一致する訪問者なし" : `訪問者 ${filteredVisitorList.length}人`}
                      </div>
                      {(visitorFilter !== "all" || journeyFilterFrom || journeyFilterTo) && (
                        <button
                          type="button"
                          onClick={() => { setVisitorFilter("all"); setJourneyFilterFrom(""); setJourneyFilterTo(""); setSelectedVid(null); }}
                          style={{ fontSize: 11, padding: "3px 8px", border: "none", borderRadius: 20, background: "#fde68a", color: "#92400e", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}
                        >
                          {visitorFilter === "purchase" ? "💰 購入フィルター中 ×" : visitorFilter === "cv" ? "✅ CVフィルター中 ×" : visitorFilter === "new" ? "🆕 新規フィルター中 ×" : visitorFilter === "repeat" ? "🔁 リピートフィルター中 ×" : "📅 日付フィルター中 ×"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ maxHeight: 560, overflowY: "auto" }}>
                    {filteredVisitorList.length === 0 && (
                      <div style={{ padding: "24px 16px", textAlign: "center", opacity: 0.5 }}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>🔍</div>
                        <div className="small">条件に一致する訪問者がいません</div>
                      </div>
                    )}
                    {filteredVisitorList.map((v) => {
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
                                {v.isNew === true && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: "#f0fdf4", color: "#15803d" }}>新規</span>
                                )}
                                {v.isNew === false && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: "#f1f5f9", color: "#475569" }}>リピート</span>
                                )}
                                {v.hasPurchase && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: "#fefce8", color: "#ca8a04" }}>💰 購入</span>
                                )}
                                {v.hasConversion && !v.hasPurchase && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: "#f0fdf4", color: "#16a34a" }}>CV</span>
                                )}
                                {v.hasImpression && !v.hasConversion && !v.hasPurchase && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: "#eff6ff", color: "#2563eb" }}>施策</span>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <span className="small" style={{ opacity: 0.55 }}>{v.pvCount} PV</span>
                                {v.hasPurchase && (
                                  <span className="small" style={{ fontWeight: 700, color: "#ca8a04" }}>
                                    ¥{v.purchaseRevenue.toLocaleString()} ({v.purchaseCount}件)
                                  </span>
                                )}
                                {v.totalDuration > 0 && (
                                  <span className="small" style={{ opacity: 0.55 }}>
                                    {durationMin > 0 ? `${durationMin}分` : `${v.totalDuration}秒`}滞在
                                  </span>
                                )}
                                <span className="small" style={{ opacity: 0.4 }}>{lastTime}</span>
                              </div>
                              {v.firstRef && (
                                <div className="small" style={{ opacity: 0.45, marginTop: 2 }}>
                                  🔗 {formatRef(v.firstRef)}
                                </div>
                              )}
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
                          // 購入情報は selectedJourney ベースで判定（visitorList の hasPurchase は訪問者切替時に不整合が起きるため）
                          const journeyPurchases = selectedJourney.filter((ev) => ev.event === "purchase");
                          const journeyRevenue = journeyPurchases.reduce((sum, ev) => sum + (typeof ev.revenue === "number" ? ev.revenue : 0), 0);
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
                                    {journeyPurchases.length > 0 && <span style={{ color: "#ca8a04", fontWeight: 700 }}> · 💰 ¥{journeyRevenue.toLocaleString()} ({journeyPurchases.length}件購入)</span>}
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
                                const isPurchase = ev.event === "purchase";
                                const isPageleave = ev.event === "pageleave";
                                const time = ev.createdAt
                                  ? new Date(ev.createdAt).toLocaleTimeString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })
                                  : "—";
                                const dotColor = isPurchase ? "#ca8a04" : isConversion ? "#16a34a" : EVENT_COLOR[ev.event]?.text || "#94a3b8";
                                // 購入時の施策特定
                                const attributedScenarioId = isPurchase ? (ev.scenario_id || vidToLastScenario.get(ev.vid || "") || null) : null;
                                const attributedScenario = attributedScenarioId ? scenarios.find((s) => s.id === attributedScenarioId) : null;
                                return (
                                  <div key={ev.id || i} style={{ display: "flex", gap: 16, paddingBottom: 16, position: "relative" }}>
                                    {/* ドット */}
                                    <div style={{ flexShrink: 0, width: 32, display: "flex", justifyContent: "center", paddingTop: 2 }}>
                                      <div style={{
                                        width: isPurchase ? 16 : isConversion ? 14 : 10,
                                        height: isPurchase ? 16 : isConversion ? 14 : 10,
                                        borderRadius: 99, background: dotColor,
                                        border: (isPurchase || isConversion) ? `2px solid #fff` : "none",
                                        boxShadow: (isPurchase || isConversion) ? `0 0 0 3px ${dotColor}40` : "none",
                                        marginTop: isPurchase ? -3 : isConversion ? -2 : 0,
                                        zIndex: 1, position: "relative",
                                      }} />
                                    </div>
                                    {/* コンテンツ */}
                                    <div style={{
                                      flex: 1,
                                      background: isPurchase ? "#fefce8" : isConversion ? "#f0fdf4" : "rgba(15,23,42,.025)",
                                      borderRadius: 8, padding: "8px 12px",
                                      border: isPurchase ? "1px solid #fde68a" : isConversion ? "1px solid #bbf7d0" : "1px solid transparent",
                                    }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                        <EventBadge event={ev.event} />
                                        <span className="small" style={{ opacity: 0.5, fontSize: 11 }}>{time}</span>
                                        {isPurchase && ev.revenue != null && (
                                          <span style={{ fontSize: 13, fontWeight: 800, color: "#ca8a04" }}>
                                            ¥{Number(ev.revenue).toLocaleString()}
                                          </span>
                                        )}
                                      </div>
                                      {isPurchase && (
                                        <>
                                          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
                                            {ev.order_id && (
                                              <div className="small" style={{ opacity: 0.6 }}>注文ID: <code style={{ fontSize: 10 }}>{ev.order_id}</code></div>
                                            )}
                                            {ev.currency && ev.currency !== "JPY" && (
                                              <div className="small" style={{ opacity: 0.6 }}>{ev.currency}</div>
                                            )}
                                          </div>
                                          {Array.isArray(ev.items) && ev.items.length > 0 && (
                                            <div style={{ marginBottom: 6 }}>
                                              {ev.items.map((item: any, idx: number) => (
                                                <div key={idx} className="small" style={{ display: "flex", gap: 8, opacity: 0.8, paddingLeft: 8, borderLeft: "2px solid #fde68a", marginBottom: 3 }}>
                                                  <span style={{ flex: 1 }}>{item.title || "商品"}</span>
                                                  <span style={{ opacity: 0.6 }}>×{item.qty || 1}</span>
                                                  <span style={{ fontWeight: 600 }}>¥{((item.price || 0) * (item.qty || 1)).toLocaleString()}</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                          {attributedScenario ? (
                                            <div className="small" style={{ padding: "4px 8px", background: "#eff6ff", borderRadius: 6, color: "#2563eb", fontWeight: 600 }}>
                                              📌 経由施策: {attributedScenario.data?.name || attributedScenarioId}
                                            </div>
                                          ) : attributedScenarioId ? (
                                            <div className="small" style={{ padding: "4px 8px", background: "#eff6ff", borderRadius: 6, color: "#2563eb", fontWeight: 600 }}>
                                              📌 経由施策: <code style={{ fontSize: 10 }}>{attributedScenarioId}</code>
                                            </div>
                                          ) : (
                                            <div className="small" style={{ opacity: 0.45 }}>施策なし（直接購入）</div>
                                          )}
                                        </>
                                      )}
                                      {!isPurchase && ev.path && (
                                        <div className="small" style={{ fontWeight: 600, opacity: 0.8, marginBottom: isPageleave || ev.scenario_id ? 4 : 0 }}>
                                          {ev.path}
                                        </div>
                                      )}
                                      {isPageleave && ev.duration_sec != null && (
                                        <div className="small" style={{ opacity: 0.55 }}>
                                          滞在時間: {ev.duration_sec >= 60 ? `${Math.floor(ev.duration_sec / 60)}分${ev.duration_sec % 60}秒` : `${ev.duration_sec}秒`}
                                        </div>
                                      )}
                                      {!isPurchase && ev.scenario_id && (
                                        <div className="small" style={{ opacity: 0.55 }}>
                                          シナリオ: <code style={{ fontSize: 10 }}>{ev.scenario_id}</code>
                                        </div>
                                      )}
                                      {ev.utm_source && (
                                        <div className="small" style={{ opacity: 0.55 }}>
                                          🔗 流入: {[ev.utm_source, ev.utm_medium, ev.utm_campaign].filter(Boolean).join(" / ")}
                                        </div>
                                      )}
                                      {!ev.utm_source && ev.event === "pageview" && (
                                        <div className="small" style={{ opacity: 0.5 }}>
                                          🔗 {ev.ref ? formatRef(ev.ref) : "直接流入"}
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
