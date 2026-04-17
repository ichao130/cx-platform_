import React from "react";

type RightDrawerProps = {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
  width?: number;
  children: React.ReactNode;
};

export default function RightDrawer({
  open,
  title,
  description,
  onClose,
  actions,
  width = 980,
  children,
}: RightDrawerProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(15,23,42,.2)",
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <aside
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100vh",
          width: `min(${width}px, calc(100vw - 24px))`,
          background: "linear-gradient(180deg,#ffffff,#f8fbff)",
          borderLeft: "1px solid rgba(20,44,68,.1)",
          boxShadow: "0 24px 80px rgba(15,23,42,.18)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "rgba(255,255,255,.9)",
            backdropFilter: "blur(14px)",
            borderBottom: "1px solid rgba(20,44,68,.08)",
            padding: "20px 24px 18px",
          }}
        >
          <div className="page-header" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}>
            <div className="page-header__meta">
              <div className="h1" style={{ marginBottom: 6 }}>{title}</div>
              {description ? (
                <div className="small" style={{ maxWidth: 680 }}>{description}</div>
              ) : null}
            </div>
            <div className="page-header__actions" style={{ gap: 8 }}>
              {actions}
              <button className="btn btn--ghost" onClick={onClose}>
                ✕ 閉じる
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "22px 24px 96px",
          }}
        >
          {children}
        </div>
      </aside>
    </div>
  );
}
