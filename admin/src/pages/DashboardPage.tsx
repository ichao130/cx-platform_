import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
} from "recharts";
import { db, apiPostJson } from "../firebase";

type StatRow = {
  siteId: string;
  day: string;
  scenarioId: string | null;
  actionId: string | null;
  variantId: string | null;
  event: "impression" | "click" | "click_link" | "close" | "conversion";
  count: number;
  updatedAt?: any;
};

function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function safeNum(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function fmtInt(n: any) {
  return safeNum(n).toLocaleString("ja-JP");
}

function pct(num: number, denom: number, digits = 1) {
  if (!denom) return "—";
  return (Math.round((num / denom) * Math.pow(10, digits + 2)) / Math.pow(10, digits)).toFixed(digits) + "%";
}

function workspaceKeyForUid(uid: string) {
  return `cx_admin_workspace_id:${uid}`;
}
function readSelectedWorkspaceId(uid?: string) {
  if (!uid) return "";
  try { return localStorage.getItem(workspaceKeyForUid(uid)) || ""; } catch { return ""; }
}
function writeSelectedWorkspaceId(workspaceId: string, uid?: string) {
  if (!uid) return;
  try {
    localStorage.setItem(workspaceKeyForUid(uid), workspaceId);
    window.dispatchEvent(new CustomEvent("cx_admin_workspace_changed", { detail: { workspaceId } }));
  } catch {}
}
function workspaceNameFromRows(workspaces: Array<{ id: string; data: any }>, workspaceId: string) {
  const hit = workspaces.find((w) => String(w.id || "") === String(workspaceId || ""));
  return String(hit?.data?.name || workspaceId || "");
}
function siteLabel(site: { id: string; data: any } | undefined) {
  if (!site) return "";
  return String(site.data?.name || site.data?.siteName || site.id || "");
}
function scenarioLabel(scenario: { id: string; data: any } | undefined) {
  if (!scenario) return "";
  return String(scenario.data?.name || scenario.id || "");
}

function badgeColor(grade: string) {
  if (grade === "good") return "#16a34a";
  if (grade === "ok") return "#2563eb";
  if (grade === "bad") return "#dc2626";
  return "#6b7280";
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  trend?: "up" | "down" | "neutral";
}) {
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : null;
  const trendColor = trend === "up" ? "#16a34a" : trend === "down" ? "#dc2626" : undefined;
  return (
    <div className="card" style={{ padding: 18, background: "#fff", border: "1px solid rgba(15,23,42,.08)", minWidth: 0 }}>
      <div className="small" style={{ opacity: 0.68 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, marginTop: 8, letterSpacing: "-.03em", color: accent }}>
        {value}
        {trendIcon && <span style={{ fontSize: 16, marginLeft: 6, color: trendColor }}>{trendIcon}</span>}
      </div>
      {sub && <div className="small" style={{ opacity: 0.58, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

const PERIOD_OPTIONS = [
  { label: "7日", value: 7 },
  { label: "14日", value: 14 },
  { label: "30日", value: 30 },
  { label: "90日", value: 90 },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<Array<{ id: string; data: any }>>([]);
  const [visibleWorkspaces, setVisibleWorkspaces] = useState<Array<{ id: string; data: any }>>([]);
  const [scenarios, setScenarios] = useState<Array<{ id: string; data: any }>>([]);
  const [siteId, setSiteId] = useState<string>("");
  const [currentUid, setCurrentUid] = useState<string>("");
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [rows, setRows] = useState<StatRow[]>([]);
  const [err, setErr] = useState<string>("");
  const [days, setDays] = useState<number>(30);
  const [aiMap, setAiMap] = useState<Record<string, any>>({});
  const [loadingAi, setLoadingAi] = useState<string | null>(null);
  const [abSummary, setAbSummary] = useState<any | null>(null);
  const [loadingAb, setLoadingAb] = useState(false);
  const [abScenarioId, setAbScenarioId] = useState<string>("");
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);

  // Auth
  useEffect(() => {
    return onAuthStateChanged(getAuth(), (user) => {
      const uid = user?.uid || "";
      setCurrentUid(uid);
      setSiteId("");
      setWorkspaceId(readSelectedWorkspaceId(uid));
      setScenarios([]);
    });
  }, []);

  useEffect(() => {
    if (!currentUid) { setWorkspaceId(""); return; }
    const apply = () => setWorkspaceId(readSelectedWorkspaceId(currentUid));
    apply();
    const onChanged = (e?: Event) => {
      const next = (e as CustomEvent | undefined)?.detail?.workspaceId;
      if (typeof next === "string") { setWorkspaceId(next); return; }
      apply();
    };
    window.addEventListener("cx_admin_workspace_changed", onChanged as EventListener);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener("cx_admin_workspace_changed", onChanged as EventListener);
      window.removeEventListener("storage", apply);
    };
  }, [currentUid]);

  useEffect(() => {
    if (!currentUid) { setVisibleWorkspaces([]); return; }
    const q = query(collection(db, "workspaces"), where(`members.${currentUid}`, "in", ["owner", "admin", "member", "viewer"]));
    return onSnapshot(q, (snap) => setVisibleWorkspaces(snap.docs.map((d) => ({ id: d.id, data: d.data() }))));
  }, [currentUid]);

  const visibleWorkspaceIds = useMemo(() => new Set(visibleWorkspaces.map((w) => String(w.id || "")).filter(Boolean)), [visibleWorkspaces]);

  useEffect(() => {
    if (!currentUid || !visibleWorkspaces.length) return;
    const exists = !!workspaceId && visibleWorkspaces.some((w) => w.id === workspaceId);
    if (!exists) {
      const next = visibleWorkspaces[0]?.id || "";
      setWorkspaceId(next);
      if (next) writeSelectedWorkspaceId(next, currentUid);
    }
  }, [currentUid, visibleWorkspaces, workspaceId]);

  // Sites
  useEffect(() => {
    if (!currentUid) { setSites([]); return; }
    const q = query(collection(db, "sites"), orderBy("__name__"));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, data: d.data() })).filter((row) => {
        const ws = String((row.data as any)?.workspaceId || "");
        return ws && visibleWorkspaceIds.has(ws) && (!workspaceId || ws === String(workspaceId));
      });
      setSites(list);
      if (!siteId || !list.some((s) => s.id === siteId)) setSiteId(list[0]?.id || "");
    }, () => {});
  }, [currentUid, siteId, visibleWorkspaceIds, workspaceId]);

  useEffect(() => {
    if (!sites.length) { setSiteId(""); return; }
    if (!siteId || !sites.some((s) => s.id === siteId)) setSiteId(sites[0].id);
  }, [siteId, sites]);

  // Scenarios
  useEffect(() => {
    if (!siteId) { setScenarios([]); setAbScenarioId(""); return; }
    const q = query(collection(db, "scenarios"), where("siteId", "==", siteId), orderBy("__name__"));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
      setScenarios(list);
      if (!abScenarioId || !list.some((s) => s.id === abScenarioId)) setAbScenarioId(list[0]?.id || "");
    });
  }, [siteId]);

  // stats_daily
  useEffect(() => {
    if (!siteId) return;
    setErr("");
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - Math.max(1, days) + 1);
    const q = query(
      collection(db, "stats_daily"),
      where("siteId", "==", siteId),
      where("day", ">=", isoDay(start)),
      where("day", "<=", isoDay(end)),
      orderBy("day", "asc")
    );
    return onSnapshot(q, (snap) => setRows(snap.docs.map((d) => d.data() as any)), () => {
      setRows([]);
      setErr("データの読み込みに失敗しました。しばらく待ってから再試行してください。");
    });
  }, [siteId, days]);

  const latestDay = useMemo(() => {
    const days = [...new Set(rows.map((r) => r.day))].sort();
    return days[days.length - 1] || "";
  }, [rows]);

  // ---- Computed: KPI summary ----
  const summary = useMemo(() => {
    let imp = 0, clkLink = 0, clk = 0, close = 0, cv = 0;
    for (const r of rows) {
      const c = safeNum(r.count);
      if (r.event === "impression") imp += c;
      if (r.event === "click_link") clkLink += c;
      if (r.event === "click") clk += c;
      if (r.event === "close") close += c;
      if (r.event === "conversion") cv += c;
    }
    const cvr = imp > 0 ? Math.round((cv / imp) * 10000) / 100 : 0;
    const ctr = imp > 0 ? Math.round((clkLink / imp) * 10000) / 100 : 0;
    const closeRate = imp > 0 ? Math.round((close / imp) * 10000) / 100 : 0;
    return { imp, clkLink, clk, close, cv, cvr, ctr, closeRate };
  }, [rows]);

  // ---- Computed: 日別トレンド（棒: impression、折れ線: CVR%）----
  const trendData = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of rows) {
      const day = String(r.day || "");
      if (!day) continue;
      if (!map.has(day)) map.set(day, { day, impression: 0, cv: 0, cvr: 0 });
      const obj = map.get(day);
      if (r.event === "impression") obj.impression += safeNum(r.count);
      if (r.event === "conversion") obj.cv += safeNum(r.count);
    }
    const out = Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
    for (const d of out) {
      d.cvr = d.impression > 0 ? Math.round((d.cv / d.impression) * 10000) / 100 : 0;
      // X軸ラベルを短縮（MM/DD形式）
      d.label = d.day.slice(5).replace("-", "/");
    }
    return out;
  }, [rows]);

  // ---- Computed: シナリオ別比較 ----
  const scenarioStats = useMemo(() => {
    const map = new Map<string, { id: string; name: string; imp: number; cv: number; clk: number }>();
    for (const r of rows) {
      const sid = String(r.scenarioId || "（未割当）");
      if (!map.has(sid)) {
        const sc = scenarios.find((s) => s.id === sid);
        map.set(sid, { id: sid, name: scenarioLabel(sc) || sid, imp: 0, cv: 0, clk: 0 });
      }
      const obj = map.get(sid)!;
      if (r.event === "impression") obj.imp += safeNum(r.count);
      if (r.event === "conversion") obj.cv += safeNum(r.count);
      if (r.event === "click_link") obj.clk += safeNum(r.count);
    }
    return Array.from(map.values())
      .map((s) => ({
        ...s,
        cvr: s.imp > 0 ? Math.round((s.cv / s.imp) * 10000) / 100 : 0,
        ctr: s.imp > 0 ? Math.round((s.clk / s.imp) * 10000) / 100 : 0,
      }))
      .filter((s) => s.imp > 0)
      .sort((a, b) => b.cvr - a.cvr);
  }, [rows, scenarios]);

  // ---- Computed: バリアント別テーブル ----
  const summaryTable = useMemo(() => {
    const map = new Map<string, { v: string; imp: number; clk: number; cv: number }>();
    for (const r of rows) {
      const v = String(r.variantId ?? "na");
      if (!map.has(v)) map.set(v, { v, imp: 0, clk: 0, cv: 0 });
      const obj = map.get(v)!;
      const c = safeNum(r.count);
      if (r.event === "impression") obj.imp += c;
      if (r.event === "click_link") obj.clk += c;
      if (r.event === "conversion") obj.cv += c;
    }
    return Array.from(map.values()).sort((a, b) => b.imp - a.imp);
  }, [rows]);

  const selectedSite = useMemo(() => sites.find((s) => s.id === siteId), [sites, siteId]);
  const selectedSiteName = useMemo(() => siteLabel(selectedSite), [selectedSite]);
  const selectedWorkspaceName = useMemo(() => workspaceNameFromRows(visibleWorkspaces, workspaceId), [visibleWorkspaces, workspaceId]);
  const scenarioName = useMemo(() => scenarioLabel(scenarios.find((s) => s.id === abScenarioId)) || abScenarioId || "", [scenarios, abScenarioId]);

  const generateAiInsight = useCallback(async (payload: any) => {
    try {
      setLoadingAi(String(payload.variant_id ?? "na"));
      const data = await apiPostJson("/v1/ai/insight", payload, { siteId: payload.site_id });
      if (!data?.ok) { alert(`AI生成失敗: ${data?.message || data?.error || ""}`); return; }
      setAiMap((prev) => ({ ...prev, [`${payload.day}__${payload.variant_id ?? "na"}`]: data }));
    } catch (e: any) {
      alert(`AI生成エラー: ${e?.message || String(e)}`);
    } finally {
      setLoadingAi(null);
    }
  }, []);

  const generateAiReview = useCallback(async (payload: any) => {
    try {
      setLoadingReview(true);
      const data = await apiPostJson("/v1/ai/review", payload, { siteId: payload.site_id });
      if (!data?.ok) { alert(`AIレビュー失敗: ${data?.message || data?.error || ""}`); return; }
      setReviewData(data);
    } catch (e: any) {
      alert(`AIレビューエラー: ${e?.message || String(e)}`);
    } finally {
      setLoadingReview(false);
    }
  }, []);

  const loadAbSummary = useCallback(async () => {
    if (!siteId || !latestDay) return;
    try {
      setLoadingAb(true);
      const data = await apiPostJson("/v1/stats/summary", { site_id: siteId, day: latestDay, scope: "scenario", scope_id: abScenarioId, variant_id: null }, { siteId });
      if (data?.ok) setAbSummary(data);
    } catch {}
    finally { setLoadingAb(false); }
  }, [siteId, latestDay, abScenarioId]);

  useEffect(() => {
    if (siteId && latestDay && abScenarioId) loadAbSummary();
  }, [siteId, latestDay, abScenarioId, loadAbSummary]);

  return (
    <div className="container liquid-page" style={{ minWidth: 0 }}>
      {/* ヘッダー */}
      <div className="page-header">
        <div className="page-header__meta">
          <div className="small" style={{ opacity: 0.7, marginBottom: 4 }}>MOKKEDA / Dashboard</div>
          <h1 className="h1">ダッシュボード</h1>
          <div className="small" style={{ opacity: 0.72 }}>KPI・CVR推移・施策比較をまとめて確認できます</div>
        </div>
        <div className="page-header__actions" style={{ flexWrap: "wrap", gap: 8 }}>
          <button className="btn" onClick={() => abScenarioId && navigate(`/scenarios/${abScenarioId}/review`)} disabled={!abScenarioId}>
            AIレビュー
          </button>
          <button className="btn" onClick={() => abScenarioId && navigate(`/scenarios/${abScenarioId}/ai`)} disabled={!abScenarioId}>
            AI分析
          </button>
          <button className="btn btn--primary" onClick={() => navigate("/scenarios")}>
            シナリオ一覧
          </button>
        </div>
      </div>

      {/* フィルターバー */}
      <div className="card" style={{ marginBottom: 14, padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px", minWidth: 180 }}>
            <div className="h2">サイト</div>
            <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.length === 0 && <option value="">（サイトなし）</option>}
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{siteLabel(s)}{siteLabel(s) !== s.id ? ` (${s.id})` : ""}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: "1 1 200px", minWidth: 180 }}>
            <div className="h2">シナリオ</div>
            <select className="input" value={abScenarioId} onChange={(e) => setAbScenarioId(e.target.value)}>
              {scenarios.length === 0 && <option value="">（シナリオなし）</option>}
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{scenarioLabel(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="h2">集計期間</div>
            <div style={{ display: "flex", border: "1px solid rgba(15,23,42,.12)", borderRadius: 10, overflow: "hidden" }}>
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDays(opt.value)}
                  style={{
                    padding: "8px 14px",
                    border: "none",
                    background: days === opt.value ? "#1f6573" : "transparent",
                    color: days === opt.value ? "#fff" : "inherit",
                    fontWeight: days === opt.value ? 700 : 500,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {err && (
          <div className="small" style={{ marginTop: 12, color: "#dc2626", display: "flex", alignItems: "center", gap: 6 }}>
            <span>⚠️</span> {err}
          </div>
        )}
      </div>

      {/* KPIカード */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
        <KpiCard label="表示回数" value={fmtInt(summary.imp)} sub={`過去${days}日間`} />
        <KpiCard label="コンバージョン数" value={fmtInt(summary.cv)} sub="CV総数" accent={summary.cv > 0 ? "#16a34a" : undefined} />
        <KpiCard
          label="CVR（転換率）"
          value={summary.imp > 0 ? `${summary.cvr}%` : "—"}
          sub="CV ÷ 表示回数"
          accent={summary.cvr >= 3 ? "#16a34a" : summary.cvr >= 1 ? "#2563eb" : undefined}
        />
        <KpiCard
          label="CTR（クリック率）"
          value={summary.imp > 0 ? `${summary.ctr}%` : "—"}
          sub="クリック ÷ 表示回数"
        />
        <KpiCard
          label="離脱率"
          value={summary.imp > 0 ? `${summary.closeRate}%` : "—"}
          sub="閉じる ÷ 表示回数"
          accent={summary.closeRate > 70 ? "#dc2626" : undefined}
        />
      </div>

      {/* 日別トレンドチャート */}
      <div className="card" style={{ marginBottom: 14, padding: 20 }}>
        <div className="h2" style={{ marginBottom: 4 }}>日別トレンド：表示回数 × CVR%</div>
        <div className="small" style={{ opacity: 0.65, marginBottom: 16 }}>
          棒グラフ（左軸）= 表示回数　折れ線（右軸）= CVR%。量と質を同時に確認できます。
        </div>
        {trendData.length === 0 ? (
          <div className="small" style={{ opacity: 0.55, padding: "32px 0", textAlign: "center" }}>
            {siteId ? "データがまだありません" : "サイトを選択してください"}
          </div>
        ) : (
          <div style={{ height: 280, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any, name: string) => name === "CVR%" ? `${value}%` : fmtInt(value)} />
                <Legend />
                <Bar yAxisId="left" dataKey="impression" name="表示回数" fill="rgba(89,183,198,.5)" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="cvr" name="CVR%" stroke="#16a34a" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* シナリオ別比較チャート */}
      {scenarioStats.length > 1 && (
        <div className="card" style={{ marginBottom: 14, padding: 20 }}>
          <div className="h2" style={{ marginBottom: 4 }}>施策比較：シナリオ別 CVR / CTR</div>
          <div className="small" style={{ opacity: 0.65, marginBottom: 16 }}>
            施策ごとの CVR・CTR を比較します。
          </div>
          <div style={{ height: 220, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scenarioStats.slice(0, 8)} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis unit="%" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Legend />
                <Bar dataKey="cvr" name="CVR%" fill="#16a34a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="ctr" name="CTR%" fill="#59b7c6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* バリアント別 / A/Bインサイト */}
      <div className="card" style={{ marginBottom: 14, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <div>
            <div className="h2" style={{ margin: 0 }}>バリアント別集計</div>
            <div className="small" style={{ opacity: 0.65, marginTop: 4 }}>シナリオ「{scenarioName || "—"}」の期間集計</div>
          </div>
        </div>

        {summaryTable.length === 0 ? (
          <div className="small" style={{ opacity: 0.55 }}>データがありません</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(15,23,42,.08)", background: "rgba(15,23,42,.02)" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, opacity: 0.7 }}>バリアント</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, opacity: 0.7 }}>表示</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, opacity: 0.7 }}>クリック</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, opacity: 0.7 }}>CV</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, opacity: 0.7 }}>CVR</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, opacity: 0.7 }}>CTR</th>
                </tr>
              </thead>
              <tbody>
                {summaryTable.map((r) => {
                  const cvr = r.imp > 0 ? Math.round((r.cv / r.imp) * 10000) / 100 : 0;
                  const ctr = r.imp > 0 ? Math.round((r.clk / r.imp) * 10000) / 100 : 0;
                  const key = `${latestDay}__${r.v ?? "na"}`;
                  const ai = aiMap[key];
                  return (
                    <React.Fragment key={r.v}>
                      <tr style={{ borderBottom: "1px solid rgba(15,23,42,.05)" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 700 }}>
                          {r.v === "na" ? "（通常配信）" : `Variant ${r.v}`}
                          {ai?.rule?.grade && (
                            <span style={{ marginLeft: 8, background: badgeColor(ai.rule.grade), color: "#fff", padding: "1px 7px", borderRadius: 5, fontSize: 11 }}>
                              {String(ai.rule.grade).toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtInt(r.imp)}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtInt(r.clk)}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: r.cv > 0 ? "#16a34a" : undefined }}>{fmtInt(r.cv)}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: cvr > 0 ? "#16a34a" : undefined }}>{cvr > 0 ? `${cvr}%` : "—"}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>{ctr > 0 ? `${ctr}%` : "—"}</td>
                      </tr>
                      {ai?.ai && (
                        <tr style={{ background: "rgba(15,23,42,.02)" }}>
                          <td colSpan={6} style={{ padding: "8px 12px" }}>
                            <div className="small" style={{ fontWeight: 700, marginBottom: 4 }}>🤖 AI分析</div>
                            <div className="small">{ai.ai.summary}</div>
                            {Array.isArray(ai.ai.bullets) && ai.ai.bullets.length > 0 && (
                              <ul style={{ margin: "6px 0 0 0", paddingLeft: 16 }}>
                                {ai.ai.bullets.map((b: string, i: number) => <li className="small" key={i}>{b}</li>)}
                              </ul>
                            )}
                            {ai.ai.next && <div className="small" style={{ marginTop: 4, fontWeight: 600 }}>→ {ai.ai.next}</div>}
                          </td>
                        </tr>
                      )}
                      {!ai && (
                        <tr style={{ background: "rgba(15,23,42,.01)" }}>
                          <td colSpan={6} style={{ padding: "6px 12px" }}>
                            <button
                              className="btn"
                              style={{ fontSize: 12, padding: "4px 12px" }}
                              onClick={() => generateAiInsight({
                                site_id: siteId,
                                day: latestDay,
                                scope: "scenario",
                                scope_id: abScenarioId,
                                variant_id: r.v,
                                metrics: { impressions: r.imp, clicks: r.clk, closes: 0, conversions: r.cv },
                              })}
                              disabled={!latestDay || loadingAi === String(r.v ?? "na")}
                            >
                              {loadingAi === String(r.v ?? "na") ? "生成中..." : "🤖 AI分析を生成"}
                            </button>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* シナリオ別サマリーテーブル */}
      {scenarioStats.length > 0 && (
        <div className="card" style={{ marginBottom: 14, padding: 20 }}>
          <div className="h2" style={{ marginBottom: 16 }}>施策別パフォーマンス一覧</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(15,23,42,.08)", background: "rgba(15,23,42,.02)" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, opacity: 0.7 }}>施策名</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, opacity: 0.7 }}>表示</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, opacity: 0.7 }}>CV</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, opacity: 0.7 }}>CVR</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, opacity: 0.7 }}>CTR</th>
                </tr>
              </thead>
              <tbody>
                {scenarioStats.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid rgba(15,23,42,.05)", background: i === 0 ? "rgba(22,163,74,.03)" : undefined }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                      {i === 0 && <span style={{ marginRight: 6 }}>🏆</span>}{s.name}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtInt(s.imp)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: s.cv > 0 ? "#16a34a" : undefined }}>{fmtInt(s.cv)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: s.cvr > 0 ? "#16a34a" : undefined }}>{s.cvr > 0 ? `${s.cvr}%` : "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{s.ctr > 0 ? `${s.ctr}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
