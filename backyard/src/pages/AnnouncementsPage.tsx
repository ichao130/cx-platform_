import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp,
} from "firebase/firestore";

type AnnouncementType = "info" | "maintenance" | "warning";

type Announcement = {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  published: boolean;
  expires_at: string | null;
  created_at: any;
};

const TYPE_CONFIG: Record<AnnouncementType, { label: string; color: string; icon: string }> = {
  info:        { label: "お知らせ",    color: "#3b82f6", icon: "📢" },
  maintenance: { label: "メンテナンス", color: "#f59e0b", icon: "🔧" },
  warning:     { label: "警告",        color: "#ef4444", icon: "⚠️" },
};

type Form = { title: string; body: string; type: AnnouncementType; expires_at: string };
const emptyForm = (): Form => ({ title: "", body: "", type: "info", expires_at: "" });

function fmt(ts: any) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const openNew = () => { setEditId(null); setForm(emptyForm()); setMsg(""); setShowModal(true); };
  const openEdit = (a: Announcement) => {
    setEditId(a.id);
    setForm({ title: a.title, body: a.body, type: a.type, expires_at: a.expires_at || "" });
    setMsg(""); setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) { setMsg("タイトルを入力してください"); return; }
    setSaving(true); setMsg("");
    try {
      const data = {
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type,
        expires_at: form.expires_at || null,
        updated_at: serverTimestamp(),
      };
      if (editId) {
        await updateDoc(doc(db, "announcements", editId), data);
      } else {
        await addDoc(collection(db, "announcements"), { ...data, published: false, created_at: serverTimestamp() });
      }
      setMsg("保存しました ✓");
      setTimeout(() => setShowModal(false), 700);
    } catch (e: any) { setMsg(`エラー: ${e.message}`); }
    finally { setSaving(false); }
  };

  const togglePublish = async (a: Announcement) => {
    await updateDoc(doc(db, "announcements", a.id), { published: !a.published });
  };

  const remove = async (a: Announcement) => {
    if (!confirm(`「${a.title}」を削除しますか？`)) return;
    await deleteDoc(doc(db, "announcements", a.id));
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "#0f172a", color: "#e2e8f0", fontSize: 13 };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>お知らせ管理</div>
          <div style={{ opacity: 0.5, fontSize: 13, marginTop: 3 }}>管理画面ユーザー全員に通知が届きます</div>
        </div>
        <button onClick={openNew} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
          + 新規作成
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, opacity: 0.4 }}>読み込み中...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.length === 0 && <div style={{ textAlign: "center", padding: 48, opacity: 0.4 }}>お知らせなし</div>}
          {items.map((a) => {
            const tc = TYPE_CONFIG[a.type] || TYPE_CONFIG.info;
            return (
              <div key={a.id} style={{ background: "#1e293b", border: `1px solid ${a.published ? tc.color + "44" : "rgba(255,255,255,.08)"}`, borderLeft: `4px solid ${tc.color}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{tc.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</span>
                    <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 99, background: `${tc.color}22`, color: tc.color, border: `1px solid ${tc.color}44`, fontWeight: 600 }}>{tc.label}</span>
                    <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 99, background: a.published ? "rgba(22,163,74,.2)" : "rgba(100,116,139,.2)", color: a.published ? "#4ade80" : "#94a3b8", fontWeight: 600 }}>
                      {a.published ? "公開中" : "下書き"}
                    </span>
                  </div>
                  {a.body && <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6, lineHeight: 1.6 }}>{a.body}</div>}
                  <div style={{ fontSize: 11, opacity: 0.4 }}>
                    作成: {fmt(a.created_at)}
                    {a.expires_at && <span style={{ marginLeft: 12 }}>期限: {a.expires_at}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => togglePublish(a)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${a.published ? "rgba(220,38,38,.4)" : "rgba(22,163,74,.4)"}`, background: a.published ? "rgba(220,38,38,.1)" : "rgba(22,163,74,.1)", color: a.published ? "#fca5a5" : "#86efac", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    {a.published ? "非公開にする" : "公開する"}
                  </button>
                  <button onClick={() => openEdit(a)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.06)", color: "#e2e8f0", cursor: "pointer", fontSize: 12 }}>編集</button>
                  <button onClick={() => remove(a)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.3)", cursor: "pointer", fontSize: 12 }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 作成/編集モーダル */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,.12)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 500 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{editId ? "お知らせを編集" : "新規お知らせ"}</div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>種別</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(Object.entries(TYPE_CONFIG) as [AnnouncementType, typeof TYPE_CONFIG.info][]).map(([k, v]) => (
                    <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${form.type === k ? v.color : "rgba(255,255,255,.12)"}`, background: form.type === k ? `${v.color}18` : "transparent", flex: 1, justifyContent: "center" }}>
                      <input type="radio" name="type" value={k} checked={form.type === k} onChange={() => setForm({ ...form, type: k })} style={{ display: "none" }} />
                      <span style={{ fontSize: 16 }}>{v.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{v.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>タイトル *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例: メンテナンスのお知らせ" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>本文（任意）</label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3}
                  placeholder="詳細な内容を入力..." style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>表示期限（任意・空欄で無期限）</label>
                <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} style={inputStyle} />
              </div>
            </div>

            {msg && <div style={{ marginTop: 12, fontSize: 13, color: msg.startsWith("エラー") ? "#fca5a5" : "#86efac" }}>{msg}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "transparent", color: "rgba(255,255,255,.6)", cursor: "pointer" }}>キャンセル</button>
              <button onClick={save} disabled={saving} style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
