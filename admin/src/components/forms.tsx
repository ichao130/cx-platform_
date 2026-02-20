import React from 'react';

export function TextAreaList(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  help?: string;
}) {
  return (
    <div style={{ width: '100%' }}>
      <div className="h2">{props.label}</div>
      {props.help ? <div className="small">{props.help}</div> : null}
      <div style={{ height: 6 }} />
      <textarea
        className="input"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
      />
    </div>
  );
}

export function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}
