import React, { useCallback, useEffect, useState } from "react";
import { apiPostJson } from "../firebase";

type PlanCode = "free" | "pro" | "advanced" | "enterprise";
type BillingProvider = "stripe" | "misoca" | "manual";

type Limits = {
  sites?: number | null;
  scenarios?: number | null;
  actions?: number | null;
  aiInsights?: number | null;
  members?: number | null;
};

type PlanRow = {
  plan_id: string;
  code: PlanCode;
  name?: string;
  description?: string;
  active?: boolean;
  billing_provider?: BillingProvider;
  price_monthly?: number;
  price_yearly?: number | null;
  limits?: Limits;
  stripe_price_monthly_id?: string | null;
  stripe_price_yearly_id?: string | null;
};

const PLAN_DEFS: {
  code: PlanCode;
  label: string;
  color: string;
  bg: string;
  border: string;
  defaultPrice: number;
  defaultDescription: string;
  defaultLimits: Limits;
}[] = [
  {
    code: "free",
    label: "Free",
    color: "#64748b",
    bg: "#f8fafc",
    border: "#e2e8f0",
    defaultPrice: 0,
    defaultDescription: "まずは無料で試してみましょう",
    defaultLimits: { sites: 1, scenarios: 3, actions: 500, aiInsights: 0, members: 1 },
  },
  {
    code: "pro",
    label: "Pro",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    defaultPrice: 13000,
    defaultDescription: "成長するチームに最適なプラン",
    defaultLimits: { sites: 5, scenarios: 20, actions: 10000, aiInsights: 100, members: 5 },
  },
  {
    code: "advanced",
    label: "Advanced",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    defaultPrice: 39800,
    defaultDescription: "本格運用向けの高機能プラン",
    defaultLimits: { sites: 20, scenarios: 100, actions: 100000, aiInsights: 1000, members: 20 },
  },
  {
    code: "enterprise",
    label: "Enterprise",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
    defaultPrice: 0,
    defaultDescription: "大規模組織向けの個別契約プラン",
    defaultLimits: { sites: null, scenarios: null, actions: null, aiInsights: null, members: null },
  },
];

function numOrNull(v: string): number | null {
  if (v === "" || v === "無制限") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function displayNum(v: number | null | undefined): string {
  if (v === null || v === undefined) return "無制限";
  return String(v);
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Record<PlanCode, PlanRow>>({} as any);
  const [editingCode, setEditingCode] = useState<PlanCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  // 編集フォームの状態
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPriceMonthly, setFormPriceMonthly] = useState("");
  const [formPriceYearly, setFormPriceYearly] = useState("");
  const [formProvider, setFormProvider] = useState<BillingProvider>("stripe");
  const [formStripePriceId, setFormStripePriceId] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formLimits, setFormLimits] = useState<Record<keyof Limits, string>>({
    sites: "", scenarios: "", actions: "", aiInsights: "", members: "",
  });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await apiPostJson("/v1/plans/list", {});
      const rows: PlanRow[] = res.plans ?? [];
      const map: Record<string, PlanRow> = {};
      for (const r of rows) map[r.code] = r;
      setPlans(map as any);
    } catch (e: any) { setError(e.message ?? "取得失敗"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = useCallback((code: PlanCode) => {
    const def = PLAN_DEFS.find((d) => d.code === code)!;
    const row = plans[code];
    setFormName(row?.name ?? def.label);
    setFormDesc(row?.description ?? def.defaultDescription);
    setFormPriceMonthly(String(row?.price_monthly ?? def.defaultPrice));
    setFormPriceYearly(row?.price_yearly != null ? String(row.price_yearly) : "");
    setFormProvider(row?.billing_provider ?? (code === "enterprise" ? "manual" : "stripe"));
    setFormStripePriceId(row?.stripe_price_monthly_id ?? "");
    setFormActive(row?.active !== false);
    const lim = row?.limits ?? def.defaultLimits;
    setFormLimits({
      sites:      displayNum(lim.sites),
      scenarios:  displayNum(lim.scenarios),
      actions:    displayNum(lim.actions),
      aiInsights: displayNum(lim.aiInsights),
      members:    displayNum(lim.members),
    });
    setEditingCode(code);
    setSaved(""); setError("");
  }, [plans]);

  const save = useCallback(async (code: PlanCode) => {
    setLoading(true); setError(""); setSaved("");
    try {
      await apiPostJson("/v1/plans/upsert", {
        plan_id: `plan_${code}`,
        code,
        name: formName,
        description: formDesc,
        active: formActive,
        billing_provider: formProvider,
        price_monthly: Number(formPriceMonthly) || 0,
        price_yearly: formPriceYearly ? Number(formPriceYearly) : null,
        stripe_price_monthly_id: formStripePriceId || null,
        limits: {
          sites:      numOrNull(formLimits.sites),
          scenarios:  numOrNull(formLimits.scenarios),
          actions:    numOrNull(formLimits.actions),
          aiInsights: numOrNull(formLimits.aiInsights),
          members:    numOrNull(formLimits.members),
        },
      });
      setSaved(`${formName} を保存しました`);
      setEditingCode(null);
      await load();
    } catch (e: any) { setError(e.message ?? "保存失敗"); }
    finally { setLoading(false); }
  }, [formName, formDesc, formActive, formProvider, formPriceMonthly, formPriceYearly, formStripePriceId, formLimits, load]);

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>プランマスタ</h2>
      <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 14 }}>カードをクリックして各プランを編集できます</p>

      {error && <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#b91c1c", fontSize: 14 }}>{error}</div>}
      {saved && <div style={{ marginBottom: 16, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, color: "#166534", fontSize: 14 }}>{saved}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {PLAN_DEFS.map((def) => {
          const row = plans[def.code];
          const isEditing = editingCode === def.code;
          const isActive = row?.active !== false;

          return (
            <div
              key={def.code}
              style={{
                background: "#fff",
                border: `2px solid ${isEditing ? def.color : def.border}`,
                borderRadius: 10,
                overflow: "hidden",
                transition: "border-color .15s",
                cursor: isEditing ? "default" : "pointer",
                opacity: !isActive && !isEditing ? .7 : 1,
              }}
              onClick={() => !isEditing && openEdit(def.code)}
            >
              {/* カードヘッダー */}
              <div style={{ background: def.bg, borderBottom: `1px solid ${def.border}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: def.color }}>{def.label}</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                    {row?.price_monthly != null
                      ? (row.price_monthly === 0 ? "¥0 / 月" : `¥${row.price_monthly.toLocaleString()} / 月`)
                      : (def.defaultPrice === 0 ? (def.code === "enterprise" ? "お問い合わせ" : "¥0 / 月") : `¥${def.defaultPrice.toLocaleString()} / 月`)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                    background: isActive ? "#dcfce7" : "#f1f5f9",
                    color: isActive ? "#166534" : "#64748b",
                  }}>
                    {isActive ? "有効" : "無効"}
                  </span>
                  {!isEditing && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(def.code); }}
                      style={{ padding: "4px 12px", background: def.color, color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                    >
                      編集
                    </button>
                  )}
                </div>
              </div>

              {/* カード本体 — 表示 or 編集 */}
              <div style={{ padding: "16px 20px" }}>
                {!isEditing ? (
                  /* 表示モード */
                  <div>
                    <div style={{ fontSize: 13, color: "#374151", marginBottom: 12 }}>{row?.description ?? def.defaultDescription}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12, color: "#64748b" }}>
                      {[
                        ["サイト数", row?.limits?.sites],
                        ["シナリオ", row?.limits?.scenarios],
                        ["アクション", row?.limits?.actions],
                        ["AI分析", row?.limits?.aiInsights],
                        ["メンバー", row?.limits?.members],
                      ].map(([label, val]) => (
                        <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", background: "#f8fafc", borderRadius: 4 }}>
                          <span>{label}</span>
                          <span style={{ fontWeight: 600, color: "#374151" }}>{val === null || val === undefined ? "無制限" : String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* 編集モード */
                  <div onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                      <div>
                        <label style={labelStyle}>プラン名</label>
                        <input value={formName} onChange={(e) => setFormName(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>プロバイダ</label>
                        <select value={formProvider} onChange={(e) => setFormProvider(e.target.value as BillingProvider)} style={inputStyle}>
                          <option value="stripe">Stripe</option>
                          <option value="misoca">Misoca</option>
                          <option value="manual">手動</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <label style={labelStyle}>説明文</label>
                      <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} style={inputStyle} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={labelStyle}>月額（円）</label>
                        <input type="number" value={formPriceMonthly} onChange={(e) => setFormPriceMonthly(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>年額（円）</label>
                        <input type="number" value={formPriceYearly} onChange={(e) => setFormPriceYearly(e.target.value)} placeholder="空欄=なし" style={inputStyle} />
                      </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <label style={labelStyle}>Stripe Price ID (月額)</label>
                      <input value={formStripePriceId} onChange={(e) => setFormStripePriceId(e.target.value)} placeholder="price_xxx" style={inputStyle} />
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ ...labelStyle, marginBottom: 6 }}>利用制限（空欄=無制限）</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {(["sites", "scenarios", "actions", "aiInsights", "members"] as (keyof Limits)[]).map((key) => {
                          const labels: Record<string, string> = { sites: "サイト数", scenarios: "シナリオ", actions: "アクション", aiInsights: "AI分析", members: "メンバー" };
                          return (
                            <div key={key}>
                              <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 2 }}>{labels[key]}</label>
                              <input
                                value={formLimits[key]}
                                onChange={(e) => setFormLimits((prev) => ({ ...prev, [key]: e.target.value }))}
                                placeholder="無制限"
                                style={{ ...inputStyle, padding: "6px 10px", fontSize: 13 }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                        <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} />
                        有効にする
                      </label>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => save(def.code)}
                        disabled={loading}
                        style={{ flex: 1, padding: "9px 0", background: def.color, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 700 }}
                      >
                        {loading ? "保存中…" : "保存する"}
                      </button>
                      <button
                        onClick={() => { setEditingCode(null); setSaved(""); setError(""); }}
                        style={{ padding: "9px 16px", background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: "#64748b", display: "block", marginBottom: 3 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 13, boxSizing: "border-box" };
