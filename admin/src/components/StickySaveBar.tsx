import React from "react";

type StickySaveBarProps = {
  visible: boolean;
  dirty?: boolean;
  saving?: boolean;
  error?: string;
  message?: string;
  onSave?: () => void;
  onSecondary?: () => void;
  saveLabel?: string;
  secondaryLabel?: string;
  saveDisabled?: boolean;
};

export default function StickySaveBar({
  visible,
  dirty = false,
  saving = false,
  error = "",
  message = "",
  onSave,
  onSecondary,
  saveLabel = "保存",
  secondaryLabel = "閉じる",
  saveDisabled = false,
}: StickySaveBarProps) {
  if (!visible) return null;

  const status = saving
    ? { text: "保存中です...", color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" }
    : error
    ? { text: error, color: "#b91c1c", bg: "#fee2e2", border: "#fca5a5" }
    : dirty
    ? { text: "未保存の変更があります。", color: "#b45309", bg: "#fef3c7", border: "#fcd34d" }
    : message
    ? { text: message, color: "#166534", bg: "#dcfce7", border: "#86efac" }
    : { text: "この画面の保存操作はここに集約されています。", color: "#475569", bg: "#f8fafc", border: "#cbd5e1" };

  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 75,
        width: "min(560px, calc(100vw - 32px))",
        background: "rgba(255,255,255,.94)",
        backdropFilter: "blur(14px)",
        border: `1px solid ${status.border}`,
        borderRadius: 16,
        boxShadow: "0 18px 40px rgba(15,23,42,.18)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          background: status.bg,
          color: status.color,
          fontSize: 13,
          fontWeight: 700,
          borderBottom: "1px solid rgba(20,44,68,.06)",
        }}
      >
        {status.text}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 16px",
          flexWrap: "wrap",
        }}
      >
        <div className="small" style={{ color: "#64748b" }}>
          右側の編集内容は一覧を見ながらそのまま調整できます。
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {onSecondary ? (
            <button className="btn" onClick={onSecondary}>
              {secondaryLabel}
            </button>
          ) : null}
          {onSave ? (
            <button className="btn btn--primary" onClick={onSave} disabled={saving || saveDisabled}>
              {saving ? "保存中..." : saveLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
