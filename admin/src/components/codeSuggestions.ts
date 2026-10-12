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

export type SuggestKind = 'var' | 'attr' | 'tag' | 'prop' | 'value' | 'state' | 'snippet' | 'fn';

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
  { label: '[data-cx-copied]', kind: 'state', detail: 'コピー直後に付く（約2秒）' },
  { label: '[data-cx-choice]', kind: 'state', detail: '選択肢ボタンに付く' },
  { label: '[data-selected]', kind: 'state', detail: '選択中の選択肢に付く' },
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
  // レイアウト
  'display', 'position', 'top', 'right', 'bottom', 'left', 'inset', 'z-index',
  'float', 'clear', 'visibility', 'overflow', 'overflow-x', 'overflow-y',
  'box-sizing', 'aspect-ratio',
  // サイズ
  'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
  // 余白
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'margin-inline', 'margin-block',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'padding-inline', 'padding-block',
  // Flex / Grid
  'flex', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'align-items', 'align-self', 'align-content', 'justify-content', 'justify-items',
  'justify-self', 'order', 'gap', 'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row', 'grid-area',
  // 文字
  'color', 'font-family', 'font-size', 'font-weight', 'font-style',
  'line-height', 'letter-spacing', 'text-align', 'text-decoration', 'text-transform',
  'text-overflow', 'text-shadow', 'white-space', 'word-break', 'overflow-wrap',
  'vertical-align', 'list-style', 'writing-mode',
  // 背景・枠
  'background', 'background-color', 'background-image', 'background-size',
  'background-position', 'background-repeat',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-color', 'border-width', 'border-style', 'border-radius',
  'box-shadow', 'outline', 'outline-offset', 'opacity',
  // 見た目・動き
  'transform', 'transform-origin', 'transition', 'animation', 'filter',
  'backdrop-filter', 'mix-blend-mode', 'object-fit', 'object-position',
  // 操作
  'cursor', 'pointer-events', 'user-select', 'touch-action', 'resize', 'content',
];

/**
 * プロパティごとの値の候補。
 * `display: ` まで書いたところで値を出すために使う。
 * 全プロパティ分は現実的でないので、選択肢が決まっていてよく使うものだけ。
 */
export const CSS_VALUES: Record<string, string[]> = {
  display: ['flex', 'grid', 'block', 'inline-block', 'inline-flex', 'inline', 'none', 'contents'],
  position: ['relative', 'absolute', 'fixed', 'sticky', 'static'],
  'flex-direction': ['row', 'column', 'row-reverse', 'column-reverse'],
  'flex-wrap': ['wrap', 'nowrap', 'wrap-reverse'],
  'align-items': ['center', 'flex-start', 'flex-end', 'stretch', 'baseline'],
  'align-self': ['center', 'flex-start', 'flex-end', 'stretch', 'auto'],
  'align-content': ['center', 'flex-start', 'flex-end', 'space-between', 'stretch'],
  'justify-content': ['center', 'flex-start', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
  'text-align': ['left', 'center', 'right', 'justify'],
  'text-decoration': ['none', 'underline', 'line-through'],
  'text-transform': ['none', 'uppercase', 'lowercase', 'capitalize'],
  'text-overflow': ['ellipsis', 'clip'],
  'font-weight': ['400', '500', '600', '700', '900', 'bold', 'normal'],
  'font-style': ['normal', 'italic'],
  'white-space': ['nowrap', 'normal', 'pre-wrap', 'pre-line'],
  'word-break': ['break-all', 'break-word', 'normal', 'keep-all'],
  'overflow-wrap': ['break-word', 'anywhere', 'normal'],
  overflow: ['hidden', 'auto', 'scroll', 'visible'],
  'overflow-x': ['hidden', 'auto', 'scroll', 'visible'],
  'overflow-y': ['hidden', 'auto', 'scroll', 'visible'],
  visibility: ['visible', 'hidden'],
  'box-sizing': ['border-box', 'content-box'],
  'object-fit': ['cover', 'contain', 'fill', 'none', 'scale-down'],
  cursor: ['pointer', 'default', 'not-allowed', 'text', 'grab', 'wait'],
  'pointer-events': ['none', 'auto'],
  'user-select': ['none', 'auto', 'text'],
  resize: ['none', 'vertical', 'horizontal', 'both'],
  'border-style': ['solid', 'dashed', 'dotted', 'none'],
  'background-size': ['cover', 'contain', 'auto'],
  'background-repeat': ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'],
  'background-position': ['center', 'top', 'bottom', 'left', 'right'],
  'vertical-align': ['middle', 'top', 'bottom', 'baseline'],
  'list-style': ['none', 'disc', 'decimal'],
  float: ['left', 'right', 'none'],
  clear: ['both', 'left', 'right', 'none'],
  'mix-blend-mode': ['multiply', 'screen', 'overlay', 'normal'],
  'touch-action': ['manipulation', 'none', 'auto'],
};

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
 * CSSの「値を書く位置」にいるか。`:` のうしろ、`;` の手前。
 *
 * ★cssValueContext が null でも、値の位置なら語の候補に落とさないこと。
 *   `margin: 0 au` のような複数値の途中で語の候補を出すと、
 *   関係のない `{{cta_url}}` などが並んでしまう。
 */
export function inCssValuePosition(lineBeforeCaret: string): boolean {
  return /(?:^|[;{])\s*[a-zA-Z-]+\s*:\s*[^;{}]*$/.test(lineBeforeCaret);
}

/**
 * CSSで「プロパティ: 値」を書いている途中かを判定する。
 *
 * 値を書いている位置でプロパティ名の候補を出すと必ず誤爆するので、
 * ここで切り分けて値だけを出す。
 *
 * @param lineBeforeCaret カーソルがある行の、カーソルより前の部分
 * @returns [プロパティ名, 入力中の値]。値の位置でなければ null
 */
export function cssValueContext(lineBeforeCaret: string): [string, string] | null {
  const m = /(?:^|[;{])\s*([a-zA-Z-]+)\s*:\s*([^;{}]*)$/.exec(lineBeforeCaret);
  if (!m) return null;
  const partial = m[2];
  // 複数値（margin: 0 auto）や関数（rgba(…）の途中は対象外。誤った置換を避ける
  if (/[\s(),]/.test(partial)) return null;
  return [m[1].toLowerCase(), partial];
}

/**
 * プロパティに対する値の候補。
 * 値はまだ1文字も書いていないこともあるので、空でも全件返す。
 */
export function valueSuggestionsFor(prop: string, partial: string, limit = 12): Suggestion[] {
  const vals = CSS_VALUES[prop];
  if (!vals) return [];
  const q = partial.toLowerCase();
  return vals
    .filter((v) => !q || v.toLowerCase().startsWith(q))
    .slice(0, limit)
    .map((v): Suggestion => ({ label: v, kind: 'value', detail: prop }));
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
