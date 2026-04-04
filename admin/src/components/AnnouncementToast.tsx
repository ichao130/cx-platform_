import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";

type AnnouncementType = "info" | "maintenance" | "warning";

type Announcement = {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  published: boolean;
  expires_at: string | null;
};

const TYPE_CONFIG: Record<AnnouncementType, { color: string; bg: string; icon: string; label: string }> = {
  info:        { color: "#2563eb", bg: "#eff6ff", icon: "📢", label: "お知らせ" },
  maintenance: { color: "#d97706", bg: "#fffbeb", icon: "🔧", label: "メンテナンス" },
  warning:     { color: "#dc2626", bg: "#fef2f2", icon: "⚠️", label: "警告" },
};

const DISMISSED_KEY = "cx_dismissed_announcements";

function getDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); } catch { return []; }
}
function dismiss(id: string) {
  const list = getDismissed();
  if (!list.includes(id)) localStorage.setItem(DISMISSED_KEY, JSON.stringify([...list, id]));
}

export default function AnnouncementToast() {
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    // 複合インデックス不要：published のみで絞り込み、ソートはクライアント側で
    const q = query(
      collection(db, "announcements"),
      where("published", "==", true)
    );
    const unsub = onSnapshot(q, (snap) => {
      const dismissed = getDismissed();
      const active = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Announcement))
        .filter((a) => {
          if (dismissed.includes(a.id)) return false;
          if (a.expires_at && a.expires_at < now) return false;
          return true;
        })
        .sort((a, b) => {
          const ta = a.created_at?.toDate?.()?.getTime?.() ?? 0;
          const tb = b.created_at?.toDate?.()?.getTime?.() ?? 0;
          return tb - ta;
        })
        .slice(0, 3);
      setItems(active);
    });
    return unsub;
  }, []);

  const handleDismiss = (id: string) => {
    dismiss(id);
    setItems((prev) => prev.filter((a) => a.id !== id));
  };

  if (items.length === 0) return null;

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20,
      display: "flex", flexDirection: "column", gap: 10,
      zIndex: 9800, maxWidth: 360, width: "calc(100vw - 40px)",
    }}>
      {items.map((a) => {
        const tc = TYPE_CONFIG[a.type] || TYPE_CONFIG.info;
        return (
          <div
            key={a.id}
            style={{
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 4px 20px rgba(15,23,42,.15), 0 1px 4px rgba(15,23,42,.08)",
              border: `1px solid ${tc.color}33`,
              borderLeft: `4px solid ${tc.color}`,
              padding: "13px 16px",
              animation: "slideInRight .25s ease",
            }}
          >
            <style>{`@keyframes slideInRight { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }`}</style>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>{tc.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: a.body ? 4 : 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: tc.color, background: `${tc.color}15`, padding: "1px 7px", borderRadius: 99 }}>{tc.label}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{a.title}</span>
                </div>
                {a.body && <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{a.body}</div>}
              </div>
              <button
                onClick={() => handleDismiss(a.id)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 16, cursor: "pointer", padding: "0 2px", flexShrink: 0, lineHeight: 1 }}
                title="閉じる"
              >×</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
