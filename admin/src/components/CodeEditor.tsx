import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  suggestionsFor,
  tokenBeforeCaret,
  filterSuggestions,
  cssValueContext,
  inCssValuePosition,
  valueSuggestionsFor,
  type CodeLang,
  type Suggestion,
} from './codeSuggestions';

type Props = {
  value: string;
  onChange: (v: string) => void;
  minHeight?: number;
  placeholder?: string;
  /** 入力候補の種類。省略時は候補を出さない */
  language?: CodeLang;
};

const FONT_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const FONT_SIZE = 13;
const LINE_HEIGHT = FONT_SIZE * 1.65;
const PAD_X = 14;
const PAD_Y = 10;
const GUTTER_MIN_W = 46;

/** 等幅フォントの1文字分の幅。実測して使い回す（候補の表示位置に使う） */
let charWidthCache = 0;
function charWidth(): number {
  if (charWidthCache) return charWidthCache;
  try {
    const c = document.createElement('canvas').getContext('2d');
    if (c) {
      c.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
      charWidthCache = c.measureText('0').width || 7.8;
    }
  } catch {
    /* 計測できなければ既定値で十分 */
  }
  return charWidthCache || 7.8;
}

const KIND_STYLE: Record<Suggestion['kind'], { label: string; color: string }> = {
  var: { label: '変数', color: '#89b4fa' },
  attr: { label: '属性', color: '#a6e3a1' },
  tag: { label: 'タグ', color: '#f9e2af' },
  prop: { label: 'CSS', color: '#f5c2e7' },
  value: { label: '値', color: '#94e2d5' },
  state: { label: '状態', color: '#b4befe' },
  snippet: { label: '定型', color: '#fab387' },
  fn: { label: 'JS', color: '#cba6f7' },
};

/**
 * 行番号付きコードエディター風テキストエリア。
 *
 * language を渡すと入力候補が出る。
 * 候補は codeSuggestions.ts にあり、MOKKEDA固有のもの（差し込み変数・data-cx-*）を
 * 一般的なHTML/CSSより先に出すようにしている。覚えていなくても書けることが狙い。
 */
export function CodeEditor({ value, onChange, minHeight = 220, placeholder, language }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const numRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  // 候補を出すきっかけになった語。確定時にこの長さぶんを置き換える
  const [token, setToken] = useState('');
  // Esc で閉じたあと、カーソルを動かすまで出し直さないための記録
  const dismissedAt = useRef<number | null>(null);
  // 次の再描画後に置きたいカーソル位置。
  // ★requestAnimationFrame で置くと React の再描画より先に走ることがあり、
  //   古い文字列長に丸められて back（引用符の中に入れる等）が効かなくなる。
  //   value の更新を見てから置くこと。
  const pendingCaret = useRef<number | null>(null);

  const all = useMemo(() => (language ? suggestionsFor(language) : []), [language]);
  const lineCount = value.split('\n').length;
  const gutterW = Math.max(GUTTER_MIN_W, String(lineCount).length * 8 + 26);

  const close = useCallback(() => {
    setItems([]);
    setActive(0);
    setToken('');
  }, []);

  /** カーソル位置から候補を出し直す */
  const refresh = useCallback(() => {
    const ta = taRef.current;
    if (!ta || !language) return close();

    const caret = ta.selectionStart;
    // 範囲選択中は邪魔なので出さない
    if (caret !== ta.selectionEnd) return close();
    if (dismissedAt.current === caret) return;
    dismissedAt.current = null;

    const before = value.slice(0, caret);

    let tk: string;
    let found: Suggestion[];

    // ★CSSで「プロパティ: 値」の値側にいるときは、値だけを出す。
    //   ここでプロパティ名の候補を出すと必ず誤爆する（display: dis… など）。
    const lineBefore = before.slice(before.lastIndexOf('\n') + 1);
    if (language === 'css' && inCssValuePosition(lineBefore)) {
      const vctx = cssValueContext(lineBefore);
      // 複数値や関数の途中。語の候補に落とすと的外れなものが並ぶので黙る
      if (!vctx) return close();
      const [prop, partial] = vctx;
      const vals = valueSuggestionsFor(prop, partial);
      // 値の候補を持たないプロパティなら、ここでは何も出さない
      if (!vals.length) return close();
      if (vals.length === 1 && vals[0].label.toLowerCase() === partial.toLowerCase()) return close();
      tk = partial;
      found = vals;
    } else {
      tk = tokenBeforeCaret(before);
      // 1文字だと候補が多すぎて邪魔になる。ただし {{ と - を含む語は即出す
      const worthIt = tk.length >= 2 || tk.endsWith('{{');
      if (!worthIt) return close();

      found = filterSuggestions(all, tk);
      if (!found.length) return close();
      // 書き終わった語に対して同じ候補だけを出しても選ぶものが無い
      if (found.length === 1 && found[0].label.toLowerCase() === tk.toLowerCase()) return close();
    }

    // 等幅前提でカーソルの行・桁から表示位置を出す。
    // ★画面座標(position: fixed)で出すこと。
    //   エディタの親に overflow:auto があると、absolute では候補が切り取られる
    //   （テンプレート編集はモーダル内のスクロール領域に置かれている）。
    const lines = before.split('\n');
    const line = lines.length - 1;
    const col = lines[lines.length - 1].length;
    const rect = ta.getBoundingClientRect();
    const caretX = rect.left + PAD_X + col * charWidth() - ta.scrollLeft;
    const caretY = rect.top + PAD_Y + (line + 1) * LINE_HEIGHT - ta.scrollTop;

    const W = 300;
    const H = 268;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // 下に入らなければカーソルの上に出す
    const below = caretY + 6;
    const flip = below + H > vh && caretY - LINE_HEIGHT - H > 0;

    setPos({
      left: Math.max(8, Math.min(caretX, vw - W - 8)),
      top: flip ? caretY - LINE_HEIGHT - H - 2 : below,
    });
    setToken(tk);
    setItems(found);
    setActive(0);
  }, [all, language, value, gutterW, close]);

  /** 候補を確定して本文に差し込む */
  const accept = useCallback(
    (s: Suggestion) => {
      const ta = taRef.current;
      if (!ta) return;
      const caret = ta.selectionStart;
      const insert = s.insert ?? s.label;
      const start = caret - token.length;
      const next = value.slice(0, start) + insert + value.slice(caret);
      const nextCaret = start + insert.length - (s.back ?? 0);

      onChange(next);
      close();
      // 確定した語はそのまま候補にも一致するため、放っておくと同じ候補が出たままになる。
      // 確定後のカーソル位置では開き直さない（さらに入力すれば開く）。
      dismissedAt.current = nextCaret;
      pendingCaret.current = nextCaret;
    },
    [value, token, onChange, close]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (items.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => (i + 1) % items.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => (i - 1 + items.length) % items.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        accept(items[active]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        dismissedAt.current = taRef.current?.selectionStart ?? null;
        close();
        return;
      }
    }

    // 候補が出ていないときの Tab は、フォーカス移動ではなくインデントにする
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const s = ta.selectionStart;
      const next = value.slice(0, s) + '  ' + value.slice(ta.selectionEnd);
      onChange(next);
      pendingCaret.current = s + 2;
    }
  };

  const handleScroll = () => {
    if (numRef.current && taRef.current) {
      numRef.current.scrollTop = taRef.current.scrollTop;
    }
    if (items.length) close();
  };

  // 画面座標で置いているので、外側がスクロール・リサイズしたらずれる。閉じる
  useEffect(() => {
    if (!items.length) return;
    const onMove = () => close();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [items.length, close]);

  // 値が変わったら、予約されたカーソル位置を適用してから候補を出し直す
  useEffect(() => {
    const el = taRef.current;
    if (pendingCaret.current != null && el) {
      const c = pendingCaret.current;
      pendingCaret.current = null;
      el.focus();
      el.setSelectionRange(c, c);
    }
    if (document.activeElement === taRef.current) refresh();
    // refresh は value に依存している。値が変わるたび評価したい
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'relative' }} ref={boxRef}>
      <div
        style={{
          display: 'flex',
          border: '1px solid rgba(20,44,68,.18)',
          borderRadius: 10,
          overflow: 'hidden',
          fontFamily: FONT_FAMILY,
          fontSize: FONT_SIZE,
          lineHeight: `${LINE_HEIGHT}px`,
          background: '#1a1b26',
          boxShadow: '0 2px 8px rgba(0,0,0,.18)',
        }}
      >
        {/* 行番号 */}
        <div
          ref={numRef}
          style={{
            padding: `${PAD_Y}px 10px ${PAD_Y}px 14px`,
            color: '#4a5580',
            textAlign: 'right',
            userSelect: 'none',
            overflow: 'hidden',
            background: '#13141f',
            borderRight: '1px solid rgba(255,255,255,.06)',
            width: gutterW,
            flexShrink: 0,
            boxSizing: 'border-box',
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} style={{ lineHeight: `${LINE_HEIGHT}px` }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* テキストエリア */}
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={onKeyDown}
          onKeyUp={(e) => {
            // カーソル移動でも出し直す（文字入力は value 側の effect が拾う）
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) refresh();
          }}
          onClick={refresh}
          onBlur={() => window.setTimeout(close, 120)}
          placeholder={placeholder}
          spellCheck={false}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: '#cdd6f4',
            caretColor: '#89b4fa',
            padding: `${PAD_Y}px ${PAD_X}px`,
            resize: 'vertical',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            minHeight,
            overflowY: 'auto',
            tabSize: 2,
          }}
        />
      </div>

      {/* 入力候補。
          ★親に overflow:auto があると absolute では切り取られるため、
            body 直下に出して position:fixed で置く。 */}
      {items.length > 0 && createPortal(
        <div
          role="listbox"
          aria-label="入力候補"
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            zIndex: 4000,
            minWidth: 260,
            maxWidth: 420,
            maxHeight: 268,
            overflowY: 'auto',
            background: '#20212e',
            border: '1px solid rgba(255,255,255,.14)',
            borderRadius: 9,
            boxShadow: '0 10px 28px rgba(0,0,0,.45)',
            padding: 4,
          }}
          // クリックで textarea の blur が先に走らないようにする
          onMouseDown={(e) => e.preventDefault()}
        >
          {items.map((s, i) => {
            const k = KIND_STYLE[s.kind];
            return (
              <div
                key={s.label + i}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => accept(s)}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  padding: '5px 9px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: i === active ? 'rgba(137,180,250,.17)' : 'transparent',
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '.04em',
                    color: k.color,
                    border: `1px solid ${k.color}55`,
                    borderRadius: 4,
                    padding: '1px 4px',
                    flexShrink: 0,
                  }}
                >
                  {k.label}
                </span>
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: 12.5,
                    color: '#cdd6f4',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {s.label}
                </span>
                {s.detail && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 11,
                      color: 'rgba(205,214,244,.45)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flexShrink: 1,
                      minWidth: 0,
                    }}
                  >
                    {s.detail}
                  </span>
                )}
              </div>
            );
          })}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,.08)',
              marginTop: 3,
              padding: '5px 9px 2px',
              fontSize: 10.5,
              color: 'rgba(205,214,244,.35)',
            }}
          >
            ↑↓ 選択 / Enter・Tab 確定 / Esc 閉じる
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
