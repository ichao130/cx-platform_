import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import AdminPreviewWithPins from "../components/AdminPreviewWithPins";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://asia-northeast1-cx-platform-v1.cloudfunctions.net/api";

function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

type ScenarioDoc = {
  siteId: string;
  name?: string;
  enabled?: boolean;
};

export default function ScenarioAiPage() {
  const [sites, setSites] = useState<Array<{ id: string; data: any }>>([]);
  const [siteId, setSiteId] = useState<string>("");

  const [scenarios, setScenarios] = useState<Array<{ id: string; data: ScenarioDoc }>>([]);
  const [scenarioId, setScenarioId] = useState<string>("");

  const [day, setDay] = useState<string>(() => isoDay(new Date()));
  const [variantId, setVariantId] = useState<string>("na");

  const [loading, setLoading] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const [review, setReview] = useState<any | null>(null);
  const [insight, setInsight] = useState<any | null>(null);

  const base = useMemo(() => API_BASE.replace(/\/$/, ""), []);

  // sites
  useEffect(() => {
    const q = query(collection(db, "sites"), orderBy("__name__"));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
        setSites(list);
        if (!siteId && list.length) setSiteId(list[0].id);
      },
      (e) => setErr(`sites read failed: ${e?.code || ""} ${e?.message || e}`)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        if (!scenarioId && list.length) setScenarioId(list[0].id);
      },
      (e) => setErr(`scenarios read failed: ${e?.code || ""} ${e?.message || e}`)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const scenarioName = useMemo(() => {
    const s = scenarios.find((x) => x.id === scenarioId);
    return s?.data?.name || scenarioId || "";
  }, [scenarios, scenarioId]);

  async function postJson(path: string, body: any) {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Site-Id": body?.site_id || siteId,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: false, raw: text };
    }
    if (!res.ok || !data?.ok) {
      const msg = data?.message || data?.error || text;
      throw new Error(`${res.status} ${msg}`);
    }
    return data;
  }

  async function runReview() {
    if (!siteId || !scenarioId || !day) return;
    setErr("");
    setLoading("review");
    try {
      const data = await postJson("/v1/ai/review", {
        site_id: siteId,
        day,
        scenario_id: scenarioId,
        variant_id: variantId || "na",
      });
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
      const sum = await postJson("/v1/stats/summary", {
        site_id: siteId,
        day,
        scope: "scenario",
        scope_id: scenarioId,
        variant_id: variantId || "na",
      });

      const data = await postJson("/v1/ai/insight", {
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
      });

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
        <h1 className="h1">AI</h1>
        <div className="small" style={{ opacity: 0.85 }}>
          ここは <b>完成形のAI分析パネル</b>（レビュー + 運用アシスタント）をまとめる場所。
        </div>

        <div style={{ height: 10 }} />

        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="h2" style={{ margin: 0 }}>site</div>
          <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.id}</option>
            ))}
          </select>

          <div className="h2" style={{ margin: 0 }}>scenario</div>
          <select className="input" value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>{s.data?.name ? `${s.data.name} (${s.id})` : s.id}</option>
            ))}
          </select>

          <div className="h2" style={{ margin: 0 }}>day</div>
          <input className="input" type="date" value={day} onChange={(e) => setDay(e.target.value)} />

          <div className="h2" style={{ margin: 0 }}>variant</div>
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

      {/* Assistant result */}
      <div className="card" style={{ minWidth: 0 }}>
        <div className="h2">運用アシスタント（AI Insight）</div>
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
