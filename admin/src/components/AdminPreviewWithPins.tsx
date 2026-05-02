import React, { useEffect, useMemo, useRef, useState } from "react";

type Action = {
  action_id: string;
  type: "modal" | "banner" | "toast";
  creative: {
    title?: string;
    body?: string;
    cta_text?: string;
    cta_url?: string;
    image_url?: string;
    [key: string]: string | undefined;
  };
  templateHtml?: string | null;
  templateCss?: string | null;
  mount?: { selector?: string }; // Phase2では基本使わない
};

type Highlight = {
  action_id: string;
  label: string;      // 短い見出し
  reason: string;     // 理由
  severity: "info" | "warn" | "bad";
};

type VariantPack = {
  variantId: string;           // "v1" | "v2" | ...
  actions: Action[];
  highlights: Highlight[];     // AI結果（最大3くらい）
  metrics?: { impressions: number; clicks: number; ctr: number };
};

/** テンプレートHTMLにcreativeフィールドを埋め込んでsrcdocを生成 */
function buildTemplateSrcdoc(html: string, css: string, creative: Record<string, string | undefined>): string {
  // {{#if field}}...{{/if}} 条件ブロックを処理
  let result = html.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_: string, key: string, inner: string) => {
    return creative[key] ? inner : "";
  });
  // {{variable}} プレースホルダーを置換
  result = result.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
    const val = creative[key];
    return val != null ? val : "";
  });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:transparent;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
${css}
</style></head><body>${result}</body></html>`;
}

/** iframeでテンプレートHTMLを描画し、コンテンツ高さに自動リサイズ */
function TemplateRenderer({ html, css, creative }: {
  html: string;
  css: string;
  creative: Record<string, string | undefined>;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(180);
  const srcdoc = buildTemplateSrcdoc(html, css, creative);

  const handleLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc?.body) {
        const h = doc.body.scrollHeight || doc.documentElement.scrollHeight;
        if (h > 0) setHeight(h + 16);
      }
    } catch { /* cross-origin: ignore */ }
  };

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      style={{ width: "100%", height, border: "none", display: "block", background: "transparent" }}
      sandbox="allow-same-origin"
      onLoad={handleLoad}
      scrolling="no"
      title="template-preview"
    />
  );
}

function severityColor(s: Highlight["severity"]) {
  if (s === "bad") return "#ef4444";
  if (s === "warn") return "#f59e0b";
  return "#3b82f6";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** ======== Action Renderer（直描画）======== */
function ActionCard({ action, innerRef }: { action: Action; innerRef?: (el: HTMLDivElement | null) => void }) {
  const c = action.creative || {};
  const hasTemplate = Boolean(action.templateHtml);

  return (
    <div
      ref={innerRef}
      data-action-id={action.action_id}
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        overflow: "hidden",
        background: hasTemplate ? "transparent" : "rgba(255,255,255,0.04)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        marginBottom: 12,
      }}
    >
      {/* アクション種別バッジ */}
      <div style={{ padding: "6px 12px", fontSize: 11, opacity: 0.6, background: "rgba(0,0,0,0.2)", display: "flex", gap: 8 }}>
        <span>{action.type}</span>
        <b>{action.action_id}</b>
        {hasTemplate && <span style={{ color: "#a5b4fc" }}>カスタムテンプレート</span>}
      </div>

      {hasTemplate ? (
        /* カスタムテンプレートをiframeで描画 */
        <TemplateRenderer
          html={action.templateHtml!}
          css={action.templateCss || ""}
          creative={c as Record<string, string | undefined>}
        />
      ) : (
        /* テンプレートなし: フォールバック表示 */
        <div style={{ padding: 14 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {c.image_url ? (
              <img
                src={c.image_url}
                alt=""
                style={{
                  width: 72,
                  height: 72,
                  objectFit: "cover",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  flex: "0 0 auto",
                }}
              />
            ) : (
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px dashed rgba(255,255,255,0.15)",
                  display: "grid",
                  placeItems: "center",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 12,
                  flex: "0 0 auto",
                }}
              >
                no img
              </div>
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, lineHeight: 1.25 }}>
                {c.title || "（タイトル未設定）"}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5, marginBottom: 10, whiteSpace: "pre-wrap" }}>
                {c.body || "（本文未設定）"}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.08)",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                  onClick={() => window.open(c.cta_url || "#", "_blank")}
                >
                  {c.cta_text || "OK"}
                </button>
                <span style={{ fontSize: 12, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.cta_url || "（URL未設定）"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** ======== Main ======== */
export default function AdminPreviewWithPins({
  packs,
  initialVariantId,
  previewRef,
}: {
  packs: VariantPack[];
  initialVariantId?: string;
  previewRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [variantId, setVariantId] = useState(initialVariantId || packs?.[0]?.variantId || "v1");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const pack = useMemo(() => packs.find((p) => p.variantId === variantId) || packs[0], [packs, variantId]);

  // preview root (relative container)
  const previewRootRef = useRef<HTMLDivElement | null>(null);

  // actionId -> element
  const actionElsRef = useRef<Record<string, HTMLDivElement | null>>({});

  // computed pin positions
  const [pins, setPins] = useState<Array<{ action_id: string; top: number; left: number; w: number; h: number }>>([]);

  // recompute positions
  const recompute = () => {
    const root = previewRootRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();

    const next: Array<{ action_id: string; top: number; left: number; w: number; h: number }> = [];
    for (const h of pack.highlights || []) {
      const el = actionElsRef.current[h.action_id];
      if (!el) continue;
      const r = el.getBoundingClientRect();

      // relative to root
      const top = r.top - rootRect.top + root.scrollTop;
      const left = r.left - rootRect.left + root.scrollLeft;
      next.push({
        action_id: h.action_id,
        top,
        left,
        w: r.width,
        h: r.height,
      });
    }
    setPins(next);
  };

  // recompute when variant/highlights change
  useEffect(() => {
    // wait a tick for DOM paint
    const id = window.setTimeout(recompute, 50);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantId, pack?.actions?.length, pack?.highlights?.length]);

  // recompute on resize
  useEffect(() => {
    const onResize = () => recompute();
    window.addEventListener("resize", onResize);

    const root = previewRootRef.current;
    const onScroll = () => recompute();
    root?.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      root?.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantId]);

  const highlights = pack.highlights || [];

  const selectAction = (action_id: string) => {
    setSelectedActionId(action_id);
    const root = previewRootRef.current;
    const el = actionElsRef.current[action_id];
    if (root && el) {
      // scroll into view inside preview
      const rootRect = root.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const dy = (r.top - rootRect.top) + root.scrollTop - 24;
      root.scrollTo({ top: dy, behavior: "smooth" });
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 0.8fr",
        gap: 14,
        alignItems: "stretch",
      }}
    >
      {/* Left: Preview */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.35)",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <div
          style={{
            padding: 12,
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 800 }}>Preview</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>React直描画（Phase2）</div>
          </div>

          {/* Variant */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Variant</span>
            <select
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {packs.map((p) => (
                <option key={p.variantId} value={p.variantId} style={{ color: "black" }}>
                  {p.variantId}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          ref={(el) => {
            (previewRootRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            if (previewRef) (previewRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }}
          style={{
            position: "relative",
            height: 640,
            overflow: "auto",
            padding: 14,
            minWidth: 0,
          }}
        >
          {/* Pins overlay */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {pins.map((p) => {
              const idx = highlights.findIndex((h) => h.action_id === p.action_id);
              const h = highlights[idx];
              const color = h ? severityColor(h.severity) : "#60a5fa";

              const pad = 6;
              return (
                <React.Fragment key={p.action_id}>
                  {/* highlight border */}
                  <div
                    style={{
                      position: "absolute",
                      top: p.top - pad,
                      left: p.left - pad,
                      width: p.w + pad * 2,
                      height: p.h + pad * 2,
                      borderRadius: 14,
                      border: `2px solid ${color}`,
                      boxShadow: `0 0 0 6px rgba(0,0,0,0.25)`,
                      pointerEvents: "none",
                    }}
                  />
                  {/* pin */}
                  <div
                    style={{
                      position: "absolute",
                      top: p.top - 12,
                      left: p.left - 12,
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background: color,
                      color: "white",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                      fontSize: 13,
                      border: "2px solid rgba(0,0,0,0.35)",
                      boxShadow: "0 10px 20px rgba(0,0,0,0.35)",
                      pointerEvents: "none",
                    }}
                  >
                    {idx >= 0 ? idx + 1 : "!"}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* actual actions */}
          {pack.actions.map((a) => (
            <ActionCard
              key={a.action_id}
              action={a}
              innerRef={(el) => {
                actionElsRef.current[a.action_id] = el;
              }}
            />
          ))}

          <div style={{ height: 40 }} />
        </div>
      </div>

      {/* Right: AI + Metrics */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.35)",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 800 }}>AI コメント</div>
          {pack.metrics ? (
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              imp <b>{pack.metrics.impressions}</b> / clk <b>{pack.metrics.clicks}</b> / ctr <b>{pack.metrics.ctr}%</b>
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.6 }}>metrics: -</div>
          )}
        </div>

        <div style={{ padding: 12 }}>
          {!highlights.length ? (
            <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.6 }}>
              まだハイライトがありません。<br />
              「AI分析を生成」したらここに出す想定。
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {highlights.map((h, i) => {
                const color = severityColor(h.severity);
                const active = selectedActionId === h.action_id;
                return (
                  <button
                    key={h.action_id}
                    type="button"
                    onClick={() => selectAction(h.action_id)}
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderRadius: 14,
                      border: active ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.12)",
                      background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 900 }}>
                        <span
                          style={{
                            display: "inline-grid",
                            placeItems: "center",
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            background: color,
                            marginRight: 8,
                            fontSize: 12,
                          }}
                        >
                          {i + 1}
                        </span>
                        {h.label}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{h.action_id}</div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
                      {h.reason}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ height: 14 }} />

          <div style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.6 }}>
            ✅ Phase2の設計：AIは <b>action_id</b> を返すだけ。<br />
            selectorは使わないので壊れにくい。
          </div>
        </div>
      </div>
    </div>
  );
}