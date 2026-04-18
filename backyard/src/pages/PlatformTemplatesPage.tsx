import React, { useEffect, useState, useCallback } from "react";
import { opsPost } from "../firebase";

type TemplateType = "modal" | "banner" | "toast" | "launcher";

const TEMPLATE_TYPES: { id: TemplateType; label: string }[] = [
  { id: "modal", label: "モーダル" },
  { id: "banner", label: "バナー" },
  { id: "toast", label: "トースト" },
  { id: "launcher", label: "ランチャー" },
];

// ---- 初期デフォルト（バックエンドから取得できない場合のフォールバック） ----
const DEFAULT_MODAL_HTML = `<div class="cx-overlay" data-cx-close>
  <div class="cx-modal" role="dialog" aria-modal="true">
    <button class="cx-close" data-cx-close aria-label="閉じる">✕</button>
    {{#if image_url}}<img class="cx-image" src="{{image_url}}" alt="{{title}}" />{{/if}}
    <div class="cx-modal__body">
      {{#if title}}<div class="cx-title">{{title}}</div>{{/if}}
      {{#if body}}<div class="cx-body">{{body}}</div>{{/if}}
      {{#if coupon_code}}<div class="cx-coupon"><span class="cx-coupon__code">{{coupon_code}}</span><button class="cx-coupon__copy" data-cx-copy="{{coupon_code}}" type="button">コピー</button></div>{{/if}}
      {{#if cta_url}}<a class="cx-btn cx-btn--primary" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
      <button class="cx-btn cx-btn--sub" data-cx-close>{{cta_text}}</button>
    </div>
  </div>
</div>`;

const DEFAULT_MODAL_CSS = `.cx-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:16px;}
.cx-modal{position:relative;background:#fff;width:min(420px,92vw);border-radius:24px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.35);font-family:system-ui,-apple-system,Segoe UI,Roboto;}
.cx-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.06);border:none;cursor:pointer;font-size:16px;line-height:1;color:#666;display:flex;align-items:center;justify-content:center;z-index:1;transition:background .15s;}
.cx-close:hover{background:rgba(0,0,0,.12);}
.cx-image{width:100%;max-height:220px;object-fit:cover;display:block;}
.cx-modal__body{padding:24px 20px 20px;}
.cx-title{font-weight:800;font-size:20px;line-height:1.3;margin-bottom:8px;padding-right:20px;}
.cx-body{font-size:14px;line-height:1.75;color:#555;white-space:pre-wrap;margin-bottom:20px;}
.cx-coupon{display:flex;align-items:center;gap:8px;background:#f8f4ff;border:2px dashed #a78bfa;border-radius:12px;padding:12px 14px;margin-bottom:16px;}
.cx-coupon__code{flex:1;font-family:monospace;font-size:16px;font-weight:800;letter-spacing:.08em;color:#6d28d9;}
.cx-coupon__copy{flex-shrink:0;border:none;border-radius:8px;padding:6px 14px;background:#6d28d9;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:opacity .15s;}
.cx-coupon__copy:hover{opacity:.82;}
.cx-coupon__copy[data-cx-copied]{background:#10b981;}
.cx-btn{display:block;width:100%;border:none;border-radius:14px;padding:14px;font-weight:700;font-size:15px;cursor:pointer;text-decoration:none;text-align:center;box-sizing:border-box;transition:opacity .15s;}
.cx-btn+.cx-btn{margin-top:8px;}
.cx-btn--primary{background:#111;color:#fff;}
.cx-btn--primary:hover{opacity:.82;}
.cx-btn--sub{background:#f1f5f9;color:#666;}
.cx-btn--sub:hover{background:#e8ecf0;}`;

const DEFAULT_BANNER_HTML = `<div class="cx-banner">
  {{#if image_url}}<img class="cx-banner__image" src="{{image_url}}" alt="{{title}}" />{{/if}}
  <div class="cx-banner__inner">
    <div class="cx-banner__content">
      <div class="cx-banner__title">{{title}}</div>
      {{#if body}}<div class="cx-banner__body">{{body}}</div>{{/if}}
    </div>
    <div class="cx-banner__actions">
      {{#if cta_url}}<a class="cx-btn cx-btn--primary" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
      <button class="cx-close" data-cx-close aria-label="閉じる">✕</button>
    </div>
  </div>
</div>`;

const DEFAULT_BANNER_CSS = `.cx-banner{position:fixed;left:12px;right:12px;bottom:12px;background:#111;color:#fff;border-radius:18px;z-index:2147483646;box-shadow:0 20px 48px rgba(0,0,0,.3);overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto;}
.cx-banner__image{width:100%;max-height:130px;object-fit:cover;display:block;}
.cx-banner__inner{display:flex;gap:12px;align-items:center;padding:16px;}
.cx-banner__content{flex:1;min-width:0;}
.cx-banner__title{font-weight:700;font-size:15px;line-height:1.3;}
.cx-banner__body{font-size:12px;opacity:.75;margin-top:4px;line-height:1.5;}
.cx-banner__actions{display:flex;gap:8px;align-items:center;flex-shrink:0;}
.cx-btn{border:none;border-radius:10px;padding:10px 16px;font-weight:700;font-size:13px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;transition:opacity .15s;}
.cx-btn--primary{background:#fff;color:#111;}
.cx-btn--primary:hover{opacity:.88;}
.cx-close{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.1);border:none;cursor:pointer;font-size:15px;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s;}
.cx-close:hover{background:rgba(255,255,255,.2);}`;

const DEFAULT_TOAST_HTML = `<div class="cx-toast">
  <button class="cx-close" data-cx-close aria-label="閉じる">✕</button>
  {{#if title}}<div class="cx-toast__title">{{title}}</div>{{/if}}
  {{#if body}}<div class="cx-toast__body">{{body}}</div>{{/if}}
  {{#if cta_url}}<a class="cx-btn" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
</div>`;

const DEFAULT_TOAST_CSS = `.cx-toast{position:fixed;right:16px;bottom:16px;max-width:min(300px,92vw);background:#111;color:#fff;border-radius:16px;z-index:2147483646;box-shadow:0 16px 40px rgba(0,0,0,.28);padding:16px 16px 14px;font-family:system-ui,-apple-system,Segoe UI,Roboto;animation:cx-slide-in .25s ease;}
@keyframes cx-slide-in{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
.cx-close{position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.1);border:none;cursor:pointer;font-size:12px;color:#fff;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.cx-close:hover{background:rgba(255,255,255,.2);}
.cx-toast__title{font-weight:800;font-size:14px;line-height:1.3;padding-right:20px;margin-bottom:6px;}
.cx-toast__body{font-size:13px;opacity:.8;line-height:1.5;white-space:pre-wrap;margin-bottom:12px;}
.cx-btn{display:block;width:100%;border:none;border-radius:10px;padding:9px;font-weight:700;font-size:13px;cursor:pointer;text-decoration:none;text-align:center;background:rgba(255,255,255,.14);color:#fff;box-sizing:border-box;transition:background .15s;}
.cx-btn:hover{background:rgba(255,255,255,.22);}`;

const DEFAULT_LAUNCHER_HTML = `<button class="cx-launcher-btn" data-cx-launcher-open aria-label="{{cta_text}}">
  {{#if launcher_image_url}}
  <img class="cx-launcher-btn__img" src="{{launcher_image_url}}" alt="" />
  {{/if}}
  {{#if cta_text}}<span class="cx-launcher-btn__label">{{cta_text}}</span>{{/if}}
</button>`;

const DEFAULT_LAUNCHER_CSS = `.cx-launcher-btn{display:flex;align-items:center;gap:10px;background:#111;color:#fff;border:none;border-radius:50px;padding:10px 20px 10px 10px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.3);font-family:system-ui,-apple-system,Segoe UI,Roboto;white-space:nowrap;transition:transform .15s,box-shadow .15s;}
.cx-launcher-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.35);}
.cx-launcher-btn:active{transform:translateY(0);}
.cx-launcher-btn__img{width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;}
.cx-launcher-btn__label{line-height:1;}`;

const DEFAULTS: Record<TemplateType, { html: string; css: string }> = {
  modal: { html: DEFAULT_MODAL_HTML, css: DEFAULT_MODAL_CSS },
  banner: { html: DEFAULT_BANNER_HTML, css: DEFAULT_BANNER_CSS },
  toast: { html: DEFAULT_TOAST_HTML, css: DEFAULT_TOAST_CSS },
  launcher: { html: DEFAULT_LAUNCHER_HTML, css: DEFAULT_LAUNCHER_CSS },
};

// Very small template renderer for preview
function renderMini(tpl: string, data: Record<string, string>): string {
  let out = tpl;
  out = out.replace(/\{\{#if\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, inner) =>
    data[key] ? inner : ""
  );
  out = out.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => data[key] ?? "");
  return out;
}

function buildPreviewDoc(html: string, css: string): string {
  const sampleData = {
    title: "プレビュー表示",
    body: "これが標準テンプレートのプレビューです🔥",
    image_url: "",
    cta_text: "閉じる",
    cta_url: "",
    cta_url_text: "詳細を見る",
    coupon_code: "SAMPLE10",
    launcher_image_url: "",
  };
  const body = renderMini(html, sampleData);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<style>
html,body{margin:0;padding:0;background:#0b0b0b;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto;}
.cx-overlay{position:relative!important;inset:auto!important;min-height:360px;}
.cx-modal{margin:24px auto;}
.cx-banner,.cx-toast{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;top:auto!important;margin:24px auto;max-width:min(520px,92vw);}
.cx-launcher-btn{display:inline-flex!important;margin:40px auto;}
</style>
<style>${css}</style>
</head>
<body>${body}</body>
</html>`;
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 1100, margin: "0 auto" },
  title: { fontWeight: 800, fontSize: 22, marginBottom: 4 },
  subtitle: { opacity: 0.5, fontSize: 13, marginBottom: 24 },
  tabs: { display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,.1)", marginBottom: 28 },
  tab: { padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600, borderBottom: "2px solid transparent", transition: "all .15s" },
  tabActive: { borderBottom: "2px solid #3b82f6", color: "#fff" },
  tabInactive: { color: "rgba(255,255,255,.45)" },
  body: { display: "flex", gap: 24, alignItems: "flex-start" },
  editors: { flex: 1, display: "flex", flexDirection: "column", gap: 16 },
  editorBox: { background: "rgba(255,255,255,.04)", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" },
  editorLabel: { padding: "8px 14px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", opacity: 0.5, borderBottom: "1px solid rgba(255,255,255,.06)", userSelect: "none" },
  textarea: { width: "100%", minHeight: 200, background: "transparent", border: "none", color: "#e2e8f0", fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, padding: 14, boxSizing: "border-box", resize: "vertical", outline: "none" },
  preview: { flex: 1, position: "sticky", top: 20, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", background: "#0b0b0b" },
  actions: { display: "flex", gap: 10, marginTop: 16 },
  btn: { padding: "10px 22px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer" },
  btnPrimary: { background: "#2563eb", color: "#fff" },
  btnGhost: { background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.12)" },
  msg: { fontSize: 13, marginTop: 8, padding: "6px 12px", borderRadius: 8 },
  msgOk: { background: "rgba(16,185,129,.15)", color: "#34d399" },
  msgErr: { background: "rgba(239,68,68,.12)", color: "#f87171" },
};

export default function PlatformTemplatesPage() {
  const [activeType, setActiveType] = useState<TemplateType>("modal");
  const [templates, setTemplates] = useState<Record<TemplateType, { html: string; css: string }>>({
    modal: { ...DEFAULTS.modal },
    banner: { ...DEFAULTS.banner },
    toast: { ...DEFAULTS.toast },
    launcher: { ...DEFAULTS.launcher },
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load platform templates from backend
  useEffect(() => {
    (async () => {
      try {
        const res = await opsPost<{ ok: boolean; platform_templates: any }>("/v1/ops/platform-templates/get");
        if (res.ok && res.platform_templates) {
          const pt = res.platform_templates;
          setTemplates((prev) => {
            const next = { ...prev };
            for (const t of ["modal", "banner", "toast", "launcher"] as TemplateType[]) {
              if (pt[t]?.html || pt[t]?.css) {
                next[t] = {
                  html: pt[t].html ?? prev[t].html,
                  css: pt[t].css ?? prev[t].css,
                };
              }
            }
            return next;
          });
        }
      } catch (e) {
        // ignore; use defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const current = templates[activeType];

  const setHtml = useCallback((html: string) => {
    setTemplates((prev) => ({ ...prev, [activeType]: { ...prev[activeType], html } }));
  }, [activeType]);

  const setCss = useCallback((css: string) => {
    setTemplates((prev) => ({ ...prev, [activeType]: { ...prev[activeType], css } }));
  }, [activeType]);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await opsPost("/v1/ops/platform-templates/upsert", {
        type: activeType,
        html: current.html,
        css: current.css,
      });
      setMsg({ text: "保存しました", ok: true });
    } catch (e: any) {
      setMsg({ text: e?.message || "保存に失敗しました", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTemplates((prev) => ({ ...prev, [activeType]: { ...DEFAULTS[activeType] } }));
    setMsg(null);
  };

  const previewSrc = buildPreviewDoc(current.html, current.css);

  return (
    <div style={s.container}>
      <div style={s.title}>標準テンプレート管理</div>
      <div style={s.subtitle}>全ワークスペースに適用されるデフォルトのHTMLテンプレートを編集できます</div>

      {/* Type tabs */}
      <div style={s.tabs}>
        {TEMPLATE_TYPES.map(({ id, label }) => (
          <button
            key={id}
            style={{ ...s.tab, ...(activeType === id ? s.tabActive : s.tabInactive) }}
            onClick={() => { setActiveType(id); setMsg(null); }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ opacity: 0.5, fontSize: 14 }}>読み込み中...</div>
      ) : (
        <div style={s.body}>
          {/* Editors */}
          <div style={s.editors}>
            <div style={s.editorBox}>
              <div style={s.editorLabel}>HTML</div>
              <textarea
                style={s.textarea}
                value={current.html}
                onChange={(e) => setHtml(e.target.value)}
                spellCheck={false}
              />
            </div>
            <div style={s.editorBox}>
              <div style={s.editorLabel}>CSS</div>
              <textarea
                style={{ ...s.textarea, minHeight: 160 }}
                value={current.css}
                onChange={(e) => setCss(e.target.value)}
                spellCheck={false}
              />
            </div>

            <div style={s.actions}>
              <button
                style={{ ...s.btn, ...s.btnPrimary, opacity: saving ? 0.6 : 1 }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "保存中..." : "保存"}
              </button>
              <button style={{ ...s.btn, ...s.btnGhost }} onClick={handleReset}>
                デフォルトに戻す
              </button>
            </div>
            {msg && (
              <div style={{ ...s.msg, ...(msg.ok ? s.msgOk : s.msgErr) }}>{msg.text}</div>
            )}
          </div>

          {/* Preview */}
          <div style={s.preview}>
            <div style={{ padding: "8px 14px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", opacity: 0.45, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
              プレビュー
            </div>
            <iframe
              srcDoc={previewSrc}
              style={{ width: "100%", height: 480, border: "none", display: "block" }}
              title="template preview"
              sandbox="allow-scripts"
            />
          </div>
        </div>
      )}
    </div>
  );
}
