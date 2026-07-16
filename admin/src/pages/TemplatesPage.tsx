import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, setDoc, deleteDoc, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, assertPlanLimit } from '../firebase';
import { usePlanLimit } from '../hooks/usePlanLimit';
import { genId } from '../components/id';
import { useBeforeUnload } from '../hooks/useBeforeUnload';
import { CodeEditor } from '../components/CodeEditor';
import RightDrawer from '../components/RightDrawer';
import StickySaveBar from '../components/StickySaveBar';

function workspaceKeyForUid(uid?: string | null) {
  return uid ? `cx_admin_workspace_id:${uid}` : 'cx_admin_workspace_id';
}
function readSelectedWorkspaceId(uid?: string | null) {
  return (
    window.localStorage.getItem(workspaceKeyForUid(uid)) ||
    window.localStorage.getItem('cx_admin_workspace_id') ||
    window.localStorage.getItem('selectedWorkspaceId') ||
    ''
  );
}

const LS_SITE_KEY = 'cx_admin_site_id';
function readSelectedSiteId(): string {
  try { return localStorage.getItem(LS_SITE_KEY) || ''; } catch { return ''; }
}
function writeSelectedSiteId(siteId: string) {
  try {
    localStorage.setItem(LS_SITE_KEY, siteId);
    window.dispatchEvent(new CustomEvent('cx_admin_site_changed', { detail: { siteId } }));
  } catch { /* ignore */ }
}

type SiteRow = { id: string; data?: { name?: string; workspaceId?: string } };

function siteLabel(site: SiteRow | undefined) {
  if (!site) return '';
  return String(site.data?.name || site.id || '');
}

type TemplateDoc = {
  workspaceId: string;
  siteId?: string;
  type: 'modal' | 'banner' | 'toast' | 'launcher' | 'question';
  name: string;
  html: string;
  css: string;
  js?: string;
};

type SampleData = {
  title: string;
  body: string;
  image_url: string;
  cta_text: string;
  cta_url: string;
  cta_url_text: string;
  coupon_code: string;
  // 質問接客(question)用のサンプル
  q_title: string;        // 質問文
  q_submit_label: string; // 送信ボタンのCTA文言
  q_choices: string;      // 選択肢（改行区切り）
};

// プレビュー用のサンプル画像。以前は Unsplash の外部URLを使っていたがリンク切れ(404)したため、
// 外部依存をなくして内蔵SVG(data URI)にした。オフラインでも壊れず、404にならない。
const SAMPLE_IMAGE_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="480" viewBox="0 0 1200 480">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="#6366f1"/><stop offset="0.55" stop-color="#3b82f6"/><stop offset="1" stop-color="#22d3ee"/>` +
      `</linearGradient></defs>` +
      `<rect width="1200" height="480" fill="url(#g)"/>` +
      `<circle cx="1050" cy="90" r="130" fill="rgba(255,255,255,0.10)"/>` +
      `<circle cx="140" cy="410" r="170" fill="rgba(255,255,255,0.08)"/>` +
      `<text x="600" y="232" font-family="system-ui,-apple-system,'Segoe UI',sans-serif" font-size="48" font-weight="700" fill="#ffffff" text-anchor="middle">サンプル画像</text>` +
      `<text x="600" y="286" font-family="system-ui,-apple-system,'Segoe UI',sans-serif" font-size="22" fill="rgba(255,255,255,0.85)" text-anchor="middle">プレビュー用のダミー画像です</text>` +
    `</svg>`
  );

function renderMiniTemplate(tpl: string, data: Record<string, any>): string {
  // Phase-1: very small "mustache-like" renderer
  // - {{key}}
  // - {{#if key}} ... {{/if}}
  const s = String(tpl || '');
  const ifRe = /\{\{#if\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g;
  const withIf = s.replace(ifRe, (_m, key, inner) => {
    const v = data[key];
    return v ? inner : '';
  });
  const varRe = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  return withIf.replace(varRe, (_m, key) => {
    const v = data[key];
    return v == null ? '' : String(v);
  });
}

function buildPreviewSrcDoc(opts: { html: string; css: string; js?: string; data: Record<string, any>; choices?: string[] }): string {
  const body = renderMiniTemplate(opts.html, opts.data);
  // 質問接客: 本番はSDKが [data-cx-choices] に選択肢ボタンを差し込むため、
  // プレビューでも同じ形（data-cx-choice / 選択で data-selected）で再現する。
  const choicesScript = (opts.choices && opts.choices.length)
    ? `<script>
(function(){
  var box = document.querySelector('[data-cx-choices]');
  if (!box) return;
  var items = ${JSON.stringify(opts.choices)};
  items.forEach(function(label){
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('data-cx-choice', label);
    b.addEventListener('click', function(){
      if (b.hasAttribute('data-selected')) b.removeAttribute('data-selected');
      else b.setAttribute('data-selected','1');
    });
    box.appendChild(b);
  });
})();
<\/script>`
    : '';
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html,body{margin:0;padding:0;background:#0b0b0b;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto;}
      /* make fixed templates visible inside iframe */
      .cx-overlay{position:relative !important;inset:auto !important;min-height:360px;}
      .cx-modal{margin:24px auto;}
      .cx-banner,.cx-toast{position:relative !important;left:auto !important;right:auto !important;bottom:auto !important;top:auto !important;margin:24px auto;max-width:min(520px,92vw);}
      .cx-launcher-btn{display:inline-flex !important;margin:40px auto;}
      /* 質問接客カード: 本番は画面下部中央のフローティング。iframe内では中央に置いて見せる */
      .cxq{margin:24px auto;}
    </style>
    <style>${opts.css || ''}</style>
  </head>
  <body>
    ${body}
    ${choicesScript}
    ${opts.js ? `<script>\ndocument.addEventListener('DOMContentLoaded', function() {\n${opts.js}\n});\n<\/script>` : ''}
  </body>
</html>`;
}

function workspaceLabel(workspaces: Array<{ id: string; data?: { name?: string } }>, workspaceId: string) {
  const hit = workspaces.find((w) => w.id === workspaceId);
  return String(hit?.data?.name || hit?.id || workspaceId || '');
}

const DEFAULTS: Record<TemplateDoc['type'], { html: string; css: string }> = {
  launcher: {
    html: `
<button class="cx-launcher-btn" data-cx-launcher-open aria-label="{{cta_text}}">
  {{#if launcher_image_url}}
  <img class="cx-launcher-btn__img" src="{{launcher_image_url}}" alt="" />
  {{/if}}
  {{#if cta_text}}<span class="cx-launcher-btn__label">{{cta_text}}</span>{{/if}}
</button>
`.trim(),
    css: `
.cx-launcher-btn{display:flex;align-items:center;gap:10px;background:#111;color:#fff;border:none;border-radius:50px;padding:10px 20px 10px 10px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.3);font-family:system-ui,-apple-system,Segoe UI,Roboto;white-space:nowrap;transition:transform .15s,box-shadow .15s;}
.cx-launcher-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.35);}
.cx-launcher-btn:active{transform:translateY(0);}
.cx-launcher-btn__img{width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;}
.cx-launcher-btn__label{line-height:1;}
`.trim(),
  },
  modal: {
    html: `
<div class="cx-overlay" data-cx-close>
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
</div>
`.trim(),
    css: `
.cx-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:16px;}
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
.cx-btn--sub:hover{background:#e8ecf0;}
`.trim(),
  },
  banner: {
    html: `
<div class="cx-banner">
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
</div>
`.trim(),
    css: `
.cx-banner{position:fixed;left:12px;right:12px;bottom:12px;background:#111;color:#fff;border-radius:18px;z-index:2147483646;box-shadow:0 20px 48px rgba(0,0,0,.3);overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto;}
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
.cx-close:hover{background:rgba(255,255,255,.2);}
`.trim(),
  },
  toast: {
    html: `
<div class="cx-toast">
  <button class="cx-close" data-cx-close aria-label="閉じる">✕</button>
  {{#if title}}<div class="cx-toast__title">{{title}}</div>{{/if}}
  {{#if body}}<div class="cx-toast__body">{{body}}</div>{{/if}}
  {{#if cta_url}}<a class="cx-btn" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
</div>
`.trim(),
    css: `
.cx-toast{position:fixed;right:16px;bottom:16px;max-width:min(300px,92vw);background:#111;color:#fff;border-radius:16px;z-index:2147483646;box-shadow:0 16px 40px rgba(0,0,0,.28);padding:16px 16px 14px;font-family:system-ui,-apple-system,Segoe UI,Roboto;animation:cx-slide-in .25s ease;}
@keyframes cx-slide-in{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
.cx-close{position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.1);border:none;cursor:pointer;font-size:12px;color:#fff;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.cx-close:hover{background:rgba(255,255,255,.2);}
.cx-toast__title{font-weight:800;font-size:14px;line-height:1.3;padding-right:20px;margin-bottom:6px;}
.cx-toast__body{font-size:13px;opacity:.8;line-height:1.5;white-space:pre-wrap;margin-bottom:12px;}
.cx-btn{display:block;width:100%;border:none;border-radius:10px;padding:9px;font-weight:700;font-size:13px;cursor:pointer;text-decoration:none;text-align:center;background:rgba(255,255,255,.14);color:#fff;box-sizing:border-box;transition:background .15s;}
.cx-btn:hover{background:rgba(255,255,255,.22);}
`.trim(),
  },
  question: {
    html: `
<div class="cxq">
  {{#if header_image_url}}<img class="cxq__img" src="{{header_image_url}}" alt="" />{{/if}}
  <button class="cxq__close" data-cx-close aria-label="閉じる">✕</button>
  <div class="cxq__body">
    <div class="cxq__title">{{title}}</div>
    <div class="cxq__choices" data-cx-choices></div>
    <button class="cxq__submit" data-cx-submit>{{submit_label}}</button>
    <!-- 回答後のお礼。SDKが自動で表示・文言差し込みします（既定は非表示） -->
    <div class="cxq__thanks" data-cx-thanks>
      <div class="cxq__thanks-msg" data-cx-thanks-message></div>
      <a class="cxq__thanks-cta" data-cx-thanks-cta href="#" target="_blank" rel="noopener"></a>
    </div>
  </div>
</div>
`.trim(),
    css: `
.cxq{position:relative;max-width:420px;width:100%;background:#ffffff;color:#1e293b;border-radius:18px;overflow:hidden;box-shadow:0 14px 44px rgba(0,0,0,.22);font-family:system-ui,-apple-system,Segoe UI,Roboto;}
.cxq__img{width:100%;display:block;max-height:150px;object-fit:cover;}
.cxq__close{position:absolute;top:10px;right:10px;width:28px;height:28px;border:none;border-radius:50%;background:rgba(0,0,0,.35);color:#fff;cursor:pointer;font-size:13px;}
.cxq__body{padding:16px 18px 18px;}
.cxq__title{font-weight:800;font-size:16px;line-height:1.5;margin-bottom:12px;}
.cxq__choices{display:flex;flex-direction:column;gap:8px;}
.cxq__choices [data-cx-choice]{text-align:left;padding:11px 14px;border-radius:12px;border:1.5px solid rgba(15,23,42,.14);background:#fff;color:#1e293b;cursor:pointer;font-size:14px;transition:all .12s;}
.cxq__choices [data-cx-choice]:hover{border-color:#6366f1;}
.cxq__choices [data-cx-choice][data-selected]{border-color:#6366f1;background:rgba(99,102,241,.08);font-weight:700;}
.cxq__submit{margin-top:12px;width:100%;padding:12px;border:none;border-radius:12px;background:#6366f1;color:#fff;font-weight:800;font-size:14px;cursor:pointer;}
.cxq__thanks{display:none;text-align:center;padding:6px 0 2px;}
.cxq__thanks-msg{font-weight:700;font-size:15px;line-height:1.6;}
.cxq__thanks-cta{display:inline-block;margin-top:12px;padding:10px 18px;border-radius:10px;background:#6366f1;color:#fff;font-weight:700;font-size:14px;text-decoration:none;}
`.trim(),
  },
};

export default function TemplatesPage() {
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; data?: { name?: string } }>>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [rows, setRows] = useState<Array<{ id: string; data: TemplateDoc }>>([]);

  const [id, setId] = useState(() => genId('tpl'));
  const [workspaceId, setWorkspaceId] = useState('');
  const [siteId, setSiteId] = useState(() => readSelectedSiteId());
  const templateLimit = usePlanLimit(workspaceId, "templates");
  const [type, setType] = useState<TemplateDoc['type']>('modal');
  const [codeTab, setCodeTab] = useState<'html' | 'css' | 'js'>('html');
  const [codeFullscreen, setCodeFullscreen] = useState(false);
  const [name, setName] = useState('Default');
  const [html, setHtml] = useState(DEFAULTS.modal.html);
  const [css, setCss] = useState(DEFAULTS.modal.css);
  const [js, setJs] = useState('');

  const selectedWorkspaceName = useMemo(() => workspaceLabel(workspaces, workspaceId), [workspaces, workspaceId]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [savedPayloadStr, setSavedPayloadStr] = useState<string | null>(null);
  const [templateListTab, setTemplateListTab] = useState<'active' | 'archived'>('active');

  const [sample, setSample] = useState<SampleData>({
    title: 'テスト表示',
    body: 'これが出れば成功🔥\n（テンプレートのプレビュー）',
    image_url: SAMPLE_IMAGE_DATA_URI,
    cta_text: 'OK',
    cta_url: '',
    cta_url_text: '詳細を見る',
    coupon_code: '',
    // 質問接客のサンプル（プレビューで実際の見え方を確認するため）
    q_title: '日焼け止めを選ぶ際、一番気になることは？',
    q_submit_label: 'この内容で回答する',
    q_choices: '白浮き\nベタつき\n成分\n紫外線防止効果\n価格',
  });

  // 認証ユーザー取得
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setCurrentUid(u?.uid ?? null));
  }, []);

  // localStorageからワークスペースIDを自動取得
  useEffect(() => {
    setWorkspaceId(readSelectedWorkspaceId(currentUid));
    const handler = (e: Event) => {
      const next = (e as CustomEvent)?.detail?.workspaceId;
      if (next) setWorkspaceId(next);
    };
    window.addEventListener('cx_admin_workspace_changed', handler);
    return () => window.removeEventListener('cx_admin_workspace_changed', handler);
  }, [currentUid]);

  // サイト一覧をリアルタイム取得（自ワークスペースのみ。全件取得はルールで不可）
  useEffect(() => {
    if (!workspaceId) { setSites([]); return; }
    const q = query(collection(db, 'sites'), where('workspaceId', '==', workspaceId));
    return onSnapshot(q, (snap) => {
      setSites(snap.docs.map((d) => ({ id: d.id, data: d.data() as SiteRow['data'] })));
    });
  }, [workspaceId]);

  // ワークスペースに紐づくサイト一覧
  const visibleSites = useMemo(() => {
    if (!workspaceId) return sites;
    return sites.filter((s) => String(s.data?.workspaceId || '') === String(workspaceId));
  }, [sites, workspaceId]);

  const selectedSite = useMemo(() => visibleSites.find((s) => s.id === siteId), [visibleSites, siteId]);
  const selectedSiteName = useMemo(() => siteLabel(selectedSite), [selectedSite]);

  // サイト選択が無効になった場合、最初のサイトへ自動切替
  useEffect(() => {
    if (!visibleSites.length) { setSiteId(''); return; }
    const exists = siteId && visibleSites.some((s) => s.id === siteId);
    if (!exists) {
      const nextSiteId = visibleSites[0]?.id || '';
      setSiteId(nextSiteId);
      if (nextSiteId) writeSelectedSiteId(nextSiteId);
    }
  }, [visibleSites, siteId]);

  // サイト変更イベントを受け取る
  useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent)?.detail?.siteId;
      if (next) setSiteId(next);
    };
    window.addEventListener('cx_admin_site_changed', handler);
    return () => window.removeEventListener('cx_admin_site_changed', handler);
  }, []);

  // テンプレート一覧をリアルタイム取得（ワークスペース単位で取得し、サイトはメモリフィルタ）
  useEffect(() => {
    if (!workspaceId) { setRows([]); return; }
    const q = query(
      collection(db, 'templates'),
      where('workspaceId', '==', workspaceId),
    );
    return onSnapshot(q,
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, data: d.data() as TemplateDoc })));
      },
      (err) => console.error('[TemplatesPage] onSnapshot error:', err),
    );
  }, [workspaceId]);

  // サイトでフィルタリングされた表示用テンプレート
  // siteId未設定の既存テンプレートはどのサイトでも表示する（後方互換）
  const filteredRows = useMemo(() => {
    if (!siteId) return rows;
    return rows.filter((r) => !r.data.siteId || r.data.siteId === siteId);
  }, [rows, siteId]);

  // タイプ変更で自動適用すべきデフォルトかを判定するヘルパー
  // いずれかのタイプのデフォルト値と完全一致する場合のみデフォルト適用対象とみなす
  const ALL_DEFAULT_CSS = Object.values(DEFAULTS).map((d) => d.css);
  const ALL_DEFAULT_HTML = Object.values(DEFAULTS).map((d) => d.html);

  const payload: TemplateDoc = useMemo(
    () => ({ workspaceId, siteId: siteId || undefined, type, name: name.trim() || 'Template', html, css, ...(js.trim() ? { js: js.trim() } : {}) }),
    [workspaceId, siteId, type, name, html, css, js]
  );

  const isDirty = useMemo(() => {
    if (savedPayloadStr === null) return false;
    return JSON.stringify(payload) !== savedPayloadStr;
  }, [payload, savedPayloadStr]);
  useBeforeUnload(isModalOpen && isDirty);

  const previewSrcDoc = useMemo(() => {
    // 質問接客は差し込み変数が別（title / header_image_url / submit_label）＋選択肢はSDKが差し込む。
    // 他タイプ用のサンプル（cta_url・クーポン等）とは噛み合わないので、種別ごとにデータを組み替える。
    if (type === 'question') {
      const choices = String(sample.q_choices || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      return buildPreviewSrcDoc({
        html, css, js,
        data: {
          title: sample.q_title,
          header_image_url: sample.image_url,
          submit_label: sample.q_submit_label,
        },
        choices,
      });
    }
    return buildPreviewSrcDoc({ html, css, js, data: sample });
  }, [html, css, js, sample, type]);

  function resetEditor() {
    setId(genId('tpl'));
    setName('Default');
    setType('modal');
    setHtml(DEFAULTS.modal.html);
    setCss(DEFAULTS.modal.css);
    setJs('');
    setSaveError('');
    setSaveMessage('');
    setSavedPayloadStr(null);
  }

  function openCreateModal() {
    resetEditor();
    setSavedPayloadStr(JSON.stringify({ workspaceId, siteId: siteId || undefined, type: 'modal', name: 'Default', html: DEFAULTS.modal.html, css: DEFAULTS.modal.css }));
    setIsModalOpen(true);
  }

  function openEditModal(row: { id: string; data: TemplateDoc }) {
    setId(row.id);
    setWorkspaceId(row.data.workspaceId);
    if (row.data.siteId) setSiteId(row.data.siteId);
    setType(row.data.type);
    setName(row.data.name || 'Template');
    // ?? を使い、空文字列も意図的な値として保持する（|| だと空文字→デフォルトに戻ってしまう）
    setHtml(row.data.html ?? DEFAULTS[row.data.type].html);
    setCss(row.data.css ?? DEFAULTS[row.data.type].css);
    setJs(row.data.js ?? '');
    setSaveError('');
    setSaveMessage('');
    setSavedPayloadStr(JSON.stringify(row.data));
    setIsModalOpen(true);
  }

  function closeEditor() {
    if (isDirty && !window.confirm('保存されていない変更があります。閉じますか？')) return;
    setIsModalOpen(false);
    setSaveError('');
    setSaveMessage('');
  }

  async function createOrUpdate() {
    if (!workspaceId) throw new Error('workspaceId required');
    try {
      setSaving(true);
      setSaveError('');
      setSaveMessage('');
      const isNew = !rows.some((r) => r.id === id.trim());
      if (isNew) await assertPlanLimit(workspaceId, "templates");
      await setDoc(doc(db, 'templates', id.trim()), payload, { merge: true });
      setSavedPayloadStr(JSON.stringify(payload));
      setSaveMessage('テンプレートを保存しました。');
    } catch (e: any) {
      setSaveError(e?.message || String(e));
      throw e;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container liquid-page">
      <div className="page-header">
        <div className="page-header__meta">
          <div className="small" style={{ marginBottom: 6, opacity: 0.7 }}>MOKKEDA / Main</div>
          <h1 className="h1">テンプレート</h1>
          <div className="small">モーダル・バナー・トーストの見た目を管理する画面です。まずは一覧で確認し、必要なときだけ登録・編集します。</div>
          <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>
            現在のワークスペース: <b>{selectedWorkspaceName || workspaceId || '（未選択）'}</b>
            {workspaceId ? (
              <React.Fragment>
                {' '}<span style={{ opacity: 0.62 }}> / ID: <code>{workspaceId}</code></span>
              </React.Fragment>
            ) : null}
          </div>
        </div>
        <div className="page-header__actions">
          <button
            className="btn btn--primary"
            onClick={openCreateModal}
            disabled={!templateLimit.allowed}
            title={!templateLimit.allowed ? `プランの上限に達しています（${templateLimit.current}/${templateLimit.limit}）` : undefined}
          >
            新規テンプレート{templateLimit.limit !== null ? ` (${templateLimit.current}/${templateLimit.limit})` : ""}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="h2">サイト</div>
        {visibleSites.length > 0 ? (
          <select
            className="input"
            value={siteId}
            onChange={(e) => { setSiteId(e.target.value); writeSelectedSiteId(e.target.value); }}
          >
            {visibleSites.map((s) => (
              <option key={s.id} value={s.id}>
                {siteLabel(s)}{siteLabel(s) !== s.id ? ` (${s.id})` : ''}
              </option>
            ))}
          </select>
        ) : (
          <div className="small" style={{ opacity: 0.6 }}>
            {workspaceId ? 'サイトが登録されていません' : 'ワークスペースを選択してください'}
          </div>
        )}
        {selectedSiteName && (
          <div className="small" style={{ marginTop: 4, opacity: 0.65 }}>
            選択中: <b>{selectedSiteName}</b>
            {siteId && selectedSiteName !== siteId ? <> / <code>{siteId}</code></> : null}
          </div>
        )}
      </div>

      <div className="card">
        <div className="list-toolbar">
          <div className="list-toolbar__filters">
            <div className="small" style={{ opacity: 0.74 }}>
              名前を中心に一覧化しています。HTML・CSS・プレビュー・確認用JSONは編集時または詳細表示で確認します。
            </div>
          </div>
          <div className="list-toolbar__actions">
            <button className="btn" onClick={openCreateModal}>作成</button>
          </div>
        </div>

        {/* アクティブ / アーカイブ タブ */}
        <div style={{ display: "flex", gap: 0, marginBottom: 12, border: "1px solid rgba(15,23,42,.12)", borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
          {([['active', `アクティブ (${filteredRows.filter(r => !(r.data as any).archived).length})`], ['archived', `アーカイブ (${filteredRows.filter(r => (r.data as any).archived).length})`]] as const).map(([tab, label]) => (
            <button key={tab} type="button" onClick={() => setTemplateListTab(tab)} style={{ padding: "6px 16px", border: "none", fontSize: 13, fontWeight: templateListTab === tab ? 700 : 500, background: templateListTab === tab ? "#1f6573" : "transparent", color: templateListTab === tab ? "#fff" : "inherit", cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>

        <div className="liquid-scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th>テンプレート</th>
                <th>サイト</th>
                <th>表示タイプ</th>
                <th>テンプレート名</th>
                <th>詳細</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
            {filteredRows.filter(r => templateListTab === 'archived' ? (r.data as any).archived : !(r.data as any).archived).map((r) => {
              const rowSite = sites.find((s) => s.id === r.data.siteId);
              return (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.data.name || '名称未設定'}</div>
                    <div className="small" style={{ opacity: 0.72 }}>
                      ID: <code>{r.id}</code>
                    </div>
                  </td>
                  <td>
                    {r.data.siteId ? (
                      <Fragment>
                        <div>{siteLabel(rowSite)}</div>
                        <div className="small" style={{ opacity: 0.72 }}><code>{r.data.siteId}</code></div>
                      </Fragment>
                    ) : (
                      <span className="small" style={{ opacity: 0.5 }}>未設定</span>
                    )}
                  </td>
                  <td>{r.data.type === 'modal' ? 'モーダル' : r.data.type === 'banner' ? 'バナー' : r.data.type === 'launcher' ? 'ランチャー' : 'トースト'}</td>
                  <td>{r.data.name}</td>
                  <td>
                    <button className="btn" onClick={() => openEditModal(r)}>編集</button>
                    <span style={{ width: 8, display: 'inline-block' }} />
                    <button
                      className="btn"
                      onClick={async () => {
                        const newId = `${r.id}_copy_${Math.random().toString(36).slice(2, 6)}`;
                        await setDoc(doc(db, 'templates', newId), { ...r.data, name: `${r.data?.name || r.id} のコピー` });
                        alert("テンプレートを複製しました");
                      }}
                    >
                      複製
                    </button>
                    <span style={{ width: 8, display: 'inline-block' }} />
                    {(r.data as any).archived ? (
                      <>
                        <button className="btn" onClick={async () => { await setDoc(doc(db, 'templates', r.id), { archived: false }, { merge: true }); }}>戻す</button>
                        <span style={{ width: 8, display: 'inline-block' }} />
                        <button className="btn btn--danger" onClick={() => deleteDoc(doc(db, 'templates', r.id))}>削除</button>
                      </>
                    ) : (
                      <button className="btn" onClick={async () => { await setDoc(doc(db, 'templates', r.id), { archived: true }, { merge: true }); }}>アーカイブ</button>
                    )}
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>

      <RightDrawer
        open={isModalOpen}
        width={1120}
        title={rows.some((r) => r.id === id) ? 'テンプレートを編集' : 'テンプレートを作成'}
        description="一覧を見ながら、HTML・CSS・プレビューを右側でまとめて調整できます。"
        onClose={closeEditor}
        actions={isDirty ? <span className="badge" style={{ color: '#b45309', borderColor: '#fcd34d', background: '#fef3c7' }}>未保存</span> : null}
      >
        <div className="row liquid-page" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div className="h2">テンプレート名</div>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
                <div className="small" style={{ opacity: 0.72, marginTop: 6, marginBottom: 8 }}>
                  テンプレートID: <code>{id}</code>
                </div>
                <div className="small" style={{ opacity: 0.72, marginBottom: 8 }}>
                  ワークスペース: <b>{selectedWorkspaceName || workspaceId || '（未選択）'}</b>
                </div>

                <div style={{ height: 10 }} />
                <div className="h2">サイト</div>
                {visibleSites.length > 0 ? (
                  <select
                    className="input"
                    value={siteId}
                    onChange={(e) => { setSiteId(e.target.value); writeSelectedSiteId(e.target.value); }}
                  >
                    {visibleSites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {siteLabel(s)}{siteLabel(s) !== s.id ? ` (${s.id})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="small" style={{ opacity: 0.6 }}>サイトが登録されていません</div>
                )}
                <div className="small" style={{ marginTop: 4, opacity: 0.65 }}>
                  テンプレートはサイト単位で管理されます。
                </div>

                <div style={{ height: 10 }} />

                <div className="row">
                  <div style={{ flex: 1 }}>
                    <div className="h2">表示タイプ</div>
                    <select className="input" value={type} onChange={(e) => {
                      const t = e.target.value as TemplateDoc['type'];
                      setType(t);
                      // 現在の値が既知のデフォルト値のいずれかと一致する場合のみ新タイプのデフォルトを適用。
                      // ユーザーが独自編集済み（カスタム値 or 意図的な空文字）の場合は上書きしない。
                      if (ALL_DEFAULT_HTML.includes(html)) setHtml(DEFAULTS[t].html);
                      if (ALL_DEFAULT_CSS.includes(css)) setCss(DEFAULTS[t].css);
                    }}>
                      <option value="modal">モーダル — 画面中央のポップアップ。クーポン・キャンペーン訴求に。</option>
                      <option value="banner">バナー — 画面下に固定表示されるフローティングバー。告知・誘導に。</option>
                      <option value="toast">トースト — 画面右下の小さい通知。邪魔せず伝えたいときに。</option>
                      <option value="launcher">ランチャー — 画面隅に常駐するボタン。クリックでモーダルを開く。</option>
                      <option value="question">質問接客 — 質問カード。選択肢を差し込む位置は data-cx-choices。</option>
                    </select>
                    <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>
                      {type === 'modal' && '💡 画面全体を覆うオーバーレイ型。インパクト大。クーポン・初回訴求・アンケートなどに向いています。'}
                      {type === 'banner' && '💡 ページ下部に常駐する帯型。スクロールしても消えないので告知・セール情報の常時表示に最適。'}
                      {type === 'toast' && '💡 画面右下にそっと出る小型通知。「クーポンあります」「残り3点」など邪魔にならず伝えたい情報に。'}
                      {type === 'launcher' && '💡 画面隅に常駐するフローティングボタン。差し込み変数: launcher_image_url（ボタン画像）/ cta_text（ボタン文言）。data-cx-launcher-open 属性の要素をクリックするとモーダルが開きます。'}
                      {type === 'question' && '💡 質問接客カード。差し込み変数: title（質問文）/ header_image_url / submit_label。選択肢を出す位置に data-cx-choices、閉じるに data-cx-close、複数選択の送信に data-cx-submit を付けてください。選択肢は [data-cx-choice] でスタイル指定でき、選択時は [data-selected] が付きます。'}
                    </div>
                  </div>
                </div>

                <div style={{ height: 10 }} />

                {/* ---- コードエディタ タブ ---- */}
                <div style={{ display: "flex", gap: 2, marginBottom: 0, borderBottom: "2px solid rgba(15,23,42,.08)", alignItems: "center" }}>
                  {(["html", "css", "js"] as const).map((tab) => {
                    const labels: Record<string, string> = { html: "HTML", css: "CSS", js: "JS" };
                    const hasContent = tab === "html" ? !!html : tab === "css" ? !!css : !!js;
                    const active = codeTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setCodeTab(tab)}
                        style={{
                          padding: "6px 18px",
                          border: "none",
                          borderBottom: active ? "2px solid #1f6573" : "2px solid transparent",
                          marginBottom: -2,
                          background: "transparent",
                          fontWeight: active ? 700 : 500,
                          fontSize: 13,
                          color: active ? "#1f6573" : "rgba(15,23,42,.5)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        {labels[tab]}
                        {hasContent && !active && (
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8", display: "inline-block" }} />
                        )}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setCodeFullscreen((v) => !v)}
                    title="エディタを全画面表示"
                    style={{ marginLeft: "auto", padding: "4px 8px", border: "1px solid rgba(15,23,42,.12)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: 14, color: "rgba(15,23,42,.5)", lineHeight: 1 }}
                  >
                    ⛶
                  </button>
                </div>

                {/* フルスクリーン オーバーレイ */}
                {codeFullscreen && (
                  <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={(e) => { if (e.target === e.currentTarget) setCodeFullscreen(false); }}
                  >
                    <div style={{ width: "min(1200px, 96vw)", height: "min(800px, 92vh)", background: "#fff", borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px rgba(15,23,42,.25)" }}>
                      {/* ヘッダー */}
                      <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "0 16px", borderBottom: "2px solid rgba(15,23,42,.08)", flexShrink: 0 }}>
                        {(["html", "css", "js"] as const).map((tab) => {
                          const labels: Record<string, string> = { html: "HTML", css: "CSS", js: "JS" };
                          const hasContent = tab === "html" ? !!html : tab === "css" ? !!css : !!js;
                          const active = codeTab === tab;
                          return (
                            <button key={tab} type="button" onClick={() => setCodeTab(tab)}
                              style={{ padding: "10px 20px", border: "none", borderBottom: active ? "2px solid #1f6573" : "2px solid transparent", marginBottom: -2, background: "transparent", fontWeight: active ? 700 : 500, fontSize: 14, color: active ? "#1f6573" : "rgba(15,23,42,.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                            >
                              {labels[tab]}
                              {hasContent && !active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8", display: "inline-block" }} />}
                            </button>
                          );
                        })}
                        <button type="button" onClick={() => setCodeFullscreen(false)}
                          style={{ marginLeft: "auto", padding: "6px 12px", border: "1px solid rgba(15,23,42,.12)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: 13, color: "rgba(15,23,42,.6)" }}
                        >
                          ✕ 閉じる
                        </button>
                      </div>
                      {/* エディタ本体 */}
                      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
                        {codeTab === "html" && <CodeEditor value={html} onChange={setHtml} minHeight={600} placeholder="<!-- HTMLをここに書いてください -->" />}
                        {codeTab === "css"  && <CodeEditor value={css}  onChange={setCss}  minHeight={600} placeholder="/* CSSをここに書いてください */" />}
                        {codeTab === "js"   && <CodeEditor value={js}   onChange={setJs}   minHeight={600} placeholder="// JavaScriptをここに書いてください" />}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ paddingTop: 10 }}>
                  {codeTab === "html" && (
                    <>
                      <CodeEditor value={html} onChange={setHtml} minHeight={400} placeholder="<!-- HTMLをここに書いてください -->" />
                      <details style={{ marginTop: 6 }}>
                        <summary className="small" style={{ cursor: "pointer", color: "#2563eb", userSelect: "none" }}>📌 差し込みタグ一覧を見る</summary>
                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginTop: 6, fontSize: 12, lineHeight: 1.8 }}>
                          <div><code>{"{{title}}"}</code> — タイトル</div>
                          <div><code>{"{{body}}"}</code> — 本文</div>
                          <div><code>{"{{image_url}}"}</code> — 画像URL</div>
                          <div><code>{"{{cta_text}}"}</code> — CTAボタン文言</div>
                          <div><code>{"{{cta_url}}"}</code> — 遷移先URL</div>
                          <div><code>{"{{cta_url_text}}"}</code> — 補助リンク文言</div>
                          <div style={{ marginTop: 6, opacity: 0.7 }}><code>{"{{#if image_url}}"}</code>…<code>{"{{/if}}"}</code> — 条件分岐（値がある場合のみ表示）</div>
                        </div>
                      </details>
                    </>
                  )}
                  {codeTab === "css" && (
                    <CodeEditor value={css} onChange={setCss} minHeight={400} placeholder="/* CSSをここに書いてください */" />
                  )}
                  {codeTab === "js" && (
                    <>
                      <div className="small" style={{ opacity: 0.68, marginBottom: 6 }}>
                        テンプレートが表示された直後に実行されます。ページのDOMを読み書きしたり、カウントダウンなどの動的処理が書けます。
                      </div>
                      <CodeEditor value={js} onChange={setJs} minHeight={400} placeholder="// JavaScriptをここに書いてください&#10;// テンプレート表示直後に実行されます" />
                      <details style={{ marginTop: 6 }}>
                        <summary className="small" style={{ cursor: "pointer", color: "#2563eb", userSelect: "none" }}>📌 使い方のヒント</summary>
                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginTop: 6, fontSize: 12, lineHeight: 1.9 }}>
                          <div>// テンプレート内の要素を操作</div>
                          <div><code>document.querySelector('.cx-title').innerText = '動的テキスト';</code></div>
                          <div style={{ marginTop: 4 }}>// ページ上の文字列を読む</div>
                          <div><code>var price = document.querySelector('.price')?.innerText;</code></div>
                          <div style={{ marginTop: 4 }}>// カウントダウンタイマー</div>
                          <div><code>{'var end = Date.now() + 10 * 60 * 1000;'}</code></div>
                          <div><code>{'setInterval(function() {'}</code></div>
                          <div><code>{'  var s = Math.max(0, Math.ceil((end - Date.now()) / 1000));'}</code></div>
                          <div><code>{'  document.getElementById("cx-timer").innerText = s + "秒";'}</code></div>
                          <div><code>{'}, 1000);'}</code></div>
                        </div>
                      </details>
                    </>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 280 }}>
                <div className="h2">プレビュー</div>
                <div className="small">JSを書いている場合はプレビューでも実行されます。固定表示のテンプレートでも見やすいように iframe 内で補正しています。</div>
                <div style={{ height: 10 }} />

                <div className="card liquid-page" style={{ background: 'linear-gradient(180deg,#ffffff,#f8fbff)', minWidth: 0 }}>
                  <div className="h2">プレビュー</div>
                  <iframe
                    title="template-preview"
                    sandbox="allow-scripts allow-modals"
                    style={{ width: '100%', height: 420, border: '1px solid rgba(15,23,42,.12)', borderRadius: 12, background: '#0b0b0b' }}
                    srcDoc={previewSrcDoc}
                  />
                </div>

                <div style={{ height: 12 }} />

                <div className="card liquid-page" style={{ background: 'linear-gradient(180deg,#ffffff,#f8fbff)', minWidth: 0 }}>
                  <div className="h2">サンプル値</div>
                  <div className="small">ここで入力した値を使って、プレビューを確認できます。</div>
                  <div style={{ height: 10 }} />

                  {type === 'question' ? (
                    <>
                      {/* 質問接客: 差し込み変数は title / header_image_url / submit_label。選択肢はSDKが差し込む */}
                      <div className="h2">質問文</div>
                      <input className="input" value={sample.q_title} onChange={(e) => setSample((s) => ({ ...s, q_title: e.target.value }))} />
                      <div style={{ height: 10 }} />
                      <div className="h2">選択肢（1行に1つ）</div>
                      <textarea className="input" rows={5} value={sample.q_choices} onChange={(e) => setSample((s) => ({ ...s, q_choices: e.target.value }))} />
                      <div className="small" style={{ opacity: 0.65, marginTop: 4 }}>
                        本番ではSDKが <code>data-cx-choices</code> の中に選択肢ボタンを差し込みます。プレビューでも同じ形で再現しています（クリックで <code>data-selected</code> が付くのでスタイル確認できます）。
                      </div>
                      <div style={{ height: 10 }} />
                      <div className="h2">送信ボタンの文言（submit_label）</div>
                      <input className="input" value={sample.q_submit_label} onChange={(e) => setSample((s) => ({ ...s, q_submit_label: e.target.value }))} />
                      <div className="small" style={{ opacity: 0.65, marginTop: 4 }}>
                        複数選択のときだけ表示されます（単一選択は選んだ瞬間に送信されるため自動で非表示）。
                      </div>
                      <div style={{ height: 10 }} />
                      <div className="h2">ヘッダー画像URL（header_image_url）</div>
                      <input className="input" value={sample.image_url} onChange={(e) => setSample((s) => ({ ...s, image_url: e.target.value }))} />
                    </>
                  ) : (
                    <>
                      <div className="h2">タイトル</div>
                      <input className="input" value={sample.title} onChange={(e) => setSample((s) => ({ ...s, title: e.target.value }))} />
                      <div style={{ height: 10 }} />
                      <div className="h2">本文</div>
                      <textarea className="input" value={sample.body} onChange={(e) => setSample((s) => ({ ...s, body: e.target.value }))} />
                      <div style={{ height: 10 }} />
                      <div className="h2">画像URL</div>
                      <input className="input" value={sample.image_url} onChange={(e) => setSample((s) => ({ ...s, image_url: e.target.value }))} />
                      <div style={{ height: 10 }} />
                      <div className="row liquid-page" style={{ flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <div className="h2">CTAボタン文言</div>
                          <input className="input" value={sample.cta_text} onChange={(e) => setSample((s) => ({ ...s, cta_text: e.target.value }))} />
                        </div>
                        <div style={{ flex: 2 }}>
                          <div className="h2">遷移先URL</div>
                          <input className="input" value={sample.cta_url} onChange={(e) => setSample((s) => ({ ...s, cta_url: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ height: 10 }} />
                      <div className="h2">補助リンク文言</div>
                      <input className="input" value={sample.cta_url_text} onChange={(e) => setSample((s) => ({ ...s, cta_url_text: e.target.value }))} />
                      <div style={{ height: 10 }} />
                      <div className="h2">クーポンコード（任意）</div>
                      <input className="input" placeholder="SUMMER2025" value={sample.coupon_code} onChange={(e) => setSample((s) => ({ ...s, coupon_code: e.target.value }))} />
                    </>
                  )}
                </div>

              </div>
        </div>
      </RightDrawer>

      <StickySaveBar
        visible={isModalOpen}
        dirty={isDirty}
        saving={saving}
        error={saveError}
        message={saveMessage}
        onSave={() => { void createOrUpdate().catch(() => {}); }}
        onSecondary={closeEditor}
        secondaryLabel="閉じる"
        saveLabel={rows.some((r) => r.id === id) ? '変更を保存' : '作成する'}
        saveDisabled={!workspaceId || !id.trim()}
      />
    </div>
  );
}
