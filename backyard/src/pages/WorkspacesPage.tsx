import React, { useEffect, useState } from "react";
import { opsPost } from "../firebase";

type Workspace = {
  id: string; name: string; ownerEmail: string;
  plan: string; status: string; provider: string;
  trialEndsAt: string | null; currentPeriodEndsAt: string | null;
  stripeCustomerId: string | null; stripeSubscriptionId: string | null;
  billingNote: string;
  accessOverrideActive: boolean; accessOverrideUntil: string | null; accessOverrideNote: string;
  memberCount: number; createdAt: string | null;
  rmsEnabled: boolean; rmsMonthlyPrice: number;
};

const PLAN_OPTIONS = ["free", "pro", "advanced", "enterprise"];
const STATUS_OPTIONS = ["inactive", "trialing", "active", "past_due", "canceled"];

const PLAN_COLOR: Record<string, string> = {
  free: "#64748b", pro: "#2563eb", advanced: "#7c3aed", enterprise: "#d97706",
};
const STATUS_COLOR: Record<string, string> = {
  inactive: "#64748b", trialing: "#0891b2", active: "#16a34a", past_due: "#dc2626", canceled: "#94a3b8",
};

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: `${color}22`, color, border: `1px solid ${color}44` }}>{label}</span>;
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
}

type EditForm = {
  plan: string; status: string; trial_days: number | ""; note: string;
  rmsEnabled: boolean; rmsMonthlyPrice: number | "";
};

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<Workspace | null>(null);
  const [form, setForm] = useState<EditForm>({ plan: "free", status: "inactive", trial_days: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [savingOptions, setSavingOptions] = useState(false);
  const [saveOptionsMsg, setSaveOptionsMsg] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await opsPost<{ workspaces: Workspace[] }>("/v1/ops/workspaces");
      setWorkspaces(res.workspaces);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = workspaces.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.ownerEmail.toLowerCase().includes(search.toLowerCase()) ||
    w.id.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (w: Workspace) => {
    setEditTarget(w);
    setForm({ plan: w.plan, status: w.status, trial_days: "", note: w.billingNote || "", rmsEnabled: w.rmsEnabled || false, rmsMonthlyPrice: w.rmsMonthlyPrice || "" });
    setSaveMsg("");
    setSaveOptionsMsg("");
  };

  const deleteWorkspace = async (w: Workspace) => {
    const confirmed = window.confirm(`「${w.name || w.id}」を削除しますか？\n\nワークスペース・請求情報が削除されます。\nサイト・シナリオ等のデータは残ります。`);
    if (!confirmed) return;
    setDeleting(w.id);
    try {
      await opsPost("/v1/ops/workspaces/delete", { workspace_id: w.id });
      await load();
    } catch (e: any) { alert(`削除エラー: ${e.message}`); }
    finally { setDeleting(null); }
  };

  const save = async () => {
    if (!editTarget) return;
    setSaving(true); setSaveMsg("");
    try {
      await opsPost("/v1/ops/workspaces/billing/update", {
        workspace_id: editTarget.id,
        plan: form.plan,
        status: form.status,
        trial_days: form.trial_days !== "" ? Number(form.trial_days) : undefined,
        note: form.note,
      });
      setSaveMsg("保存しました ✓");
      await load();
      setTimeout(() => setEditTarget(null), 800);
    } catch (e: any) { setSaveMsg(`エラー: ${e.message}`); }
    finally { setSaving(false); }
  };

  const saveOptions = async () => {
    if (!editTarget) return;
    setSavingOptions(true); setSaveOptionsMsg("");
    try {
      await opsPost("/v1/ops/workspaces/options/update", {
        workspace_id: editTarget.id,
        rms_enabled: form.rmsEnabled,
        rms_monthly_price: form.rmsMonthlyPrice !== "" ? Number(form.rmsMonthlyPrice) : 0,
      });
      setSaveOptionsMsg("保存しました ✓");
      await load();
    } catch (e: any) { setSaveOptionsMsg(`エラー: ${e.message}`); }
    finally { setSavingOptions(false); }
  };

  const td: React.CSSProperties = { padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,.06)", verticalAlign: "middle" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>ワークスペース管理</div>
          <div style={{ opacity: 0.5, fontSize: 13, marginTop: 3 }}>全 {workspaces.length} ワークスペース</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="名前 / メール / IDで検索"
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.06)", color: "#e2e8f0", fontSize: 13, width: 240 }}
          />
          <button onClick={load} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.06)", color: "#e2e8f0", cursor: "pointer", fontSize: 13 }}>
            🔄 更新
          </button>
        </div>
      </div>

      {error && <div style={{ padding: "10px 16px", background: "rgba(220,38,38,.15)", border: "1px solid rgba(220,38,38,.3)", borderRadius: 8, marginBottom: 16, color: "#fca5a5" }}>⚠️ {error}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, opacity: 0.4 }}>読み込み中...</div>
      ) : (
        <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.04)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", opacity: 0.5 }}>
                {["ワークスペース", "プラン", "ステータス", "オプション", "トライアル期限", "更新日", "メンバー", "操作"].map((h) => (
                  <th key={h} style={{ ...td, fontWeight: 600, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} style={{ transition: "background .1s" }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.03)")} onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                  <td style={td}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{w.name || <span style={{ opacity: 0.4 }}>（未設定）</span>}</div>
                    <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>{w.ownerEmail}</div>
                    {w.accessOverrideActive && <div style={{ fontSize: 10, marginTop: 3, color: "#f59e0b", fontWeight: 700 }}>★ 特別トライアル中</div>}
                  </td>
                  <td style={td}><Badge label={w.plan} color={PLAN_COLOR[w.plan] || "#64748b"} /></td>
                  <td style={td}><Badge label={w.status} color={STATUS_COLOR[w.status] || "#64748b"} /></td>
                  <td style={td}>
                    {w.rmsEnabled ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "rgba(234,179,8,.15)", color: "#eab308", border: "1px solid rgba(234,179,8,.3)" }}>
                        🏪 RMS {w.rmsMonthlyPrice > 0 ? `¥${w.rmsMonthlyPrice.toLocaleString()}` : ""}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, opacity: 0.3 }}>—</span>
                    )}
                  </td>
                  <td style={td}><span style={{ fontSize: 12, opacity: 0.7 }}>{fmt(w.trialEndsAt)}</span></td>
                  <td style={td}><span style={{ fontSize: 12, opacity: 0.7 }}>{fmt(w.currentPeriodEndsAt)}</span></td>
                  <td style={td}><span style={{ fontSize: 12, opacity: 0.7 }}>{w.memberCount}人</span></td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(w)} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#e2e8f0", cursor: "pointer", fontSize: 12 }}>
                        編集
                      </button>
                      <button
                        onClick={() => deleteWorkspace(w)}
                        disabled={deleting === w.id}
                        style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(220,38,38,.4)", background: "rgba(220,38,38,.1)", color: "#fca5a5", cursor: "pointer", fontSize: 12, opacity: deleting === w.id ? 0.5 : 1 }}
                      >
                        {deleting === w.id ? "…" : "削除"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, opacity: 0.4 }}>該当なし</div>}
        </div>
      )}

      {/* 編集モーダル */}
      {editTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditTarget(null); }}>
          <div style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,.12)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{editTarget.name || editTarget.id}</div>
                <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>{editTarget.ownerEmail} / {editTarget.id}</div>
              </div>
              <button onClick={() => setEditTarget(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>プラン</label>
                <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "#0f172a", color: "#e2e8f0", fontSize: 13 }}>
                  {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>ステータス</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "#0f172a", color: "#e2e8f0", fontSize: 13 }}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>トライアル日数を追加（今日から）</label>
                <input type="number" min={0} max={365} value={form.trial_days} onChange={(e) => setForm({ ...form, trial_days: e.target.value === "" ? "" : Number(e.target.value) })}
                  placeholder="例: 30（空白でスキップ）"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "#0f172a", color: "#e2e8f0", fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>メモ（社内用）</label>
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "#0f172a", color: "#e2e8f0", fontSize: 13, resize: "vertical" }} />
              </div>
            </div>

            {saveMsg && <div style={{ marginTop: 12, fontSize: 13, color: saveMsg.startsWith("エラー") ? "#fca5a5" : "#86efac" }}>{saveMsg}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setEditTarget(null)} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "transparent", color: "rgba(255,255,255,.6)", cursor: "pointer" }}>キャンセル</button>
              <button onClick={save} disabled={saving} style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>

            {/* ── オプション設定 ── */}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: "#eab308" }}>🏪 オプション機能</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(234,179,8,.2)", background: "rgba(234,179,8,.05)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>楽天RMS連携</div>
                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>受注・商品・売上データの自動同期</div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <span style={{ fontSize: 12, opacity: 0.6 }}>{form.rmsEnabled ? "有効" : "無効"}</span>
                    <div
                      onClick={() => setForm({ ...form, rmsEnabled: !form.rmsEnabled })}
                      style={{
                        width: 40, height: 22, borderRadius: 11, cursor: "pointer", transition: "background .2s",
                        background: form.rmsEnabled ? "#eab308" : "rgba(255,255,255,.15)",
                        position: "relative",
                      }}
                    >
                      <div style={{
                        position: "absolute", top: 3, left: form.rmsEnabled ? 21 : 3,
                        width: 16, height: 16, borderRadius: "50%", background: "#fff",
                        transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)",
                      }} />
                    </div>
                  </label>
                </div>
                <div>
                  <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>RMS月額料金（円）</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ opacity: 0.5, fontSize: 14 }}>¥</span>
                    <input
                      type="number" min={0} step={1000}
                      value={form.rmsMonthlyPrice}
                      onChange={(e) => setForm({ ...form, rmsMonthlyPrice: e.target.value === "" ? "" : Number(e.target.value) })}
                      placeholder="例: 9800"
                      style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "#0f172a", color: "#e2e8f0", fontSize: 13 }}
                    />
                    <span style={{ opacity: 0.4, fontSize: 12 }}>/月</span>
                  </div>
                </div>
              </div>

              {saveOptionsMsg && <div style={{ marginTop: 10, fontSize: 13, color: saveOptionsMsg.startsWith("エラー") ? "#fca5a5" : "#86efac" }}>{saveOptionsMsg}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <button onClick={saveOptions} disabled={savingOptions} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#854d0e", color: "#fef08a", fontWeight: 700, cursor: "pointer", fontSize: 13, opacity: savingOptions ? 0.6 : 1 }}>
                  {savingOptions ? "保存中..." : "オプションを保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
