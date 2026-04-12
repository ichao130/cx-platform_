// admin/src/pages/PlatformUsersPage.tsx
import React, { useEffect, useState } from "react";
import { apiPostJson } from "../firebase";

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
  createdAt: any;
};

function fmtDate(s: string | null | undefined) {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function fmtDateTime(s: string | null | undefined) {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function PlatformUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [confirmUid, setConfirmUid] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiPostJson("/v1/ops/users", {});
      if (!res.ok) throw new Error(res.error || "failed");
      setUsers(res.users || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (uid: string) => {
    setDeletingUid(uid);
    try {
      const res = await apiPostJson("/v1/ops/users/delete", { uid });
      if (!res.ok) throw new Error(res.error || "failed");
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (e: any) {
      alert("削除失敗: " + (e?.message || String(e)));
    } finally {
      setDeletingUid(null);
      setConfirmUid(null);
    }
  };

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100 }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div>
          <div className="h1" style={{ marginBottom: 4 }}>登録ユーザー一覧</div>
          <div className="small" style={{ color: "var(--muted)" }}>
            Firebase Auth + Firestore の全ユーザー {loading ? "..." : `${users.length}件`}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="input"
            placeholder="メール・名前・UIDで絞り込み"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260, fontSize: 13 }}
          />
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "読込中..." : "↻ 更新"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>読み込み中...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(15,23,42,.03)", borderBottom: "1px solid rgba(15,23,42,.08)" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>ユーザー</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>UID</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>ワークスペース</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>登録日</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>最終ログイン</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
                    {search ? "該当するユーザーが見つかりません" : "ユーザーが登録されていません"}
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr key={u.uid} style={{ borderBottom: "1px solid rgba(15,23,42,.05)", background: u.disabled ? "rgba(239,68,68,.03)" : undefined }}>
                  {/* ユーザー情報 */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#64748b", flexShrink: 0 }}>
                          {(u.displayName || u.email || "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>{u.displayName || "-"}</div>
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>{u.email}</div>
                        {u.disabled && <span style={{ fontSize: 11, background: "#fef2f2", color: "#dc2626", borderRadius: 4, padding: "1px 6px" }}>無効</span>}
                      </div>
                    </div>
                  </td>
                  {/* UID */}
                  <td style={{ padding: "12px 16px" }}>
                    <code style={{ fontSize: 11, color: "var(--muted)", background: "rgba(15,23,42,.04)", borderRadius: 4, padding: "2px 6px" }}>
                      {u.uid}
                    </code>
                  </td>
                  {/* ワークスペース */}
                  <td style={{ padding: "12px 16px" }}>
                    {u.workspaces.length === 0 ? (
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>なし</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {u.workspaces.map((ws) => (
                          <div key={ws.id} style={{ fontSize: 12 }}>
                            <span style={{ fontWeight: ws.id === u.primaryWorkspaceId ? 700 : 400 }}>{ws.name}</span>
                            {ws.id === u.primaryWorkspaceId && (
                              <span style={{ marginLeft: 4, fontSize: 10, color: "#2563eb", background: "#eff6ff", borderRadius: 4, padding: "1px 5px" }}>主</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  {/* 登録日 */}
                  <td style={{ padding: "12px 16px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {fmtDate(u.creationTime)}
                  </td>
                  {/* 最終ログイン */}
                  <td style={{ padding: "12px 16px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {fmtDateTime(u.lastSignInTime)}
                  </td>
                  {/* 操作 */}
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    {confirmUid === u.uid ? (
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button
                          className="btn"
                          style={{ fontSize: 12, padding: "4px 10px", background: "#dc2626", color: "#fff", border: "none" }}
                          disabled={deletingUid === u.uid}
                          onClick={() => handleDelete(u.uid)}
                        >
                          {deletingUid === u.uid ? "削除中..." : "確認：削除"}
                        </button>
                        <button
                          className="btn"
                          style={{ fontSize: 12, padding: "4px 10px" }}
                          onClick={() => setConfirmUid(null)}
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn"
                        style={{ fontSize: 12, padding: "4px 12px", color: "#dc2626", borderColor: "#fca5a5" }}
                        onClick={() => setConfirmUid(u.uid)}
                      >
                        削除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
        ※ ユーザー削除はFirebase AuthとFirestoreのusersドキュメントを削除します。ワークスペースのデータは削除されません。
      </div>
    </div>
  );
}
