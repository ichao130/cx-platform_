import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db, apiPostJson } from "../firebase";



type StatRow = {
  siteId: string;
  day: string; // YYYY-MM-DD
  scenarioId: string | null;
  actionId: string | null;
  variantId: string | null;
  event: "impression" | "click" | "click_link" | "close";
  count: number;
  updatedAt?: any;
};

function badgeColor(grade: string) {
  if (grade === "good") return "#16a34a";
  if (grade === "ok") return "#2563eb";
  if (grade === "bad") return "#dc2626";
  return "#6b7280";
}

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

function formatInt(n: any) {
  return safeNum(n).toLocaleString("ja-JP");
}

function workspaceNameFromSites(sites: Array<{ id: string; data: any }>, workspaceId: string) {
  const hit = sites.find((s) => String(s.data?.workspaceId || "") === String(workspaceId || ""));
  return String(hit?.data?.workspaceName || hit?.data?.workspace_name || "");
}

function siteLabel(site: { id: string; data: any } | undefined) {
  if (!site) return "";
  return String(site.data?.name || site.data?.siteName || site.id || "");
}

function scenarioLabel(scenario: { id: string; data: any } | undefined) {
  if (!scenario) return "";
  return String(scenario.data?.name || scenario.id || "");
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      className="card"
      style={{
        minWidth: 0,
        padding: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
      }}
    >
      <div className="small" style={{ opacity: 0.72 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1, marginTop: 6 }}>{value}</div>
      {sub ? <div className="small" style={{ opacity: 0.62, marginTop: 6 }}>{sub}</div> : null}
    </div>
  );
}

export default function DashboardPage() {
  const [sites, setSites] = useState<Array<{ id: string; data: any }>>([]);
  const [visibleWorkspaces, setVisibleWorkspaces] = useState<Array<{ id: string; data: any }>>([]);
  const [scenarios, setScenarios] = useState<Array<{ id: string; data: any }>>([]);
  const [siteId, setSiteId] = useState<string>("");
  const [currentUid, setCurrentUid] = useState<string>("");

  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [rows, setRows] = useState<StatRow[]>([]);
  const [err, setErr] = useState<string>("");

  // date range (last N days)
  const [days, setDays] = useState<number>(30);

  const [aiMap, setAiMap] = useState<Record<string, any>>({});
  const [loadingAi, setLoadingAi] = useState<string | null>(null);

  const [abSummary, setAbSummary] = useState<any | null>(null);
  const [loadingAb, setLoadingAb] = useState(false);
  const [abErr, setAbErr] = useState<string>("");

  // selected scenario (UI selector)
  const [abScenarioId, setAbScenarioId] = useState<string>("");
  // load scenarios for selected site
  useEffect(() => {
    if (!siteId) {
      setScenarios([]);
      setAbScenarioId("");
      return;
    }

    const q = query(
      collection(db, "scenarios"),
      where("siteId", "==", siteId),
      orderBy("__name__")
    );

    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
      setScenarios(list);

      const exists = !!abScenarioId && list.some((s) => s.id === abScenarioId);
      if (!exists) {
        setAbScenarioId(list[0]?.id || "");
      }
    });
  }, [siteId, abScenarioId]);

  const [reviewData, setReviewData] = useState<any | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);

  // Billing
  const [billingData, setBillingData] = useState<any | null>(null);
  const [billingForm, setBillingForm] = useState<{ plan: string; status: string; trial_days: number; billing_email: string }>(
    { plan: "free", status: "trialing", trial_days: 14, billing_email: "" }
  );
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingErr, setBillingErr] = useState<string>("");

  // ---- aggregate (ALL variants merged) ----
  const chartData = useMemo(() => {
    const map = new Map<string, any>(); // day -> { day, impression, click_link, click, close, ctr }
    for (const r of rows) {
      const day = String(r.day || "");
      if (!day) continue;
      if (!map.has(day)) map.set(day, { day, impression: 0, click_link: 0, click: 0, close: 0 });
      const obj = map.get(day);
      const ev = String(r.event || "");
      obj[ev] = safeNum(obj[ev]) + safeNum(r.count);
    }

    const out = Array.from(map.values()).sort((a, b) => String(a.day).localeCompare(String(b.day)));
    for (const d of out) {
      const imp = safeNum(d.impression);
      const clk = safeNum(d.click_link);
      d.ctr = imp > 0 ? Math.round((clk / imp) * 1000) / 10 : 0; // %
    }
    return out;
  }, [rows]);

const latestDay = useMemo(() => {
  return chartData.length ? chartData[chartData.length - 1].day : "";
}, [chartData]);

  const selectedSite = useMemo(() => sites.find((s) => s.id === siteId), [sites, siteId]);
  const selectedSiteName = useMemo(() => siteLabel(selectedSite), [selectedSite]);
  const selectedWorkspaceName = useMemo(() => workspaceNameFromSites(sites, workspaceId), [sites, workspaceId]);
  const scenarioName = useMemo(() => {
    const hit = scenarios.find((s) => s.id === abScenarioId);
    return scenarioLabel(hit) || abScenarioId || "";
  }, [scenarios, abScenarioId]);


  const summaryTable = useMemo(() => {
    const map = new Map<string, { v: string; imp: number; clk: number; ctr: number }>();

    for (const r of rows) {
      const v = String(r.variantId ?? "na");
      if (!map.has(v)) map.set(v, { v, imp: 0, clk: 0, ctr: 0 });

      const obj = map.get(v)!;
      const c = safeNum(r.count);

      if (r.event === "impression") obj.imp += c;
      if (r.event === "click_link") obj.clk += c;
    }

    const out = Array.from(map.values());
    out.forEach((x) => {
      x.ctr = x.imp > 0 ? Math.round((x.clk / x.imp) * 1000) / 10 : 0;
    });

    out.sort((a, b) => b.imp - a.imp);
    return out;
  }, [rows]);

  const summary = useMemo(() => {
    let imp = 0, clkLink = 0, clk = 0, close = 0;
    for (const r of rows) {
      const c = safeNum(r.count);
      if (r.event === "impression") imp += c;
      if (r.event === "click_link") clkLink += c;
      if (r.event === "click") clk += c;
      if (r.event === "close") close += c;
    }
    const ctr = imp > 0 ? Math.round((clkLink / imp) * 1000) / 10 : 0;
    return { imp, clkLink, clk, close, ctr };
  }, [rows]);

  const generateAiInsight = useCallback(async (payload: any) => {
    try {
      setLoadingAi(String(payload.variant_id ?? "na"));

      const data = await apiPostJson("/v1/ai/insight", payload, { siteId: payload.site_id });

      if (!data?.ok) {
        console.error("[ai/insight] failed:", data);
        alert(`AI生成失敗:\n${data?.message || data?.error || JSON.stringify(data)}`);
        return;
      }

      setAiMap((prev) => ({
        ...prev,
        [`${payload.day}__${payload.variant_id ?? "na"}`]: data,
      }));
    } catch (e: any) {
      console.error(e);
      alert(`AI生成で例外: ${e?.message || String(e)}`);
    } finally {
      setLoadingAi(null);
    }
  }, []);

  const generateAiReview = useCallback(async (payload: any) => {
    try {
      setLoadingReview(true);

      const data = await apiPostJson("/v1/ai/review", payload, { siteId: payload.site_id });

      if (!data?.ok) {
        console.error("[ai/review] failed:", data);
        alert(`AIレビュー失敗:\n${data?.message || data?.error || JSON.stringify(data)}`);
        return;
      }

      setReviewData(data);
    } catch (e: any) {
      console.error(e);
      alert(`AIレビューで例外: ${e?.message || String(e)}`);
    } finally {
      setLoadingReview(false);
    }
  }, []);

  const loadAbSummary = useCallback(async () => {
    if (!siteId || !latestDay) return;

    try {
      setLoadingAb(true);
      setAbErr("");

      const data = await apiPostJson(
        "/v1/stats/summary",
        {
          site_id: siteId,
          day: latestDay,
          scope: "scenario",
          scope_id: abScenarioId,
          variant_id: null,
        },
        { siteId }
      );

      if (!data?.ok) {
        console.error("[stats/summary] failed:", data);
        setAbErr(`A/B集計失敗: ${data?.message || data?.error || JSON.stringify(data)}`);
        setAbSummary(null);
        return;
      }

      setAbSummary(data);
    } catch (e: any) {
      console.error(e);
      setAbErr(`A/B集計で例外: ${e?.message || String(e)}`);
      setAbSummary(null);
    } finally {
      setLoadingAb(false);
    }
  }, [siteId, latestDay, abScenarioId]);

  const loadBilling = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setBillingLoading(true);
      setBillingErr("");

      const data = await apiPostJson(
        "/v1/workspaces/billing/get",
        { workspace_id: workspaceId },
        { siteId }
      );

      if (!data?.ok) {
        setBillingErr(String(data?.message || data?.error || "billing get failed"));
        setBillingData(null);
        return;
      }

      setBillingData(data);
      const b = data?.billing || data;

      setBillingForm((prev) => ({
        plan: String(b?.plan ?? prev.plan),
        status: String(b?.status ?? prev.status),
        trial_days: Number.isFinite(Number(b?.trial_days)) ? Number(b?.trial_days) : prev.trial_days,
        billing_email: String(b?.billing_email ?? prev.billing_email),
      }));
    } catch (e: any) {
      setBillingErr(String(e?.message || e));
      setBillingData(null);
    } finally {
      setBillingLoading(false);
    }
  }, [workspaceId, siteId]);

  useEffect(() => {
    return onAuthStateChanged(getAuth(), (user) => {
      const uid = user?.uid || "";
      setCurrentUid(uid);
      setSiteId("");
      setWorkspaceId("");
      setScenarios([]);
    });
  }, []);

  useEffect(() => {
    if (!currentUid) {
      setVisibleWorkspaces([]);
      return;
    }

    const q = query(
      collection(db, "workspaces"),
      where(`members.${currentUid}`, "in", ["owner", "admin", "member", "viewer"])
    );

    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
      setVisibleWorkspaces(list);
    });
  }, [currentUid]);

  const visibleWorkspaceIds = useMemo(() => {
    return new Set(visibleWorkspaces.map((w) => String(w.id || "")).filter(Boolean));
  }, [visibleWorkspaces]);


  const updateBilling = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setBillingLoading(true);
      setBillingErr("");

      const data = await apiPostJson(
        "/v1/workspaces/billing/update",
        {
          workspace_id: workspaceId,
          plan: billingForm.plan,
          status: billingForm.status,
          trial_days: Number(billingForm.trial_days || 0),
          billing_email: billingForm.billing_email,
        },
        { siteId }
      );

      if (!data?.ok) {
        setBillingErr(String(data?.message || data?.error || "billing update failed"));
        return;
      }

      setBillingData(data);
    } catch (e: any) {
      setBillingErr(String(e?.message || e));
    } finally {
      setBillingLoading(false);
    }
  }, [workspaceId, billingForm, siteId]);

  // load sites
  useEffect(() => {
    if (!currentUid) {
      setSites([]);
      return;
    }

    const q = query(collection(db, "sites"), orderBy("__name__"));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, data: d.data() }))
          .filter((row) => {
            const ws = String((row.data as any)?.workspaceId || "");
            return !!ws && visibleWorkspaceIds.has(ws);
          });

        setSites(list);

        const exists = !!siteId && list.some((s) => s.id === siteId);
        if (!exists) {
          const nextSiteId = list[0]?.id || "";
          setSiteId(nextSiteId);
          const ws = (list[0]?.data as any)?.workspaceId;
          setWorkspaceId(typeof ws === "string" ? ws : "");
        }
      },
      (e) => setErr(`sites read failed: ${e?.code || ""} ${e?.message || e}`)
    );
  }, [currentUid, siteId, visibleWorkspaceIds]);

  useEffect(() => {
    if (!sites.length) {
      setSiteId("");
      setWorkspaceId("");
      return;
    }

    const hit = siteId ? sites.find((s) => s.id === siteId) : null;

    if (!hit) {
      setSiteId(sites[0].id);
      const firstWs = (sites[0].data as any)?.workspaceId;
      if (typeof firstWs === "string" && firstWs) setWorkspaceId(firstWs);
      return;
    }

    const ws = (hit.data as any)?.workspaceId;
    if (typeof ws === "string" && ws) setWorkspaceId(ws);
  }, [siteId, sites]);

  // load stats_daily
  useEffect(() => {
    if (!siteId) return;

    setErr("");
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - Math.max(1, days) + 1);

    const startDay = isoDay(start);
    const endDay = isoDay(end);

    const q = query(
      collection(db, "stats_daily"),
      where("siteId", "==", siteId),
      where("day", ">=", startDay),
      where("day", "<=", endDay),
      orderBy("day", "asc")
    );

    return onSnapshot(
      q,
      (snap) => setRows(snap.docs.map((d) => d.data() as any)),
      (e) => {
        console.error("[stats_daily] snapshot error:", e);
        setRows([]);
        setErr(`stats_daily read failed: ${e?.code || ""} ${e?.message || e}`);
      }
    );
  }, [siteId, days]);

  useEffect(() => {
    if (!siteId || !latestDay || !abScenarioId) return;
    loadAbSummary();
  }, [siteId, latestDay, abScenarioId, loadAbSummary]);

  return (
    <div className="container" style={{ minWidth: 0 }}>
      <div className="card" style={{ minWidth: 0 }}>
        <h1 className="h1">ダッシュボード</h1>
        <div className="small">選択中のサイトの反応状況、A/B結果、AIレビューをまとめて確認できます。</div>
        <div className="small" style={{ opacity: 0.72 }}>直近の推移と主要KPIを、サイト名ベースで分かりやすく確認できます。</div>

        <div style={{ height: 12 }} />

        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="h2" style={{ margin: 0 }}>サイト</div>
          <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {siteLabel(s)}{siteLabel(s) !== s.id ? ` (${s.id})` : ""}
              </option>
            ))}
          </select>

          <div className="h2" style={{ margin: 0 }}>集計日数</div>
          <input
            className="input"
            type="number"
            style={{ width: 90 }}
            value={days}
            min={1}
            max={365}
            onChange={(e) => setDays(Number(e.target.value || 30))}
          />

          <div style={{ flex: 1 }} />

          <div className="small" style={{ opacity: 0.75 }}>
            ワークスペース: <b>{selectedWorkspaceName || workspaceId || "-"}</b>
          </div>
          <div className="small" style={{ opacity: 0.75 }}>
            最新日: <b>{latestDay || "-"}</b>
          </div>
        </div>
        <div style={{ height: 12 }} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <StatCard label="表示回数" value={formatInt(summary.imp)} sub={`${days}日集計`} />
          <StatCard label="主要クリック" value={formatInt(summary.clkLink)} sub="主要KPI" />
          <StatCard label="CTR" value={`${summary.ctr}%`} sub="クリック率" />
          <StatCard label="閉じる操作" value={formatInt(summary.close)} sub="dismiss / close" />
        </div>

        <div style={{ height: 12 }} />

          <div
            className="card"
            style={{
              minWidth: 0,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div className="small" style={{ opacity: 0.68 }}>選択中のサイト</div>
                <div style={{ fontWeight: 800, marginTop: 4 }}>{selectedSiteName || "-"}</div>
                {selectedSiteName && siteId && selectedSiteName !== siteId ? (
                  <div className="small" style={{ opacity: 0.58, marginTop: 2 }}>
                    ID: {siteId}
                  </div>
                ) : null}
              </div>
              <div>
                <div className="small" style={{ opacity: 0.68 }}>選択中のシナリオ</div>
                <div style={{ fontWeight: 800, marginTop: 4 }}>{scenarioName || "-"}</div>
                {scenarioName && abScenarioId && scenarioName !== abScenarioId ? (
                  <div className="small" style={{ opacity: 0.58, marginTop: 2 }}>
                    ID: {abScenarioId}
                  </div>
                ) : null}
              </div>
              <div>
                <div className="small" style={{ opacity: 0.68 }}>ワークスペース</div>
                <div style={{ fontWeight: 800, marginTop: 4 }}>{selectedWorkspaceName || workspaceId || "-"}</div>
              </div>
              <div>
                <div className="small" style={{ opacity: 0.68 }}>読み込み件数 / 日数</div>
                <div style={{ fontWeight: 800, marginTop: 4 }}>{rows.length} / {chartData.length}</div>
              </div>
            </div>
          </div>

          <div style={{ height: 12 }} />

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn"
            onClick={() => abScenarioId && navigate(`/scenarios/${abScenarioId}/review`)}
            disabled={!abScenarioId}
          >
            AIレビューを見る
          </button>
          <button
            className="btn"
            onClick={() => abScenarioId && navigate(`/scenarios/${abScenarioId}/ai`)}
            disabled={!abScenarioId}
          >
            AI分析を見る
          </button>
          <button
            className="btn"
            onClick={() => navigate("/workspace/members")}
          >
            メンバー管理
          </button>
          <button
            className="btn"
            onClick={() => navigate("/workspace/billing")}
          >
            契約 / Billing
          </button>
          <button
            className="btn"
            onClick={() => navigate("/scenarios")}
          >
            シナリオ一覧
          </button>
        </div>

        <div style={{ height: 12 }} />

        {/* Workspace / Billing */}
        <div
          className="card"
          style={{
            marginTop: 8,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.20)",
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="h2" style={{ margin: 0 }}>契約 / Billing</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={loadBilling} disabled={!workspaceId || billingLoading}>
                {billingLoading ? "読込中..." : "現在の契約情報を取得"}
              </button>
              <button onClick={updateBilling} disabled={!workspaceId || billingLoading}>
                {billingLoading ? "更新中..." : "契約情報を更新"}
              </button>
            </div>
          </div>
          <div className="small" style={{ opacity: 0.8 }}>workspace</div>
          <div style={{ height: 10 }} />

          <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="small" style={{ opacity: 0.8 }}>workspace</div>
            <input
              className="input"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              style={{ minWidth: 320, flex: "1 1 320px" }}
              placeholder="workspace ID"
            />
          </div>

          <div style={{ height: 10 }} />

          <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="small" style={{ opacity: 0.8 }}>plan</div>
            <select className="input" value={billingForm.plan} onChange={(e) => setBillingForm((p) => ({ ...p, plan: e.target.value }))}>
              <option value="free">free</option>
              <option value="pro">pro</option>
              <option value="enterprise">enterprise</option>
            </select>

            <div className="small" style={{ opacity: 0.8 }}>status</div>
            <select className="input" value={billingForm.status} onChange={(e) => setBillingForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="trialing">trialing</option>
              <option value="active">active</option>
              <option value="past_due">past_due</option>
              <option value="canceled">canceled</option>
            </select>

            <div className="small" style={{ opacity: 0.8 }}>trial_days</div>
            <input
              className="input"
              type="number"
              value={billingForm.trial_days}
              min={0}
              max={365}
              style={{ width: 110 }}
              onChange={(e) => setBillingForm((p) => ({ ...p, trial_days: Number(e.target.value || 0) }))}
            />

            <div className="small" style={{ opacity: 0.8 }}>billing_email</div>
            <input
              className="input"
              value={billingForm.billing_email}
              onChange={(e) => setBillingForm((p) => ({ ...p, billing_email: e.target.value }))}
              style={{ minWidth: 220, flex: "1 1 220px" }}
              placeholder="billing@example.com"
            />
          </div>

          {billingErr ? (
            <div className="small" style={{ marginTop: 10, color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{billingErr}</div>
          ) : null}

          {billingData ? (
            <div className="small" style={{ marginTop: 10, opacity: 0.9, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(billingData, null, 2)}
            </div>
          ) : (
            <div className="small" style={{ marginTop: 10, opacity: 0.75 }}>
              まだ契約情報を読み込んでいません（workspace を確認して「現在の契約情報を取得」を押してください）。
            </div>
          )}
        </div>

        <div style={{ height: 12 }} />

        {/* AIレビュー */}
        <div className="card" style={{ marginTop: 8, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div className="h2" style={{ margin: 0 }}>AIレビュー（画面プレビュー付き）</div>
            <button
              onClick={() =>
                generateAiReview({
                  site_id: siteId,
                  day: latestDay,
                  scenario_id: abScenarioId,
                  variant_id: "na",
                })
              }
              disabled={!latestDay || !abScenarioId || loadingReview}
            >
              {loadingReview ? "生成中..." : "AIレビューを生成"}
            </button>
          </div>

          <div className="small" style={{ marginTop: 6, opacity: 0.85 }}>
            ※ scenario_id は下の A/B 統計カードと同じ入力を使います（variant は一旦 na）
          </div>

          <div style={{ height: 12 }} />

          <div className="small" style={{ opacity: 0.72, marginBottom: 10 }}>
            プレビュー＋注釈ピンで、どこを改善すべきかを視覚的に確認できます。
          </div>

          {reviewData?.packs?.length ? (
            <AdminPreviewWithPins packs={reviewData.packs} initialVariantId={reviewData.packs?.[0]?.variantId || "na"} />
          ) : (
            <div className="small" style={{ opacity: 0.8 }}>
              まだAIレビュー結果がありません（右上のボタンで生成）
            </div>
          )}
        </div>

        {/* A/B */}
        <div className="card" style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="h2" style={{ margin: 0 }}>A/B 結果サマリー</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => abScenarioId && navigate(`/scenarios/${abScenarioId}/review`)} disabled={!abScenarioId}>
                AIレビューを見る
              </button>
              <button onClick={() => abScenarioId && navigate(`/scenarios/${abScenarioId}/ai`)} disabled={!abScenarioId}>
                AI分析を見る
              </button>
              <button onClick={() => navigate("/scenarios")}>
                シナリオ一覧
              </button>
              <button onClick={() => loadAbSummary()} disabled={!latestDay || !abScenarioId || loadingAb}>
                {loadingAb ? "更新中..." : "集計を更新"}
              </button>
            </div>
          </div>

          <div className="small" style={{ marginTop: 6, opacity: 0.85 }}>
            ※ 選択中 scenario を対象に variant_id:null でAPIを叩き、variants / ab（あれば）をそのまま表示します。scenario が無い場合は先に Scenario を作成してください。
          </div>

          <div style={{ height: 10 }} />

          <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="small" style={{ opacity: 0.8 }}>scenario</div>
            <select
              className="input"
              value={abScenarioId}
              onChange={(e) => setAbScenarioId(e.target.value)}
              style={{ minWidth: 320, flex: "1 1 320px" }}
              disabled={!scenarios.length}
            >
              {!scenarios.length ? (
                <option value="">scenario がありません</option>
              ) : null}
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {scenarioLabel(s)}{scenarioLabel(s) !== s.id ? ` (${s.id})` : ""}
                </option>
              ))}
            </select>
            <div className="small" style={{ opacity: 0.8 }}>day</div>
            <input className="input" value={latestDay || ""} readOnly style={{ width: 140, opacity: 0.9 }} />
          </div>

          {abErr ? (
            <div className="small" style={{ marginTop: 10, color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{abErr}</div>
          ) : null}

          {abSummary?.ok ? (
            <div style={{ marginTop: 10 }}>
              <div className="small" style={{ opacity: 0.85 }}>
                scope: <b>{abSummary.scope}</b> / scope_id: <b>{abSummary.scope_id}</b> / variant_id: <b>{String(abSummary.variant_id)}</b>
              </div>

              <div style={{ height: 8 }} />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <StatCard label="TOTAL Imp" value={formatInt(abSummary?.counts?.impressions)} />
                <StatCard label="TOTAL Click" value={formatInt(abSummary?.counts?.click_links)} />
                <StatCard label="TOTAL CTR" value={`${safeNum(abSummary?.metrics?.link_ctr ?? abSummary?.metrics?.ctr)}%`} />
                <StatCard label="Winner" value={String(abSummary?.ab?.winner ?? "-")} />
              </div>

              <div
                className="card"
                style={{
                  minWidth: 0,
                  marginBottom: 10,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <div className="small" style={{ opacity: 0.68 }}>A/B判定サマリー</div>
                    <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>
                      {String(abSummary?.ab?.winner ?? "-")}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div className="small" style={{ opacity: 0.78 }}>
                      significant: <b>{String(abSummary?.ab?.significant ?? "-")}</b>
                    </div>
                    <div className="small" style={{ opacity: 0.78 }}>
                      p-value: <b>{String(abSummary?.ab?.p_value ?? abSummary?.ab?.pValue ?? "-")}</b>
                    </div>
                    <div className="small" style={{ opacity: 0.78 }}>
                      lift_abs: <b>{String(abSummary?.ab?.lift_abs ?? abSummary?.ab?.liftAbs ?? "-")}</b>
                    </div>
                    <div className="small" style={{ opacity: 0.78 }}>
                      lift_rel: <b>{String(abSummary?.ab?.lift_rel ?? abSummary?.ab?.liftRel ?? "-")}</b>
                    </div>
                  </div>
                </div>

                <div className="small" style={{ opacity: 0.68, marginTop: 10, lineHeight: 1.8 }}>
                  {abSummary?.ab?.winner
                    ? `現在の暫定勝者は ${String(abSummary?.ab?.winner)} です。significant と p-value を見ながら切替判断します。`
                    : "まだ winner は判定されていません。十分な impressions と click が集まるまで継続観測します。"}
                </div>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>TOTAL</th>
                    <th style={{ textAlign: "right" }}>impressions</th>
                    <th style={{ textAlign: "right" }}>click_links</th>
                    <th style={{ textAlign: "right" }}>CTR%</th>
                    <th style={{ textAlign: "right" }}>closes</th>
                    <th style={{ textAlign: "right" }}>conversions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ textAlign: "left" }}><b>all</b></td>
                    <td style={{ textAlign: "right" }}><b>{safeNum(abSummary?.counts?.impressions)}</b></td>
                    <td style={{ textAlign: "right" }}><b>{safeNum(abSummary?.counts?.click_links)}</b></td>
                    <td style={{ textAlign: "right" }}><b>{safeNum(abSummary?.metrics?.link_ctr ?? abSummary?.metrics?.ctr)}</b></td>
                    <td style={{ textAlign: "right" }}><b>{safeNum(abSummary?.counts?.closes)}</b></td>
                    <td style={{ textAlign: "right" }}><b>{safeNum(abSummary?.counts?.conversions)}</b></td>
                  </tr>
                </tbody>
              </table>

              {Array.isArray(abSummary?.variants) && abSummary.variants.length ? (
                <>
                  <div style={{ height: 10 }} />
                  <div className="h2" style={{ margin: 0, fontSize: 14 }}>バリエーション別結果</div>
                  <div style={{ height: 6 }} />
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>variant</th>
                        <th style={{ textAlign: "right" }}>impressions</th>
                        <th style={{ textAlign: "right" }}>click_links</th>
                        <th style={{ textAlign: "right" }}>CTR%</th>
                        <th style={{ textAlign: "right" }}>closes</th>
                        <th style={{ textAlign: "right" }}>conversions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abSummary.variants.map((v: any) => (
                        <tr key={String(v?.variant_id ?? v?.variantId ?? "na")}>
                          <td style={{ textAlign: "left" }}><b>{String(v?.variant_id ?? v?.variantId ?? "na")}</b></td>
                          <td style={{ textAlign: "right" }}>{safeNum(v?.counts?.impressions)}</td>
                          <td style={{ textAlign: "right" }}>{safeNum(v?.counts?.click_links)}</td>
                          <td style={{ textAlign: "right" }}>{safeNum(v?.metrics?.link_ctr ?? v?.metrics?.ctr)}</td>
                          <td style={{ textAlign: "right" }}>{safeNum(v?.counts?.closes)}</td>
                          <td style={{ textAlign: "right" }}>{safeNum(v?.counts?.conversions)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <div className="small" style={{ marginTop: 10, opacity: 0.8 }}>
                  variants がまだ返ってきてない（バックエンドがTOTALだけ返す版の可能性あり）。
                </div>
              )}

              {abSummary?.ab ? (
                <>
                  <div style={{ height: 10 }} />
                  <div className="h2" style={{ margin: 0, fontSize: 14 }}>A/B判定（統計）</div>
                  <div style={{ height: 6 }} />
                  <div className="small" style={{ opacity: 0.9, lineHeight: 1.7 }}>
                    p-value: <b>{String(abSummary.ab.p_value ?? abSummary.ab.pValue ?? "-")}</b> / significant: <b>{String(abSummary.ab.significant)}</b> / winner: <b>{String(abSummary.ab.winner ?? "-")}</b>
                    <br />
                    lift_abs: <b>{String(abSummary.ab.lift_abs ?? abSummary.ab.liftAbs ?? "-")}</b> / lift_rel: <b>{String(abSummary.ab.lift_rel ?? abSummary.ab.liftRel ?? "-")}</b>
                  </div>
                </>
              ) : null}

              {abSummary?.rule ? (
                <>
                  <div style={{ height: 10 }} />
                  <div className="h2" style={{ margin: 0, fontSize: 14 }}>Rule</div>
                  <div style={{ height: 6 }} />
                  <div className="small" style={{ opacity: 0.9 }}>
                    grade: <b>{String(abSummary.rule.grade)}</b>
                    {Array.isArray(abSummary.rule.reasons) && abSummary.rule.reasons.length ? (
                      <ul>
                        {abSummary.rule.reasons.map((t: string, i: number) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="small" style={{ marginTop: 10, opacity: 0.8 }}>
              まだ集計がありません（day/site/scenario_id を確認して「更新」）。
            </div>
          )}
        </div>

        <div style={{ height: 8 }} />
        <div className="small" style={{ opacity: 0.85 }}>
          rows: <b>{rows.length}</b> / chartDays: <b>{chartData.length}</b>
        </div>

        {err ? (
          <div className="small" style={{ marginTop: 8, color: "#ff6b6b", whiteSpace: "pre-wrap" }}>
            {err}
            {"\n"}
            ※ index エラーなら、Firebase console が「Create index」リンク出すやつ。そこ踏めばOK。
          </div>
        ) : null}
      </div>

      <div style={{ height: 14 }} />

      <div className="card" style={{ minWidth: 0 }}>
        <div className="h2">表示回数 / 主要クリック</div>
        <div className="small" style={{ opacity: 0.68, marginBottom: 8 }}>
          日別の表示回数と主要クリックを重ねて確認します。
        </div>
        <div style={{ height: 320, minHeight: 320, width: "100%", minWidth: 0 }}>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="impression" name="impression" dot={false} />
                <Line type="monotone" dataKey="click_link" name="click_link" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="small">データがありません</div>
          )}
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="card" style={{ minWidth: 0 }}>
        <div className="h2">CTR（クリック率）</div>
        <div className="small" style={{ opacity: 0.68, marginBottom: 8 }}>
          クリック率の推移。A/Bや改善後の変化を確認するための指標です。
        </div>
        <div style={{ height: 320, minHeight: 320, width: "100%", minWidth: 0 }}>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ctr" name="CTR%" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="small">データがありません</div>
          )}
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div className="h2">{days}日まとめ / バリエーション別インサイト</div>
            <div className="small" style={{ opacity: 0.68, marginBottom: 8 }}>
              期間集計と、variantごとのAI所見をまとめて確認できます。
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => abScenarioId && navigate(`/scenarios/${abScenarioId}/ai`)} disabled={!abScenarioId}>
              AI分析を見る
            </button>
            <button className="btn" onClick={() => abScenarioId && navigate(`/scenarios/${abScenarioId}/review`)} disabled={!abScenarioId}>
              AIレビューを見る
            </button>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th style={{ textAlign: "right" }}>impression</th>
              <th style={{ textAlign: "right" }}>click_link</th>
              <th style={{ textAlign: "right" }}>CTR%</th>
              <th style={{ textAlign: "right" }}>click</th>
              <th style={{ textAlign: "right" }}>close</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: "right" }}><b>{summary.imp}</b></td>
              <td style={{ textAlign: "right" }}><b>{summary.clkLink}</b></td>
              <td style={{ textAlign: "right" }}><b>{summary.ctr}</b></td>
              <td style={{ textAlign: "right" }}><b>{summary.clk}</b></td>
              <td style={{ textAlign: "right" }}><b>{summary.close}</b></td>
            </tr>
          </tbody>
        </table>

        {summaryTable.map((r) => {
          const day = latestDay; // 最新日
          const key = `${day}__${r.v ?? "na"}`;
          const ai = aiMap[key];

          return (
            <div key={r.v} className="card" style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <b>Variant {r.v}</b>

                {ai?.rule && (
                  <span
                    style={{
                      background: badgeColor(ai.rule.grade),
                      color: "#fff",
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  >
                    {String(ai.rule.grade || "").toUpperCase()}
                  </span>
                )}
              </div>

              <div style={{ marginTop: 8 }}>
                Impression: {r.imp} / Click: {r.clk} / CTR: {r.ctr}%
              </div>

              {!ai && (
                <button
                  onClick={() =>
                    generateAiInsight({
                      site_id: siteId,
                      day,
                      scope: "scenario",
                      scope_id: abScenarioId,
                      variant_id: r.v,
                      metrics: {
                        impressions: r.imp,
                        clicks: r.clk,
                        closes: 0,
                        conversions: 0,
                      },
                    })
                  }
                  disabled={!day || loadingAi === String(r.v ?? "na")}
                >
                  {loadingAi === String(r.v ?? "na") ? "生成中..." : "AI分析を生成"}
                </button>
              )}

              {ai?.ai && (
                <div style={{ marginTop: 12 }}>
                  <b>🤖 AI分析</b>
                  <div style={{ marginTop: 6 }}>{ai.ai.summary}</div>
                  <ul>
                    {Array.isArray(ai.ai.bullets) &&
                      ai.ai.bullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
                  </ul>
                  <div>
                    <b>Next:</b> {ai.ai.next}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}