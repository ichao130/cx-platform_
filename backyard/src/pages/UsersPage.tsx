import React, { useEffect, useState } from "react";
import { opsPost } from "../firebase";

type UserRow = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  primaryWorkspaceId: string | null;
  workspaces: { id: string; name: string }[];
  disabled: boolean;
  lastSignInTime: string | null;
  creationTime: string | null;
};

function fmt(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
}
function fmtTime(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("ja-JP", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const s: Record<string, React.CSSProperties> = {
  th: { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap", borderBottom: "1px solid rgba(255,255,255,.08)" },
  td: { padding: "12px 14px", fontSize: 13, borderBottom: "1px solid rgba(255,255,255,.05)", verticalAlign: "middle" },
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [confirmUid, setConfirmUid] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await opsPost<{ users: UserRow[] }>("/v1/ops/users");
      setUsers(res.users || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (uid: string) => {
    setDeleting(uid);
    try {
      await opsPost("/v1/ops/users/delete", { uid });
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      setConfirmUid(null);
    } catch (e: any) {
      alert("削除失敗: " + (e?.message || String(e)));
    } finally {
      setDeleting(null);
    }
  };

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q) || u.uid.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, color: "#fff" }}>ユーザー管理</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginTop: 2 }}>
            全 {loading ? "..." : users.length} ユーザー
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="メール / 名前 / UIDで検索"
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "#fff", fontSize: 13, width: 260, outline: "none" }}
          />
          <button
            onClick={load}
            disabled={loading}
            style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", color: "#fff", fontSize: 13, cursor: "pointer" }}
          >
            {loading ? "読込中..." : "↻ 更新"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#7f1d1d33", border: "1px solid #dc262655", borderRadius: 8, color: "#fca5a5", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "rgba(255,255,255,.3)" }}>読み込み中...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={s.th}>ユーザー</th>
                <th style={s.th}>UID</th>
                <th style={s.th}>ワークスペース</th>
                <th style={s.th}>登録日</th>
                <th style={s.th}>最終ログイン</th>
                <th style={{ ...s.th, textAlign: "center" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...s.td, textAlign: "center", color: "rgba(255,255,255,.3)", padding: 40 }}>
                    {search ? "該当するユーザーが見つかりません" : "ユーザーがいません"}
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr key={u.uid} style={{ opacity: u.disabled ? 0.5 : 1 }}>
                  {/* ユーザー情報 */}
                  <td style={s.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)", flexShrink: 0 }}>
                          {(u.displayName || u.email || "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: "#fff", fontSize: 13 }}>{u.displayName || "—"}</div>
                        <div style={{ color: "rgba(255,255,255,.45)", fontSize: 12 }}>{u.email}</div>
                        {u.disabled && (
                          <span style={{ fontSize: 10, background: "#dc262622", color: "#fca5a5", border: "1px solid #dc262644", borderRadius: 4, padding: "1px 5px" }}>無効</span>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* UID */}
                  <td style={s.td}>
                    <code style={{ fontSize: 11, color: "rgba(255,255,255,.3)", background: "rgba(255,255,255,.05)", borderRadius: 4, padding: "2px 6px" }}>
                      {u.uid}
                    </code>
                  </td>
                  {/* ワークスペース */}
                  <td style={s.td}>
                    {u.workspaces.length === 0 ? (
                      <span style={{ color: "rgba(255,255,255,.25)", fontSize: 12 }}>なし</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {u.workspaces.map((ws) => (
                          <div key={ws.id} style={{ fontSize: 12, color: ws.id === u.primaryWorkspaceId ? "#fff" : "rgba(255,255,255,.5)", display: "flex", alignItems: "center", gap: 4 }}>
                            {ws.id === u.primaryWorkspaceId && (
                              <span style={{ fontSize: 10, background: "#2563eb33", color: "#60a5fa", border: "1px solid #2563eb55", borderRadius: 4, padding: "1px 5px" }}>主</span>
                            )}
                            {ws.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  {/* 登録日 */}
                  <td style={{ ...s.td, color: "rgba(255,255,255,.4)", whiteSpace: "nowrap" }}>
                    {fmt(u.creationTime)}
                  </td>
                  {/* 最終ログイン */}
                  <td style={{ ...s.td, color: "rgba(255,255,255,.4)", whiteSpace: "nowrap" }}>
                    {fmtTime(u.lastSignInTime)}
                  </td>
                  {/* 操作 */}
                  <td style={{ ...s.td, textAlign: "center" }}>
                    {confirmUid === u.uid ? (
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button
                          disabled={deleting === u.uid}
                          onClick={() => handleDelete(u.uid)}
                          style={{ padding: "5px 12px", borderRadius: 6, background: "#dc2626", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                        >
                          {deleting === u.uid ? "削除中..." : "確認：削除"}
                        </button>
                        <button
                          onClick={() => setConfirmUid(null)}
                          style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.6)", fontSize: 12, cursor: "pointer" }}
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmUid(u.uid)}
                        style={{ padding: "5px 14px", borderRadius: 6, background: "#dc262622", border: "1px solid #dc262655", color: "#fca5a5", fontSize: 12, cursor: "pointer" }}
                      >
                        削除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.2)" }}>
        ※ 削除はFirebase AuthとFirestoreのusersドキュメントを削除します。ワークスペースデータは残ります。
      </div>
    </div>
  );
}
