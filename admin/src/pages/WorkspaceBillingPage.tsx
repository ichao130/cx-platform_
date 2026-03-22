import React, { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { apiPostJson, auth } from "../firebase";

const PLATFORM_ADMIN_EMAIL = "iwatanabe@branberyheag.com";

type Plan = "free" | "pro" | "advanced" | "enterprise";
type Status = "inactive" | "trialing" | "active" | "past_due" | "canceled";
type Provider = "stripe" | "misoca" | "manual";

type Billing = {
  plan: Plan;
  status: Status;
  provider?: Provider;
  billing_email?: string | null;
  billing_company_name?: string | null;
  billing_contact_name?: string | null;
  billing_contact_phone?: string | null;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  manual_billing_note?: string;
  access_override_until?: string | null;
  access_override_note?: string;
  access_override_active?: boolean;
  plan_master?: {
    name?: string;
    price_monthly?: number;
    currency?: string;
    description?: string;
  } | null;
  updatedAt?: any;
};

const PLAN_META: Record<Plan, { label: string; color: string; bg: string; price: string }> = {
  free:       { label: "Free",       color: "#64748b", bg: "#f8fafc",  price: "¥0 / 月" },
  pro:        { label: "Pro",        color: "#2563eb", bg: "#eff6ff",  price: "¥13,000 / 月" },
  advanced:   { label: "Advanced",   color: "#7c3aed", bg: "#f5f3ff",  price: "¥39,800 / 月" },
  enterprise: { label: "Enterprise", color: "#b45309", bg: "#fffbeb",  price: "お問い合わせ" },
};

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  inactive: { label: "未契約",       color: "#64748b", bg: "#f1f5f9" },
  trialing: { label: "トライアル中", color: "#0891b2", bg: "#ecfeff" },
  active:   { label: "利用中",       color: "#166534", bg: "#dcfce7" },
  past_due: { label: "支払い要確認", color: "#b45309", bg: "#fffbeb" },
  canceled: { label: "解約済み",     color: "#b91c1c", bg: "#fef2f2" },
};

const PROVIDER_META: Record<Provider, { label: string; icon: string }> = {
  stripe:  { label: "クレジットカード（Stripe）", icon: "💳" },
  misoca:  { label: "請求書払い（Misoca）",       icon: "🧾" },
  manual:  { label: "手動管理",                   icon: "📋" },
};

const PLAN_ORDER: Plan[] = ["free", "pro", "advanced", "enterprise"];

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  try { return new Date(v).toLocaleDateString("ja-JP"); } catch { return v; }
}

// ── コンポーネント ──────────────────────────────────────────────
export default function WorkspaceBillingPage({ workspaceId }: { workspaceId?: string }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [wsId, setWsId] = useState(workspaceId ?? "");
  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  // モーダル
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showProvider, setShowProvider] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("free");
  const [selectedProvider, setSelectedProvider] = useState<Provider>("stripe");

  // 請求先フォーム
  const [billingEmail, setBillingEmail] = useState("");
  const [billingCompany, setBillingCompany] = useState("");
  const [billingContact, setBillingContact] = useState("");
  const [billingPhone, setBillingPhone] = useState("");

  // アクセスオーバーライド
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [overrideSaving, setOverrideSaving] = useState(false);

  const isPlatformAdmin = useMemo(() => userEmail === PLATFORM_ADMIN_EMAIL, [userEmail]);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUserEmail(u?.email ?? null));
  }, []);

  const load = useCallback(async () => {
    if (!wsId) return;
    setLoading(true); setError("");
    try {
      const res = await apiPostJson("/v1/workspaces/billing/get", { workspace_id: wsId });
      const b: Billing = res.billing ?? res;
      setBilling(b);
      setSelectedPlan(b.plan ?? "free");
      setSelectedProvider(b.provider ?? "stripe");
      setBillingEmail(b.billing_email ?? "");
      setBillingCompany(b.billing_company_name ?? "");
      setBillingContact(b.billing_contact_name ?? "");
      setBillingPhone(b.billing_contact_phone ?? "");
      if (b.access_override_until) {
        setOverrideDate(b.access_override_until.slice(0, 10));
        setOverrideNote(b.access_override_note ?? "");
      }
    } catch (e: any) { setError(e.message ?? "取得失敗"); }
    finally { setLoading(false); }
  }, [wsId]);

  useEffect(() => { load(); }, [load]);

  // 請求先住所の保存
  const saveAddress = useCallback(async () => {
    if (!wsId || !billing) return;
    setLoading(true); setError(""); setSaved("");
    try {
      await apiPostJson("/v1/workspaces/billing/update", {
        workspace_id: wsId,
        plan: billing.plan,
        provider: billing.provider,
        billing_email: billingEmail,
        billing_company_name: billingCompany,
        billing_contact_name: billingContact,
        billing_contact_phone: billingPhone,
      });
      setSaved("請求先情報を保存しました");
      await load();
    } catch (e: any) { setError(e.message ?? "保存失敗"); }
    finally { setLoading(false); }
  }, [wsId, billing, billingEmail, billingCompany, billingContact, billingPhone, load]);

  // プラン変更
  const changePlan = useCallback(async () => {
    if (!wsId || !billing) return;
    setLoading(true); setError(""); setSaved("");
    try {
      await apiPostJson("/v1/workspaces/billing/update", {
        workspace_id: wsId,
        plan: selectedPlan,
        provider: billing.provider,
        billing_email: billingEmail,
        billing_company_name: billingCompany,
        billing_contact_name: billingContact,
        billing_contact_phone: billingPhone,
      });
      setShowUpgrade(false);
      setSaved("プランを変更しました");
      await load();
    } catch (e: any) { setError(e.message ?? "変更失敗"); }
    finally { setLoading(false); }
  }, [wsId, billing, selectedPlan, billingEmail, billingCompany, billingContact, billingPhone, load]);

  // 支払い方法変更
  const changeProvider = useCallback(async () => {
    if (!wsId || !billing) return;
    setLoading(true); setError(""); setSaved("");
    try {
      await apiPostJson("/v1/workspaces/billing/update", {
        workspace_id: wsId,
        plan: billing.plan,
        provider: selectedProvider,
        billing_email: billingEmail,
        billing_company_name: billingCompany,
        billing_contact_name: billingContact,
        billing_contact_phone: billingPhone,
      });
      setShowProvider(false);
      setSaved("支払い方法を変更しました");
      await load();
    } catch (e: any) { setError(e.message ?? "変更失敗"); }
    finally { setLoading(false); }
  }, [wsId, billing, selectedProvider, billingEmail, billingCompany, billingContact, billingPhone, load]);

  // アクセスオーバーライド保存
  const saveOverride = useCallback(async () => {
    if (!wsId) return;
    setOverrideSaving(true); setError(""); setSaved("");
    try {
      await apiPostJson("/v1/workspaces/access-override/set", {
        workspace_id: wsId,
        override_until: overrideDate ? new Date(overrideDate).toISOString() : null,
        note: overrideNote,
      });
      setSaved("アクセス権限を設定しました");
      await load();
    } catch (e: any) { setError(e.message ?? "設定失敗"); }
    finally { setOverrideSaving(false); }
  }, [wsId, overrideDate, overrideNote, load]);

  // ── UI ────────────────────────────────────────────────────────
  const plan = billing?.plan ?? "free";
  const status = billing?.status ?? "inactive";
  const provider = billing?.provider ?? "manual";
  const planMeta = PLAN_META[plan] ?? PLAN_META.free;
  const statusMeta = STATUS_META[status] ?? STATUS_META.inactive;
  const providerMeta = PROVIDER_META[provider] ?? PROVIDER_META.manual;

  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 700 }}>契約・Billing</h2>

      {/* ワークスペースID入力（workspaceIdがpropsで来ない場合） */}
      {!workspaceId && (
        <div style={{ marginBottom: 20, display: "flex", gap: 8 }}>
          <input
            value={wsId}
            onChange={(e) => setWsId(e.target.value)}
            placeholder="ワークスペースID"
            style={{ flex: 1, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
          />
          <button
            onClick={load}
            style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
          >
            読み込む
          </button>
        </div>
      )}

      {error && <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#b91c1c", fontSize: 14 }}>{error}</div>}
      {saved && <div style={{ marginBottom: 16, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, color: "#166534", fontSize: 14 }}>{saved}</div>}

      {loading && <div style={{ color: "#64748b", marginBottom: 16 }}>読み込み中…</div>}

      {billing && (
        <>
          {/* ── 現在のプランカード ── */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 16, overflow: "hidden", borderTop: `4px solid ${planMeta.color}` }}>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>現在のプラン</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: planMeta.color }}>{planMeta.label}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: statusMeta.bg, color: statusMeta.color }}>
                    {statusMeta.label}
                  </span>
                  <button
                    onClick={() => { setSelectedPlan(plan); setShowUpgrade(true); }}
                    style={{ padding: "6px 14px", background: planMeta.color, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                  >
                    プランを変更
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#1e293b", marginBottom: 12 }}>{planMeta.price}</div>
              <div style={{ display: "flex", gap: 24, fontSize: 13, color: "#64748b" }}>
                {billing.trial_ends_at && <span>トライアル終了: {fmtDate(billing.trial_ends_at)}</span>}
                {billing.current_period_ends_at && <span>次回更新: {fmtDate(billing.current_period_ends_at)}</span>}
              </div>
              {/* アクセスオーバーライド表示 */}
              {billing.access_override_active && billing.access_override_until && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: "#f5f3ff", borderRadius: 6, fontSize: 13, color: "#7c3aed", fontWeight: 600 }}>
                  🔑 フルアクセス付与中（{fmtDate(billing.access_override_until)} まで）
                  {billing.access_override_note && <span style={{ fontWeight: 400, marginLeft: 8 }}>— {billing.access_override_note}</span>}
                </div>
              )}
            </div>
          </div>

          {/* ── 支払い方法カード ── */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 16, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>支払い方法</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b" }}>
                  {providerMeta.icon} {providerMeta.label}
                </div>
                {billing.stripe_customer_id && (
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Customer ID: {billing.stripe_customer_id}</div>
                )}
              </div>
              <button
                onClick={() => { setSelectedProvider(provider); setShowProvider(true); }}
                style={{ padding: "6px 14px", background: "#f1f5f9", color: "#374151", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
              >
                変更する
              </button>
            </div>
          </div>

          {/* ── 請求先住所フォーム ── */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 16, padding: "20px 24px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#1e293b" }}>請求先情報</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>企業名</label>
                <input
                  value={billingCompany}
                  onChange={(e) => setBillingCompany(e.target.value)}
                  placeholder="株式会社〇〇"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>担当者名</label>
                <input
                  value={billingContact}
                  onChange={(e) => setBillingContact(e.target.value)}
                  placeholder="山田 太郎"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>請求先メール</label>
                <input
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  placeholder="billing@example.com"
                  type="email"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>電話番号</label>
                <input
                  value={billingPhone}
                  onChange={(e) => setBillingPhone(e.target.value)}
                  placeholder="03-0000-0000"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
            </div>
            <button
              onClick={saveAddress}
              disabled={loading}
              style={{ padding: "8px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
            >
              保存する
            </button>
          </div>

          {/* ── アクセスオーバーライド（管理者のみ） ── */}
          {isPlatformAdmin && (
            <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 10, padding: "20px 24px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: "#7c3aed" }}>🔑 アクセス権限の付与（管理者専用）</div>
              <div style={{ fontSize: 13, color: "#8b5cf6", marginBottom: 16 }}>プランに関係なく、指定期間フル機能を利用可能にします</div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div>
                  <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>有効期限</label>
                  <input
                    type="date"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>メモ</label>
                  <input
                    value={overrideNote}
                    onChange={(e) => setOverrideNote(e.target.value)}
                    placeholder="検証用、など"
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <button
                  onClick={saveOverride}
                  disabled={overrideSaving}
                  style={{ padding: "8px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
                >
                  {overrideSaving ? "設定中…" : "設定する"}
                </button>
                {overrideDate && (
                  <button
                    onClick={() => { setOverrideDate(""); setOverrideNote(""); }}
                    style={{ padding: "8px 14px", background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
                  >
                    クリア
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── プラン変更モーダル ── */}
      {showUpgrade && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 500, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>プランを変更する</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {PLAN_ORDER.map((p) => {
                const m = PLAN_META[p];
                const isSelected = selectedPlan === p;
                return (
                  <label
                    key={p}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: `2px solid ${isSelected ? m.color : "#e2e8f0"}`, borderRadius: 8, cursor: "pointer", background: isSelected ? m.bg : "#fff", transition: "all .15s" }}
                  >
                    <input type="radio" name="plan" value={p} checked={isSelected} onChange={() => setSelectedPlan(p)} style={{ accentColor: m.color }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: m.color, fontSize: 15 }}>{m.label}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>{m.price}</div>
                    </div>
                    {billing?.plan === p && <span style={{ fontSize: 12, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 10 }}>現在</span>}
                  </label>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowUpgrade(false)} style={{ padding: "9px 20px", background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>キャンセル</button>
              <button
                onClick={changePlan}
                disabled={loading || selectedPlan === billing?.plan}
                style={{ padding: "9px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: selectedPlan === billing?.plan ? .5 : 1 }}
              >
                {loading ? "変更中…" : "変更する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 支払い方法変更モーダル ── */}
      {showProvider && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 440, maxWidth: "90vw" }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>支払い方法を変更する</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {(["stripe", "misoca", "manual"] as Provider[]).map((pv) => {
                const m = PROVIDER_META[pv];
                const isSelected = selectedProvider === pv;
                return (
                  <label
                    key={pv}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: `2px solid ${isSelected ? "#2563eb" : "#e2e8f0"}`, borderRadius: 8, cursor: "pointer", background: isSelected ? "#eff6ff" : "#fff" }}
                  >
                    <input type="radio" name="provider" value={pv} checked={isSelected} onChange={() => setSelectedProvider(pv)} />
                    <div style={{ fontSize: 18 }}>{m.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.label}</div>
                    {billing?.provider === pv && <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 10 }}>現在</span>}
                  </label>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowProvider(false)} style={{ padding: "9px 20px", background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>キャンセル</button>
              <button
                onClick={changeProvider}
                disabled={loading || selectedProvider === billing?.provider}
                style={{ padding: "9px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: selectedProvider === billing?.provider ? .5 : 1 }}
              >
                {loading ? "変更中…" : "変更する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
