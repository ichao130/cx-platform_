// functions/src/data/platformTemplatePresets.ts
//
// 標準テンプレートライブラリのプリセット定義。
// ops画面の「標準セットを投入」から冪等に投入される（既存idはスキップ）。
//
// 注意:
// - html/css は SDK のレンダラ前提。{{key}} 置換と {{#if key}}...{{/if}} が使える。
// - 閉じるボタンは data-cx-close、コピーボタンは data-cx-copy="<値>"、
//   ランチャー起動は data-cx-launcher-open（SDKが配線する）。
// - fields は「テンプレ独自の {{key}}」のメタ情報。ワークスペースへ複製したとき
//   アクション作成画面にそのまま入力欄として出る（KARTE風の追加フィールド）。

export type PresetFieldType = "text" | "textarea" | "image" | "url" | "color" | "number";

export type PlatformTemplatePreset = {
  id: string;
  name: string;
  type: "modal" | "banner" | "toast" | "launcher" | "push";
  /** タイプごとの既定（アクションにテンプレ未指定時のフォールバック）にするか */
  isDefault?: boolean;
  html: string;
  css: string;
  js?: string;
  fields?: { key: string; label: string; type: PresetFieldType; default?: string }[];
};

/* ========================= modal ========================= */

const MODAL_BASIC: PlatformTemplatePreset = {
  id: "std_modal_basic",
  name: "ベーシックモーダル",
  type: "modal",
  isDefault: true,
  html: `<div class="cx-overlay" data-cx-close>
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
</div>`,
  css: `.cx-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:16px;}
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
.cx-btn--sub:hover{background:#e8ecf0;}`,
};

const MODAL_COUPON_MULTI: PlatformTemplatePreset = {
  id: "std_modal_coupon_multi",
  name: "複数クーポン（コメント付き）",
  type: "modal",
  html: `<div class="cx-overlay" data-cx-close>
  <div class="cx-modal" role="dialog" aria-modal="true">
    <button type="button" class="cx-close" data-cx-close aria-label="閉じる">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>

    <h3 class="cx-ttl">{{title}}</h3>
    {{#if body}}<p class="cx-lead">{{body}}</p>{{/if}}

    {{#if comment1}}
    <div class="cx-row">
      <p class="cx-cmt">{{comment1}}</p>
      <div class="cx-code">
        <span class="cx-code-text">{{coupon1}}</span>
        <button type="button" class="cx-copy" data-cx-copy="{{coupon1}}">コピー</button>
      </div>
    </div>
    {{/if}}

    {{#if comment2}}
    <div class="cx-row">
      <p class="cx-cmt">{{comment2}}</p>
      <div class="cx-code">
        <span class="cx-code-text">{{coupon2}}</span>
        <button type="button" class="cx-copy" data-cx-copy="{{coupon2}}">コピー</button>
      </div>
    </div>
    {{/if}}

    {{#if comment3}}
    <div class="cx-row">
      <p class="cx-cmt">{{comment3}}</p>
      <div class="cx-code">
        <span class="cx-code-text">{{coupon3}}</span>
        <button type="button" class="cx-copy" data-cx-copy="{{coupon3}}">コピー</button>
      </div>
    </div>
    {{/if}}
  </div>
</div>`,
  css: `.cx-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}
.cx-modal{position:relative;background:#fff;width:min(380px,92vw);border-radius:20px;padding:24px 22px;box-sizing:border-box;box-shadow:0 32px 80px rgba(0,0,0,.35);color:#1f2937;}
.cx-close{position:absolute;top:12px;right:12px;width:30px;height:30px;border-radius:50%;background:rgba(0,0,0,.05);border:none;cursor:pointer;color:#6b7280;display:flex;align-items:center;justify-content:center;padding:0;transition:background .15s,color .15s;}
.cx-close:hover{background:rgba(0,0,0,.1);color:#374151;}
.cx-close svg{width:16px;height:16px;display:block;}
.cx-ttl{margin:0 24px 4px 0;font-size:18px;font-weight:700;}
.cx-lead{margin:0 0 16px;font-size:13px;color:#6b7280;}
.cx-row{background:#f8fafc;border-radius:12px;padding:12px 14px;margin-bottom:12px;}
.cx-row:last-child{margin-bottom:0;}
.cx-cmt{margin:0 0 8px;font-size:13px;line-height:1.5;}
.cx-code{display:flex;align-items:center;gap:8px;}
.cx-code-text{flex:1;font-family:ui-monospace,Menlo,monospace;font-size:15px;letter-spacing:1px;text-align:center;padding:8px 10px;border:1px dashed #94a3b8;border-radius:8px;background:#fff;}
.cx-copy{flex-shrink:0;height:38px;padding:0 16px;border:none;border-radius:8px;background:#1f6573;color:#fff;font-size:13px;font-weight:600;cursor:pointer;}
.cx-copy:hover{background:#17505c;}
.cx-copy[data-cx-copied="1"]{background:#16a34a;}`,
  fields: [
    { key: "comment1", label: "コメント1", type: "text", default: "全品10%OFF（3,000円以上）" },
    { key: "coupon1", label: "クーポン1", type: "text", default: "SUMMER10" },
    { key: "comment2", label: "コメント2", type: "text", default: "送料無料クーポン" },
    { key: "coupon2", label: "クーポン2", type: "text", default: "FREESHIP" },
    { key: "comment3", label: "コメント3", type: "text", default: "リピーター様限定 500円引き" },
    { key: "coupon3", label: "クーポン3", type: "text", default: "AGAIN500" },
  ],
};

const MODAL_IMAGE_HERO: PlatformTemplatePreset = {
  id: "std_modal_image_hero",
  name: "画像ヒーロー訴求",
  type: "modal",
  html: `<div class="cx-overlay" data-cx-close>
  <div class="cx-modal" role="dialog" aria-modal="true">
    <button class="cx-close" data-cx-close aria-label="閉じる">✕</button>
    {{#if image_url}}<div class="cx-hero"><img src="{{image_url}}" alt="{{title}}" /></div>{{/if}}
    <div class="cx-body-wrap">
      {{#if badge_text}}<span class="cx-badge">{{badge_text}}</span>{{/if}}
      {{#if title}}<div class="cx-title">{{title}}</div>{{/if}}
      {{#if body}}<div class="cx-text">{{body}}</div>{{/if}}
      {{#if cta_url}}<a class="cx-cta" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
      <button class="cx-later" data-cx-close>{{cta_text}}</button>
    </div>
  </div>
</div>`,
  css: `.cx-overlay{position:fixed;inset:0;background:rgba(15,23,42,.62);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}
.cx-modal{position:relative;background:#fff;width:min(400px,92vw);border-radius:22px;overflow:hidden;box-shadow:0 30px 70px rgba(15,23,42,.4);color:#0f172a;}
.cx-close{position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.85);border:none;cursor:pointer;font-size:14px;color:#475569;z-index:2;display:flex;align-items:center;justify-content:center;}
.cx-close:hover{background:#fff;}
.cx-hero{background:#e2e8f0;}
.cx-hero img{width:100%;max-height:240px;object-fit:cover;display:block;}
.cx-body-wrap{padding:22px 22px 20px;}
.cx-badge{display:inline-block;background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:700;letter-spacing:.06em;padding:5px 10px;border-radius:999px;margin-bottom:10px;}
.cx-title{font-size:21px;font-weight:800;line-height:1.35;margin-bottom:8px;}
.cx-text{font-size:14px;line-height:1.8;color:#475569;white-space:pre-wrap;margin-bottom:18px;}
.cx-cta{display:block;background:#0f172a;color:#fff;text-decoration:none;text-align:center;padding:15px;border-radius:12px;font-weight:700;font-size:15px;transition:opacity .15s;}
.cx-cta:hover{opacity:.85;}
.cx-later{display:block;width:100%;margin-top:10px;background:transparent;border:none;color:#94a3b8;font-size:13px;cursor:pointer;padding:6px;}
.cx-later:hover{color:#64748b;}`,
  fields: [{ key: "badge_text", label: "バッジ文言", type: "text", default: "期間限定" }],
};

const MODAL_COUNTDOWN: PlatformTemplatePreset = {
  id: "std_modal_countdown",
  name: "カウントダウン付き（残り時間訴求）",
  type: "modal",
  html: `<div class="cx-overlay" data-cx-close>
  <div class="cx-modal" role="dialog" aria-modal="true">
    <button class="cx-close" data-cx-close aria-label="閉じる">✕</button>
    <div class="cx-inner">
      {{#if title}}<div class="cx-title">{{title}}</div>{{/if}}
      {{#if body}}<div class="cx-text">{{body}}</div>{{/if}}
      <div class="cx-timer-wrap">
        <div class="cx-timer-label">終了まであと</div>
        <div class="cx-timer" id="cx-countdown">--:--</div>
      </div>
      {{#if coupon_code}}<div class="cx-coupon"><span>{{coupon_code}}</span><button data-cx-copy="{{coupon_code}}" type="button">コピー</button></div>{{/if}}
      {{#if cta_url}}<a class="cx-cta" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
      <button class="cx-later" data-cx-close>{{cta_text}}</button>
    </div>
  </div>
</div>`,
  css: `.cx-overlay{position:fixed;inset:0;background:rgba(15,23,42,.65);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}
.cx-modal{position:relative;background:#fff;width:min(380px,92vw);border-radius:20px;box-shadow:0 30px 70px rgba(15,23,42,.4);color:#0f172a;}
.cx-close{position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:50%;background:rgba(0,0,0,.05);border:none;cursor:pointer;font-size:14px;color:#64748b;}
.cx-inner{padding:26px 22px 20px;}
.cx-title{font-size:20px;font-weight:800;line-height:1.35;margin-bottom:8px;padding-right:22px;}
.cx-text{font-size:14px;line-height:1.75;color:#475569;white-space:pre-wrap;margin-bottom:16px;}
.cx-timer-wrap{background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:12px;text-align:center;margin-bottom:16px;}
.cx-timer-label{font-size:11px;font-weight:700;color:#9f1239;letter-spacing:.08em;margin-bottom:2px;}
.cx-timer{font-family:ui-monospace,Menlo,monospace;font-size:28px;font-weight:800;color:#e11d48;line-height:1.1;font-variant-numeric:tabular-nums;}
.cx-coupon{display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px dashed #94a3b8;border-radius:10px;padding:10px 12px;margin-bottom:14px;}
.cx-coupon span{flex:1;font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;letter-spacing:1px;text-align:center;}
.cx-coupon button{flex-shrink:0;border:none;border-radius:8px;padding:8px 14px;background:#0f172a;color:#fff;font-size:12px;font-weight:700;cursor:pointer;}
.cx-coupon button[data-cx-copied]{background:#16a34a;}
.cx-cta{display:block;background:#e11d48;color:#fff;text-decoration:none;text-align:center;padding:15px;border-radius:12px;font-weight:700;font-size:15px;}
.cx-cta:hover{opacity:.88;}
.cx-later{display:block;width:100%;margin-top:10px;background:transparent;border:none;color:#94a3b8;font-size:13px;cursor:pointer;padding:6px;}`,
  js: `// 残り時間カウントダウン。countdown_minutes 分後を終了時刻とする（既定30分）
(function () {
  var el = document.getElementById("cx-countdown");
  if (!el) return;
  var mins = parseInt("{{countdown_minutes}}", 10);
  if (!mins || isNaN(mins)) mins = 30;
  var end = Date.now() + mins * 60 * 1000;
  function tick() {
    var left = Math.max(0, end - Date.now());
    var h = Math.floor(left / 3600000);
    var m = Math.floor((left % 3600000) / 60000);
    var s = Math.floor((left % 60000) / 1000);
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    el.textContent = (h > 0 ? p(h) + ":" : "") + p(m) + ":" + p(s);
    if (left <= 0) clearInterval(iv);
  }
  tick();
  var iv = setInterval(tick, 1000);
})();`,
  fields: [{ key: "countdown_minutes", label: "カウントダウン（分）", type: "number", default: "30" }],
};

/* ========================= banner ========================= */

const BANNER_BASIC: PlatformTemplatePreset = {
  id: "std_banner_basic",
  name: "ベーシックバナー",
  type: "banner",
  isDefault: true,
  html: `<div class="cx-banner">
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
</div>`,
  css: `.cx-banner{position:fixed;left:12px;right:12px;bottom:12px;background:#111;color:#fff;border-radius:18px;z-index:2147483646;box-shadow:0 20px 48px rgba(0,0,0,.3);overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto;}
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
.cx-close:hover{background:rgba(255,255,255,.2);}`,
};

const BANNER_FLOATING_CARD: PlatformTemplatePreset = {
  id: "std_banner_floating_card",
  name: "フローティングカード（右下・画像つき）",
  type: "banner",
  html: `<div class="cx-fcard">
  <button class="cx-fcard__close" data-cx-close aria-label="閉じる">✕</button>
  {{#if image_url}}<img class="cx-fcard__img" src="{{image_url}}" alt="{{title}}" />{{/if}}
  <div class="cx-fcard__body">
    {{#if badge_text}}<span class="cx-fcard__badge">{{badge_text}}</span>{{/if}}
    <div class="cx-fcard__title">{{title}}</div>
    {{#if body}}<div class="cx-fcard__text">{{body}}</div>{{/if}}
    {{#if cta_url}}<a class="cx-fcard__cta" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
  </div>
</div>`,
  css: `.cx-fcard{position:fixed;right:16px;bottom:16px;width:min(310px,92vw);background:#fff;border-radius:16px;z-index:2147483646;box-shadow:0 18px 44px rgba(15,23,42,.28);overflow:hidden;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a;animation:cx-fc-in .28s ease;}
@keyframes cx-fc-in{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
.cx-fcard__close{position:absolute;top:8px;right:8px;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.9);border:none;cursor:pointer;font-size:12px;color:#64748b;z-index:2;display:flex;align-items:center;justify-content:center;}
.cx-fcard__close:hover{background:#fff;color:#0f172a;}
.cx-fcard__img{width:100%;height:132px;object-fit:cover;display:block;}
.cx-fcard__body{padding:14px 16px 16px;}
.cx-fcard__badge{display:inline-block;background:#ecfdf5;color:#047857;font-size:10px;font-weight:700;letter-spacing:.06em;padding:4px 9px;border-radius:999px;margin-bottom:7px;}
.cx-fcard__title{font-size:15px;font-weight:700;line-height:1.4;}
.cx-fcard__text{font-size:12.5px;line-height:1.65;color:#64748b;margin-top:5px;white-space:pre-wrap;}
.cx-fcard__cta{display:block;margin-top:12px;background:#0f172a;color:#fff;text-decoration:none;text-align:center;padding:11px;border-radius:10px;font-size:13px;font-weight:700;transition:opacity .15s;}
.cx-fcard__cta:hover{opacity:.85;}`,
  fields: [{ key: "badge_text", label: "バッジ文言", type: "text", default: "おすすめ" }],
};

const BANNER_COUPON: PlatformTemplatePreset = {
  id: "std_banner_coupon",
  name: "クーポン配布バナー（コピー付き）",
  type: "banner",
  html: `<div class="cx-cbanner">
  <div class="cx-cbanner__main">
    <div class="cx-cbanner__texts">
      <div class="cx-cbanner__title">{{title}}</div>
      {{#if body}}<div class="cx-cbanner__body">{{body}}</div>{{/if}}
    </div>
    {{#if coupon_code}}
    <div class="cx-cbanner__code">
      <span class="cx-cbanner__codetext">{{coupon_code}}</span>
      <button type="button" class="cx-cbanner__copy" data-cx-copy="{{coupon_code}}">コピー</button>
    </div>
    {{/if}}
  </div>
  <button class="cx-cbanner__close" data-cx-close aria-label="閉じる">✕</button>
</div>`,
  css: `.cx-cbanner{position:fixed;left:12px;right:12px;bottom:12px;background:linear-gradient(135deg,#1f6573,#134e58);color:#fff;border-radius:16px;z-index:2147483646;box-shadow:0 18px 44px rgba(15,23,42,.32);padding:14px 46px 14px 18px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}
.cx-cbanner__main{display:flex;gap:14px;align-items:center;flex-wrap:wrap;}
.cx-cbanner__texts{flex:1;min-width:180px;}
.cx-cbanner__title{font-size:15px;font-weight:700;line-height:1.35;}
.cx-cbanner__body{font-size:12px;opacity:.8;margin-top:3px;line-height:1.5;}
.cx-cbanner__code{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.cx-cbanner__codetext{font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;letter-spacing:1.5px;background:rgba(255,255,255,.14);border:1px dashed rgba(255,255,255,.5);border-radius:8px;padding:8px 14px;}
.cx-cbanner__copy{border:none;border-radius:8px;padding:9px 16px;background:#fff;color:#134e58;font-size:13px;font-weight:700;cursor:pointer;transition:opacity .15s;}
.cx-cbanner__copy:hover{opacity:.85;}
.cx-cbanner__copy[data-cx-copied]{background:#16a34a;color:#fff;}
.cx-cbanner__close{position:absolute;top:50%;right:12px;transform:translateY(-50%);width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.14);border:none;cursor:pointer;font-size:13px;color:#fff;display:flex;align-items:center;justify-content:center;}
.cx-cbanner__close:hover{background:rgba(255,255,255,.26);}`,
};

const BANNER_FREESHIP: PlatformTemplatePreset = {
  id: "std_banner_freeship",
  name: "送料無料まであと◯円（進捗バー）",
  type: "banner",
  html: `<div class="cx-ship">
  <button class="cx-ship__close" data-cx-close aria-label="閉じる">✕</button>
  <div class="cx-ship__title">{{title}}</div>
  {{#if body}}<div class="cx-ship__body">{{body}}</div>{{/if}}
  <div class="cx-ship__bar"><div class="cx-ship__fill" id="cx-ship-fill"></div></div>
  <div class="cx-ship__meta">
    <span id="cx-ship-remain">あと{{remain_amount}}円</span>
    <span class="cx-ship__goal">{{threshold_amount}}円で送料無料</span>
  </div>
  {{#if cta_url}}<a class="cx-ship__cta" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
</div>`,
  css: `.cx-ship{position:fixed;left:12px;right:12px;bottom:12px;background:#fff;color:#0f172a;border-radius:16px;z-index:2147483646;box-shadow:0 18px 44px rgba(15,23,42,.24);padding:16px 18px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:520px;margin:0 auto;box-sizing:border-box;}
.cx-ship__close{position:absolute;top:10px;right:10px;width:26px;height:26px;border-radius:50%;background:rgba(15,23,42,.06);border:none;cursor:pointer;font-size:12px;color:#64748b;}
.cx-ship__title{font-size:15px;font-weight:700;line-height:1.35;padding-right:24px;}
.cx-ship__body{font-size:12.5px;color:#64748b;margin-top:4px;line-height:1.6;}
.cx-ship__bar{height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin:12px 0 7px;}
.cx-ship__fill{height:100%;width:0;background:linear-gradient(90deg,#34d399,#059669);border-radius:999px;transition:width .5s ease;}
.cx-ship__meta{display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#059669;}
.cx-ship__goal{color:#94a3b8;font-weight:500;}
.cx-ship__cta{display:block;margin-top:12px;background:#059669;color:#fff;text-decoration:none;text-align:center;padding:12px;border-radius:10px;font-size:13.5px;font-weight:700;}
.cx-ship__cta:hover{opacity:.88;}`,
  js: `// 進捗バーを threshold と remain から計算して伸ばす
(function () {
  var fill = document.getElementById("cx-ship-fill");
  if (!fill) return;
  var threshold = parseFloat("{{threshold_amount}}".replace(/[^0-9.]/g, "")) || 0;
  var remain = parseFloat("{{remain_amount}}".replace(/[^0-9.]/g, "")) || 0;
  var pct = threshold > 0 ? Math.max(0, Math.min(100, ((threshold - remain) / threshold) * 100)) : 0;
  setTimeout(function () { fill.style.width = pct.toFixed(1) + "%"; }, 60);
})();`,
  fields: [
    { key: "threshold_amount", label: "送料無料のしきい金額", type: "number", default: "5000" },
    { key: "remain_amount", label: "あと何円", type: "number", default: "1200" },
  ],
};

/* ========================= toast ========================= */

const TOAST_BASIC: PlatformTemplatePreset = {
  id: "std_toast_basic",
  name: "ベーシックトースト",
  type: "toast",
  isDefault: true,
  html: `<div class="cx-toast">
  <button class="cx-close" data-cx-close aria-label="閉じる">✕</button>
  {{#if title}}<div class="cx-toast__title">{{title}}</div>{{/if}}
  {{#if body}}<div class="cx-toast__body">{{body}}</div>{{/if}}
  {{#if cta_url}}<a class="cx-btn" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
</div>`,
  css: `.cx-toast{position:fixed;right:16px;bottom:16px;max-width:min(300px,92vw);background:#111;color:#fff;border-radius:16px;z-index:2147483646;box-shadow:0 16px 40px rgba(0,0,0,.28);padding:16px 16px 14px;font-family:system-ui,-apple-system,Segoe UI,Roboto;animation:cx-slide-in .25s ease;}
@keyframes cx-slide-in{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
.cx-close{position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.1);border:none;cursor:pointer;font-size:12px;color:#fff;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.cx-close:hover{background:rgba(255,255,255,.2);}
.cx-toast__title{font-weight:800;font-size:14px;line-height:1.3;padding-right:20px;margin-bottom:6px;}
.cx-toast__body{font-size:13px;opacity:.8;line-height:1.5;white-space:pre-wrap;margin-bottom:12px;}
.cx-btn{display:block;width:100%;border:none;border-radius:10px;padding:9px;font-weight:700;font-size:13px;cursor:pointer;text-decoration:none;text-align:center;background:rgba(255,255,255,.14);color:#fff;box-sizing:border-box;transition:background .15s;}
.cx-btn:hover{background:rgba(255,255,255,.22);}`,
};

const TOAST_SOCIAL_PROOF: PlatformTemplatePreset = {
  id: "std_toast_social_proof",
  name: "社会的証明トースト（人気・閲覧中）",
  type: "toast",
  html: `<div class="cx-sp">
  <button class="cx-sp__close" data-cx-close aria-label="閉じる">✕</button>
  {{#if image_url}}<img class="cx-sp__img" src="{{image_url}}" alt="" />{{/if}}
  <div class="cx-sp__texts">
    <div class="cx-sp__title">{{title}}</div>
    {{#if body}}<div class="cx-sp__body">{{body}}</div>{{/if}}
    {{#if cta_url}}<a class="cx-sp__link" href="{{cta_url}}" target="_blank" rel="noopener">{{cta_url_text}}</a>{{/if}}
  </div>
</div>`,
  css: `.cx-sp{position:fixed;left:16px;bottom:16px;display:flex;gap:12px;align-items:center;width:min(320px,92vw);background:#fff;color:#0f172a;border-radius:14px;z-index:2147483646;box-shadow:0 14px 38px rgba(15,23,42,.22);padding:12px 34px 12px 12px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;animation:cx-sp-in .3s ease;}
@keyframes cx-sp-in{from{opacity:0;transform:translateX(-14px);}to{opacity:1;transform:translateX(0);}}
.cx-sp__close{position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:50%;background:transparent;border:none;cursor:pointer;font-size:11px;color:#94a3b8;}
.cx-sp__close:hover{color:#0f172a;}
.cx-sp__img{width:46px;height:46px;border-radius:10px;object-fit:cover;flex-shrink:0;}
.cx-sp__texts{flex:1;min-width:0;}
.cx-sp__title{font-size:13px;font-weight:700;line-height:1.4;}
.cx-sp__body{font-size:11.5px;color:#64748b;margin-top:2px;line-height:1.5;}
.cx-sp__link{display:inline-block;margin-top:5px;font-size:11.5px;font-weight:700;color:#1f6573;text-decoration:none;}
.cx-sp__link:hover{text-decoration:underline;}`,
};

/* ========================= launcher ========================= */

const LAUNCHER_BASIC: PlatformTemplatePreset = {
  id: "std_launcher_basic",
  name: "ベーシックランチャー",
  type: "launcher",
  isDefault: true,
  html: `<button class="cx-launcher-btn" data-cx-launcher-open aria-label="{{cta_text}}">
  {{#if launcher_image_url}}
  <img class="cx-launcher-btn__img" src="{{launcher_image_url}}" alt="" />
  {{/if}}
  {{#if cta_text}}<span class="cx-launcher-btn__label">{{cta_text}}</span>{{/if}}
</button>`,
  css: `.cx-launcher-btn{display:flex;align-items:center;gap:10px;background:#111;color:#fff;border:none;border-radius:50px;padding:10px 20px 10px 10px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.3);font-family:system-ui,-apple-system,Segoe UI,Roboto;white-space:nowrap;transition:transform .15s,box-shadow .15s;}
.cx-launcher-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.35);}
.cx-launcher-btn:active{transform:translateY(0);}
.cx-launcher-btn__img{width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;}
.cx-launcher-btn__label{line-height:1;}`,
};

const LAUNCHER_ICON_PULSE: PlatformTemplatePreset = {
  id: "std_launcher_icon_pulse",
  name: "アイコン丸ボタン（脈動アニメ）",
  type: "launcher",
  html: `<button class="cx-lpulse" data-cx-launcher-open aria-label="{{cta_text}}">
  {{#if launcher_image_url}}<img class="cx-lpulse__img" src="{{launcher_image_url}}" alt="" />{{/if}}
  {{#if badge_text}}<span class="cx-lpulse__badge">{{badge_text}}</span>{{/if}}
</button>`,
  css: `.cx-lpulse{position:relative;display:flex;align-items:center;justify-content:center;width:60px;height:60px;border-radius:50%;background:#1f6573;color:#fff;border:none;cursor:pointer;box-shadow:0 6px 22px rgba(31,101,115,.45);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:0;}
.cx-lpulse::before{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(31,101,115,.5);animation:cx-lp 1.9s ease-out infinite;}
@keyframes cx-lp{0%{transform:scale(.9);opacity:.8;}100%{transform:scale(1.35);opacity:0;}}
@media (prefers-reduced-motion: reduce){.cx-lpulse::before{animation:none;}}
.cx-lpulse:hover{background:#17505c;}
.cx-lpulse__img{width:60px;height:60px;border-radius:50%;object-fit:cover;display:block;}
.cx-lpulse__badge{position:absolute;top:-4px;right:-4px;background:#e11d48;color:#fff;font-size:10px;font-weight:700;min-width:18px;height:18px;border-radius:999px;display:flex;align-items:center;justify-content:center;padding:0 5px;box-shadow:0 2px 6px rgba(0,0,0,.25);}`,
  fields: [{ key: "badge_text", label: "バッジ（数字や短文）", type: "text", default: "1" }],
};

/* ========================= push ========================= */

// プッシュ通知の購読は「見た目」ではなく動作が本体なので、独立した push 区分にした。
// 画面は出さず、ブラウザ標準の confirm で意思確認してから許可ダイアログを出す。
const PUSH_OPTIN_CONFIRM: PlatformTemplatePreset = {
  id: "std_push_optin",
  name: "プッシュ通知の登録（確認ダイアログ）",
  type: "push",
  isDefault: true,
  // SDKは firstElementChild が無いと描画処理を打ち切りJSも実行されないため、
  // 見えない要素を1つだけ置く（表示はしない）
  html: `<div class="cx-push-optin" aria-hidden="true"></div>`,
  css: `.cx-push-optin{display:none!important;}`,
  js: `// 確認ダイアログ → OKなら購読フローへ。
// Shopifyのようにサイトルートへ /push-sw.js を置けない環境では、
// SDKが自動でブリッジ方式（別ウィンドウ）にフォールバックする。
(function () {
  var api = window.mokkeda && window.mokkeda.push;
  if (!api) return;

  var ASK_TEXT   = "{{confirm_text}}" || "最新情報やお得なクーポンを通知でお届けします。受け取りますか？";
  var DONE_TEXT  = "{{done_text}}"    || "通知の登録が完了しました。";
  var DENY_TEXT  = "{{denied_text}}"  || "ブラウザの設定で通知がブロックされています。設定から許可してください。";
  var SKIP_KEY   = "cx_push_asked";

  // 一度断った人に毎回聞かない（同じブラウザでは再表示しない）
  try { if (localStorage.getItem(SKIP_KEY)) return; } catch (e) {}

  // ポップアップがブロックされないよう、確認前に環境判定を済ませておく
  try { api.prepare && api.prepare(); } catch (e) {}

  // 描画直後にconfirmを出すと不自然なので少しだけ待つ
  setTimeout(function () {
    var ok = false;
    try { ok = window.confirm(ASK_TEXT); } catch (e) { return; }
    try { localStorage.setItem(SKIP_KEY, "1"); } catch (e) {}
    if (!ok) return;

    api.requestPermission(function (r) {
      var s = r && r.status;
      if (s === "subscribed" || s === "already") { try { window.alert(DONE_TEXT); } catch (e) {} }
      else if (s === "denied") { try { window.alert(DENY_TEXT); } catch (e) {} }
      else if (s === "popup_blocked") {
        // ブラウザにブロックされた場合は再挑戦できるよう、抑止フラグを戻す
        try { localStorage.removeItem(SKIP_KEY); } catch (e) {}
      }
    });
  }, 400);
})();`,
  fields: [
    { key: "confirm_text", label: "確認メッセージ", type: "textarea", default: "最新情報やお得なクーポンを通知でお届けします。受け取りますか？" },
    { key: "done_text", label: "登録完了メッセージ", type: "text", default: "通知の登録が完了しました。" },
    { key: "denied_text", label: "ブロック時メッセージ", type: "text", default: "ブラウザの設定で通知がブロックされています。設定から許可してください。" },
  ],
};

export const PLATFORM_TEMPLATE_PRESETS: PlatformTemplatePreset[] = [
  MODAL_BASIC,
  MODAL_COUPON_MULTI,
  MODAL_IMAGE_HERO,
  MODAL_COUNTDOWN,
  BANNER_BASIC,
  BANNER_FLOATING_CARD,
  BANNER_COUPON,
  BANNER_FREESHIP,
  TOAST_BASIC,
  TOAST_SOCIAL_PROOF,
  LAUNCHER_BASIC,
  LAUNCHER_ICON_PULSE,
  PUSH_OPTIN_CONFIRM,
];
