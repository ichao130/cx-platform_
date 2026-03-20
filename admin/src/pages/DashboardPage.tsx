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

function writeSelectedWorkspaceId(workspaceId: string, uid?: string) {
  if (!uid) return;
  try {
    localStorage.setItem(workspaceKeyForUid(uid), workspaceId);
    window.dispatchEvent(new CustomEvent("cx_admin_workspace_changed", { detail: { workspaceId } }));
  } catch {
    // ignore
  }
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
        padding: 18,
        background: "#fff",
        border: "1px solid rgba(15,23,42,0.08)",
      }}
    >
      <div className="small" style={{ opacity: 0.74 }}>{label}</div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          lineHeight: 1.08,
          marginTop: 8,
          letterSpacing: "-.02em",
        }}
      >
        {value}
      </div>
      {sub ? <div className="small" style={{ opacity: 0.66, marginTop: 8 }}>{sub}</div> : null}
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
  const selectedWorkspaceName = useMemo(() => workspaceNameFromRows(visibleWorkspaces, workspaceId), [visibleWorkspaces, workspaceId]);
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
      setWorkspaceId(readSelectedWorkspaceId(uid));
      setScenarios([]);
    });
  }, []);

  useEffect(() => {
    if (!currentUid) {
      setWorkspaceId("");
      return;
    }

    const applySelectedWorkspace = () => {
      setWorkspaceId(readSelectedWorkspaceId(currentUid));
    };

    applySelectedWorkspace();

    const onWorkspaceChanged = (e?: Event) => {
      const next = (e as CustomEvent | undefined)?.detail?.workspaceId;
      if (typeof next === "string") {
        setWorkspaceId(next);
        return;
      }
      applySelectedWorkspace();
    };

    const onStorageChanged = () => applySelectedWorkspace();

    window.addEventListener("cx_admin_workspace_changed", onWorkspaceChanged as EventListener);
    window.addEventListener("storage", onStorageChanged);
    return () => {
      window.removeEventListener("cx_admin_workspace_changed", onWorkspaceChanged as EventListener);
      window.removeEventListener("storage", onStorageChanged);
    };
  }, [currentUid]);

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

  useEffect(() => {
    if (!currentUid) return;
    if (!visibleWorkspaces.length) return;

    const exists = !!workspaceId && visibleWorkspaces.some((w) => w.id === workspaceId);
    if (!exists) {
      const nextWorkspaceId = visibleWorkspaces[0]?.id || "";
      setWorkspaceId(nextWorkspaceId);
      if (nextWorkspaceId) writeSelectedWorkspaceId(nextWorkspaceId, currentUid);
    }
  }, [currentUid, visibleWorkspaces, workspaceId]);

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
            if (!ws || !visibleWorkspaceIds.has(ws)) return false;
            if (!workspaceId) return true;
            if (ws !== String(workspaceId)) return false;
            return true;
          });

        setSites(list);

        const exists = !!siteId && list.some((s) => s.id === siteId);
        if (!exists) {
          const nextSiteId = list[0]?.id || "";
          setSiteId(nextSiteId);
        }
      },
      (e) => setErr(`sites read failed: ${e?.code || ""} ${e?.message || e}`)
    );
  }, [currentUid, siteId, visibleWorkspaceIds, workspaceId]);

  useEffect(() => {
    if (!sites.length) {
      setSiteId("");
      return;
    }

    const hit = siteId ? sites.find((s) => s.id === siteId) : null;
    if (!hit) {
      setSiteId(sites[0].id);
      return;
    }
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
    <div className="container liquid-page" style={{ minWidth: 0 }}>

      <div className="page-header">
        <div className="page-header__meta">
          <div className="small" style={{ marginBottom: 6, opacity: 0.7 }}>MOKKEDA / Dashboard</div>
          <h1 className="h1">ダッシュボード</h1>
          <div className="small">選択中サイトのKPI、A/B状況、AIレビューをまとめて確認できます。</div>
          <div className="small" style={{ opacity: 0.72, marginTop: 4 }}>
            サイト名ベースで、直近の反応状況と運用判断に必要な情報を整理しています。
          </div>
        </div>

        <div className="page-header__actions" style={{ flexWrap: "wrap" }}>
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
          <button className="btn" onClick={() => navigate("/scenarios")}>
            シナリオ一覧
          </button>
        </div>
      </div>

      <div className="card liquid-page" style={{ minWidth: 0, marginBottom: 14 }}>
        <div className="list-toolbar">
          <div className="list-toolbar__filters" style={{ minWidth: 0, flex: 1 }}>
            <div style={{ minWidth: 260, flex: "1 1 320px" }}>
              <div className="h2">サイト</div>
              <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {siteLabel(s)}{siteLabel(s) !== s.id ? ` (${s.id})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ width: 120 }}>
              <div className="h2">集計日数</div>
              <input
                className="input"
                type="number"
                value={days}
                min={1}
                max={365}
                onChange={(e) => setDays(Number(e.target.value || 30))}
              />
            </div>
          </div>

          <div className="list-toolbar__actions">
            <button className="btn" onClick={() => navigate("/workspace/members")}>
              メンバー管理
            </button>
            <button className="btn" onClick={() => navigate("/workspace/billing")}>
              契約 / Billing
            </button>
          </div>
        </div>

        <div
          className="card"
          style={{
            minWidth: 0,
            padding: 16,
            background: "linear-gradient(180deg,#ffffff,#f8fbff)",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <div className="small" style={{ opacity: 0.68 }}>現在のサイト</div>
              <div style={{ fontWeight: 800, marginTop: 6 }}>{selectedSiteName || "-"}</div>
              {selectedSiteName && siteId && selectedSiteName !== siteId ? (
                <div className="small" style={{ opacity: 0.58, marginTop: 2 }}>ID: {siteId}</div>
              ) : null}
            </div>
            <div>
              <div className="small" style={{ opacity: 0.68 }}>現在のシナリオ</div>
              <div style={{ fontWeight: 800, marginTop: 6 }}>{scenarioName || "-"}</div>
              {scenarioName && abScenarioId && scenarioName !== abScenarioId ? (
                <div className="small" style={{ opacity: 0.58, marginTop: 2 }}>ID: {abScenarioId}</div>
              ) : null}
            </div>
            <div>
              <div className="small" style={{ opacity: 0.68 }}>ワークスペース</div>
              <div style={{ fontWeight: 800, marginTop: 6 }}>{selectedWorkspaceName || "-"}</div>
            </div>
            <div>
              <div className="small" style={{ opacity: 0.68 }}>最新日 / 読み込み件数</div>
              <div style={{ fontWeight: 800, marginTop: 6 }}>{latestDay || "-"} / {rows.length}</div>
            </div>
          </div>
        </div>

        <div style={{ height: 14 }} />

        <div
          className="liquid-page"
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

        {err ? (
          <div className="small" style={{ marginTop: 12, color: "#d93025", whiteSpace: "pre-wrap" }}>
            {err}
            {"\n"}
            ※ index エラーなら、Firebase console が「Create index」リンク出すやつ。そこを開けば対応できます。
          </div>
        ) : null}
      </div>




      <div style={{ height: 14 }} />

      <div className="card liquid-page" style={{ minWidth: 0 }}>
        <div className="h2">推移：表示回数 / 主要クリック</div>
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

      <div className="card liquid-page" style={{ minWidth: 0 }}>
        <div className="h2">推移：CTR（クリック率）</div>
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

      <div className="card liquid-page" style={{ minWidth: 0 }}>
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
        <div className="liquid-scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th style={{ textAlign: "right" }}>表示回数</th>
                <th style={{ textAlign: "right" }}>主要クリック</th>
                <th style={{ textAlign: "right" }}>CTR%</th>
                <th style={{ textAlign: "right" }}>クリック</th>
                <th style={{ textAlign: "right" }}>閉じる操作</th>
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
        </div>

        {summaryTable.map((r) => {
          const day = latestDay; // 最新日
          const key = `${day}__${r.v ?? "na"}`;
          const ai = aiMap[key];

          return (
            <div
              key={r.v}
              className="card liquid-page"
              style={{
                marginTop: 16,
                minWidth: 0,
                border: "1px solid rgba(15,23,42,0.08)",
                background: "linear-gradient(180deg,#ffffff,#f8fbff)",
              }}
            >
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
                  className="btn btn--primary"
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