import React, { useEffect, useState } from "react";
import { opsPost } from "../firebase";

type Trial = {
  id: string; type: "workspace" | "account";
  target_id: string; target_name: string;
  status: "active" | "expired" | "revoked";
  expires_at: string | null; note: string;
  granted_by: string; granted_at: string;
};

function fmt(iso: string | null) {
  if (!iso) return "無期限";
  return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "active" ? "#16a34a" : status === "revoked" ? "#dc2626" : "#64748b";
  const label = status === "active" ? "有効" : status === "revoked" ? "取消済" : "期限切れ";
  return <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: `${color}22`, color, border: `1px solid ${color}44` }}>{label}</span>;
}

type NewForm = { type: "workspace" | "account"; target_id: string; target_name: string; expires_at: string; note: string; };

export default function TrialsPage() {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<NewForm>({ type: "workspace", target_id: "", target_name: "", expires_at: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await opsPost<{ trials: Trial[] }>("/v1/ops/special-trials/list");
      setTrials(res.trials);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.target_id.trim()) { setSaveMsg("対象IDを入力してください"); return; }
    setSaving(true); setSaveMsg("");
    try {
      await opsPost("/v1/ops/special-trials/upsert", {
        type: form.type,
        target_id: form.target_id.trim(),
        target_name: form.target_name.trim() || form.target_id.trim(),
        expires_at: form.expires_at || null,
        note: form.note.trim(),
      });
      setSaveMsg("登録しました ✓");
      await load();
      setTimeout(() => { setShowNew(false); setSaveMsg(""); setForm({ type: "workspace", target_id: "", target_name: "", expires_at: "", note: "" }); }, 800);
    } catch (e: any) { setSaveMsg(`エラー: ${e.message}`); }
    finally { setSaving(false); }
  };

  const revoke = async (id: string) => {
    if (!confirm("このトライアルを取り消しますか？アクセス権限も即時解除されます。")) return;
    setRevoking(id);
    try {
      await opsPost("/v1/ops/special-trials/revoke", { trial_id: id });
      await load();
    } catch (e: any) { alert(`エラー: ${(e as any).message}`); }
    finally { setRevoking(null); }
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "#0f172a", color: "#e2e8f0", fontSize: 13 };
  const td: React.CSSProperties = { padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.06)", verticalAlign: "middle" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>特別トライアル管理</div>
          <div style={{ opacity: 0.5, fontSize: 13, marginTop: 3 }}>フル機能・無制限でアクセスを付与します</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={load} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.06)", color: "#e2e8f0", cursor: "pointer", fontSize: 13 }}>🔄 更新</button>
          <button onClick={() => { setShowNew(true); setSaveMsg(""); }} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            + 新規トライアル付与
          </button>
        </div>
      </div>

      {error && <div style={{ padding: "10px 16px", background: "rgba(220,38,38,.15)", border: "1px solid rgba(220,38,38,.3)", borderRadius: 8, marginBottom: 16, color: "#fca5a5" }}>⚠️ {error}</div>}

      {/* 説明カード */}
      <div style={{ padding: "14px 18px", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)", borderRadius: 10, marginBottom: 20, fontSize: 13, lineHeight: 1.7 }}>
        <strong>特別トライアルについて：</strong><br />
        付与されたワークスペースはプラン制限・機能制限なし・利用上限なしでフル機能を利用できます。<br />
        <span style={{ opacity: 0.7 }}>・ワークスペース指定：対象のワークスペースIDを入力 / アカウント指定：オーナーのメールアドレスを入力（そのアカウントがオーナーの全ワークスペースに適用）</span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, opacity: 0.4 }}>読み込み中...</div>
      ) : (
        <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.04)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", opacity: 0.5 }}>
                {["対象", "種別", "ステータス", "期限", "メモ", "付与日", "操作"].map((h) => (
                  <th key={h} style={{ ...td, fontWeight: 600, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trials.map((t) => (
                <tr key={t.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.target_name}</div>
                    <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>{t.target_id}</div>
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: t.type === "workspace" ? "rgba(99,102,241,.2)" : "rgba(20,184,166,.2)", color: t.type === "workspace" ? "#818cf8" : "#2dd4bf" }}>
                      {t.type === "workspace" ? "ワークスペース" : "アカウント"}
                    </span>
                  </td>
                  <td style={td}><StatusBadge status={t.status} /></td>
                  <td style={td}><span style={{ fontSize: 12, opacity: 0.7 }}>{fmt(t.expires_at)}</span></td>
                  <td style={td}><span style={{ fontSize: 12, opacity: 0.6 }}>{t.note || "—"}</span></td>
                  <td style={td}><span style={{ fontSize: 11, opacity: 0.5 }}>{fmt(t.granted_at)}</span></td>
                  <td style={td}>
                    {t.status === "active" && (
                      <button onClick={() => revoke(t.id)} disabled={revoking === t.id}
                        style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(220,38,38,.4)", background: "rgba(220,38,38,.1)", color: "#fca5a5", cursor: "pointer", fontSize: 12, opacity: revoking === t.id ? 0.5 : 1 }}>
                        {revoking === t.id ? "取消中..." : "取り消す"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {trials.length === 0 && <div style={{ textAlign: "center", padding: 48, opacity: 0.4 }}>トライアル登録なし</div>}
        </div>
      )}

      {/* 新規登録モーダル */}
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,.12)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>特別トライアルを付与</div>
              <button onClick={() => setShowNew(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>種別</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {(["workspace", "account"] as const).map((t) => (
                    <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${form.type === t ? "#3b82f6" : "rgba(255,255,255,.12)"}`, background: form.type === t ? "rgba(59,130,246,.12)" : "transparent", flex: 1, justifyContent: "center" }}>
                      <input type="radio" name="type" value={t} checked={form.type === t} onChange={() => setForm({ ...form, type: t })} style={{ accentColor: "#3b82f6" }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{t === "workspace" ? "ワークスペース" : "アカウント（メール）"}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>
                  {form.type === "workspace" ? "ワークスペースID" : "オーナーのメールアドレス"}
                </label>
                <input value={form.target_id} onChange={(e) => setForm({ ...form, target_id: e.target.value })}
                  placeholder={form.type === "workspace" ? "ws_xxxxxxxxxx" : "example@company.com"}
                  style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>表示名（任意）</label>
                <input value={form.target_name} onChange={(e) => setForm({ ...form, target_name: e.target.value })}
                  placeholder="株式会社〇〇"
                  style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>有効期限（空欄で無期限）</label>
                <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>メモ（社内用）</label>
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2}
                  placeholder="営業担当・経緯など" style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>

            {saveMsg && <div style={{ marginTop: 12, fontSize: 13, color: saveMsg.startsWith("エラー") ? "#fca5a5" : "#86efac" }}>{saveMsg}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowNew(false)} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "transparent", color: "rgba(255,255,255,.6)", cursor: "pointer" }}>キャンセル</button>
              <button onClick={create} disabled={saving} style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "付与中..." : "トライアルを付与する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
