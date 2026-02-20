import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { genId } from '../components/id';

type TemplateDoc = {
  workspaceId: string;
  type: 'modal' | 'banner' | 'toast';
  name: string;
  html: string;
  css: string;
};

type SampleData = {
  title: string;
  body: string;
  image_url: string;
  cta_text: string;
  cta_url: string;
  cta_url_text: string;
};

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

function buildPreviewSrcDoc(opts: { html: string; css: string; data: Record<string, any> }): string {
  const body = renderMiniTemplate(opts.html, opts.data);
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
    </style>
    <style>${opts.css || ''}</style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

const DEFAULTS: Record<TemplateDoc['type'], { html: string; css: string }> = {
  modal: {
    html: `
<div class="cx-overlay" data-cx-close>
  <div class="cx-modal" role="dialog" aria-modal="true">
    {{#if image_url}}<img class="cx-image" src="{{image_url}}" alt="{{title}}" />{{/if}}
    {{#if title}}<div class="cx-header">{{title}}</div>{{/if}}
    {{#if body}}<div class="cx-body">{{body}}</div>{{/if}}
    <div class="cx-footer">
      {{#if cta_url}}<a class="cx-btn cx-btn--ghost" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
      <button class="cx-btn cx-btn--primary" data-cx-close>{{cta_text}}</button>
    </div>
  </div>
</div>
`.trim(),
    css: `
.cx-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483646;display:flex;align-items:center;justify-content:center;}
.cx-modal{background:#fff;width:min(520px,92vw);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:system-ui,-apple-system,Segoe UI,Roboto;}
.cx-image{width:100%;max-height:260px;object-fit:cover;display:block;}
.cx-header{padding:18px 20px 8px;font-weight:700;font-size:18px;}
.cx-body{padding:0 20px 16px;font-size:14px;white-space:pre-wrap;}
.cx-footer{padding:0 20px 20px;display:flex;justify-content:flex-end;gap:10px;}
.cx-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;}
.cx-btn--primary{background:#111;color:#fff;}
.cx-btn--ghost{background:#eee;color:#111;}
`.trim(),
  },
  banner: {
    html: `
<div class="cx-banner" data-cx-close>
  <div class="cx-banner__inner">
    <div class="cx-banner__text">
      {{title}}
    </div>
    {{#if cta_url}}<a class="cx-btn cx-btn--ghost" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
    <button class="cx-btn cx-btn--primary" data-cx-close>{{cta_text}}</button>
  </div>
</div>
`.trim(),
    css: `
.cx-banner{position:fixed;left:12px;right:12px;bottom:12px;background:#111;color:#fff;border-radius:14px;z-index:2147483646;box-shadow:0 18px 40px rgba(0,0,0,.25);}
.cx-banner__inner{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:14px;}
.cx-banner__text{font-weight:700;}
.cx-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;}
.cx-btn--primary{background:#fff;color:#111;}
.cx-btn--ghost{background:rgba(255,255,255,.15);color:#fff;}
`.trim(),
  },
  toast: {
    html: `
<div class="cx-toast" data-cx-close>
  <div class="cx-toast__title">{{title}}</div>
  {{#if body}}<div class="cx-toast__body">{{body}}</div>{{/if}}
  <div class="cx-toast__footer">
    {{#if cta_url}}<a class="cx-btn cx-btn--ghost" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
    <button class="cx-btn cx-btn--primary" data-cx-close>{{cta_text}}</button>
  </div>
</div>
`.trim(),
    css: `
.cx-toast{position:fixed;right:12px;bottom:12px;max-width:min(420px,92vw);background:#111;color:#fff;border-radius:14px;z-index:2147483646;box-shadow:0 18px 40px rgba(0,0,0,.25);padding:14px;font-family:system-ui,-apple-system,Segoe UI,Roboto;}
.cx-toast__title{font-weight:800;margin-bottom:6px;}
.cx-toast__body{opacity:.9;white-space:pre-wrap;margin-bottom:10px;}
.cx-toast__footer{display:flex;gap:10px;justify-content:flex-end;}
.cx-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;}
.cx-btn--primary{background:#fff;color:#111;}
.cx-btn--ghost{background:rgba(255,255,255,.15);color:#fff;}
`.trim(),
  },
};

export default function TemplatesPage() {
  const [workspaces, setWorkspaces] = useState<Array<{ id: string }>>([]);
  const [rows, setRows] = useState<Array<{ id: string; data: TemplateDoc }>>([]);

  useEffect(() => {
    const q = query(collection(db, 'workspaces'), orderBy('__name__'));
    return onSnapshot(q, (snap) => setWorkspaces(snap.docs.map((d) => ({ id: d.id }))));
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'templates'), orderBy('__name__'));
    return onSnapshot(q, (snap) => setRows(snap.docs.map((d) => ({ id: d.id, data: d.data() as TemplateDoc }))));
  }, []);

  const [id, setId] = useState(() => genId('tpl'));
  const [workspaceId, setWorkspaceId] = useState('');
  const [type, setType] = useState<TemplateDoc['type']>('modal');
  const [name, setName] = useState('Default');
  const [html, setHtml] = useState(DEFAULTS.modal.html);
  const [css, setCss] = useState(DEFAULTS.modal.css);

  const [sample, setSample] = useState<SampleData>({
    title: 'テスト表示',
    body: 'これが出れば成功🔥\n（テンプレートのプレビュー）',
    image_url: 'https://images.unsplash.com/photo-1520975693411-b7e3c5c8c3f1?auto=format&fit=crop&w=1200&q=60',
    cta_text: 'OK',
    cta_url: 'https://nurihiro.website/',
    cta_url_text: '詳細を見る',
  });

  useEffect(() => {
    if (!workspaceId && workspaces.length) setWorkspaceId(workspaces[0].id);
  }, [workspaces, workspaceId]);

  useEffect(() => {
    // When type changes and we're creating a new template, preload defaults
    setHtml((prev) => (prev ? prev : DEFAULTS[type].html));
    setCss((prev) => (prev ? prev : DEFAULTS[type].css));
  }, [type]);

  const payload: TemplateDoc = useMemo(
    () => ({ workspaceId, type, name: name.trim() || 'Template', html, css }),
    [workspaceId, type, name, html, css]
  );

  const previewSrcDoc = useMemo(() => {
    return buildPreviewSrcDoc({ html, css, data: sample });
  }, [html, css, sample]);

  async function createOrUpdate() {
    if (!workspaceId) throw new Error('workspaceId required');
    await setDoc(doc(db, 'templates', id.trim()), payload, { merge: true });
    setId(genId('tpl'));
    setName('Default');
    setHtml(DEFAULTS.modal.html);
    setCss(DEFAULTS.modal.css);
    setType('modal');
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">Templates</h1>
        <div className="small">モーダル/バナー/トーストの HTML/CSS を管理。Action から templateId を選ぶと SDK 側でこのテンプレが使われる。</div>
        <div style={{ height: 14 }} />

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="h2">templateId</div>
            <input className="input" value={id} onChange={(e) => setId(e.target.value)} />
            <div style={{ height: 10 }} />

            <div className="h2">workspaceId</div>
            <select className="input" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>{w.id}</option>
              ))}
            </select>
            <div style={{ height: 10 }} />

            <div className="row">
              <div style={{ flex: 1 }}>
                <div className="h2">type</div>
                <select className="input" value={type} onChange={(e) => {
                  const t = e.target.value as TemplateDoc['type'];
                  setType(t);
                  setHtml(DEFAULTS[t].html);
                  setCss(DEFAULTS[t].css);
                }}>
                  <option value="modal">modal</option>
                  <option value="banner">banner</option>
                  <option value="toast">toast</option>
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <div className="h2">name</div>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>

            <div style={{ height: 10 }} />
            <div className="h2">HTML</div>
            <textarea className="input" style={{ minHeight: 240, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }} value={html} onChange={(e) => setHtml(e.target.value)} />
            <div className="small">対応変数：title / body / image_url / cta_text / cta_url / cta_url_text。 <code>{'{{#if key}}...{{/if}}'}</code> も使える。</div>

            <div style={{ height: 10 }} />
            <div className="h2">CSS</div>
            <textarea className="input" style={{ minHeight: 180, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }} value={css} onChange={(e) => setCss(e.target.value)} />

            <div style={{ height: 14 }} />
            <button className="btn btn--primary" onClick={createOrUpdate}>保存</button>
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="h2">プレビュー（Phase 1）</div>
            <div className="small">※ scripts は実行しない（iframe sandbox）。固定配置のテンプレでも見えるように、iframe内では position を少し補正して表示する。</div>
            <div style={{ height: 10 }} />

            <div className="card" style={{ background: 'rgba(255,255,255,.03)' }}>
              <div className="h2">サンプル値</div>
              <div className="small">この値で <code>{'{{title}}'}</code> などが差し込まれる</div>
              <div style={{ height: 10 }} />
              <div className="h2">title</div>
              <input className="input" value={sample.title} onChange={(e) => setSample((s) => ({ ...s, title: e.target.value }))} />
              <div style={{ height: 10 }} />
              <div className="h2">body</div>
              <textarea className="input" value={sample.body} onChange={(e) => setSample((s) => ({ ...s, body: e.target.value }))} />
              <div style={{ height: 10 }} />
              <div className="h2">image_url</div>
              <input className="input" value={sample.image_url} onChange={(e) => setSample((s) => ({ ...s, image_url: e.target.value }))} />
              <div style={{ height: 10 }} />
              <div className="row">
                <div style={{ flex: 1 }}>
                  <div className="h2">cta_text</div>
                  <input className="input" value={sample.cta_text} onChange={(e) => setSample((s) => ({ ...s, cta_text: e.target.value }))} />
                </div>
                <div style={{ flex: 2 }}>
                  <div className="h2">cta_url</div>
                  <input className="input" value={sample.cta_url} onChange={(e) => setSample((s) => ({ ...s, cta_url: e.target.value }))} />
                </div>
              </div>
              <div style={{ height: 10 }} />
              <div className="h2">cta_url_text</div>
              <input className="input" value={sample.cta_url_text} onChange={(e) => setSample((s) => ({ ...s, cta_url_text: e.target.value }))} />
            </div>

            <div style={{ height: 12 }} />

            <div className="card" style={{ background: 'rgba(255,255,255,.03)' }}>
              <div className="h2">見た目（リアルタイム）</div>
              <iframe
                title="template-preview"
                sandbox=""
                style={{ width: '100%', height: 420, border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, background: '#0b0b0b' }}
                srcDoc={previewSrcDoc}
              />
            </div>

            <div style={{ height: 12 }} />

            <div className="h2">データ（JSON）</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(payload, null, 2)}</pre>
          </div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="card">
        <div className="h2">一覧</div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>workspaceId</th>
              <th>type</th>
              <th>name</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><code>{r.id}</code></td>
                <td><code>{r.data.workspaceId}</code></td>
                <td>{r.data.type}</td>
                <td>{r.data.name}</td>
                <td>
                  <button className="btn" onClick={() => {
                    setId(r.id);
                    setWorkspaceId(r.data.workspaceId);
                    setType(r.data.type);
                    setName(r.data.name || 'Template');
                    setHtml(r.data.html || DEFAULTS[r.data.type].html);
                    setCss(r.data.css || DEFAULTS[r.data.type].css);
                  }}>編集</button>
                  <span style={{ width: 8, display: 'inline-block' }} />
                  <button className="btn btn--danger" onClick={() => deleteDoc(doc(db, 'templates', r.id))}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
