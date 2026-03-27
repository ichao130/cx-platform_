import React, { useRef } from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  minHeight?: number;
  placeholder?: string;
};

/**
 * 行番号付きコードエディター風テキストエリア
 */
export function CodeEditor({ value, onChange, minHeight = 220, placeholder }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const numRef = useRef<HTMLDivElement>(null);

  const lineCount = value.split('\n').length;

  const handleScroll = () => {
    if (numRef.current && taRef.current) {
      numRef.current.scrollTop = taRef.current.scrollTop;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        border: '1px solid rgba(20,44,68,.18)',
        borderRadius: 10,
        overflow: 'hidden',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 13,
        lineHeight: '1.65',
        background: '#1a1b26',
        boxShadow: '0 2px 8px rgba(0,0,0,.18)',
      }}
    >
      {/* 行番号 */}
      <div
        ref={numRef}
        style={{
          padding: '10px 10px 10px 14px',
          color: '#4a5580',
          textAlign: 'right',
          userSelect: 'none',
          overflow: 'hidden',
          background: '#13141f',
          borderRight: '1px solid rgba(255,255,255,.06)',
          minWidth: 46,
          flexShrink: 0,
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} style={{ lineHeight: '1.65' }}>
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
        placeholder={placeholder}
        spellCheck={false}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: '#cdd6f4',
          caretColor: '#89b4fa',
          padding: '10px 14px',
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
  );
}
