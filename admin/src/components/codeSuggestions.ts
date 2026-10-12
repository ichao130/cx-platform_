// admin/src/components/codeSuggestions.ts
//
// テンプレートエディタの入力候補。
//
// MOKKEDA固有のもの（差し込み変数・data-cx-* 属性）は、思い出せないと手が止まる。
// 一般的なHTML/CSSの候補より、まずこちらが出ることを優先している。
//
// ★ここの値は public/sdk.js の実装と一致していること。
//   差し込み変数は normalizeCreative()、属性は querySelector("[data-cx-...]") を参照。
//   SDK側を変えたらここも直すこと。

export type SuggestKind = 'var' | 'attr' | 'tag' | 'prop' | 'value' | 'snippet' | 'fn';

export type Suggestion = {
  /** 候補リストに出る文字列。入力中の語とはこれで突き合わせる */
  label: string;
  /** 実際に挿入する文字列。省略時は label をそのまま挿入 */
  insert?: string;
  /** 挿入後にカーソルを何文字戻すか（引用符の中に入れたいときなど） */
  back?: number;
  /** 候補の右に出る短い説明 */
  detail?: string;
  kind: SuggestKind;
};

/* ============================================================
   差し込み変数（HTML・CSS・JS すべてで使える）
   sdk.js の renderTemplate() が {{key}} と {{#if key}}…{{/if}} を処理する。
   ============================================================ */

/** sdk.js の normalizeCreative() が必ず埋める組み込みキー */
export const CREATIVE_VARS: Suggestion[] = [
  { label: '{{title}}',        kind: 'var', detail: 'タイトル' },
  { label: '{{body}}',         kind: 'var', detail: '本文' },
  { label: '{{image_url}}',    kind: 'var', detail: '画像URL' },
  { label: '{{cta_text}}',     kind: 'var', detail: 'ボタン文言（既定: OK）' },
  { label: '{{cta_url}}',      kind: 'var', detail: 'ボタンのリンク先' },
  { label: '{{cta_url_text}}', kind: 'var', detail: 'リンク文言（既定: 詳細を見る）' },
  { label: '{{coupon_code}}',  kind: 'var', detail: 'クーポンコード' },
  {
    label: '{{#if}}',
    insert: '{{#if key}}\n\n{{/if}}',
    back: 9,
    kind: 'snippet',
    detail: '値があるときだけ出す',
  },
];

/* ============================================================
   data-cx-* 属性
   ------------------------------------------------------------
   2種類ある。混同するとハマるので分けている。
     ① 作者が書く  … SDKが querySelector で探して動きを配線する
     ② SDKが付ける … 作者は書かない。CSSのセレクタとしてだけ使う
   ============================================================ */

/** ① 作者がHTMLに書く属性 */
export const CX_ATTRS: Suggestion[] = [
  { label: 'data-cx-close', kind: 'attr', detail: '押すと閉じる' },
  {
    label: 'data-cx-copy',
    insert: 'data-cx-copy=""',
    back: 1,
    kind: 'attr',
    detail: '押すと値をコピー',
  },
  { label: 'data-cx-launcher-open', kind: 'attr', detail: 'ランチャー: モーダルを開く' },
  { label: 'data-cx-choices', kind: 'attr', detail: '質問接客: 選択肢の差し込み先' },
  { label: 'data-cx-submit', kind: 'attr', detail: '質問接客: 送信ボタン' },
  { label: 'data-cx-thanks', kind: 'attr', detail: '質問接客: お礼を出す領域' },
  { label: 'data-cx-thanks-message', kind: 'attr', detail: '質問接客: お礼の文言' },
  { label: 'data-cx-thanks-cta', kind: 'attr', detail: '質問接客: お礼のボタン' },
];

/** ② SDKが実行時に付ける。CSSセレクタとして使う（HTMLには書かない） */
export const CX_STATE_SELECTORS: Suggestion[] = [
  { label: '[data-cx-copied]', kind: 'value', detail: 'コピー直後に付く（約2秒）' },
  { label: '[data-cx-choice]', kind: 'value', detail: '選択肢ボタンに付く' },
  { label: '[data-selected]', kind: 'value', detail: '選択中の選択肢に付く' },
];

/* ============================================================
   HTML
   ============================================================ */

const HTML_TAGS = [
  'div', 'span', 'p', 'a', 'img', 'button', 'section', 'header', 'footer',
  'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'strong', 'em', 'small', 'br', 'hr',
  'input', 'label', 'form', 'select', 'option', 'textarea', 'svg', 'picture', 'source',
];

const HTML_ATTRS: Suggestion[] = [
  { label: 'class', insert: 'class=""', back: 1, kind: 'attr' },
  { label: 'id', insert: 'id=""', back: 1, kind: 'attr' },
  { label: 'style', insert: 'style=""', back: 1, kind: 'attr' },
  { label: 'href', insert: 'href=""', back: 1, kind: 'attr' },
  { label: 'src', insert: 'src=""', back: 1, kind: 'attr' },
  { label: 'alt', insert: 'alt=""', back: 1, kind: 'attr' },
  { label: 'title', insert: 'title=""', back: 1, kind: 'attr' },
  { label: 'type', insert: 'type=""', back: 1, kind: 'attr' },
  { label: 'value', insert: 'value=""', back: 1, kind: 'attr' },
  { label: 'placeholder', insert: 'placeholder=""', back: 1, kind: 'attr' },
  { label: 'target', insert: 'target="_blank"', kind: 'attr', detail: '別タブで開く' },
  { label: 'rel', insert: 'rel="noopener noreferrer"', kind: 'attr', detail: 'target="_blank" と一緒に' },
  { label: 'loading', insert: 'loading="lazy"', kind: 'attr', detail: '画像の遅延読み込み' },
  { label: 'aria-label', insert: 'aria-label=""', back: 1, kind: 'attr' },
];

const HTML_SNIPPETS: Suggestion[] = [
  {
    label: 'closebtn',
    insert: '<button class="cx-close" data-cx-close aria-label="閉じる">×</button>',
    kind: 'snippet',
    detail: '右上の閉じるボタン',
  },
  {
    label: 'copybtn',
    insert: '<button class="cx-copy" data-cx-copy="{{coupon_code}}">コピー</button>',
    kind: 'snippet',
    detail: 'クーポンのコピーボタン',
  },
  {
    label: 'cta',
    insert: '<a class="cx-cta" href="{{cta_url}}" target="_blank" rel="noopener noreferrer">{{cta_text}}</a>',
    kind: 'snippet',
    detail: 'CTAボタン',
  },
];

/* ============================================================
   CSS
   ============================================================ */

const CSS_PROPS = [
  'align-items', 'background', 'background-color', 'background-image', 'border',
  'border-radius', 'bottom', 'box-shadow', 'box-sizing', 'color', 'cursor',
  'display', 'flex', 'flex-direction', 'flex-wrap', 'font-family', 'font-size',
  'font-weight', 'gap', 'grid-template-columns', 'height', 'justify-content',
  'left', 'letter-spacing', 'line-height', 'margin', 'max-width', 'min-height',
  'object-fit', 'opacity', 'overflow', 'padding', 'position', 'right',
  'text-align', 'text-decoration', 'top', 'transform', 'transition',
  'white-space', 'width', 'word-break', 'z-index',
];

const CSS_SNIPPETS: Suggestion[] = [
  {
    label: 'flex-center',
    insert: 'display: flex;\nalign-items: center;\njustify-content: center;',
    kind: 'snippet',
    detail: '中央寄せ',
  },
  {
    label: 'media-sp',
    insert: '@media (max-width: 480px) {\n  \n}',
    back: 3,
    kind: 'snippet',
    detail: 'スマホ向け',
  },
];

/* ============================================================
   JS
   テンプレートのJSは表示直後に実行される。
   ============================================================ */

const JS_SUGGESTIONS: Suggestion[] = [
  { label: 'document.querySelector', insert: "document.querySelector('')", back: 2, kind: 'fn' },
  { label: 'document.querySelectorAll', insert: "document.querySelectorAll('')", back: 2, kind: 'fn' },
  { label: 'addEventListener', insert: "addEventListener('click', function () {\n  \n})", back: 3, kind: 'fn' },
  { label: 'classList.add', insert: "classList.add('')", back: 2, kind: 'fn' },
  { label: 'classList.remove', insert: "classList.remove('')", back: 2, kind: 'fn' },
  { label: 'classList.toggle', insert: "classList.toggle('')", back: 2, kind: 'fn' },
  { label: 'setAttribute', insert: "setAttribute('', '')", back: 6, kind: 'fn' },
  { label: 'navigator.clipboard.writeText', insert: 'navigator.clipboard.writeText()', back: 1, kind: 'fn', detail: 'クリップボードへコピー' },
  { label: 'setTimeout', insert: 'setTimeout(function () {\n  \n}, 1000)', back: 9, kind: 'fn' },
  { label: 'console.log', insert: 'console.log()', back: 1, kind: 'fn' },
  { label: 'textContent', kind: 'fn' },
  { label: 'innerHTML', kind: 'fn' },
  { label: 'preventDefault', insert: 'preventDefault()', kind: 'fn' },
];

/* ============================================================
   言語ごとの候補一覧
   ============================================================ */

export type CodeLang = 'html' | 'css' | 'js';

const htmlList: Suggestion[] = [
  ...CREATIVE_VARS,
  ...CX_ATTRS,
  ...HTML_SNIPPETS,
  ...HTML_ATTRS,
  ...HTML_TAGS.map((t): Suggestion => ({
    label: t,
    insert: `<${t}></${t}>`,
    back: t.length + 3,
    kind: 'tag',
  })),
];

const cssList: Suggestion[] = [
  ...CX_STATE_SELECTORS,
  ...CSS_SNIPPETS,
  ...CREATIVE_VARS.filter((s) => s.kind === 'var'),
  ...CSS_PROPS.map((p): Suggestion => ({
    label: p,
    insert: `${p}: ;`,
    back: 1,
    kind: 'prop',
  })),
];

const jsList: Suggestion[] = [
  ...JS_SUGGESTIONS,
  ...CREATIVE_VARS.filter((s) => s.kind === 'var'),
];

export function suggestionsFor(lang: CodeLang): Suggestion[] {
  if (lang === 'css') return cssList;
  if (lang === 'js') return jsList;
  return htmlList;
}

/**
 * カーソル直前の「入力中の語」を取り出す。
 *
 * 差し込み変数は `{{` から書き始めるので、`{` も語の一部として扱う。
 * `data-cx-` のハイフンや CSS プロパティのハイフンも語に含める。
 */
export function tokenBeforeCaret(textBeforeCaret: string): string {
  const m = /[A-Za-z0-9_${}#[\]-]*$/.exec(textBeforeCaret);
  return m ? m[0] : '';
}

/**
 * 入力中の語に合う候補を絞り込む。
 *
 * 突き合わせは2段階。
 *   ① 入力そのままの前方一致（記号も見る）
 *   ② 記号を落とした小文字どうしの一致（`cx-co` → `data-cx-copy`）
 *
 * ★`{{` や `[` で書き始めたときは、その記法の候補だけに絞ること。
 *   記号を落として突き合わせると `{{ti` が属性の `title` にも一致してしまい、
 *   確定すると `{{` を食って `title=""` という壊れた出力になる。
 */
export function filterSuggestions(all: Suggestion[], token: string, limit = 12): Suggestion[] {
  const raw = token.toLowerCase();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const q = norm(token);
  if (!q) return [];

  let pool = all;
  if (raw.startsWith('{{')) pool = all.filter((s) => s.label.startsWith('{{'));
  else if (raw.startsWith('[')) pool = all.filter((s) => s.label.startsWith('['));

  const scored: Array<{ s: Suggestion; score: number }> = [];
  for (const s of pool) {
    const lraw = s.label.toLowerCase();
    const l = norm(s.label);
    if (!l) continue;
    let score = -1;
    if (lraw.startsWith(raw)) score = 0;     // 入力そのままの前方一致が最優先
    else if (l.startsWith(q)) score = 1;     // 記号を落とした前方一致
    else {
      const i = l.indexOf(q);
      if (i > 0) score = 2 + i;              // 部分一致はうしろほど弱く
    }
    if (score >= 0) scored.push({ s, score });
  }

  scored.sort((a, b) => a.score - b.score || a.s.label.length - b.s.label.length);
  return scored.slice(0, limit).map((x) => x.s);
}
