import React, { useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useParams } from "react-router-dom";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db, apiPostJson } from "../firebase";
import AdminPreviewWithPins from "../components/AdminPreviewWithPins";


function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
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

type ScenarioDoc = {
  siteId: string;
  name?: string;
  enabled?: boolean;
};

export default function ScenarioAiPage() {
  const params = useParams();
  const routeScenarioId = params?.scenarioId as string | undefined;

  const [sites, setSites] = useState<Array<{ id: string; data: any }>>([]);
  const [siteId, setSiteId] = useState<string>("");
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [currentUid, setCurrentUid] = useState<string>("");

  const [scenarios, setScenarios] = useState<Array<{ id: string; data: ScenarioDoc }>>([]);
  const [scenarioId, setScenarioId] = useState<string>(() => routeScenarioId || "");

  const [day, setDay] = useState<string>(() => isoDay(new Date()));
  const [variantId, setVariantId] = useState<string>("na");

  const [loading, setLoading] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const [review, setReview] = useState<any | null>(null);
  const [insight, setInsight] = useState<any | null>(null);


  function safeNum(n: any) {
    const v = Number(n);
    return Number.isFinite(v) ? v : 0;
  }

  function formatInt(n: any) {
    return safeNum(n).toLocaleString("ja-JP");
  }

  function siteLabel(site: { id: string; data: any } | undefined) {
    if (!site) return "";
    return String(site.data?.name || site.data?.siteName || site.id || "");
  }

  function MiniStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
      <div
        className="card"
        style={{
          padding: 14,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        }}
      >
        <div className="small" style={{ opacity: 0.7 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{value}</div>
        {sub ? <div className="small" style={{ opacity: 0.6, marginTop: 6 }}>{sub}</div> : null}
      </div>
    );
  }

  useEffect(() => {
    return onAuthStateChanged(getAuth(), (user) => {
      const uid = user?.uid || "";
      setCurrentUid(uid);
      setWorkspaceId(readSelectedWorkspaceId(uid));
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

  // sites
  useEffect(() => {
    const q = query(collection(db, "sites"), orderBy("__name__"));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, data: d.data() }))
          .filter((row) => {
            const ws = String((row.data as any)?.workspaceId || "");
            if (!workspaceId) return true;
            return ws === String(workspaceId);
          });
        setSites(list);
        const exists = !!siteId && list.some((s) => s.id === siteId);
        if (!exists) setSiteId(list[0]?.id || "");
      },
      (e) => setErr(`sites read failed: ${e?.code || ""} ${e?.message || e}`)
    );
  }, [siteId, workspaceId]);

  // scenarios for site
  useEffect(() => {
    if (!siteId) return;
    setErr("");
    setReview(null);
    setInsight(null);

    const q = query(collection(db, "scenarios"), where("siteId", "==", siteId), orderBy("__name__"));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, data: d.data() as any }));
        setScenarios(list);

        if (routeScenarioId) {
          const exists = list.find((s) => s.id === routeScenarioId);
          if (exists) setScenarioId(routeScenarioId);
        } else if (!scenarioId && list.length) {
          setScenarioId(list[0].id);
        }
      },
      (e) => setErr(`scenarios read failed: ${e?.code || ""} ${e?.message || e}`)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const scenarioName = useMemo(() => {
    const s = scenarios.find((x) => x.id === scenarioId);
    return s?.data?.name || scenarioId || "";
  }, [scenarios, scenarioId]);

  const selectedSiteName = useMemo(() => {
    const s = sites.find((x) => x.id === siteId);
    return siteLabel(s) || siteId || "";
  }, [sites, siteId]);

  const selectedWorkspaceName = useMemo(() => {
    const s = sites.find((x) => String(x.data?.workspaceId || "") === String(workspaceId || ""));
    return String(s?.data?.workspaceName || s?.data?.workspace_name || workspaceId || "");
  }, [sites, workspaceId]);

  const stats = useMemo(() => {
    const counts = insight?.counts || review?.counts || {};

    return {
      impressions: safeNum(counts?.impressions),
      clicks: safeNum(counts?.clicks),
      closes: safeNum(counts?.closes),
      conversions: safeNum(counts?.conversions),
    };
  }, [insight, review]);


  async function runReview() {
    if (!siteId || !scenarioId || !day) return;
    setErr("");
    setLoading("review");
    try {
      const data = await apiPostJson(
        "/v1/ai/review",
        {
          site_id: siteId,
          day,
          scenario_id: scenarioId,
          variant_id: variantId || "na",
        },
        { siteId }
      );
      setReview(data);
    } catch (e: any) {
      console.error(e);
      setErr(`AIレビュー失敗: ${e?.message || String(e)}`);
    } finally {
      setLoading("");
    }
  }

  async function runInsight() {
    if (!siteId || !scenarioId || !day) return;
    setErr("");
    setLoading("insight");
    try {
      // まず stats/summary で counts を取る
      const sum = await apiPostJson(
        "/v1/stats/summary",
        {
          site_id: siteId,
          day,
          scope: "scenario",
          scope_id: scenarioId,
          variant_id: variantId || "na",
        },
        { siteId }
      );

      const data = await apiPostJson(
        "/v1/ai/insight",
        {
          site_id: siteId,
          day,
          scope: "scenario",
          scope_id: scenarioId,
          variant_id: variantId || "na",
          metrics: {
            impressions: sum?.counts?.impressions ?? 0,
            clicks: sum?.counts?.clicks ?? 0,
            closes: sum?.counts?.closes ?? 0,
            conversions: sum?.counts?.conversions ?? 0,
          },
          context: {
            scenario_name: scenarioName,
            url_hint: "https://branberyheag.jp/",
          },
        },
        { siteId }
      );

      setInsight(data);
    } catch (e: any) {
      console.error(e);
      setErr(`AI運用アシスタント失敗: ${e?.message || String(e)}`);
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ minWidth: 0 }}>
        <h1 className="h1">AIインサイト</h1>
        <div className="small" style={{ opacity: 0.85 }}>
          AIレビューと運用アシスタントをまとめて確認する画面です。
        </div>

        <div style={{ height: 10 }} />

        <div className="small" style={{ opacity: 0.72, marginBottom: 8 }}>
          現在のサイト: <b>{selectedSiteName || "-"}</b>
          <span style={{ opacity: 0.52 }}> / </span>
          ワークスペース: <b>{selectedWorkspaceName || workspaceId || "-"}</b>
        </div>

        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="h2" style={{ margin: 0 }}>サイト</div>
          <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s) => {
              const label = siteLabel(s);
              return (
                <option key={s.id} value={s.id}>
                  {label}{label !== s.id ? ` (${s.id})` : ""}
                </option>
              );
            })}
          </select>

          <div className="h2" style={{ margin: 0 }}>シナリオ</div>
          <select
            className="input"
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            disabled={!!routeScenarioId}
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>{s.data?.name ? `${s.data.name} (${s.id})` : s.id}</option>
            ))}
          </select>
          {routeScenarioId ? (
            <div className="small" style={{ opacity: 0.7 }}>
              Scenario固定（Scenarioページから開かれました）
            </div>
          ) : null}

          <div className="h2" style={{ margin: 0 }}>日付</div>
          <input className="input" type="date" value={day} onChange={(e) => setDay(e.target.value)} />

          <div className="h2" style={{ margin: 0 }}>バリエーション</div>
          <input
            className="input"
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            placeholder="na"
            style={{ width: 120 }}
          />
        </div>

        {err ? (
          <div className="small" style={{ marginTop: 10, color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{err}</div>
        ) : null}

        <div style={{ height: 12 }} />

        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <button onClick={runReview} disabled={loading !== ""}>
            {loading === "review" ? "生成中..." : "AIレビュー生成"}
          </button>
          <button onClick={runInsight} disabled={loading !== ""}>
            {loading === "insight" ? "生成中..." : "AI運用アシスタント生成"}
          </button>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <MiniStat label="表示回数" value={formatInt(stats.impressions)} />
        <MiniStat label="クリック数" value={formatInt(stats.clicks)} />
        <MiniStat label="閉じる操作" value={formatInt(stats.closes)} />
        <MiniStat label="コンバージョン" value={formatInt(stats.conversions)} />
      </div>

      <div style={{ height: 14 }} />

      {/* Assistant result */}
      <div className="card" style={{ minWidth: 0 }}>
        <div className="h2">運用アシスタント（AI Insight）</div>
        <div className="small" style={{ opacity: 0.75 }}>
          AIがデータを分析し、改善ポイントと次のアクションを提案します。
        </div>
        {!insight?.ai ? (
          <div className="small" style={{ opacity: 0.8 }}>まだ生成してません。上の「AI運用アシスタント生成」を押してね。</div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>🤖 {insight.ai.summary}</div>
            {Array.isArray(insight.ai.bullets) && insight.ai.bullets.length ? (
              <ul style={{ marginTop: 8 }}>
                {insight.ai.bullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
              </ul>
            ) : null}
            {insight.ai.next ? (
              <div style={{ marginTop: 8 }}><b>Next:</b> {insight.ai.next}</div>
            ) : null}
          </div>
        )}
      </div>

      <div style={{ height: 14 }} />

      {/* Review result */}
      <div className="card" style={{ minWidth: 0 }}>
        <div className="h2">実画面レビュー（AI Review + Pins）</div>
        <div className="small" style={{ opacity: 0.75 }}>
          プレビュー上に改善ポイントをピン表示します。
        </div>
        {!review?.packs ? (
          <div className="small" style={{ opacity: 0.8 }}>まだ生成してません。上の「AIレビュー生成」を押してね。</div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <AdminPreviewWithPins packs={review.packs} initialVariantId={variantId || "na"} />
          </div>
        )}
      </div>
    </div>
  );
}
