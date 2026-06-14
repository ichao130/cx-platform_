import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
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
import { SkeletonBar, SkeletonCard } from "../components/Skeleton";

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
// NOTE: +9h 後は getUTC* で読む。getDate() は local time を返すため
//       JST ブラウザでは +9h が二重適用されてしまう。
function utcIsoToJstDay(createdAt: string): string {
  if (!createdAt) return "";
  const ms = new Date(createdAt).getTime();
  if (isNaN(ms)) return "";
  const jst = new Date(ms + 9 * 60 * 60 * 1000);
  const y  = jst.getUTCFullYear();
  const m  = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// createdAt フィールドをミリ秒に変換（ISO文字列・Firestore Timestamp・数値に対応）
function toMs(createdAt: any): number {
  if (!createdAt) return 0;
  if (typeof createdAt === "number") return createdAt;
  if (typeof createdAt === "string") return new Date(createdAt).getTime() || 0;
  if (typeof createdAt.toDate === "function") return createdAt.toDate().getTime(); // Firestore Timestamp
  if (typeof createdAt.seconds === "number") return createdAt.seconds * 1000; // Timestamp-like
  return 0;
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
  window.dispatchEvent(new CustomEvent("cx_admin_site_changed", { detail: { workspaceId, siteId } }));
}

function readSelectedWorkspaceId(uid?: string) {
  if (!uid) return "";
  try {
    return localStorage.getItem(workspaceKeyForUid(uid)) || "";
  } catch {
    return "";
  }
}

// ---- CountUp: 数値をゼロからカウントアップ ----
function CountUp({ value, duration = 600, formatter = (n: number) => n.toLocaleString("ja-JP") }: {
  value: number; duration?: number; formatter?: (n: number) => string;
}) {
  const [display, setDisplay] = React.useState(0);
  const startRef = React.useRef<number | null>(null);
  const rafRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    const target = value;
    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * ease));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);
  return <>{formatter(display)}</>;
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
function StatCard({ label, value, sub, accent, loading, numericValue, formatter, delta, compLabel }: {
  label: string; value: string | number; sub?: string; accent?: string;
  loading?: boolean; numericValue?: number; formatter?: (n: number) => string;
  delta?: number; compLabel?: string;
}) {
  const str = String(value);
  const fontSize = str.length > 10 ? 18 : str.length > 8 ? 22 : str.length > 6 ? 26 : 30;
  const deltaEl = delta !== undefined ? (() => {
    const up = delta >= 0;
    const abs = Math.abs(delta);
    const color = up ? "#16a34a" : "#dc2626";
    const arrow = up ? "↑" : "↓";
    const pct = abs >= 1000 ? ">999%" : abs < 1 ? `${abs.toFixed(1)}%` : `${Math.round(abs)}%`;
    return (
      <span style={{ fontSize: 11, fontWeight: 700, color, marginLeft: 6, letterSpacing: 0 }}>
        {arrow}{pct} {compLabel}
      </span>
    );
  })() : null;
  return (
    <div className="card" style={{ padding: 18, background: "#fff", border: "1px solid rgba(15,23,42,.08)", minWidth: 0 }}>
      <div className="small" style={{ opacity: 0.68 }}>{label}</div>
      <div style={{ fontSize, fontWeight: 800, lineHeight: 1.2, marginTop: 6, letterSpacing: "-.02em", color: accent || "inherit", whiteSpace: "nowrap", minHeight: fontSize }}>
        {loading ? (
          <SkeletonBar width="70%" height={fontSize * 0.9} radius={4} />
        ) : numericValue !== undefined ? (
          <CountUp value={numericValue} formatter={formatter} />
        ) : (
          value
        )}
      </div>
      {sub && (
        <div className="small" style={{ opacity: 0.6, marginTop: 6, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          {loading ? <SkeletonBar width="50%" height={10} radius={3} /> : <>{sub}{deltaEl}</>}
        </div>
      )}
    </div>
  );
}

function SectionLead({
  title,
  description,
  meta,
}: {
  title: string;
  description?: string;
  meta?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
      <div>
        <div className="h2" style={{ marginBottom: 4 }}>{title}</div>
        {description ? <div className="small" style={{ opacity: 0.68 }}>{description}</div> : null}
      </div>
      {meta ? <div className="small" style={{ opacity: 0.55 }}>{meta}</div> : null}
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

function DailyTrendTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  const order = ["pv", "session", "uv", "revenue"];
  const sortedPayload = [...payload].sort((a, b) => order.indexOf(String(a.dataKey)) - order.indexOf(String(b.dataKey)));

  return (
    <div style={{ background: "#fff", borderRadius: 8, border: "1px solid rgba(15,23,42,.1)", boxShadow: "0 4px 12px rgba(0,0,0,.08)", padding: "10px 12px", minWidth: 160 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "grid", gap: 4 }}>
        {sortedPayload.map((entry) => (
          <div key={String(entry.dataKey)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: entry.color || "#94a3b8", flexShrink: 0 }} />
              <span style={{ color: "#475569", whiteSpace: "nowrap" }}>{entry.name}</span>
            </div>
            <span style={{ fontWeight: 700, color: "#0f172a" }}>
              {entry.dataKey === "revenue"
                ? `¥${Math.round(Number(entry.value)).toLocaleString()}`
                : fmtInt(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

// タブUI
function TabBar({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "rgba(15,23,42,.05)", borderRadius: 10, padding: 3, width: "fit-content", marginBottom: 14 }}>
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{ border: 0, borderRadius: 8, padding: "5px 14px", fontSize: 13, fontWeight: active === t.key ? 700 : 400, background: active === t.key ? "#fff" : "transparent", color: active === t.key ? "#0f172a" : "#64748b", cursor: "pointer", boxShadow: active === t.key ? "0 1px 3px rgba(0,0,0,.1)" : "none", transition: "all .15s" }}>
          {t.label}
        </button>
      ))}
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
  const [comparison, setComparison] = useState<"none" | "day" | "month" | "year">("none");

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
    return daysAgo((dateRange as number) - 1); // 14日 = 今日含めて14日分
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

  // ---- 比較期間 ----
  const { compFrom, compTo } = useMemo(() => {
    if (comparison === "none") return { compFrom: null, compTo: null };
    const shiftDate = (d: Date, type: "day" | "month" | "year") => {
      const r = new Date(d);
      if (type === "day")   r.setDate(r.getDate() - 1);
      if (type === "month") r.setMonth(r.getMonth() - 1);
      if (type === "year")  r.setFullYear(r.getFullYear() - 1);
      return r;
    };
    return { compFrom: shiftDate(effectiveFrom, comparison), compTo: shiftDate(effectiveTo, comparison) };
  }, [comparison, effectiveFrom, effectiveTo]);

  const compLabel = useMemo(() => {
    if (comparison === "day")   return "前日比";
    if (comparison === "month") return "前月比";
    if (comparison === "year")  return "昨年比";
    return "";
  }, [comparison]);

  // scenarioTab 廃止 → isScenarioInPeriod で期間内シナリオを自動表示
  const [realtimeTab, setRealtimeTab] = useState<"events" | "sessions">("events");

  // ---- リアルタイムログ ----
  const [recentLogs, setRecentLogs] = useState<any[]>([]);


  // ---- stats_daily（ファネル用） ----
  const [statRows, setStatRows] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // ---- 訪問者ジャーニー ----
  const [journeyLogs, setJourneyLogs] = useState<any[]>([]);
  const [journeyLoading, setJourneyLoading] = useState(false);

  // ---- 購入ログ（売上計測） ----
  const [purchaseLogs, setPurchaseLogs] = useState<any[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // ---- 比較期間データ ----
  const [compStatRows, setCompStatRows] = useState<any[]>([]);
  const [compPurchaseLogs, setCompPurchaseLogs] = useState<any[]>([]);
  const [selectedVid, setSelectedVid] = useState<string | null>(null);

  // ---- 商品別売上アコーディオン ----
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // ---- 訪問者ジャーニーフィルター ----
  const [visitorFilter, setVisitorFilter] = useState<"all" | "purchase" | "scenario_purchase" | "cv" | "new" | "repeat">("all");
  // journeyFilterFrom/To は削除 → 上部の期間指定（effectiveFrom/To）に統一
  const [utmFilter, setUtmFilter] = useState<string>(""); // UTMフィルター（utm_source）
  const [couponFilter, setCouponFilter] = useState<string>(""); // クーポンコードフィルター
  const [visitorDisplayLimit, setVisitorDisplayLimit] = useState<number>(100); // 表示件数

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
    setUtmFilter("");
    setCouponFilter("");
    setSelectedVid(null);
  }, [siteId]);

  // ---- 訪問者ジャーニー用ログ（リアルタイム: onSnapshot） ----
  useEffect(() => {
    setJourneyLogs([]);
    if (!siteId) { return; }
    setJourneyLoading(true);

    const since = effectiveFrom.toISOString();
    const to    = effectiveTo.toISOString();
    const unsub = onSnapshot(
      query(
        collection(db, "logs"),
        where("site_id", "==", siteId),
        where("createdAt", ">", since),
        where("createdAt", "<=", to),
        orderBy("createdAt", "desc"),
        limit(5000)
      ),
      (snap) => {
        setJourneyLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setJourneyLoading(false);
      },
      () => setJourneyLoading(false)
    );
    return unsub;
  }, [siteId, effectiveFrom, effectiveTo]);

  // ---- 購入ログ取得（リアルタイム） ----
  useEffect(() => {
    setPurchaseLogs([]); // siteId 変更時に即クリア（古データ混入防止）
    if (!siteId) { return; }
    setPurchaseLoading(true);
    const since = effectiveFrom.toISOString();
    const to    = effectiveTo.toISOString();
    const unsub = onSnapshot(
      query(
        collection(db, "logs"),
        where("site_id", "==", siteId),
        where("event", "==", "purchase"),
        where("createdAt", ">", since),
        limit(1000)
      ),
      (snap) => {
        const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((l) => (l.createdAt || "") <= to);
        // order_id で重複排除（同一注文が複数回ログされてもカウント1回）
        const seen = new Set<string>();
        const deduped = raw.filter((l: any) => {
          const key = l.order_id;
          if (!key) return true;
          if (seen.has(String(key))) return false;
          seen.add(String(key));
          return true;
        });
        setPurchaseLogs(deduped);
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
    const fromStr = isoDay(new Date(effectiveFrom));
    const toStr   = isoDay(new Date(effectiveTo));
    if (!fromStr || !toStr) return;
    setStatsLoading(true);
    const q = query(
      collection(db, "stats_daily"),
      where("siteId", "==", siteId),
      where("day", ">=", fromStr),
      where("day", "<=", toStr)
    );
    return onSnapshot(q, (snap) => {
      setStatRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setStatsLoading(false);
    });
  }, [siteId, effectiveFrom, effectiveTo]);

  // ---- 比較期間 stats_daily ----
  useEffect(() => {
    if (!siteId || !compFrom || !compTo) { setCompStatRows([]); return; }
    const fromStr = isoDay(new Date(compFrom));
    const toStr   = isoDay(new Date(compTo));
    const q = query(
      collection(db, "stats_daily"),
      where("siteId", "==", siteId),
      where("day", ">=", fromStr),
      where("day", "<=", toStr)
    );
    return onSnapshot(q, (snap) => {
      setCompStatRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [siteId, compFrom, compTo]);

  // ---- 比較期間 purchaseLogs ----
  useEffect(() => {
    if (!siteId || !compFrom || !compTo) { setCompPurchaseLogs([]); return; }
    const since = compFrom.toISOString();
    const to    = compTo.toISOString();
    const unsub = onSnapshot(
      query(
        collection(db, "logs"),
        where("site_id", "==", siteId),
        where("event", "==", "purchase"),
        where("createdAt", ">", since),
        limit(1000)
      ),
      (snap) => {
        const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((l) => (l.createdAt || "") <= to);
        const seen = new Set<string>();
        setCompPurchaseLogs(raw.filter((l: any) => {
          const key = l.order_id;
          if (!key) return true;
          if (seen.has(String(key))) return false;
          seen.add(String(key));
          return true;
        }));
      }
    );
    return unsub;
  }, [siteId, compFrom, compTo]);

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
  // 合計・件数・AOV は purchaseLogs ベース（raw データで正確に集計）
  const todayRevenue = useMemo(() => {
    return purchaseLogs
      .filter((l) => utcIsoToJstDay(l.createdAt || "") === todayStr)
      .reduce((s, l) => s + (typeof l.revenue === "number" ? l.revenue : 0), 0);
  }, [purchaseLogs, todayStr]);
  const totalRevenue = useMemo(() => purchaseLogs.reduce((s, l) => s + (typeof l.revenue === "number" ? l.revenue : 0), 0), [purchaseLogs]);
  const purchaseCount = useMemo(() => purchaseLogs.length, [purchaseLogs]);
  const avgOrderValue = useMemo(() => purchaseCount > 0 ? totalRevenue / purchaseCount : 0, [totalRevenue, purchaseCount]);

  // ---- computed: 比較期間の集計値 ----
  const compTodayStr = useMemo(() => {
    if (!compFrom) return "";
    // 比較期間の「今日」= compFrom と compTo の差を考慮した同一相対日
    // シンプルに: 比較期間の終日（compTo の JST日）を比較対象の「今日」とする
    return isoDay(compTo ? new Date(compTo) : new Date(compFrom));
  }, [compFrom, compTo]);

  const compTodayPv = useMemo(() => {
    if (!compTodayStr) return null;
    return compStatRows.filter((r) => r.day === compTodayStr && r.event === "pageview").reduce((s: number, r: any) => s + safeNum(r.count), 0);
  }, [compStatRows, compTodayStr]);
  const compTodayImp = useMemo(() => {
    if (!compTodayStr) return null;
    return compStatRows.filter((r) => r.day === compTodayStr && r.event === "impression").reduce((s, r) => s + safeNum(r.count), 0);
  }, [compStatRows, compTodayStr]);
  const compTodayCv = useMemo(() => {
    if (!compTodayStr) return null;
    return compStatRows.filter((r) => r.day === compTodayStr && r.event === "conversion").reduce((s, r) => s + safeNum(r.count), 0);
  }, [compStatRows, compTodayStr]);
  const compTodayRevenue = useMemo(() => {
    if (!compTodayStr) return null;
    return compPurchaseLogs
      .filter((l) => utcIsoToJstDay(l.createdAt || "") === compTodayStr)
      .reduce((s, l) => s + (typeof l.revenue === "number" ? l.revenue : 0), 0);
  }, [compPurchaseLogs, compTodayStr]);
  const compTotalRevenue = useMemo(() => {
    if (!compFrom) return null;
    return compPurchaseLogs.reduce((s, l) => s + (typeof l.revenue === "number" ? l.revenue : 0), 0);
  }, [compPurchaseLogs, compFrom]);
  const compPurchaseCount = useMemo(() => {
    if (!compFrom) return null;
    return compPurchaseLogs.length;
  }, [compPurchaseLogs, compFrom]);
  const compAvgOrderValue = useMemo(() => {
    if (compPurchaseCount === null || compPurchaseCount === 0) return null;
    return (compTotalRevenue ?? 0) / compPurchaseCount;
  }, [compTotalRevenue, compPurchaseCount]);

  // delta計算ヘルパー: (current - comp) / comp * 100
  const calcDelta = (current: number, comp: number | null): number | undefined => {
    if (comp === null || comp === 0) return undefined;
    return ((current - comp) / comp) * 100;
  };

  // ---- computed: クーポン別集計 ----
  const couponStats = useMemo(() => {
    const map = new Map<string, { code: string; revenue: number; count: number; vids: Set<string> }>();
    for (const l of purchaseLogs) {
      const codes: string[] = Array.isArray(l.discount_codes) ? l.discount_codes : [];
      if (codes.length === 0) continue;
      for (const code of codes) {
        if (!code) continue;
        if (!map.has(code)) map.set(code, { code, revenue: 0, count: 0, vids: new Set() });
        const s = map.get(code)!;
        s.revenue += typeof l.revenue === "number" ? l.revenue : 0;
        s.count++;
        if (l.vid) s.vids.add(l.vid);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((s) => ({ ...s, vids: Array.from(s.vids) }));
  }, [purchaseLogs]);

  // シナリオが選択期間内に稼働していたか判定
  // スケジュールなし → 常時稼働 → true
  // スケジュールあり → 選択期間と重なる場合のみ true
  const isScenarioInPeriod = useCallback((scenarioId: string | null): boolean => {
    if (!scenarioId) return false;
    const sc = scenarios.find((s) => s.id === scenarioId);
    if (!sc) return false;
    const schedule = (sc.data as any)?.schedule;
    if (!schedule || (!schedule.startAt && !schedule.endAt)) return true;
    const startMs = schedule.startAt ? new Date(schedule.startAt).getTime() : -Infinity;
    const endMs   = schedule.endAt   ? new Date(schedule.endAt).getTime()   : Infinity;
    return startMs <= effectiveTo.getTime() && endMs >= effectiveFrom.getTime();
  }, [scenarios, effectiveFrom, effectiveTo]);

  // シナリオ別売上
  // ① purchase ログに scenario_id が直接保存されていれば確定帰属（Web Pixel 更新後の購入）
  // ② なければ journeyLogs のラストタッチで推定帰属（旧データの best-effort）
  //    - シナリオの CV計測タイミングが "click" → click/click_link イベントで帰属
  //    - "view"（デフォルト）→ impression イベントで帰属
  // ※ 購入日が施策の稼働期間（スケジュール±猶予）外なら帰属を外す（施策なし扱い）。
  //   Shopifyのカート属性が終了後も残り、終了済み施策に後日の購入が紐づく問題への対策。
  const revenueByScenario = useMemo(() => {
    const ATTR_GRACE_MS = 7 * 24 * 60 * 60 * 1000; // 終了後7日間は猶予（SDKのカート属性TTLと一致）

    // 施策が指定日に稼働していたか（スケジュールなし＝常時稼働とみなす）
    const wasActiveOnDay = (sc: { data: any } | undefined, dayStr: string): boolean => {
      if (!sc) return false;
      const schedule = (sc.data as any)?.schedule;
      if (!schedule || (!schedule.startAt && !schedule.endAt)) return true;
      const dayMs = new Date(dayStr + "T12:00:00+09:00").getTime();
      const startMs = schedule.startAt ? new Date(schedule.startAt).getTime() - ATTR_GRACE_MS : -Infinity;
      const endMs   = schedule.endAt   ? new Date(schedule.endAt).getTime() + ATTR_GRACE_MS : Infinity;
      return dayMs >= startMs && dayMs <= endMs;
    };

    // journeyLogs から vid → ラストタッチ施策（旧データ補完用）
    const vidToImpScenario = new Map<string, string>();
    const vidToClickScenario = new Map<string, string>();
    for (const l of journeyLogs) {
      if (l.event === "impression" && l.scenario_id && l.vid) vidToImpScenario.set(l.vid, l.scenario_id);
      if ((l.event === "click" || l.event === "click_link") && l.scenario_id && l.vid) vidToClickScenario.set(l.vid, l.scenario_id);
    }

    // クーポンコード → 施策のマップ（最も確実な帰属。接客のクリック/表示に依存しない）
    const couponToScenario = new Map<string, string>();
    for (const s of scenarios) {
      const code = String((s.data as any)?.couponCode || "").trim().toUpperCase();
      if (code) couponToScenario.set(code, s.id);
    }

    const map = new Map<string, { id: string | null; name: string; revenue: number; count: number }>();
    const addToNone = (rev: number) => {
      if (!map.has("__none__")) map.set("__none__", { id: null, name: "（施策なし）", revenue: 0, count: 0 });
      const e = map.get("__none__")!;
      e.revenue += rev;
      e.count++;
    };

    for (const purchase of purchaseLogs) {
      const rev = typeof purchase.revenue === "number" ? purchase.revenue : 0;

      // ① クーポン一致を最優先（明示的な紐付けなので施策稼働期間のゲートも掛けない）
      let couponScenarioId: string | null = null;
      const codes: string[] = Array.isArray(purchase.discount_codes) ? purchase.discount_codes : [];
      for (const c of codes) {
        const hit = couponToScenario.get(String(c || "").trim().toUpperCase());
        if (hit) { couponScenarioId = hit; break; }
      }
      if (couponScenarioId) {
        const sc = scenarios.find((s) => s.id === couponScenarioId);
        const name = sc ? String(sc.data?.name || sc.id) : couponScenarioId;
        if (!map.has(couponScenarioId)) map.set(couponScenarioId, { id: couponScenarioId, name, revenue: 0, count: 0 });
        const entry = map.get(couponScenarioId)!;
        entry.revenue += rev;
        entry.count++;
        continue;
      }

      // ② カート属性 / ラストタッチ帰属（稼働期間ゲートあり）
      let scenarioId: string | null = purchase.scenario_id || null;
      if (!scenarioId && purchase.vid) {
        const clickScId = vidToClickScenario.get(purchase.vid) || null;
        const impScId = vidToImpScenario.get(purchase.vid) || null;
        if (clickScId) {
          const clickSc = scenarios.find((s) => s.id === clickScId);
          if ((clickSc?.data?.goal as any)?.attribution === "click") scenarioId = clickScId;
        }
        if (!scenarioId && impScId) {
          const impSc = scenarios.find((s) => s.id === impScId);
          if ((impSc?.data?.goal as any)?.attribution !== "click") scenarioId = impScId;
        }
      }
      if (!scenarioId) { addToNone(rev); continue; }

      // 購入日に施策が稼働していたかチェック（終了済み施策への後日帰属を排除）
      const sc = scenarios.find((s) => s.id === scenarioId);
      const purchaseDay = utcIsoToJstDay(purchase.createdAt || "");
      if (!wasActiveOnDay(sc, purchaseDay)) { addToNone(rev); continue; }

      const name = sc ? String(sc.data?.name || sc.id) : scenarioId;
      if (!map.has(scenarioId)) map.set(scenarioId, { id: scenarioId, name, revenue: 0, count: 0 });
      const entry = map.get(scenarioId)!;
      entry.revenue += rev;
      entry.count++;
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [purchaseLogs, journeyLogs, scenarios]);

  // ---- computed: 商品別売上（施策帰属付き） ----
  const revenueByProduct = useMemo(() => {
    // 表示ベース: vid → 最後に impression したシナリオ
    const vidToImpScenario = new Map<string, string>();
    const sortedImp = [...journeyLogs]
      .filter((l) => l.event === "impression" && l.scenario_id)
      .sort((a, b) => (a.createdAt || "") < (b.createdAt || "") ? -1 : 1);
    for (const l of sortedImp) {
      if (l.vid && l.scenario_id) vidToImpScenario.set(l.vid, l.scenario_id);
    }
    // クリックベース: vid → 最後に click/click_link したシナリオ
    const vidToClickScenario = new Map<string, string>();
    const sortedClick = [...journeyLogs]
      .filter((l) => (l.event === "click" || l.event === "click_link") && l.scenario_id)
      .sort((a, b) => (a.createdAt || "") < (b.createdAt || "") ? -1 : 1);
    for (const l of sortedClick) {
      if (l.vid && l.scenario_id) vidToClickScenario.set(l.vid, l.scenario_id);
    }

    const map = new Map<string, { title: string; qty: number; revenue: number; qtyAttributed: number; revenueAttributed: number; scenarioBreakdown: Map<string, { qty: number; revenue: number }> }>();
    for (const log of purchaseLogs) {
      if (!Array.isArray(log.items)) continue;
      // purchase ログの scenario_id 優先、なければ attribution 設定に基づくフォールバック
      let scenarioId: string | null = log.scenario_id || null;
      if (!scenarioId && log.vid) {
        const clickScId = vidToClickScenario.get(log.vid) || null;
        const impScId = vidToImpScenario.get(log.vid) || null;
        if (clickScId) {
          const clickSc = scenarios.find((s) => s.id === clickScId);
          if ((clickSc?.data?.goal as any)?.attribution === "click") scenarioId = clickScId;
        }
        if (!scenarioId && impScId) {
          const impSc = scenarios.find((s) => s.id === impScId);
          if ((impSc?.data?.goal as any)?.attribution !== "click") scenarioId = impScId;
        }
      }
      for (const item of log.items) {
        const title = String(item.title || "（不明）");
        if (!map.has(title)) map.set(title, { title, qty: 0, revenue: 0, qtyAttributed: 0, revenueAttributed: 0, scenarioBreakdown: new Map() });
        const entry = map.get(title)!;
        const itemRevenue = (Number(item.qty) || 0) * (Number(item.price) || 0);
        entry.qty += Number(item.qty) || 0;
        entry.revenue += itemRevenue;
        // 施策が選択期間内に稼働していた場合のみ貢献カウント
        if (scenarioId && isScenarioInPeriod(scenarioId)) {
          entry.qtyAttributed += Number(item.qty) || 0;
          entry.revenueAttributed += itemRevenue;
          const bd = entry.scenarioBreakdown;
          const cur = bd.get(scenarioId) || { qty: 0, revenue: 0 };
          bd.set(scenarioId, { qty: cur.qty + (Number(item.qty) || 0), revenue: cur.revenue + itemRevenue });
        }
      }
    }
    return Array.from(map.values())
      .map((r) => ({
        ...r,
        scenarioBreakdown: Array.from(r.scenarioBreakdown.entries())
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => b.revenue - a.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [purchaseLogs, journeyLogs, scenarios, isScenarioInPeriod]);

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
    return scenarios.filter((sc) => (sc.data as any)?.status !== "paused").map((sc) => {
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

  // 期間内に稼働していたシナリオのみ表示（アーカイブ除外）
  const inPeriodScenarios = useMemo(() => scenarios.filter((s) => (s.data as any)?.status !== "paused" && isScenarioInPeriod(s.id)), [scenarios, isScenarioInPeriod]);

  // 施策ファネル: activeな施策はすべて表示（期間フィルターなし）、pausedのみ除外
  const inPeriodFunnelData = useMemo(() => funnelData, [funnelData]);

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
      // PV: stats_daily（JST集計で正確）
      const pv = statRows.filter((r) => r.day === day && r.event === "pageview").reduce((s: number, r: any) => s + safeNum(r.count), 0);
      // UV: サーバー側 arrayUnion 集計の "uv" ドキュメントを優先。旧データは journeyLogs でフォールバック
      const uvDoc = statRows.find((r: any) => r.day === day && r.event === "uv" && r.siteId === siteId);
      const dayLogs = pvLogs.filter((l) => utcIsoToJstDay(l.createdAt || "") === day);
      const uv = uvDoc?.vids?.length ?? new Set(dayLogs.map((l: any) => l.vid).filter(Boolean)).size;
      // セッション数: stats_daily の "session" ドキュメント（sid の arrayUnion）を優先
      // フォールバック: pvLogs（pageview のみ）の sid でカウント（journeyLogs の全イベントは使わない）
      const sessionDoc = statRows.find((r: any) => r.day === day && r.event === "session" && r.siteId === siteId);
      const session = sessionDoc?.sids?.length
        ?? new Set(pvLogs.filter((l) => utcIsoToJstDay(l.createdAt || "") === day && l.sid).map((l) => l.sid)).size;
      const imp = statRows.filter((r) => r.day === day && r.event === "impression").reduce((s, r) => s + safeNum(r.count), 0);
      const cv = statRows.filter((r) => r.day === day && r.event === "conversion").reduce((s, r) => s + safeNum(r.count), 0);
      const revenue = purchaseLogs
        .filter((l) => utcIsoToJstDay(l.createdAt || "") === day)
        .reduce((s, l) => s + (typeof l.revenue === "number" ? l.revenue : 0), 0);
      result.push({ day, label, pv, uv, session, imp, cv, revenue });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [pvLogs, journeyLogs, statRows, purchaseLogs, effectiveFrom, effectiveTo]);

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
  // ジャーニーフィルターが指定されていれば、その範囲内のログだけを集計対象にする
  const visitorList = useMemo(() => {
    const map = new Map<string, {
      vid: string; firstSeen: string; lastSeen: string;
      pvCount: number; totalDuration: number;
      hasConversion: boolean; hasImpression: boolean; hasPurchase: boolean;
      purchaseRevenue: number; purchaseCount: number;
      pages: string[]; eventCount: number; firstRef: string;
      isNew: boolean | null; // true=新規, false=リピート, null=不明（古いログ）
      utmSource: string; utmMedium: string; utmCampaign: string;
      sessionCount: number; // ユニークセッション数（sid単位）
      spanDays: number;     // firstSeen〜lastSeen の日数
      daysSinceLastVisit: number; // 最終訪問からの経過日数
    }>();
    // sid ごとにセッションを追跡
    const vidSids = new Map<string, Set<string>>();
    // 訪問日（JST YYYY-MM-DD）をユニーク集計（spanDays の正確な計算に使用）
    const vidDays = new Map<string, Set<string>>();

    // 上部の期間指定（effectiveFrom/To）でログを絞り込む
    const jFromMs = effectiveFrom.getTime();
    const jToMs   = effectiveTo.getTime();
    const sourceLogs = journeyLogs.filter((l) => { const t = toMs(l.createdAt); return t >= jFromMs && t <= jToMs; });

    const sorted = [...sourceLogs].sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    const nowMs = Date.now();
    for (const l of sorted) {
      const vid = l.vid || "unknown";
      if (!map.has(vid)) {
        map.set(vid, { vid, firstSeen: l.createdAt || "", lastSeen: l.createdAt || "", pvCount: 0, totalDuration: 0, hasConversion: false, hasImpression: false, hasPurchase: false, purchaseRevenue: 0, purchaseCount: 0, pages: [], eventCount: 0, firstRef: "", isNew: null, utmSource: "", utmMedium: "", utmCampaign: "", sessionCount: 0, spanDays: 0, daysSinceLastVisit: 0 });
        vidSids.set(vid, new Set());
        vidDays.set(vid, new Set());
      }
      const v = map.get(vid)!;
      v.lastSeen = l.createdAt || v.lastSeen;
      v.eventCount++;
      // sid 追跡
      if (l.sid) vidSids.get(vid)!.add(l.sid);
      // 訪問日（JST）を追跡
      const dayStr = utcIsoToJstDay(l.createdAt || "");
      if (dayStr) vidDays.get(vid)!.add(dayStr);
      if (l.event === "pageview") {
        v.pvCount++;
        if (l.path && !v.pages.includes(l.path)) v.pages.push(l.path);
        if (!v.firstRef && l.ref) v.firstRef = l.ref;
        // 最初の pageview の is_new を採用（null=古いログで情報なし）
        if (v.isNew === null && typeof l.is_new === "boolean") v.isNew = l.is_new;
        // UTM パラメータは最初の pageview を採用
        if (!v.utmSource && l.utm_source) v.utmSource = l.utm_source;
        if (!v.utmMedium && l.utm_medium) v.utmMedium = l.utm_medium;
        if (!v.utmCampaign && l.utm_campaign) v.utmCampaign = l.utm_campaign;
      }
      if (l.event === "conversion") v.hasConversion = true;
      if (l.event === "impression") v.hasImpression = true;
      if (l.event === "pageleave" && l.duration_sec) v.totalDuration += Number(l.duration_sec);
    }
    // 購入ログを紐付け（vid が明示されているものだけ紐付ける）
    // hasPurchase は「ロード済み範囲内でいつでも購入あり」で判定する
    // （日付フィルターは「その期間に来たか」の絞り込みに使い、購入有無はその人全体で見る）
    for (const p of purchaseLogs) {
      if (!p.vid) continue;
      // map にいない（フィルター期間に来ていない）訪問者でも、
      // 購入だけはフィルター期間内なら map に追加して購入者として扱う
      if (!map.has(p.vid)) {
        const t = toMs(p.createdAt);
        if (t < jFromMs || t > jToMs) continue; // 期間外の購入は無視
        map.set(p.vid, { vid: p.vid, firstSeen: p.createdAt || "", lastSeen: p.createdAt || "", pvCount: 0, totalDuration: 0, hasConversion: false, hasImpression: false, hasPurchase: false, purchaseRevenue: 0, purchaseCount: 0, pages: [], eventCount: 0, firstRef: "", isNew: null, utmSource: "", utmMedium: "", utmCampaign: "", sessionCount: 1, spanDays: 0, daysSinceLastVisit: 0 });
        vidSids.set(p.vid, new Set());
      }
      const v = map.get(p.vid)!;
      v.hasPurchase = true;
      v.purchaseRevenue += typeof p.revenue === "number" ? p.revenue : 0;
      v.purchaseCount++;
    }
    // セッション数・スパン・最終訪問経過日数を後処理で計算
    for (const [vid, v] of map) {
      const sids = vidSids.get(vid);
      v.sessionCount = sids && sids.size > 0 ? sids.size : 1;
      // spanDays: ユニーク訪問日（JST）の最初と最後の差分で計算
      // → 同日複数訪問が多くても正確にリターン間隔を反映できる
      const days = vidDays.get(vid);
      if (days && days.size >= 2) {
        const sortedDays = [...days].sort();
        const d1 = new Date(sortedDays[0] + "T00:00:00+09:00").getTime();
        const d2 = new Date(sortedDays[sortedDays.length - 1] + "T00:00:00+09:00").getTime();
        v.spanDays = Math.round((d2 - d1) / 86400000);
      } else {
        v.spanDays = 0;
      }
      const lastMs = v.lastSeen ? new Date(v.lastSeen).getTime() : nowMs;
      v.daysSinceLastVisit = Math.floor((nowMs - lastMs) / 86400000);
    }
    return Array.from(map.values())
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
      .slice(0, 1000);
  }, [journeyLogs, purchaseLogs, effectiveFrom, effectiveTo]);

  // ---- computed: 流入元（utm_source or ref）× 売上 ----
  const referrerData = useMemo(() => {
    // utm_source → 参照元ドメイン → 直接流入 の順で流入元を判定（PV・売上で共通）
    const resolveSource = (utmSource: string, ref: string): string => {
      if (utmSource) return utmSource;
      if (ref) {
        try { return new URL(ref, "http://x").hostname || ref; } catch (e) { return ref; }
      }
      return "直接流入";
    };
    const sessionMap = new Map<string, number>();
    for (const l of pvLogs) {
      const src = resolveSource(l.utm_source, l.ref);
      sessionMap.set(src, (sessionMap.get(src) || 0) + 1);
    }
    // 訪問者の流入元: utm_source優先、なければ最初のpageviewの参照元ドメイン
    const vidSourceMap = new Map<string, string>();
    for (const v of visitorList) {
      vidSourceMap.set(v.vid, resolveSource(v.utmSource, v.firstRef));
    }
    const revenueMap = new Map<string, { revenue: number; count: number; vids: Set<string> }>();
    for (const p of purchaseLogs) {
      if (!p.vid) continue;
      const src = vidSourceMap.get(p.vid) || "直接流入";
      if (!revenueMap.has(src)) revenueMap.set(src, { revenue: 0, count: 0, vids: new Set() });
      const entry = revenueMap.get(src)!;
      entry.revenue += typeof p.revenue === "number" ? p.revenue : 0;
      entry.count++;
      entry.vids.add(p.vid);
    }
    const allSrcs = new Set([...sessionMap.keys(), ...revenueMap.keys()]);
    return Array.from(allSrcs)
      .map((src) => ({
        src,
        sessions: sessionMap.get(src) || 0,
        revenue: revenueMap.get(src)?.revenue || 0,
        purchaseCount: revenueMap.get(src)?.count || 0,
        buyers: revenueMap.get(src)?.vids.size || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.sessions - a.sessions)
      .slice(0, 10);
  }, [pvLogs, visitorList, purchaseLogs]);

  const referrerMax = useMemo(() => Math.max(...referrerData.map((r) => r.sessions), 1), [referrerData]);
  const referrerTotal = useMemo(() => referrerData.reduce((s, r) => s + r.sessions, 0), [referrerData]);

  // ---- computed: 新規/リピート 日別集計 ----
  // stats_daily の "new_vids" / "repeat_vids" ドキュメントを優先（limit制限なし）
  // デプロイ前の旧データのみ visitorList フォールバック
  const newRepeatTrend = useMemo(() => {
    return dailyTrend.map((d) => {
      const newDoc = statRows.find((r: any) => r.day === d.day && r.event === "new_vids" && r.siteId === siteId);
      const repeatDoc = statRows.find((r: any) => r.day === d.day && r.event === "repeat_vids" && r.siteId === siteId);
      return {
        ...d,
        newCount: newDoc?.vids?.length
          ?? visitorList.filter((v) => v.isNew === true && utcIsoToJstDay(v.firstSeen) === d.day).length,
        repeatCount: repeatDoc?.vids?.length
          ?? visitorList.filter((v) => v.isNew === false && utcIsoToJstDay(v.firstSeen) === d.day).length,
      };
    });
  }, [dailyTrend, visitorList, statRows, siteId]);

  // ---- computed: 訪問頻度分布（sessionCount別バケット） ----
  const visitFrequencyDist = useMemo(() => {
    const buckets = [
      { label: "1回のみ", min: 1, max: 1, count: 0 },
      { label: "2〜3回",  min: 2, max: 3, count: 0 },
      { label: "4〜9回",  min: 4, max: 9, count: 0 },
      { label: "10回以上", min: 10, max: Infinity, count: 0 },
    ];
    for (const v of visitorList) {
      const sc = v.sessionCount;
      const b = buckets.find((b) => sc >= b.min && sc <= b.max);
      if (b) b.count++;
    }
    return buckets;
  }, [visitorList]);

  // ---- computed: リターンスパン分布（異なる日に2回以上来た訪問者の初回〜最終訪問日数） ----
  const returnSpanDist = useMemo(() => {
    const buckets = [
      { label: "1〜3日",  min: 1,  max: 3,   count: 0 },
      { label: "4〜7日",  min: 4,  max: 7,   count: 0 },
      { label: "8〜14日", min: 8,  max: 14,  count: 0 },
      { label: "15〜30日",min: 15, max: 30,  count: 0 },
      { label: "31日以上",min: 31, max: Infinity, count: 0 },
    ];
    // 別の日に2回以上来た人だけ対象（spanDays > 0）
    const returners = visitorList.filter((v) => v.spanDays > 0);
    for (const v of returners) {
      const b = buckets.find((b) => v.spanDays >= b.min && v.spanDays <= b.max);
      if (b) b.count++;
    }
    // 平均リターンスパン（初回〜最終訪問日の平均）
    const avgReturnDays = returners.length > 0
      ? Math.round(returners.reduce((s, v) => s + v.spanDays, 0) / returners.length)
      : null;
    return { buckets, returnerCount: returners.length, avgReturnDays };
  }, [visitorList]);

  // ---- computed: UTM選択肢（utm_sourceのユニーク値） ----
  const utmOptions = useMemo(() => {
    const sources = [...new Set(visitorList.map((v: any) => v.utmSource).filter(Boolean))].sort() as string[];
    return sources;
  }, [visitorList]);

  // シナリオ帰属購入のvid集合（購入ありかつシナリオに帰属している訪問者）
  const scenarioPurchaseVids = useMemo(() => {
    const vids = new Set<string>();
    if (!purchaseLogs.length) return vids;
    const vidToImpScenario = new Map<string, string>();
    const sortedImp = [...journeyLogs]
      .filter((l) => l.event === "impression" && l.scenario_id)
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    for (const l of sortedImp) { if (l.vid) vidToImpScenario.set(l.vid, l.scenario_id); }
    const vidToClickScenario = new Map<string, string>();
    const sortedClick = [...journeyLogs]
      .filter((l) => (l.event === "click" || l.event === "click_link") && l.scenario_id)
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    for (const l of sortedClick) { if (l.vid) vidToClickScenario.set(l.vid, l.scenario_id); }
    for (const purchase of purchaseLogs) {
      if (!purchase.vid) continue;
      let scenarioId: string | null = purchase.scenario_id || null;
      if (!scenarioId) {
        const clickScId = vidToClickScenario.get(purchase.vid) || null;
        const impScId = vidToImpScenario.get(purchase.vid) || null;
        if (clickScId) {
          const sc = scenarios.find((s) => s.id === clickScId);
          if ((sc?.data?.goal as any)?.attribution === "click") scenarioId = clickScId;
        }
        if (!scenarioId && impScId) {
          const sc = scenarios.find((s) => s.id === impScId);
          if ((sc?.data?.goal as any)?.attribution !== "click") scenarioId = impScId;
        }
      }
      if (scenarioId && isScenarioInPeriod(scenarioId)) vids.add(purchase.vid);
    }
    return vids;
  }, [purchaseLogs, journeyLogs, scenarios, isScenarioInPeriod]);

  // ---- computed: フィルター済み訪問者リスト ----
  // visitorList は既にジャーニーフィルター範囲で集計されているため、
  // ここでは visitorFilter / utmFilter のみ適用
  const filteredVisitorList = useMemo(() => {
    let list = visitorList;
    if (visitorFilter === "purchase") list = list.filter((v) => v.hasPurchase);
    if (visitorFilter === "scenario_purchase") list = list.filter((v) => scenarioPurchaseVids.has(v.vid));
    if (visitorFilter === "cv") list = list.filter((v) => v.hasConversion || v.hasPurchase);
    if (visitorFilter === "new") list = list.filter((v) => v.isNew === true);
    if (visitorFilter === "repeat") list = list.filter((v) => v.isNew === false);
    if (utmFilter) list = list.filter((v: any) => v.utmSource === utmFilter);
    if (couponFilter) {
      const couponVids = new Set(couponStats.find((c) => c.code === couponFilter)?.vids || []);
      list = list.filter((v) => couponVids.has(v.vid));
    }
    return list.slice(0, visitorDisplayLimit);
  }, [visitorList, visitorFilter, scenarioPurchaseVids, utmFilter, couponFilter, couponStats, visitorDisplayLimit]);

  // ---- computed: 選択中訪問者のイベント一覧（購入ログ含む） ----
  const selectedJourney = useMemo(() => {
    if (!selectedVid) return [];
    // journeyLogs は全イベントを含むため purchase を除外（purchaseLogs と重複しないように）
    const logs = journeyLogs.filter((l) => l.vid === selectedVid && l.event !== "purchase");
    // 購入ログを purchase イベントとして混ぜる（revenue/order_id 等の詳細情報を持つ purchaseLogs を使う）
    const purchases = purchaseLogs
      .filter((p) => p.vid && p.vid === selectedVid)
      .map((p) => ({ ...p, event: "purchase", id: p.id || p.order_id || String(p.createdAt) }));
    let all = [...logs, ...purchases]
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    // 上部の期間指定でイベントを絞り込む
    const fromMs = effectiveFrom.getTime();
    const toMs2  = effectiveTo.getTime();
    all = all.filter((e) => { const t = toMs(e.createdAt); return t >= fromMs && t <= toMs2; });
    return all;
  }, [journeyLogs, purchaseLogs, selectedVid, effectiveFrom, effectiveTo]);

  // ---- computed: 期間内訪問者別集計（左パネルカード表示用） ----
  const filteredJourneyStats = useMemo(() => {
    const fromMs = effectiveFrom.getTime();
    const toMs2  = effectiveTo.getTime();
    const map = new Map<string, { pvCount: number; lastSeen: string; hasPurchase: boolean; purchaseRevenue: number; purchaseCount: number }>();
    for (const l of journeyLogs) {
      const t = toMs(l.createdAt); if (t < fromMs || t > toMs2) continue;
      const vid = l.vid; if (!vid) continue;
      if (!map.has(vid)) map.set(vid, { pvCount: 0, lastSeen: "", hasPurchase: false, purchaseRevenue: 0, purchaseCount: 0 });
      const s = map.get(vid)!;
      if (l.event === "pageview") s.pvCount++;
      if (!s.lastSeen || l.createdAt > s.lastSeen) s.lastSeen = l.createdAt || "";
    }
    for (const p of purchaseLogs) {
      const t = toMs(p.createdAt); if (t < fromMs || t > toMs2) continue;
      const vid = p.vid; if (!vid) continue;
      if (!map.has(vid)) map.set(vid, { pvCount: 0, lastSeen: "", hasPurchase: false, purchaseRevenue: 0, purchaseCount: 0 });
      const s = map.get(vid)!;
      s.hasPurchase = true;
      s.purchaseRevenue += typeof p.revenue === "number" ? p.revenue : 0;
      s.purchaseCount++;
      if (!s.lastSeen || p.createdAt > s.lastSeen) s.lastSeen = p.createdAt || "";
    }
    return map;
  }, [journeyLogs, purchaseLogs, effectiveFrom, effectiveTo]);

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

  const focusCards = useMemo(() => {
    const pvTotal  = dailyTrend.reduce((sum, d) => sum + safeNum(d.pv), 0);
    const impTotal = dailyTrend.reduce((sum, d) => sum + safeNum(d.imp), 0);
    const cvTotal  = dailyTrend.reduce((sum, d) => sum + safeNum(d.cv), 0);
    const compPvTotal  = compFrom ? compStatRows.filter((r) => r.event === "pageview") .reduce((s: number, r: any) => s + safeNum(r.count), 0) : null;
    const compImpTotal = compFrom ? compStatRows.filter((r) => r.event === "impression").reduce((s: number, r: any) => s + safeNum(r.count), 0) : null;
    const compCvTotal  = compFrom ? compStatRows.filter((r) => r.event === "conversion").reduce((s: number, r: any) => s + safeNum(r.count), 0) : null;
    const cards = [
      {
        key: "pv",
        label: "ページビュー",
        value: fmtInt(pvTotal),
        numericValue: pvTotal,
        formatter: (n: number) => n.toLocaleString("ja-JP"),
        sub: `${dateRangeLabel} の閲覧量`,
        accent: "#2563eb",
        delta: calcDelta(pvTotal, compPvTotal),
      },
      {
        key: "imp",
        label: "施策表示",
        value: fmtInt(impTotal),
        numericValue: impTotal,
        formatter: (n: number) => n.toLocaleString("ja-JP"),
        sub: "シナリオ表示回数",
        accent: "#7c3aed",
        delta: calcDelta(impTotal, compImpTotal),
      },
      purchaseLogs.length > 0
        ? {
            key: "revenue",
            label: "売上合計",
            value: `¥${Math.round(totalRevenue).toLocaleString()}`,
            numericValue: Math.round(totalRevenue),
            formatter: (n: number) => `¥${n.toLocaleString("ja-JP")}`,
            sub: `${purchaseCount}件の購入`,
            accent: "#16a34a",
            delta: calcDelta(totalRevenue, compTotalRevenue),
          }
        : {
            key: "cv",
            label: "コンバージョン",
            value: fmtInt(cvTotal),
            numericValue: cvTotal,
            formatter: (n: number) => n.toLocaleString("ja-JP"),
            sub: "期間内のCV数",
            accent: "#f59e0b",
            delta: calcDelta(cvTotal, compCvTotal),
          },
    ];
    return cards;
  }, [dailyTrend, dateRangeLabel, purchaseCount, purchaseLogs.length, totalRevenue, compFrom, compStatRows, compTotalRevenue]);

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
          {/* 比較選択 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="small" style={{ opacity: 0.5, whiteSpace: "nowrap" }}>比較:</span>
            <div style={{ display: "flex", border: "1px solid rgba(15,23,42,.12)", borderRadius: 10, overflow: "hidden" }}>
              {([ ["none", "なし"], ["day", "前日"], ["month", "前月"], ["year", "昨年"] ] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setComparison(val)}
                  style={{
                    padding: "7px 12px",
                    border: "none",
                    borderLeft: val !== "none" ? "1px solid rgba(15,23,42,.08)" : undefined,
                    background: comparison === val ? "#374151" : "transparent",
                    color: comparison === val ? "#fff" : "inherit",
                    fontWeight: comparison === val ? 700 : 500,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 管理者除外ブックマークレット */}
      {siteDomain && (
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
          <div className="card" style={{ marginBottom: 24, padding: 18, background: "linear-gradient(180deg,#ffffff,#f8fbff)" }}>
            <SectionLead
              title="まず見る3指標"
              description="最初に変化を追いやすい数値だけを前に出しています。詳しい分析はこの下で見られます。"
              meta={<span>{selectedSiteName || "サイト未選択"} / {dateRangeLabel}</span>}
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {focusCards.map((card) => (
                <div key={card.key} style={{ border: "1px solid rgba(15,23,42,.08)", borderRadius: 14, padding: 16, background: "#fff" }}>
                  <div className="small" style={{ opacity: 0.68 }}>{card.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, marginTop: 8, letterSpacing: "-.03em", color: card.accent, minHeight: 34 }}>
                    {statsLoading
                      ? <SkeletonBar width="65%" height={26} radius={5} />
                      : typeof card.numericValue === "number"
                        ? <CountUp value={card.numericValue} formatter={card.formatter || ((n) => n.toLocaleString("ja-JP"))} />
                        : card.value}
                  </div>
                  <div className="small" style={{ opacity: 0.58, marginTop: 6, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                    {statsLoading ? <SkeletonBar width="50%" height={10} radius={3} /> : (
                      <>
                        {card.sub}
                        {card.delta !== undefined && (() => {
                          const up = card.delta >= 0;
                          const abs = Math.abs(card.delta);
                          const pct = abs >= 1000 ? ">999%" : abs < 1 ? `${abs.toFixed(1)}%` : `${Math.round(abs)}%`;
                          return <span style={{ fontSize: 11, fontWeight: 700, color: up ? "#16a34a" : "#dc2626", marginLeft: 6 }}>{up ? "↑" : "↓"}{pct} {compLabel}</span>;
                        })()}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== 日別トレンド ===== */}
          <div style={{ marginBottom: 32 }}>
            <div className="h2" style={{ marginBottom: 14 }}>
              日別トレンド <span className="small" style={{ fontWeight: 400, opacity: 0.6 }}>（{dateRangeLabel}）</span>
            </div>

            {journeyLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <SkeletonCard rows={5} /><SkeletonCard rows={5} />
                <SkeletonCard rows={4} /><SkeletonCard rows={4} />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                {/* ① PV & ユニーク訪問者 */}
                <div className="card" style={{ padding: "20px 20px 8px", background: "#fff" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 16 }}>📈 ページビュー / セッション数 / ユニーク訪問者</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={dailyTrend} margin={{ top: 4, right: 48, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradPv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradSession" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradUv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0891b2" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,.06)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(15,23,42,.45)" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "rgba(15,23,42,.45)" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#16a34a" }} axisLine={false} tickLine={false} tickFormatter={(v) => v === 0 ? "0" : `¥${(v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v))}`} />
                      <Tooltip content={<DailyTrendTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Area yAxisId="left" type="monotone" dataKey="pv" name="ページビュー" stroke="#2563eb" strokeWidth={2} fill="url(#gradPv)" dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      <Area yAxisId="left" type="monotone" dataKey="session" name="セッション数" stroke="#7c3aed" strokeWidth={2} fill="url(#gradSession)" dot={{ r: 3, fill: "#7c3aed", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      <Area yAxisId="left" type="monotone" dataKey="uv" name="ユニーク訪問者" stroke="#0891b2" strokeWidth={2} fill="url(#gradUv)" dot={{ r: 3, fill: "#0891b2", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      <Bar yAxisId="right" dataKey="revenue" name="売上" fill="#86efac" fillOpacity={0.6} radius={[3, 3, 0, 0]} maxBarSize={20} />
                    </ComposedChart>
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
                    <Bar dataKey="newCount" name="新規" stackId="a" fill="#22c55e" fillOpacity={0.8} radius={[0, 0, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="repeatCount" name="リピート" stackId="a" fill="#94a3b8" fillOpacity={0.7} radius={[3, 3, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ④ 訪問頻度分布 ＋ リターンスパン分布 */}
            {!journeyLoading && visitorList.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, marginBottom: 16 }}>

                {/* 訪問頻度分布 */}
                <div className="card" style={{ padding: "20px 20px 12px", background: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>🔁 訪問頻度分布</div>
                    <span className="small" style={{ opacity: 0.5 }}>{visitorList.length}人</span>
                  </div>
                  <div className="small" style={{ opacity: 0.5, marginBottom: 14 }}>
                    同じユーザーが何回サイトを訪れたか（セッション単位）
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={visitFrequencyDist} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,.06)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(15,23,42,.5)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "rgba(15,23,42,.4)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(15,23,42,.1)", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}
                        formatter={(value: any) => [`${value}人`, "訪問者数"]}
                      />
                      <Bar dataKey="count" name="訪問者数" fill="#3b82f6" fillOpacity={0.75} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  {/* サマリー行 */}
                  <div style={{ display: "flex", gap: 12, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(15,23,42,.06)", flexWrap: "wrap" }}>
                    {visitFrequencyDist.map((b) => (
                      <div key={b.label} style={{ textAlign: "center", minWidth: 52 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#1d4ed8" }}>{b.count}</div>
                        <div style={{ fontSize: 10, opacity: 0.5 }}>{b.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* リターンスパン分布 */}
                <div className="card" style={{ padding: "20px 20px 12px", background: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>📅 リターンスパン分布</div>
                    <span className="small" style={{ opacity: 0.5 }}>{returnSpanDist.returnerCount}人（リピーター）</span>
                  </div>
                  <div className="small" style={{ opacity: 0.5, marginBottom: 14 }}>
                    2回以上訪問した人が、平均何日後に戻ってくるか
                  </div>
                  {returnSpanDist.returnerCount === 0 ? (
                    <div style={{ padding: "32px 0", textAlign: "center", opacity: 0.4, fontSize: 13 }}>
                      リピーターデータがまだありません
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={returnSpanDist.buckets} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={28}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,.06)" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(15,23,42,.5)" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "rgba(15,23,42,.4)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(15,23,42,.1)", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}
                            formatter={(value: any) => [`${value}人`, "訪問者数"]}
                          />
                          <Bar dataKey="count" name="訪問者数" fill="#8b5cf6" fillOpacity={0.75} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      <div style={{ display: "flex", gap: 16, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(15,23,42,.06)" }}>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "#7c3aed" }}>
                            {returnSpanDist.avgReturnDays != null ? `${returnSpanDist.avgReturnDays}日` : "—"}
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.5 }}>平均リターン間隔</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "#374151" }}>
                            {returnSpanDist.returnerCount}人
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.5 }}>リピーター数</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>
            )}

            {/* 施策別CVトレンド（期間内に稼働していたシナリオのみ） */}
            {!journeyLoading && inPeriodScenarios.length > 0 && (
              <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                {inPeriodScenarios.slice(0, 4).map((sc) => {
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
                          <Bar dataKey="imp" name="表示" fill="#7c3aed" fillOpacity={0.65} radius={[2, 2, 0, 0]} maxBarSize={32} />
                          <Line type="monotone" dataKey="cv" name="CV" stroke="#16a34a" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>

          {/* ===== Section 1: リアルタイム ===== */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <LiveDot />
              <SectionLead
                title="リアルタイム"
                description="直近30分の動きです。今まさに反応があるかだけを確認できます。"
                meta="過去30分"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
              <StatCard label="アクティブ訪問者" value={fmtInt(activeVisitors)} sub="ユニーク訪問者数" accent="#22c55e" loading={journeyLoading} />
              <StatCard label="今日のPV" value={fmtInt(todayPvCount)} sub="ページビュー" loading={statsLoading} delta={calcDelta(todayPvCount, compTodayPv)} compLabel={compLabel} />
              <StatCard label="今日の施策表示" value={fmtInt(todayImpCount)} sub="インプレッション" accent="#2563eb" loading={statsLoading} delta={calcDelta(todayImpCount, compTodayImp)} compLabel={compLabel} />
              <StatCard label="今日のCV" value={fmtInt(todayCvCount)} sub="コンバージョン" accent="#f59e0b" loading={statsLoading} delta={calcDelta(todayCvCount, compTodayCv)} compLabel={compLabel} />
              <StatCard label="今日の売上" value="—" numericValue={todayRevenue} sub="購入合計" accent="#16a34a" loading={purchaseLoading} formatter={(n) => n > 0 ? `¥${Math.round(n).toLocaleString()}` : "—"} delta={calcDelta(todayRevenue, compTodayRevenue)} compLabel={compLabel} />
            </div>
            {/* タブ: 直近のイベント / セッション行動 */}
            <TabBar
              tabs={[{ key: "events", label: "直近のイベント" }, { key: "sessions", label: "セッション行動" }]}
              active={realtimeTab}
              onChange={(k) => setRealtimeTab(k as "events" | "sessions")}
            />
            {realtimeTab === "events" && (
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
            )}
            {realtimeTab === "sessions" && (
              <>
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
              </>
            )}
          </div>

          {/* ===== Section 1.5: 売上計測 ===== */}
          {(purchaseLogs.length > 0 || purchaseLoading) && (
            <div style={{ marginBottom: 32 }}>
              <div className="h2" style={{ marginBottom: 14 }}>
                💰 売上計測 <span className="small" style={{ fontWeight: 400, opacity: 0.6 }}>（{dateRangeLabel} · Shopify Web Pixel）</span>
              </div>
              {purchaseLoading ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
                  <SkeletonCard rows={3} /><SkeletonCard rows={3} /><SkeletonCard rows={3} />
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
                    <StatCard label="売上合計" value="—" numericValue={Math.round(totalRevenue)} sub={`${purchaseCount}件の購入`} accent="#22c55e" loading={statsLoading} formatter={(n) => `¥${n.toLocaleString()}`} delta={calcDelta(totalRevenue, compTotalRevenue)} compLabel={compLabel} />
                    <StatCard label="平均注文額" value="—" numericValue={Math.round(avgOrderValue)} sub="AOV" accent="#0891b2" loading={statsLoading} formatter={(n) => `¥${n.toLocaleString()}`} delta={calcDelta(avgOrderValue, compAvgOrderValue)} compLabel={compLabel} />
                    <StatCard label="購入件数" value={fmtInt(purchaseCount)} numericValue={purchaseCount} sub="ユニーク注文" accent="#7c3aed" loading={statsLoading} delta={calcDelta(purchaseCount, compPurchaseCount)} compLabel={compLabel} />
                  </div>
                  {/* デバッグ: 購入ログのvid確認 */}
                  <details style={{ marginBottom: 10 }}>
                    <summary style={{ fontSize: 11, color: "#94a3b8", cursor: "pointer" }}>開発確認用（帰属確認が必要なときだけ開く）</summary>
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
                  {revenueByProduct.length > 0 && (
                    <div className="card" style={{ padding: 18, background: "#fff", marginTop: 12 }}>
                      <div className="small" style={{ fontWeight: 700, marginBottom: 12 }}>🛍️ 商品別売上</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {revenueByProduct.map((r) => {
                          const maxRev = revenueByProduct[0]?.revenue || 1;
                          const barPct = (r.revenue / maxRev) * 100;
                          const attrPct = r.qty > 0 ? Math.round((r.qtyAttributed / r.qty) * 100) : 0;
                          const isExpanded = expandedProducts.has(r.title);
                          const hasBreakdown = r.scenarioBreakdown.length > 0;
                          return (
                            <div key={r.title} style={{ borderRadius: 10, overflow: "hidden", border: isExpanded ? "1px solid #e2e8f0" : "1px solid transparent", marginBottom: 6 }}>
                              {/* メイン行 */}
                              <div
                                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", cursor: hasBreakdown ? "pointer" : "default", background: isExpanded ? "#f8fafc" : "transparent", borderRadius: isExpanded ? "10px 10px 0 0" : 10 }}
                                onClick={() => {
                                  if (!hasBreakdown) return;
                                  setExpandedProducts((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(r.title)) next.delete(r.title); else next.add(r.title);
                                    return next;
                                  });
                                }}
                              >
                                {hasBreakdown && (
                                  <span style={{ fontSize: 11, color: "#94a3b8", userSelect: "none", transition: "transform .2s", display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                                )}
                                <div style={{ minWidth: 160, fontSize: 13, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "0 0 160px" }}>{r.title}</div>
                                <div style={{ flex: 1, height: 8, background: "rgba(15,23,42,.07)", borderRadius: 99, overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${barPct}%`, background: "#f59e0b", borderRadius: 99, transition: "width .4s ease" }} />
                                </div>
                                <div style={{ minWidth: 100, fontSize: 13, fontWeight: 600, textAlign: "right" }}>¥{Math.round(r.revenue).toLocaleString()}</div>
                                <div style={{ minWidth: 50, fontSize: 12, color: "#94a3b8", textAlign: "right" }}>{r.qty}個</div>
                                {r.qtyAttributed > 0 && (
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#dcfce7", color: "#15803d", whiteSpace: "nowrap" }}>施策貢献 {attrPct}%</span>
                                )}
                              </div>
                              {/* アコーディオン: シナリオ別内訳 */}
                              {isExpanded && (
                                <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "10px 16px 12px 32px", display: "flex", flexDirection: "column", gap: 7 }}>
                                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>施策別内訳</div>
                                  {r.scenarioBreakdown.map((bd) => {
                                    const sc = scenarios.find((s) => s.id === bd.id);
                                    const scName = sc ? String(sc.data?.name || sc.id) : bd.id;
                                    const bdPct = r.qtyAttributed > 0 ? Math.round((bd.qty / r.qtyAttributed) * 100) : 0;
                                    return (
                                      <div key={bd.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", flexShrink: 0 }} />
                                        <div style={{ flex: 1, fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scName}</div>
                                        <div style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{bd.qty}個</div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", whiteSpace: "nowrap", minWidth: 80, textAlign: "right" }}>¥{Math.round(bd.revenue).toLocaleString()}</div>
                                        <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 20, background: "#ede9fe", color: "#6d28d9", whiteSpace: "nowrap" }}>{bdPct}%</span>
                                      </div>
                                    );
                                  })}
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

          {/* ===== Section 1.6: クーポン分析 ===== */}
          {couponStats.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div className="h2" style={{ marginBottom: 14 }}>
                🎟️ クーポン分析 <span className="small" style={{ fontWeight: 400, opacity: 0.6 }}>（{dateRangeLabel} · 購入ログに discount_codes が記録された件数）</span>
              </div>
              <div className="card" style={{ padding: 18, background: "#fff" }}>
                {/* ヘッダー行 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 80px 120px", gap: 8, padding: "4px 8px", marginBottom: 8 }}>
                  <div className="small" style={{ fontWeight: 700, opacity: 0.5 }}>クーポンコード</div>
                  <div className="small" style={{ fontWeight: 700, opacity: 0.5, textAlign: "right" }}>売上合計</div>
                  <div className="small" style={{ fontWeight: 700, opacity: 0.5, textAlign: "right" }}>件数</div>
                  <div className="small" style={{ fontWeight: 700, opacity: 0.5, textAlign: "right" }}>訪問者数</div>
                  <div className="small" style={{ fontWeight: 700, opacity: 0.5, textAlign: "center" }}>ジャーニー追跡</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {couponStats.map((c) => {
                    const maxRev = couponStats[0]?.revenue || 1;
                    const barPct = (c.revenue / maxRev) * 100;
                    const isActive = couponFilter === c.code;
                    return (
                      <div key={c.code} style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 80px 120px", gap: 8, alignItems: "center", padding: "8px", borderRadius: 8, background: isActive ? "#f0fdf4" : "rgba(15,23,42,.02)", border: isActive ? "1px solid #86efac" : "1px solid transparent" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "#1f6573", minWidth: 120 }}>{c.code}</div>
                          <div style={{ flex: 1, height: 6, background: "rgba(15,23,42,.07)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${barPct}%`, background: "#34d399", borderRadius: 99, transition: "width .4s ease" }} />
                          </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right", color: "#16a34a" }}>¥{Math.round(c.revenue).toLocaleString()}</div>
                        <div style={{ fontSize: 13, textAlign: "right", color: "#374151" }}>{c.count}件</div>
                        <div style={{ fontSize: 13, textAlign: "right", color: "#374151" }}>{c.vids.length}人</div>
                        <div style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setCouponFilter(isActive ? "" : c.code);
                              setSelectedVid(null);
                              // ジャーニーセクションまでスクロール
                              setTimeout(() => {
                                document.getElementById("journey-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }, 100);
                            }}
                            style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, border: "none", background: isActive ? "#16a34a" : "#e0f2fe", color: isActive ? "#fff" : "#0369a1", cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            {isActive ? "✓ 追跡中" : "👣 追跡する"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===== Section 2: 流入元 ===== */}
          <div style={{ marginBottom: 32 }}>
            <div className="h2" style={{ marginBottom: 14 }}>
              流入元・離脱 <span className="small" style={{ fontWeight: 400, opacity: 0.6 }}>（{dateRangeLabel}）</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>

              {/* 流入元 × 売上（全幅） */}
              <div className="card" style={{ padding: 18, background: "#fff", gridColumn: "1 / -1" }}>
                <div style={{ marginBottom: 16 }}>
                  <div className="small" style={{ fontWeight: 700 }}>🔀 流入元経由売上</div>
                  <div className="small" style={{ opacity: 0.5, marginTop: 2 }}>utm_source またはリファラー × ファーストタッチ帰属</div>
                </div>
                {journeyLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><SkeletonBar width="80%" /><SkeletonBar width="60%" /><SkeletonBar width="70%" /></div>
                ) : referrerData.length === 0 ? (
                  <div className="small" style={{ opacity: 0.55 }}>データなし</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    {/* グラフ */}
                    <div>
                      <ResponsiveContainer width="100%" height={Math.max(180, referrerData.length * 36)}>
                        <BarChart data={[...referrerData].reverse()} layout="vertical" margin={{ top: 0, right: 60, left: 8, bottom: 0 }} barSize={14}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="src" width={90} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: any) => `¥${Number(v).toLocaleString()}`} labelStyle={{ fontSize: 12 }} />
                          <Bar dataKey="revenue" name="売上" fill="#59b7c6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* テーブル */}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 600, opacity: 0.6 }}>流入元</th>
                            <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600, opacity: 0.6 }}>PV</th>
                            <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600, opacity: 0.6 }}>購入者</th>
                            <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600, opacity: 0.6 }}>売上</th>
                            <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600, opacity: 0.6 }}>CVR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {referrerData.map((r) => {
                            const cvr = r.sessions > 0 ? (r.buyers / r.sessions * 100) : 0;
                            return (
                              <tr key={r.src} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "6px 8px", fontWeight: 500, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.src}</td>
                                <td style={{ textAlign: "right", padding: "6px 8px", opacity: 0.7 }}>{fmtInt(r.sessions)}</td>
                                <td style={{ textAlign: "right", padding: "6px 8px" }}>{r.buyers > 0 ? fmtInt(r.buyers) : <span style={{ opacity: 0.3 }}>—</span>}</td>
                                <td style={{ textAlign: "right", padding: "6px 8px", fontWeight: r.revenue > 0 ? 700 : 400, color: r.revenue > 0 ? "#0f172a" : undefined }}>{r.revenue > 0 ? `¥${r.revenue.toLocaleString()}` : <span style={{ opacity: 0.3 }}>—</span>}</td>
                                <td style={{ textAlign: "right", padding: "6px 8px", color: cvr > 0 ? "#059669" : undefined }}>{cvr > 0 ? `${cvr.toFixed(1)}%` : <span style={{ opacity: 0.3 }}>—</span>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
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
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><SkeletonBar width="75%" /><SkeletonBar width="55%" /><SkeletonBar width="65%" /></div>
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
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><SkeletonBar width="90%" /><SkeletonBar width="70%" /><SkeletonBar width="80%" /></div>
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
            {inPeriodFunnelData.length === 0 ? (
              <div className="card" style={{ padding: 20, opacity: 0.7 }}>
                <div className="small">選択期間に稼働していた施策のデータがありません</div>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 16 }}>
                  {inPeriodFunnelData.slice(0, 6).map((sc) => {
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
                {/* 施策別売上 */}
                {revenueByScenario.length > 0 && (
                  <div className="card" style={{ padding: 18, background: "#fff", marginBottom: 16 }}>
                    <div className="small" style={{ fontWeight: 700, marginBottom: 12 }}>施策別売上（ラストタッチ帰属）</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {revenueByScenario.map((r) => {
                        const revPct = totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0;
                        return (
                          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ minWidth: 140, fontSize: 13, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                            <div style={{ flex: 1, height: 8, background: "rgba(15,23,42,.07)", borderRadius: 99, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${revPct}%`, background: r.name === "（施策なし）" ? "#94a3b8" : "#22c55e", borderRadius: 99, transition: "width .4s ease" }} />
                            </div>
                            <div style={{ minWidth: 100, fontSize: 13, fontWeight: 600, textAlign: "right" }}>¥{Math.round(r.revenue).toLocaleString()}</div>
                            <div style={{ minWidth: 40, fontSize: 12, color: "#94a3b8", textAlign: "right" }}>{r.count}件</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* 施策比較テーブル */}
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
                      {inPeriodFunnelData.map((sc, i) => (
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* ===== Section 6: 訪問者ジャーニー ===== */}
          <div id="journey-section" style={{ marginBottom: 32 }}>
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
              {journeyLoading && <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}><SkeletonBar width="100%" height={14} /><SkeletonBar width="80%" height={14} /><SkeletonBar width="90%" height={14} /><SkeletonBar width="60%" height={14} /></div>}
            </div>

            {/* フィルターバー */}
            <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", alignItems: "center", marginBottom: 12, padding: "10px 14px", background: "rgba(15,23,42,.03)", borderRadius: 10, border: "1px solid rgba(15,23,42,.07)", overflowX: "auto" }}>
              <span className="small" style={{ opacity: 0.55, whiteSpace: "nowrap", fontWeight: 700, marginRight: 4 }}>このブロックだけに適用</span>
              {/* 絞り込みタイプ */}
              <div style={{ display: "flex", border: "1px solid rgba(15,23,42,.12)", borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                {([["all", "全員"], ["new", "🆕 新規"], ["repeat", "🔁 リピート"], ["purchase", "💰 購入あり"], ["scenario_purchase", "🎯 施策経由購入"], ["cv", "✅ CV あり"]] as const).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => { setVisitorFilter(val); setSelectedVid(null); }} style={{ padding: "5px 10px", border: "none", fontSize: 12, fontWeight: visitorFilter === val ? 700 : 500, background: visitorFilter === val ? "#1f6573" : "transparent", color: visitorFilter === val ? "#fff" : "inherit", cursor: "pointer", whiteSpace: "nowrap" }}>
                    {label}
                  </button>
                ))}
              </div>
              {/* UTM流入元フィルター */}
              {utmOptions.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  <span className="small" style={{ opacity: 0.6, whiteSpace: "nowrap" }}>流入元</span>
                  <select value={utmFilter} onChange={(e) => setUtmFilter(e.target.value)} style={{ fontSize: 12, padding: "5px 7px", border: "1px solid rgba(15,23,42,.14)", borderRadius: 7, background: "#fff", cursor: "pointer", maxWidth: 140 }}>
                    <option value="">すべて</option>
                    {utmOptions.map((src) => <option key={src} value={src}>{src}</option>)}
                  </select>
                  {utmFilter && (
                    <button type="button" onClick={() => setUtmFilter("")} style={{ fontSize: 11, padding: "4px 7px", border: "1px solid rgba(15,23,42,.14)", borderRadius: 6, background: "transparent", cursor: "pointer", opacity: 0.6 }}>✕</button>
                  )}
                </div>
              )}
              {/* クーポンフィルター */}
              {couponStats.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  <span className="small" style={{ opacity: 0.6, whiteSpace: "nowrap" }}>🎟️ クーポン</span>
                  <select value={couponFilter} onChange={(e) => { setCouponFilter(e.target.value); setSelectedVid(null); }} style={{ fontSize: 12, padding: "5px 7px", border: "1px solid rgba(15,23,42,.14)", borderRadius: 7, background: couponFilter ? "#f0fdf4" : "#fff", cursor: "pointer", maxWidth: 160, fontWeight: couponFilter ? 700 : 400, color: couponFilter ? "#16a34a" : "inherit" }}>
                    <option value="">すべて</option>
                    {couponStats.map((c) => <option key={c.code} value={c.code}>{c.code}（{c.vids.length}人）</option>)}
                  </select>
                  {couponFilter && (
                    <button type="button" onClick={() => { setCouponFilter(""); setSelectedVid(null); }} style={{ fontSize: 11, padding: "4px 7px", border: "1px solid rgba(15,23,42,.14)", borderRadius: 6, background: "transparent", cursor: "pointer", opacity: 0.6 }}>✕</button>
                  )}
                </div>
              )}
              {/* 件数表示 + 表示件数プルダウン */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", flexShrink: 0 }}>
                <div className="small" style={{ opacity: 0.55, whiteSpace: "nowrap" }}>
                  {filteredVisitorList.length}人表示
                  {visitorFilter !== "all" || utmFilter ? ` / ${visitorList.length}人中` : ""}
                </div>
                <select
                  value={visitorDisplayLimit}
                  onChange={(e) => setVisitorDisplayLimit(Number(e.target.value))}
                  style={{ fontSize: 11, padding: "3px 6px", border: "1px solid rgba(15,23,42,.14)", borderRadius: 6, background: "#fff", cursor: "pointer" }}
                >
                  {[50, 100, 200, 500, 1000].map((n) => (
                    <option key={n} value={n}>{n}人</option>
                  ))}
                </select>
              </div>
            </div>

            {visitorList.length === 0 && !journeyLoading ? (
              <div className="card" style={{ padding: 20, opacity: 0.7 }}>
                <div className="small">期間内の訪問データがありません</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" }}>

                {/* 左: 訪問者リスト */}
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(15,23,42,.07)", background: "rgba(15,23,42,.02)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div>
                        <div className="small" style={{ fontWeight: 700 }}>
                          {filteredVisitorList.length === 0 ? "条件に一致する訪問者なし" : `訪問者 ${filteredVisitorList.length}人`}
                        </div>
                        <div className="small" style={{ opacity: 0.5, marginTop: 2 }}>
                          新しい動きから順に表示
                        </div>
                      </div>
                      {(visitorFilter !== "all" || utmFilter || couponFilter) && (
                        <button
                          type="button"
                          onClick={() => { setVisitorFilter("all"); setUtmFilter(""); setCouponFilter(""); setSelectedVid(null); }}
                          style={{ fontSize: 11, padding: "3px 8px", border: "none", borderRadius: 20, background: couponFilter ? "#dcfce7" : "#fde68a", color: couponFilter ? "#15803d" : "#92400e", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}
                        >
                          {couponFilter ? `🎟️ ${couponFilter} ×` : utmFilter ? `📡 ${utmFilter} ×` : visitorFilter === "purchase" ? "💰 購入フィルター中 ×" : visitorFilter === "scenario_purchase" ? "🎯 施策経由購入フィルター中 ×" : visitorFilter === "cv" ? "✅ CVフィルター中 ×" : visitorFilter === "new" ? "🆕 新規フィルター中 ×" : "🔁 リピートフィルター中 ×"}
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
                      // 日付フィルター適用時はフィルター済み stats を優先表示
                      const fs = filteredJourneyStats?.get(v.vid);
                      const dispPvCount = fs ? fs.pvCount : v.pvCount;
                      const dispHasPurchase = fs ? fs.hasPurchase : v.hasPurchase;
                      const dispPurchaseRevenue = fs ? fs.purchaseRevenue : v.purchaseRevenue;
                      const dispPurchaseCount = fs ? fs.purchaseCount : v.purchaseCount;
                      const dispLastSeen = fs ? fs.lastSeen : v.lastSeen;
                      const durationMin = Math.round(v.totalDuration / 60);
                      const lastTime = dispLastSeen ? new Date(dispLastSeen).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
                      const vidShort = v.vid.slice(0, 8) + "…";
                      const visitorTypeLabel = v.isNew === true ? "新規" : v.isNew === false ? "リピート" : null;
                      const visitorTypeStyle = v.isNew === true
                        ? { background: "#f0fdf4", color: "#15803d" }
                        : { background: "#f1f5f9", color: "#475569" };
                      const statusLabel = dispHasPurchase
                        ? `購入 ${dispPurchaseCount}件`
                        : v.hasConversion
                          ? "CVあり"
                          : v.hasImpression
                            ? "施策表示"
                            : "ページ閲覧のみ";
                      const statusStyle = dispHasPurchase
                        ? { background: "#fefce8", color: "#ca8a04" }
                        : v.hasConversion
                          ? { background: "#f0fdf4", color: "#16a34a" }
                          : v.hasImpression
                            ? { background: "#eff6ff", color: "#2563eb" }
                            : { background: "rgba(15,23,42,.06)", color: "#475569" };
                      const purchaseSummary = dispHasPurchase
                        ? `¥${dispPurchaseRevenue.toLocaleString()}`
                        : v.hasConversion
                          ? "CVあり"
                          : "購入なし";
                      const sourceSummary = v.firstRef ? formatRef(v.firstRef) : "直接流入";
                      // vid から色を生成
                      const hue = v.vid.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
                      return (
                        <div
                          key={v.vid}
                          onClick={() => setSelectedVid(isSelected ? null : v.vid)}
                          style={{
                            padding: "14px 16px", cursor: "pointer", borderBottom: "1px solid rgba(15,23,42,.05)",
                            background: isSelected ? `hsla(${hue},60%,96%,1)` : "transparent",
                            borderLeft: isSelected ? `3px solid hsl(${hue},60%,50%)` : "3px solid transparent",
                            boxShadow: isSelected ? `inset 0 0 0 1px hsla(${hue},60%,70%,.4)` : "none",
                            transition: "background .15s, box-shadow .15s",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
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
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                    <code style={{ fontSize: 11, opacity: 0.78 }}>{vidShort}</code>
                                    {visitorTypeLabel && (
                                      <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20, ...visitorTypeStyle }}>{visitorTypeLabel}</span>
                                    )}
                                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20, ...statusStyle }}>{statusLabel}</span>
                                  </div>
                                </div>
                                <span className="small" style={{ opacity: 0.45, whiteSpace: "nowrap", flexShrink: 0 }}>
                                  {lastTime}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                                <span className="small" style={{ opacity: 0.72, fontWeight: 700 }}>{dispPvCount} PV</span>
                                <span className="small" style={{ opacity: dispHasPurchase ? 0.92 : 0.55, color: dispHasPurchase ? "#a16207" : "inherit", fontWeight: dispHasPurchase ? 700 : 500 }}>
                                  {purchaseSummary}
                                </span>
                                {v.totalDuration > 0 && (
                                  <span className="small" style={{ opacity: 0.5 }}>
                                    {durationMin > 0 ? `${durationMin}分` : `${v.totalDuration}秒`}滞在
                                  </span>
                                )}
                              </div>
                              {/* 訪問回数・リターン情報 */}
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                                <span className="small" style={{ opacity: 0.7, fontWeight: 700, color: v.sessionCount >= 3 ? "#2563eb" : "inherit" }}>
                                  {v.sessionCount}回訪問
                                </span>
                                <span className="small" style={{ opacity: 0.5 }}>
                                  {v.daysSinceLastVisit === 0 ? "本日最終訪問" : `${v.daysSinceLastVisit}日前`}
                                </span>
                                {v.spanDays > 0 && (
                                  <span className="small" style={{ opacity: 0.45 }}>
                                    初回から{v.spanDays}日
                                  </span>
                                )}
                              </div>
                              <div className="small" style={{ opacity: 0.45, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                流入元: {sourceSummary}
                              </div>
                              <div className="small" style={{ opacity: isSelected ? 0.52 : 0.34, marginTop: 5, fontWeight: isSelected ? 600 : 500 }}>
                                {isSelected ? "右側でタイムラインを表示中" : "クリックで詳細表示"}
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
                      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(15,23,42,.07)", background: "rgba(15,23,42,.02)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                        {(() => {
                          const v = visitorList.find((x) => x.vid === selectedVid);
                          const hue = selectedVid.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
                          // 購入情報は selectedJourney ベースで判定（visitorList の hasPurchase は訪問者切替時に不整合が起きるため）
                          const journeyPurchases = selectedJourney.filter((ev) => ev.event === "purchase");
                          const journeyRevenue = journeyPurchases.reduce((sum, ev) => sum + (typeof ev.revenue === "number" ? ev.revenue : 0), 0);
                          const pageviewCount = selectedJourney.filter((e) => e.event === "pageview").length;
                          return (
                            <>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 99, background: `hsl(${hue},60%,88%)`, color: `hsl(${hue},60%,35%)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>
                                  {selectedVid.slice(0, 1).toUpperCase()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700 }}><code>{selectedVid}</code></div>
                                  <div className="small" style={{ opacity: 0.55 }}>
                                    時系列で確認できます
                                    {v?.isNew === true && <span> · 新規訪問</span>}
                                    {v?.isNew === false && <span> · リピート訪問</span>}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <div style={{ padding: "6px 10px", borderRadius: 999, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                                  <span className="small" style={{ fontWeight: 700, color: "#1d4ed8" }}>{v?.sessionCount ?? 1}回</span>
                                  <span className="small" style={{ opacity: 0.65, marginLeft: 4 }}>訪問</span>
                                </div>
                                {(v?.spanDays ?? 0) > 0 && (
                                  <div style={{ padding: "6px 10px", borderRadius: 999, background: "#fff", border: "1px solid rgba(15,23,42,.08)" }}>
                                    <span className="small" style={{ fontWeight: 700 }}>初回から{v!.spanDays}日</span>
                                  </div>
                                )}
                                <div style={{ padding: "6px 10px", borderRadius: 999, background: "#fff", border: "1px solid rgba(15,23,42,.08)" }}>
                                  <span className="small" style={{ fontWeight: 700 }}>{pageviewCount}</span>
                                  <span className="small" style={{ opacity: 0.55, marginLeft: 4 }}>ページ閲覧</span>
                                </div>
                                <div style={{ padding: "6px 10px", borderRadius: 999, background: "#fff", border: "1px solid rgba(15,23,42,.08)" }}>
                                  <span className="small" style={{ fontWeight: 700 }}>{selectedJourney.length}</span>
                                  <span className="small" style={{ opacity: 0.55, marginLeft: 4 }}>イベント</span>
                                </div>
                                {journeyPurchases.length > 0 ? (
                                  <div style={{ padding: "6px 10px", borderRadius: 999, background: "#fffdf2", border: "1px solid #fde68a" }}>
                                    <span className="small" style={{ fontWeight: 700, color: "#a16207" }}>¥{journeyRevenue.toLocaleString()}</span>
                                    <span className="small" style={{ opacity: 0.6, marginLeft: 4 }}>{journeyPurchases.length}件購入</span>
                                  </div>
                                ) : (
                                  <div style={{ padding: "6px 10px", borderRadius: 999, background: "#fff", border: "1px solid rgba(15,23,42,.08)" }}>
                                    <span className="small" style={{ fontWeight: 700 }}>購入なし</span>
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(15,23,42,.06)", background: "rgba(15,23,42,.015)" }}>
                        <div className="small" style={{ opacity: 0.52 }}>
                          上から順に訪問の流れを追えます。重要なイベントは色を強めて表示しています。
                        </div>
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
                                // セッション区切り: sid が前のイベントと変わった瞬間に仕切りを表示
                                const prevEv = i > 0 ? selectedJourney[i - 1] : null;
                                const isNewSession = i > 0 && ev.sid && prevEv?.sid && ev.sid !== prevEv.sid;
                                const sessionLabel = isNewSession ? (() => {
                                  const prevMs = prevEv?.createdAt ? new Date(prevEv.createdAt).getTime() : 0;
                                  const curMs  = ev.createdAt ? new Date(ev.createdAt).getTime() : 0;
                                  const diffMin = prevMs && curMs ? Math.round((curMs - prevMs) / 60000) : 0;
                                  const diffStr = diffMin >= 1440
                                    ? `${Math.floor(diffMin / 1440)}日後`
                                    : diffMin >= 60
                                      ? `${Math.floor(diffMin / 60)}時間後`
                                      : diffMin > 0 ? `${diffMin}分後` : "";
                                  return diffStr ? `新しいセッション（${diffStr}）` : "新しいセッション";
                                })() : null;
                                const time = ev.createdAt
                                  ? new Date(ev.createdAt).toLocaleTimeString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })
                                  : "—";
                                const dotColor = isPurchase ? "#ca8a04" : isConversion ? "#16a34a" : EVENT_COLOR[ev.event]?.text || "#94a3b8";
                                const scenarioName = ev.scenario_id ? (scenarios.find((s) => s.id === ev.scenario_id)?.data?.name || ev.scenario_id) : null;
                                const eventTitle = isPurchase
                                  ? "購入が完了しました"
                                  : isConversion
                                    ? "コンバージョンを記録しました"
                                    : ev.event === "impression"
                                      ? `施策を表示しました${scenarioName ? `: ${scenarioName}` : ""}`
                                      : isPageleave
                                        ? `${ev.path || "ページ"}を離脱しました`
                                        : ev.path || "ページを閲覧しました";
                                // 購入時の施策特定
                                const attributedScenarioId = isPurchase ? (ev.scenario_id || vidToLastScenario.get(ev.vid || "") || null) : null;
                                const attributedScenario = attributedScenarioId ? scenarios.find((s) => s.id === attributedScenarioId) : null;
                                return (
                                  <React.Fragment key={ev.id || i}>
                                  {/* セッション区切り */}
                                  {isNewSession && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 12px", paddingLeft: 32 }}>
                                      <div style={{ flex: 1, height: 1, background: "rgba(59,130,246,.25)" }} />
                                      <span style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6", whiteSpace: "nowrap", padding: "2px 8px", borderRadius: 99, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                                        🔄 {sessionLabel}
                                      </span>
                                      <div style={{ flex: 1, height: 1, background: "rgba(59,130,246,.25)" }} />
                                    </div>
                                  )}
                                  <div style={{ display: "flex", gap: 16, paddingBottom: 16, position: "relative" }}>
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
                                      borderRadius: 10, padding: "10px 12px",
                                      border: isPurchase ? "1px solid #fde68a" : isConversion ? "1px solid #bbf7d0" : "1px solid transparent",
                                    }}>
                                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                                        <div style={{ minWidth: 0 }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                                            <EventBadge event={ev.event} />
                                            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{eventTitle}</span>
                                          </div>
                                          <div className="small" style={{ opacity: 0.48 }}>
                                            Step {i + 1}
                                          </div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                          <div className="small" style={{ opacity: 0.5, fontSize: 11 }}>{time}</div>
                                          {isPurchase && ev.revenue != null && (
                                            <div style={{ fontSize: 13, fontWeight: 800, color: "#ca8a04", marginTop: 2 }}>
                                              ¥{Number(ev.revenue).toLocaleString()}
                                            </div>
                                          )}
                                        </div>
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
                                            {Array.isArray(ev.discount_codes) && ev.discount_codes.length > 0 && (
                                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                                {ev.discount_codes.map((code: string) => (
                                                  <span key={code} style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#dcfce7", color: "#15803d", fontFamily: "monospace" }}>🎟️ {code}</span>
                                                ))}
                                              </div>
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
                                        <div className="small" style={{ fontWeight: 600, opacity: 0.8, marginBottom: isPageleave || ev.scenario_id || ev.utm_source ? 6 : 0 }}>
                                          {ev.path}
                                        </div>
                                      )}
                                      {!isPurchase && scenarioName && (
                                        <div className="small" style={{ opacity: 0.58, marginBottom: ev.utm_source ? 4 : 0 }}>
                                          シナリオ: <span style={{ fontWeight: 600 }}>{scenarioName}</span>
                                        </div>
                                      )}
                                      {isPageleave && ev.duration_sec != null && (
                                        <div className="small" style={{ opacity: 0.55 }}>
                                          滞在時間: {ev.duration_sec >= 60 ? `${Math.floor(ev.duration_sec / 60)}分${ev.duration_sec % 60}秒` : `${ev.duration_sec}秒`}
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
                                  </React.Fragment>
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
