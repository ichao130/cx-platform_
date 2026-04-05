import React, { useEffect, useState } from "react";
import { opsPost } from "../firebase";

type PlanCode = "free" | "standard" | "premium" | "custom";

type PlanLimits = {
  workspaces: number | null;
  sites: number | null;
  scenarios: number | null;
  actions: number | null;
  aiInsights: number | null;
  members: number | null;
  templates: number | null;
  media: number | null;
  log_sample_rate: number; // 0〜1 (1 = 100%)
};

type Plan = {
  id: string;
  code: PlanCode;
  name: string;
  description: string;
  active: boolean;
  price_monthly: number;
  limits: PlanLimits;
};

const CODE_COLOR: Record<PlanCode, string> = {
  free:     "#64748b",
  standard: "#3b82f6",
  premium:  "#8b5cf6",
  custom:   "#f59e0b",
};

const LIMIT_LABELS: { key: keyof PlanLimits; label: string }[] = [
  { key: "workspaces", label: "ワークスペース" },
  { key: "sites",      label: "サイト" },
  { key: "scenarios",  label: "シナリオ" },
  { key: "actions",    label: "アクション" },
  { key: "templates",  label: "テンプレート" },
  { key: "media",      label: "メディア" },
  { key: "members",    label: "メンバー" },
  { key: "aiInsights", label: "AI分析" },
];

const emptyLimits = (): PlanLimits => ({
  workspaces: null, sites: null, scenarios: null, actions: null,
  aiInsights: null, members: null, templates: null, media: null,
  log_sample_rate: 1,
});

type FormState = {
  plan_id: string;
  code: PlanCode;
  name: string;
  description: string;
  active: boolean;
  price_monthly: number;
  limits: PlanLimits;
};

const emptyForm = (): FormState => ({
  plan_id: "", code: "free", name: "", description: "",
  active: true, price_monthly: 0, limits: emptyLimits(),
});

function limitDisplay(v: number | null) {
  return v === null ? "無制限" : String(v);
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const loadPlans = async () => {
    try {
      const res = await opsPost<{ plans: Plan[] }>("/v1/ops/plans/list");
      setPlans(res.plans);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const openNew = () => {
    setForm(emptyForm());
    setMsg("");
    setShowModal(true);
  };

  const openEdit = (p: Plan) => {
    setForm({
      plan_id: p.id,
      code: p.code,
      name: p.name,
      description: p.description || "",
      active: p.active,
      price_monthly: p.price_monthly || 0,
      limits: { ...emptyLimits(), ...p.limits },
    });
    setMsg("");
    setShowModal(true);
  };

  const save = async () => {
    if (!form.plan_id.trim()) { setMsg("プランIDを入力してください"); return; }
    if (!form.name.trim()) { setMsg("プラン名を入力してください"); return; }
    setSaving(true); setMsg("");
    try {
      await opsPost("/v1/ops/plans/upsert", {
        plan_id: form.plan_id.trim(),
        code: form.code,
        name: form.name.trim(),
        description: form.description.trim(),
        active: form.active,
        price_monthly: form.price_monthly,
        limits: form.limits,
      });
      setMsg("保存しました ✓");
      await loadPlans();
      setTimeout(() => setShowModal(false), 700);
    } catch (e: any) {
      setMsg(`エラー: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const setLimit = (key: keyof PlanLimits, raw: string) => {
    const trimmed = raw.trim();
    const v = trimmed === "" || trimmed === "∞" ? null : parseInt(trimmed, 10);
    setForm((f) => ({ ...f, limits: { ...f.limits, [key]: isNaN(v as number) ? null : v } }));
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,.15)", background: "#0f172a",
    color: "#e2e8f0", fontSize: 13,
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>プラン管理</div>
          <div style={{ opacity: 0.5, fontSize: 13, marginTop: 3 }}>料金プランとリミットを設定します</div>
        </div>
        <button onClick={openNew} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
          + 新規プラン
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, opacity: 0.4 }}>読み込み中...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {plans.length === 0 && (
            <div style={{ textAlign: "center", padding: 48, opacity: 0.4 }}>
              プランなし。「+ 新規プラン」からFreeプランを作成してください。
            </div>
          )}
          {plans.map((p) => {
            const color = CODE_COLOR[p.code] || CODE_COLOR.custom;
            return (
              <div key={p.id} style={{ background: "#1e293b", border: `1px solid ${p.active ? color + "44" : "rgba(255,255,255,.08)"}`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: 16 }}>{p.name}</span>
                      <span style={{ fontSize: 11, padding: "1px 9px", borderRadius: 99, background: `${color}22`, color, border: `1px solid ${color}44`, fontWeight: 700 }}>{p.code}</span>
                      {!p.active && <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 99, background: "rgba(100,116,139,.2)", color: "#94a3b8", fontWeight: 600 }}>無効</span>}
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>¥{p.price_monthly.toLocaleString()}/月</span>
                      <span style={{ fontSize: 11, opacity: 0.4 }}>ID: {p.id}</span>
                    </div>
                    {p.description && <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 10 }}>{p.description}</div>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
                      {LIMIT_LABELS.map(({ key, label }) => (
                        <span key={key} style={{ fontSize: 12, color: "#94a3b8" }}>
                          {label}: <strong style={{ color: p.limits[key] === null ? "#4ade80" : "#e2e8f0" }}>{limitDisplay(p.limits[key])}</strong>
                        </span>
                      ))}
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        ログサンプリング: <strong style={{ color: "#e2e8f0" }}>{Math.round((p.limits.log_sample_rate ?? 1) * 100)}%</strong>
                      </span>
                    </div>
                  </div>
                  <button onClick={() => openEdit(p)} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.06)", color: "#e2e8f0", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>
                    編集
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,.12)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, margin: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{plans.find((p) => p.id === form.plan_id) ? "プランを編集" : "新規プラン"}</div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Plan ID */}
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>プランID *（英数字・ハイフン、変更不可）</label>
                <input
                  value={form.plan_id}
                  onChange={(e) => setForm({ ...form, plan_id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  placeholder="例: free"
                  style={inputStyle}
                  disabled={!!plans.find((p) => p.id === form.plan_id)}
                />
              </div>

              {/* Code + Name row */}
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: "0 0 140px" }}>
                  <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>種別</label>
                  <select value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value as PlanCode })} style={inputStyle}>
                    <option value="free">free</option>
                    <option value="standard">standard</option>
                    <option value="premium">premium</option>
                    <option value="custom">custom</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>プラン名 *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例: Free" style={inputStyle} />
                </div>
              </div>

              {/* Price + Active */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>月額（円）</label>
                  <input type="number" min={0} value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: parseInt(e.target.value) || 0 })} style={inputStyle} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "9px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: form.active ? "rgba(34,197,94,.1)" : "rgba(100,116,139,.1)", marginBottom: 0 }}>
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                  <span style={{ fontSize: 13, color: form.active ? "#4ade80" : "#94a3b8" }}>有効</span>
                </label>
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>説明（任意）</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              {/* Limits */}
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 8 }}>リミット（空欄 = 無制限）</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                  {LIMIT_LABELS.map(({ key, label }) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, opacity: 0.5, display: "block", marginBottom: 3 }}>{label}</label>
                      <input
                        value={form.limits[key] === null ? "" : String(form.limits[key])}
                        onChange={(e) => setLimit(key, e.target.value)}
                        placeholder="∞ 無制限"
                        type="number"
                        min={0}
                        style={{ ...inputStyle, padding: "7px 10px" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ログサンプリングレート */}
              <div>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 5 }}>ログサンプリングレート（0〜1、1 = 100%）</label>
                <input
                  value={form.limits.log_sample_rate}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setForm((f) => ({ ...f, limits: { ...f.limits, log_sample_rate: isNaN(v) ? 1 : Math.min(1, Math.max(0, v)) } }));
                  }}
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  style={inputStyle}
                />
                <div style={{ fontSize: 11, opacity: 0.45, marginTop: 4 }}>例: 1 = 全件、0.5 = 50%、0.1 = 10%。特別トライアル中は常に100%。</div>
              </div>
            </div>

            {msg && <div style={{ marginTop: 12, fontSize: 13, color: msg.startsWith("エラー") ? "#fca5a5" : "#86efac" }}>{msg}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
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
