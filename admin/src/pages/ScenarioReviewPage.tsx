import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminPreviewWithPins from "../components/AdminPreviewWithPins";
import { apiPostJson } from "../firebase";
import html2canvas from "html2canvas";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function readSelectedSiteId(): string {
  try {
    return (
      localStorage.getItem("cx_admin_site_id") ||
      localStorage.getItem("cx_admin_selected_site") ||
      "site_s1rfu064_1771496065677"
    );
  } catch {
    return "site_s1rfu064_1771496065677";
  }
}

function safeNum(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function formatInt(n: any) {
  return safeNum(n).toLocaleString("ja-JP");
}

function badgeStyle(grade?: string): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
  };

  if (grade === "good") return { ...base, background: "rgba(34,197,94,0.18)", borderColor: "rgba(34,197,94,0.35)" };
  if (grade === "ok") return { ...base, background: "rgba(59,130,246,0.18)", borderColor: "rgba(59,130,246,0.35)" };
  if (grade === "bad") return { ...base, background: "rgba(239,68,68,0.18)", borderColor: "rgba(239,68,68,0.35)" };
  if (grade === "need_data") return { ...base, background: "rgba(245,158,11,0.18)", borderColor: "rgba(245,158,11,0.35)" };
  return base;
}

function MiniStat({
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
      <div className="small" style={{ opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.15, marginTop: 6 }}>{value}</div>
      {sub ? <div className="small" style={{ opacity: 0.6, marginTop: 6 }}>{sub}</div> : null}
    </div>
  );
}

export default function ScenarioReviewPage() {
  const navigate = useNavigate();
  const { scenarioId } = useParams<{ scenarioId: string }>();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [screenshotMode, setScreenshotMode] = useState(false);
  const [screenshotStatus, setScreenshotStatus] = useState<"idle" | "capturing" | "done" | "error">("idle");
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [siteId, setSiteId] = useState<string>(() => readSelectedSiteId());
  const [dayFrom, setDayFrom] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10);
  });
  const [dayTo, setDayTo] = useState<string>(todayIso());
  const [variantId, setVariantId] = useState<string>("na");

  useEffect(() => {
    const onStorage = () => setSiteId(readSelectedSiteId());
    const onCustom = (e: any) => {
      const next = e?.detail?.siteId || e?.detail?.site_id;
      if (typeof next === "string" && next) setSiteId(next);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("cx_admin_site_changed" as any, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cx_admin_site_changed" as any, onCustom);
    };
  }, []);

  const pack = useMemo(() => data?.packs?.[0] || null, [data]);

  const summary = useMemo(() => {
    const counts = data?.counts || data?.metrics || {};
    const metrics = data?.metrics || {};
    const rule = data?.rule || {};
    const ai = data?.ai || {};
    const bullets = Array.isArray(ai?.bullets) ? ai.bullets : [];

    return {
      impressions: safeNum(counts?.impressions),
      clicks: safeNum(counts?.click_links ?? counts?.clicks),
      ctr: safeNum(metrics?.link_ctr ?? metrics?.ctr),
      closes: safeNum(counts?.closes),
      conversions: safeNum(counts?.conversions),
      grade: String(rule?.grade || "-"),
      bullets,
      aiSummary: String(ai?.summary || ""),
      aiNext: String(ai?.next || ""),
    };
  }, [data]);

  /** プレビュー要素をキャプチャして base64 PNG を返す */
  const capturePreview = useCallback(async (): Promise<string | null> => {
    const el = previewRef.current;
    if (!el) return null;
    setScreenshotStatus("capturing");
    try {
      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#1a1a2e",
        scale: 1.5, // 解像度を上げて見やすく
        logging: false,
        width: el.offsetWidth,
        height: Math.min(el.offsetHeight, 640),
      });
      // 幅を最大 900px にリサイズしてコスト削減
      const maxW = 900;
      let { width, height } = canvas;
      if (width > maxW) {
        height = Math.round(height * maxW / width);
        width = maxW;
      }
      const out = document.createElement("canvas");
      out.width = width;
      out.height = height;
      const ctx = out.getContext("2d");
      if (ctx) ctx.drawImage(canvas, 0, 0, width, height);
      const dataUrl = out.toDataURL("image/png");
      const base64 = dataUrl.split(",")[1];
      setScreenshotStatus("done");
      return base64 || null;
    } catch (e) {
      console.warn("[capturePreview] failed:", e);
      setScreenshotStatus("error");
      return null;
    }
  }, []);

  const fetchReview = useCallback(async (withScreenshot = false) => {
    if (!scenarioId) {
      setError("scenarioId がありません");
      setData(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // スクリーンショットモード: プレビューが既にレンダリングされている場合にキャプチャ
      let previewImage: string | null = null;
      if (withScreenshot && previewRef.current) {
        previewImage = await capturePreview();
      }

      const json = await apiPostJson(
        "/v1/ai/review",
        {
          site_id: siteId,
          day_from: dayFrom,
          day_to: dayTo,
          scenario_id: scenarioId,
          variant_id: variantId,
          force_refresh: true,
          ...(previewImage ? { preview_image: previewImage } : {}),
        },
        { siteId }
      );

      setData(json);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [scenarioId, siteId, dayFrom, dayTo, variantId, capturePreview]);

  useEffect(() => {
    fetchReview(false);
  }, [fetchReview]);

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>AIレビュー</h1>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
            scenario: <b>{scenarioId || "-"}</b>
          </div>
          <div className="small" style={{ opacity: 0.66, marginTop: 6 }}>
            プレビュー、注釈ピン、改善提案を1画面で確認します。
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={badgeStyle(data?.rule?.grade)}>{String(data?.rule?.grade || "no_data").toUpperCase()}</span>
          <button className="btn" onClick={() => navigate(-1)}>
            戻る
          </button>
          <button className="btn" onClick={() => fetchReview(false)} disabled={loading || !scenarioId}>
            {loading && !screenshotMode ? "分析中..." : "再取得"}
          </button>
          <button
            className="btn btn--primary"
            onClick={async () => {
              setScreenshotMode(true);
              await fetchReview(true);
              setScreenshotMode(false);
            }}
            disabled={loading || !scenarioId || !data}
            title="プレビューのスクリーンショットを撮り、GPT-4o Visionで視覚的に評価します"
          >
            {loading && screenshotMode
              ? screenshotStatus === "capturing" ? "📷 キャプチャ中..." : "🔍 Vision分析中..."
              : "📷 ビジュアルAIレビュー"}
          </button>
        </div>
      </div>

      <div className="card" style={{ minWidth: 0 }}>
        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          {[
            { label: "今日", days: 0 },
            { label: "直近7日", days: 6 },
            { label: "直近30日", days: 29 },
          ].map(({ label, days }) => (
            <button key={label} className="btn btn--sm" onClick={() => {
              const to = todayIso();
              const from = new Date(); from.setDate(from.getDate() - days);
              setDayFrom(from.toISOString().slice(0, 10));
              setDayTo(to);
            }}>{label}</button>
          ))}
        </div>
        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="small" style={{ opacity: 0.8 }}>開始日</div>
          <input className="input" type="date" value={dayFrom} onChange={(e) => setDayFrom(e.target.value)} style={{ width: 160 }} />
          <div className="small" style={{ opacity: 0.8 }}>終了日</div>
          <input className="input" type="date" value={dayTo} onChange={(e) => setDayTo(e.target.value)} style={{ width: 160 }} />
          <div className="small" style={{ opacity: 0.8 }}>variant</div>
          <input className="input" value={variantId} onChange={(e) => setVariantId(e.target.value)} style={{ width: 120 }} />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <MiniStat label="Impressions" value={formatInt(summary.impressions)} sub="review基準" />
        <MiniStat label="Click" value={formatInt(summary.clicks)} sub="主要クリック" />
        <MiniStat label="CTR" value={`${summary.ctr}%`} sub="link_ctr / ctr" />
        <MiniStat label="Grade" value={summary.grade.toUpperCase()} sub="AI rule" />
      </div>

      <div className="card" style={{ minWidth: 0 }}>
        <div className="h2" style={{ marginTop: 0 }}>AIサマリー</div>
        {summary.aiSummary ? (
          <div style={{ lineHeight: 1.8 }}>{summary.aiSummary}</div>
        ) : (
          <div className="small" style={{ opacity: 0.72 }}>まだAIサマリーがありません。</div>
        )}

        {summary.bullets.length ? (
          <ul style={{ marginTop: 10, lineHeight: 1.8 }}>
            {summary.bullets.map((b: string, i: number) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : null}

        {summary.aiNext ? (
          <div style={{ marginTop: 10 }}>
            <b>Next:</b> {summary.aiNext}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="card" style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>
          {error}
        </div>
      ) : null}

      {data?.rule?.grade === "need_data" && (
        <div className="card" style={{ background: "rgba(255,255,255,0.04)" }}>
          データ不足のため分析できません（30imp以上で有効）
        </div>
      )}

      {pack ? (
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div className="h2" style={{ margin: 0 }}>実画面レビュー（AI REVIEW + PINS）</div>
              <div className="small" style={{ opacity: 0.68, marginTop: 4 }}>
                プレビュー上に改善ポイントをピン表示します。右上の「📷 ビジュアルAIレビュー」でGPT-4o Visionによるデザイン評価が可能です。
              </div>
            </div>
            {data?.used_vision && (
              <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: "rgba(99,102,241,0.18)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.35)", fontWeight: 700 }}>
                👁 GPT-4o Vision
              </span>
            )}
          </div>
          <AdminPreviewWithPins
            packs={data.packs}
            initialVariantId={pack.variantId || variantId || "na"}
            previewRef={previewRef}
          />
        </div>
      ) : loading ? (
        <div className="card">AI分析中...</div>
      ) : data ? (
        <div className="card" style={{ opacity: 0.78 }}>
          プレビューに使える pack がありません。
        </div>
      ) : null}

      <div className="card" style={{ minWidth: 0 }}>
        <div className="h2" style={{ marginTop: 0 }}>Rule / Decision</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={badgeStyle(data?.rule?.grade)}>{String(data?.rule?.grade || "-").toUpperCase()}</span>
          <div className="small" style={{ opacity: 0.7 }}>
            impressions: <b>{formatInt(summary.impressions)}</b>
          </div>
          <div className="small" style={{ opacity: 0.7 }}>
            ctr: <b>{summary.ctr}%</b>
          </div>
          <div className="small" style={{ opacity: 0.7 }}>
            closes: <b>{formatInt(summary.closes)}</b>
          </div>
          <div className="small" style={{ opacity: 0.7 }}>
            conversions: <b>{formatInt(summary.conversions)}</b>
          </div>
        </div>

        {Array.isArray(data?.rule?.reasons) && data.rule.reasons.length ? (
          <ul style={{ marginTop: 12, lineHeight: 1.8 }}>
            {data.rule.reasons.map((r: string, i: number) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        ) : (
          <div className="small" style={{ opacity: 0.72, marginTop: 10 }}>
            ルール理由はまだありません。
          </div>
        )}
      </div>

    </div>
  );
}