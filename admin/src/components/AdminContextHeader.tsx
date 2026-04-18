import React from "react";
import { Link } from "react-router-dom";

type RoleKey = "owner" | "admin" | "member" | "viewer" | null;

type AdminContextHeaderProps = {
  workspaceName: string;
  workspaceDescription?: string;
  siteName?: string;
  role: RoleKey;
  canAccess: (key: "analytics" | "ai" | "members" | "billing") => boolean;
};

function roleMeta(role: RoleKey) {
  if (role === "owner") return { label: "Owner", color: "#7c2d12", bg: "#ffedd5", border: "#fdba74" };
  if (role === "admin") return { label: "Admin", color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" };
  if (role === "member") return { label: "Member", color: "#166534", bg: "#dcfce7", border: "#86efac" };
  if (role === "viewer") return { label: "Viewer", color: "#475569", bg: "#e2e8f0", border: "#cbd5e1" };
  return { label: "No Role", color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" };
}

export default function AdminContextHeader({
  workspaceName,
  workspaceDescription,
  siteName,
  role,
  canAccess,
}: AdminContextHeaderProps) {
  const roleBadge = roleMeta(role);

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        padding: "18px 28px 12px",
        backdropFilter: "blur(14px)",
        background: "linear-gradient(180deg, rgba(243,247,251,.96), rgba(243,247,251,.84))",
        borderBottom: "1px solid rgba(20,44,68,.08)",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,.82)",
          border: "1px solid rgba(20,44,68,.08)",
          borderRadius: 18,
          boxShadow: "0 8px 20px rgba(20,44,68,.06)",
          padding: "14px 18px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{workspaceName || "ワークスペース未選択"}</div>
            {siteName ? (
              <div style={{ fontSize: 14, color: "var(--muted)" }}>
                / <strong style={{ color: "var(--text)", fontWeight: 700 }}>{siteName}</strong>
              </div>
            ) : null}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                borderRadius: 999,
                background: roleBadge.bg,
                color: roleBadge.color,
                border: `1px solid ${roleBadge.border}`,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {roleBadge.label}
            </span>
          </div>
          {workspaceDescription ? (
            <div className="small" style={{ lineHeight: 1.6 }}>{workspaceDescription}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", minWidth: 220 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link className="btn btn--sm" to="/sites">サイト管理</Link>
            {canAccess("members") ? <Link className="btn btn--sm" to="/workspace/members">メンバー</Link> : null}
            {canAccess("billing") ? <Link className="btn btn--sm" to="/workspace/billing">Billing</Link> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
