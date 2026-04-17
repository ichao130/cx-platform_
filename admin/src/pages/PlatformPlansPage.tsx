// admin/src/pages/PlatformPlansPage.tsx
import React, { useEffect, useState, useCallback } from "react";
import { apiPostJson } from "../firebase";
import { useAuth } from "../App";

// ---- 型定義 ----
type PlanLimits = {
  workspaces: number | null;
  sites: number | null;
  scenarios: number | null;
  actions: number | null;
  members: number | null;
  templates: number | null;
  media: number | null;
  log_sample_rate: number;
};

type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
  billing_provider: "stripe" | "manual";
  currency: string;
  price_monthly: number;
  price_yearly: number | null;
  limits: PlanLimits;
  stripe_price_monthly_id: string | null;
  stripe_price_yearly_id: string | null;
  updatedAt: any;
};

const LIMIT_LABELS: { key: keyof PlanLimits; label: string; isFloat?: boolean }[] = [
  { key: "sites", label: "サイト数" },
  { key: "scenarios", label: "シナリオ数" },
  { key: "actions", label: "アクション数" },
  { key: "members", label: "メンバー数" },
  { key: "templates", label: "テンプレート数" },
  { key: "media", label: "メディア数" },
  { key: "log_sample_rate", label: "ログサンプリング率", isFloat: true },
];

const EMPTY_LIMITS: PlanLimits = {
  workspaces: null,
  sites: null,
  scenarios: null,
  actions: null,
  members: null,
  templates: null,
  media: null,
  log_sample_rate: 1,
};

function genPlanId() {
  return "plan_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
}

function fmtPrice(n: number) {
  return "¥" + n.toLocaleString("ja-JP");
}

function LimitBadge({ v }: { v: number | null | undefined }) {
  if (v === null || v === undefined) return <span style={{ color: "#16a34a", fontSize: 12 }}>無制限</span>;
  return <span style={{ fontSize: 12 }}>{v.toLocaleString()}</span>;
}

// ---- プラン編集モーダル ----
type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; plan: PlanRow };

function PlanModal({
  modalState,
  workspaceId,
  onClose,
  onSaved,
}: {
  modalState: ModalState;
  workspaceId: string;
  onClose: () => void;
  onSaved: (plan: PlanRow) => void;
}) {
  const isOpen = modalState.mode !== "closed";
  const isEdit = modalState.mode === "edit";
  const initialPlan = isEdit ? modalState.plan : null;

  const [planId, setPlanId] = useState(initialPlan?.id || genPlanId());
  const [code, setCode] = useState(initialPlan?.code || "");
  const [name, setName] = useState(initialPlan?.name || "");
  const [description, setDescription] = useState(initialPlan?.description || "");
  const [active, setActive] = useState(initialPlan?.active ?? true);
  const [billingProvider, setBillingProvider] = useState<"stripe" | "manual">(initialPlan?.billing_provider || "stripe");
  const [currency, setCurrency] = useState(initialPlan?.currency || "JPY");
  const [priceMonthly, setPriceMonthly] = useState(String(initialPlan?.price_monthly ?? ""));
  const [priceYearly, setPriceYearly] = useState(String(initialPlan?.price_yearly ?? ""));
  const [stripePriceMonthlyId, setStripePriceMonthlyId] = useState(initialPlan?.stripe_price_monthly_id || "");
  const [stripePriceYearlyId, setStripePriceYearlyId] = useState(initialPlan?.stripe_price_yearly_id || "");
  const [limits, setLimits] = useState<PlanLimits>(initialPlan?.limits || EMPTY_LIMITS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // モーダルが開くたびに初期値をリセット
  useEffect(() => {
    if (!isOpen) return;
    const p = isEdit ? (modalState as { mode: "edit"; plan: PlanRow }).plan : null;
    setPlanId(p?.id || genPlanId());
    setCode(p?.code || "");
    setName(p?.name || "");
    setDescription(p?.description || "");
    setActive(p?.active ?? true);
    setBillingProvider(p?.billing_provider || "stripe");
    setCurrency(p?.currency || "JPY");
    setPriceMonthly(String(p?.price_monthly ?? ""));
    setPriceYearly(String(p?.price_yearly ?? ""));
    setStripePriceMonthlyId(p?.stripe_price_monthly_id || "");
    setStripePriceYearlyId(p?.stripe_price_yearly_id || "");
    setLimits(p?.limits || EMPTY_LIMITS);
    setError("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const setLimit = (key: keyof PlanLimits, rawVal: string) => {
    if (key === "log_sample_rate") {
      const v = parseFloat(rawVal);
      setLimits((prev) => ({ ...prev, [key]: isNaN(v) ? 1 : Math.min(1, Math.max(0, v)) }));
    } else {
      if (rawVal === "" || rawVal === "null") {
        setLimits((prev) => ({ ...prev, [key]: null }));
      } else {
        const v = parseInt(rawVal, 10);
        setLimits((prev) => ({ ...prev, [key]: isNaN(v) ? null : v }));
      }
    }
  };

  const handleSave = async () => {
    if (!code.trim()) { setError("コードを入力してください"); return; }
    if (!name.trim()) { setError("名前を入力してください"); return; }
    if (priceMonthly === "" || isNaN(Number(priceMonthly))) { setError("月額価格を入力してください"); return; }

    setSaving(true);
    setError("");
    try {
      const res = await apiPostJson("/v1/plans/upsert", {
        workspace_id: workspaceId,
        plan_id: planId,
        code: code.trim(),
        name: name.trim(),
        description: description.trim(),
        active,
        billing_provider: billingProvider,
        currency: currency || "JPY",
        price_monthly: Number(priceMonthly),
        price_yearly: priceYearly !== "" ? Number(priceYearly) : null,
        limits,
        stripe_price_monthly_id: stripePriceMonthlyId.trim() || null,
        stripe_price_yearly_id: stripePriceYearlyId.trim() || null,
      });
      if (!res.ok) throw new Error(res.message || res.error || "保存失敗");
      onSaved({
        id: planId,
        code: code.trim(),
        name: name.trim(),
        description: description.trim(),
        active,
        billing_provider: billingProvider,
        currency: currency || "JPY",
        price_monthly: Number(priceMonthly),
        price_yearly: priceYearly !== "" ? Number(priceYearly) : null,
        limits,
        stripe_price_monthly_id: stripePriceMonthlyId.trim() || null,
        stripe_price_yearly_id: stripePriceYearlyId.trim() || null,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px", overflowY: "auto" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 600, boxShadow: "0 20px 60px rgba(0,0,0,.25)", padding: 28 }}>
        {/* ヘッダー */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          <div className="h1" style={{ margin: 0 }}>{isEdit ? "✏️ プランを編集" : "➕ プランを作成"}</div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted)", padding: "2px 6px" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Plan ID（編集時は読み取り専用） */}
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>プランID（Firestore doc ID）</span>
            {isEdit ? (
              <code style={{ fontSize: 12, background: "#f1f5f9", borderRadius: 6, padding: "6px 10px", color: "#475569" }}>{planId}</code>
            ) : (
              <input className="input" value={planId} onChange={(e) => setPlanId(e.target.value)} style={{ fontSize: 13 }} />
            )}
          </label>

          {/* 基本情報 2列 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>コード <span style={{ color: "#ef4444" }}>*</span></span>
              <input className="input" value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} placeholder="pro, advanced, free..." style={{ fontSize: 13 }} />
              <span style={{ fontSize: 11, color: "var(--muted)" }}>小文字英数字・ハイフン・アンダースコアのみ</span>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>プラン名 <span style={{ color: "#ef4444" }}>*</span></span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro プラン" style={{ fontSize: 13 }} />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>説明文</span>
            <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ fontSize: 13, resize: "vertical" }} />
          </label>

          {/* 価格・設定 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>月額（税抜） <span style={{ color: "#ef4444" }}>*</span></span>
              <input className="input" type="number" min={0} value={priceMonthly} onChange={(e) => setPriceMonthly(e.target.value)} placeholder="12900" style={{ fontSize: 13 }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>年額（税抜・任意）</span>
              <input className="input" type="number" min={0} value={priceYearly} onChange={(e) => setPriceYearly(e.target.value)} placeholder="空欄=なし" style={{ fontSize: 13 }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>通貨</span>
              <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="JPY" style={{ fontSize: 13 }} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>請求プロバイダ</span>
              <select className="input" value={billingProvider} onChange={(e) => setBillingProvider(e.target.value as any)} style={{ fontSize: 13 }}>
                <option value="stripe">Stripe</option>
                <option value="manual">手動（請求書）</option>
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 22 }}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>有効（アクティブ）</span>
            </label>
          </div>

          {/* Stripe Price IDs */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 10 }}>💳 Stripe 設定</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Price ID（月額）</span>
                <input
                  className="input"
                  value={stripePriceMonthlyId}
                  onChange={(e) => setStripePriceMonthlyId(e.target.value.trim())}
                  placeholder="price_..."
                  style={{ fontSize: 12, fontFamily: "monospace" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Price ID（年額・任意）</span>
                <input
                  className="input"
                  value={stripePriceYearlyId}
                  onChange={(e) => setStripePriceYearlyId(e.target.value.trim())}
                  placeholder="price_..."
                  style={{ fontSize: 12, fontFamily: "monospace" }}
                />
              </label>
            </div>
          </div>

          {/* プラン制限 */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 10 }}>📊 プラン制限（空欄 = 無制限）</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {LIMIT_LABELS.map(({ key, label, isFloat }) => (
                <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>{label}</span>
                  {isFloat ? (
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={limits[key] ?? 1}
                      onChange={(e) => setLimit(key, e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                  ) : (
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={limits[key] === null || limits[key] === undefined ? "" : String(limits[key])}
                      onChange={(e) => setLimit(key, e.target.value)}
                      placeholder="無制限"
                      style={{ fontSize: 12 }}
                    />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* エラー */}
          {error && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* ボタン */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button className="btn" onClick={onClose} disabled={saving} style={{ fontSize: 13 }}>キャンセル</button>
            <button
              className="btn"
              onClick={handleSave}
              disabled={saving}
              style={{ fontSize: 13, background: "#2563eb", color: "#fff", border: "none" }}
            >
              {saving ? "保存中..." : isEdit ? "💾 更新する" : "✅ 作成する"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- メインページ ----
export default function PlatformPlansPage() {
  const { workspaceId } = useAuth();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalState, setModalState] = useState<ModalState>({ mode: "closed" });
  const [includeInactive, setIncludeInactive] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiPostJson("/v1/plans/list", { workspace_id: workspaceId, include_inactive: true });
      if (!res.ok) throw new Error(res.error || "failed");
      setPlans(res.items || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (plan: PlanRow) => {
    setPlans((prev) => {
      const idx = prev.findIndex((p) => p.id === plan.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = plan;
        return next;
      }
      return [...prev, plan];
    });
  };

  const displayPlans = includeInactive ? plans : plans.filter((p) => p.active);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100 }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div>
          <div className="h1" style={{ marginBottom: 4 }}>プラン管理</div>
          <div className="small" style={{ color: "var(--muted)" }}>
            Platform Admin 専用 — Stripe Price ID・制限値の設定
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
            無効プランも表示
          </label>
          <button className="btn" onClick={load} disabled={loading} style={{ fontSize: 13 }}>
            {loading ? "読込中..." : "↻ 更新"}
          </button>
          <button
            className="btn"
            onClick={() => setModalState({ mode: "create" })}
            style={{ fontSize: 13, background: "#2563eb", color: "#fff", border: "none" }}
          >
            ＋ 新規プラン
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
      ) : displayPlans.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>
          プランが登録されていません
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {displayPlans.map((plan) => (
            <div key={plan.id} className="card" style={{ padding: "18px 20px", opacity: plan.active ? 1 : 0.55 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                {/* 左：基本情報 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{plan.name}</span>
                    <code style={{ fontSize: 11, background: "#f1f5f9", borderRadius: 4, padding: "2px 8px", color: "#475569" }}>{plan.code}</code>
                    {!plan.active && <span style={{ fontSize: 11, background: "#fef2f2", color: "#dc2626", borderRadius: 4, padding: "1px 6px" }}>無効</span>}
                    <span style={{
                      fontSize: 11, borderRadius: 4, padding: "2px 8px",
                      background: plan.billing_provider === "stripe" ? "#eff6ff" : "#f0fdf4",
                      color: plan.billing_provider === "stripe" ? "#2563eb" : "#16a34a",
                    }}>
                      {plan.billing_provider === "stripe" ? "💳 Stripe" : "🧾 手動"}
                    </span>
                  </div>

                  {plan.description && (
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{plan.description}</div>
                  )}

                  {/* 価格 */}
                  <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 13 }}>
                    <span><strong>{fmtPrice(plan.price_monthly)}</strong>/月</span>
                    {plan.price_yearly && <span style={{ color: "var(--muted)" }}>{fmtPrice(plan.price_yearly)}/年</span>}
                  </div>

                  {/* Stripe Price IDs */}
                  <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12 }}>
                      <span style={{ color: "var(--muted)" }}>月額 Price ID: </span>
                      {plan.stripe_price_monthly_id ? (
                        <code style={{ fontSize: 11, background: "#eff6ff", color: "#2563eb", borderRadius: 4, padding: "2px 8px" }}>{plan.stripe_price_monthly_id}</code>
                      ) : (
                        <span style={{ color: "#f59e0b", fontSize: 12 }}>⚠ 未設定</span>
                      )}
                    </div>
                    {plan.stripe_price_yearly_id && (
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: "var(--muted)" }}>年額 Price ID: </span>
                        <code style={{ fontSize: 11, background: "#eff6ff", color: "#2563eb", borderRadius: 4, padding: "2px 8px" }}>{plan.stripe_price_yearly_id}</code>
                      </div>
                    )}
                  </div>

                  {/* 制限値 */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {LIMIT_LABELS.filter((l) => l.key !== "log_sample_rate").map(({ key, label }) => (
                      <div key={key} style={{ fontSize: 12, background: "#f8fafc", borderRadius: 6, padding: "3px 8px", border: "1px solid #e2e8f0" }}>
                        <span style={{ color: "var(--muted)" }}>{label}: </span>
                        <LimitBadge v={plan.limits?.[key] as number | null | undefined} />
                      </div>
                    ))}
                    <div style={{ fontSize: 12, background: "#f8fafc", borderRadius: 6, padding: "3px 8px", border: "1px solid #e2e8f0" }}>
                      <span style={{ color: "var(--muted)" }}>サンプリング: </span>
                      <span style={{ fontSize: 12 }}>{((plan.limits?.log_sample_rate ?? 1) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {/* 右：編集ボタン */}
                <div style={{ flexShrink: 0 }}>
                  <button
                    className="btn"
                    onClick={() => setModalState({ mode: "edit", plan })}
                    style={{ fontSize: 12, padding: "6px 14px" }}
                  >
                    ✏️ 編集
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PlanModal
        modalState={modalState}
        workspaceId={workspaceId || ""}
        onClose={() => setModalState({ mode: "closed" })}
        onSaved={handleSaved}
      />
    </div>
  );
}
