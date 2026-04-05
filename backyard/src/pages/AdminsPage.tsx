import React, { useEffect, useState } from "react";
import { db, OPS_EMAIL } from "../firebase";
import { collection, getDocs, setDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

type AdminDoc = { id: string; email: string; addedAt: string | null; addedBy: string };

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "ops_admins"));
      const rows = snap.docs.map((d) => ({
        id: d.id,
        email: d.data().email as string,
        addedAt: d.data().addedAt?.toDate?.()?.toLocaleDateString("ja-JP") ?? null,
        addedBy: (d.data().addedBy as string) ?? "",
      }));
      setAdmins(rows);
    } catch (e: any) {
      setError(e.message || "読み込みエラー");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addAdmin() {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) { setError("正しいメールアドレスを入力してください"); return; }
    if (email === OPS_EMAIL) { setError("スーパー管理者は既に登録されています"); return; }
    if (admins.some((a) => a.email === email)) { setError("既に登録されています"); return; }
    setSaving(true);
    setError("");
    try {
      const currentUser = getAuth().currentUser;
      await setDoc(doc(db, "ops_admins", email), {
        email,
        addedAt: serverTimestamp(),
        addedBy: currentUser?.email ?? "",
      });
      setNewEmail("");
      await load();
    } catch (e: any) {
      setError(e.message || "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  async function removeAdmin(id: string) {
    if (!confirm(`${id} を削除しますか？`)) return;
    try {
      await deleteDoc(doc(db, "ops_admins", id));
      await load();
    } catch (e: any) {
      setError(e.message || "削除エラー");
    }
  }

  const cell: React.CSSProperties = { padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", gap: 16 };

  return (
    <div>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 24, color: "#fff" }}>管理者管理</h2>

      {/* Add form */}
      <div style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: "#fff" }}>管理者を招待</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addAdmin()}
            placeholder="メールアドレスを入力"
            style={{ flex: 1, padding: "8px 12px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none" }}
          />
          <button
            onClick={addAdmin}
            disabled={saving}
            style={{ padding: "8px 20px", background: "#2563eb", border: "none", borderRadius: 8, color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "追加中..." : "追加"}
          </button>
        </div>
        {error && <div style={{ marginTop: 8, color: "#f87171", fontSize: 13 }}>{error}</div>}
      </div>

      {/* List */}
      <div style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ ...cell, borderBottom: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)" }}>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 12, opacity: 0.5, textTransform: "uppercase", letterSpacing: ".05em" }}>メールアドレス</span>
          <span style={{ width: 120, fontWeight: 600, fontSize: 12, opacity: 0.5, textTransform: "uppercase", letterSpacing: ".05em" }}>追加日</span>
          <span style={{ width: 120, fontWeight: 600, fontSize: 12, opacity: 0.5, textTransform: "uppercase", letterSpacing: ".05em" }}>追加者</span>
          <span style={{ width: 80 }}></span>
        </div>

        {/* Super admin (fixed) */}
        <div style={cell}>
          <span style={{ flex: 1, fontSize: 14, color: "#fff" }}>{OPS_EMAIL}</span>
          <span style={{ width: 120, fontSize: 13, opacity: 0.4 }}>—</span>
          <span style={{ width: 120, fontSize: 13, opacity: 0.4 }}>—</span>
          <span style={{ width: 80 }}>
            <span style={{ fontSize: 11, padding: "2px 8px", background: "rgba(251,191,36,.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,.25)", borderRadius: 99, fontWeight: 700 }}>
              スーパー管理者
            </span>
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 24, opacity: 0.4, fontSize: 14 }}>読み込み中...</div>
        ) : admins.length === 0 ? (
          <div style={{ padding: 24, opacity: 0.35, fontSize: 14 }}>招待済みの管理者はいません</div>
        ) : (
          admins.map((a) => (
            <div key={a.id} style={cell}>
              <span style={{ flex: 1, fontSize: 14, color: "#fff" }}>{a.email}</span>
              <span style={{ width: 120, fontSize: 13, opacity: 0.5 }}>{a.addedAt ?? "—"}</span>
              <span style={{ width: 120, fontSize: 13, opacity: 0.5 }}>{a.addedBy || "—"}</span>
              <span style={{ width: 80 }}>
                <button
                  onClick={() => removeAdmin(a.id)}
                  style={{ fontSize: 12, padding: "3px 10px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 6, color: "#f87171", cursor: "pointer" }}
                >
                  削除
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
