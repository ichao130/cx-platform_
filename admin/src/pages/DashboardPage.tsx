import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import AdminPreviewWithPins from "../components/AdminPreviewWithPins";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://asia-northeast1-cx-platform-v1.cloudfunctions.net/api"; 
// ↑自分のFunctionsのベースURLに合わせて

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

export default function DashboardPage() {
  const [sites, setSites] = useState<Array<{ id: string; data: any }>>([]);
  const [siteId, setSiteId] = useState<string>("");

  const [rows, setRows] = useState<StatRow[]>([]);
  const [err, setErr] = useState<string>("");

  // date range (last 30 days)
  const [days, setDays] = useState<number>(30);
  const [aiMap, setAiMap] = useState<Record<string, any>>({});
  const [loadingAi, setLoadingAi] = useState<string | null>(null);

  const [abSummary, setAbSummary] = useState<any | null>(null);
  const [loadingAb, setLoadingAb] = useState(false);
  const [abErr, setAbErr] = useState<string>("");

  // Phase2: とりあえず固定の scenario_id（後でUI化する）
  const [abScenarioId, setAbScenarioId] = useState<string>("scn_y3ab6lj2_1772003107750");



  async function generateAiInsight(payload: any) {
    try {
      setLoadingAi(String(payload.variant_id ?? "na"));

      const base = API_BASE.replace(/\/$/, "");
      const res = await fetch(`${base}/v1/ai/insight`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Site-Id": payload.site_id,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = null;
      try { data = JSON.parse(text); } catch { data = { ok: false, raw: text }; }

      if (!res.ok || !data?.ok) {
        console.error("[ai/insight] failed:", res.status, data);
        alert(`AI生成失敗: ${res.status}\n${data?.message || data?.error || text}`);
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
  }

  async function generateAiReview(payload: any) {
    try {
      setLoadingReview(true);

      const base = API_BASE.replace(/\/$/, "");
      const res = await fetch(`${base}/v1/ai/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Site-Id": payload.site_id,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { ok: false, raw: text };
      }

      if (!res.ok || !data?.ok) {
        console.error("[ai/review] failed:", res.status, data);
        alert(`AIレビュー失敗: ${res.status}\n${data?.message || data?.error || text}`);
        return;
      }

      setReviewData(data);
    } catch (e: any) {
      console.error(e);
      alert(`AIレビューで例外: ${e?.message || String(e)}`);
    } finally {
      setLoadingReview(false);
    }
  }

  async function loadAbSummary() {
    if (!siteId || !latestDay) return;

    try {
      setLoadingAb(true);
      setAbErr("");

      const base = API_BASE.replace(/\/$/, "");
      const res = await fetch(`${base}/v1/stats/summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Site-Id": siteId,
        },
        body: JSON.stringify({
          site_id: siteId,
          day: latestDay,
          scope: "scenario",
          scope_id: abScenarioId,
          variant_id: null,
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { ok: false, raw: text };
      }

      if (!res.ok || !data?.ok) {
        console.error("[stats/summary] failed:", res.status, data);
        setAbErr(`A/B集計失敗: ${res.status} ${data?.message || data?.error || text}`);
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
  }


  const [reviewData, setReviewData] = useState<any | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  // load sites
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

  // load stats_daily
  useEffect(() => {
    if (!siteId) return;

    setErr("");
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - Math.max(1, days) + 1);

    const startDay = isoDay(start);
    const endDay = isoDay(end);

    // NOTE:
    // where(siteId==) + where(day>=) + where(day<=) + orderBy(day)
    // で composite index が必要になることがある（失敗したら err に出る）
    const q = query(
      collection(db, "stats_daily"),
      where("siteId", "==", siteId),
      where("day", ">=", startDay),
      where("day", "<=", endDay),
      orderBy("day", "asc")
    );

    return onSnapshot(
      q,
      (snap) => {
        setRows(snap.docs.map((d) => d.data() as any));
      },
      (e) => {
        console.error("[stats_daily] snapshot error:", e);
        setRows([]);
        setErr(`stats_daily read failed: ${e?.code || ""} ${e?.message || e}`);
      }
    );
  }, [siteId, days]);

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


  useEffect(() => {
    // latestDay が取れてから自動取得
    loadAbSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, latestDay, abScenarioId]);


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

    // 表示回数多い順などにしたいならここでsort
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

  return (
    <div className="container">
      <div className="card" style={{ minWidth: 0 }}>
        <h1 className="h1">Dashboard</h1>

        <div className="small">stats_daily（直近N日 / 全variant合算）</div>

        <div style={{ height: 12 }} />

        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <div className="h2" style={{ margin: 0 }}>site</div>
          <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.id}</option>
            ))}
          </select>

          <div className="h2" style={{ margin: 0 }}>days</div>
          <input
            className="input"
            type="number"
            style={{ width: 90 }}
            value={days}
            min={1}
            max={365}
            onChange={(e) => setDays(Number(e.target.value || 30))}
          />
        </div>

        <div style={{ height: 12 }} />

        <div
          className="card"
          style={{
            marginTop: 8,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.20)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div className="h2" style={{ margin: 0 }}>AIレビュー（画面プレビュー）</div>
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

          {reviewData?.packs?.length ? (
            <AdminPreviewWithPins
              packs={reviewData.packs}
              initialVariantId={reviewData.packs?.[0]?.variantId || "na"}
            />
          ) : (
            <div className="small" style={{ opacity: 0.8 }}>
              まだAIレビュー結果がありません（右上のボタンで生成）
            </div>
          )}
        </div>

        <div
          className="card"
          style={{
            marginTop: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.20)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div className="h2" style={{ margin: 0 }}>A/B 統計（stats/summary）</div>
            <button onClick={() => loadAbSummary()} disabled={!latestDay || !abScenarioId || loadingAb}>
              {loadingAb ? "更新中..." : "更新"}
            </button>
          </div>

          <div className="small" style={{ marginTop: 6, opacity: 0.85 }}>
            ※ variant_id:null でAPIを叩いて、variants / ab（あれば）をそのまま表示する。
          </div>

          <div style={{ height: 10 }} />

          <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="small" style={{ opacity: 0.8 }}>scenario_id</div>
            <input
              className="input"
              value={abScenarioId}
              onChange={(e) => setAbScenarioId(e.target.value)}
              style={{ minWidth: 320, flex: "1 1 320px" }}
              placeholder="scn_..."
            />
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
                  <div className="h2" style={{ margin: 0, fontSize: 14 }}>Variants</div>
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
                  <div className="h2" style={{ margin: 0, fontSize: 14 }}>A/B z検定</div>
                  <div style={{ height: 6 }} />
                  <div className="small" style={{ opacity: 0.9, lineHeight: 1.7 }}>
                    p-value: <b>{String(abSummary.ab.p_value ?? abSummary.ab.pValue ?? "-")}</b> / significant: <b>{String(abSummary.ab.significant)}</b> / winner: <b>{String(abSummary.ab.winner ?? "-")}</b>
                    <br />
                    lift_abs: <b>{String(abSummary.ab.lift_abs ?? abSummary.ab.liftAbs ?? "-")}</b> / lift_rel: <b>{String(abSummary.ab.lift_rel ?? abSummary.ab.liftRel ?? "-")}</b>
                  </div>
                  {Array.isArray(abSummary.ab.reasons) && abSummary.ab.reasons.length ? (
                    <ul>
                      {abSummary.ab.reasons.map((t: string, i: number) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  ) : null}
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
        <div className="h2">Impression / Click_link</div>
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
        <div className="h2">CTR（click_link / impression）%</div>
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
        <div className="h2">{days}日まとめ</div>
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
                  disabled={!day || loadingAi === String(r.v ?? "na")} // ★ dayが空なら押せない
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




        {!rows.length && !err ? (
          <div className="small" style={{ marginTop: 10, opacity: 0.8 }}>
            データが0件。原因候補：
            <ul>
              <li>siteId が違う（sites の先頭が別siteになってる）</li>
              <li>stats_daily の day が範囲外（days を増やしてみて）</li>
              <li>Firestore rules で読めてない（本来は err が出る）</li>
              <li>index が未作成（err に出る）</li>
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}