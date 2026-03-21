import React, { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { apiPostJson, auth } from "../firebase";

const API_PATHS = {
  get: "/v1/workspaces/billing/get",
  update: "/v1/workspaces/billing/update",
  stripeCheckout: "/v1/stripe/create-checkout-session",
  stripePortal: "/v1/stripe/create-portal-session",
  misocaStatus: "/v1/misoca/status",
};

type Plan = "free" | "standard" | "pro" | "enterprise";
type Status = "inactive" | "trialing" | "active" | "past_due" | "canceled";
type Provider = "stripe" | "misoca" | "manual";

type Limits = {
  workspaces?: number | null;
  sites?: number | null;
  scenarios?: number | null;
  actions?: number | null;
  aiInsights?: number | null;
  members?: number | null;
};

type PlanMaster = {
  id?: string;
  code: Plan;
  name?: string;
  description?: string;
  active?: boolean;
  billing_provider?: Provider;
  currency?: string;
  price_monthly?: number;
  price_yearly?: number | null;
  limits?: Limits;
  updatedAt?: any;
};

type LimitOverride = {
  limits?: Limits;
  note?: string;
  updatedAt?: any;
};

type Billing = {
  plan: Plan;
  status: Status;
  provider?: Provider;
  billing_email?: string | null;
  trial_ends_at?: any;
  current_period_ends_at?: any;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  custom_limit_override_id?: string | null;
  manual_billing_note?: string;
  plan_master?: PlanMaster | null;
  override?: LimitOverride | null;
  updatedAt?: any;
};

const PLAN_META: Record<Plan, { label: string; color: string; bg: string }> = {
  free:       { label: "Free",       color: "#64748b", bg: "#f8fafc" },
  standard:   { label: "Standard",   color: "#2563eb", bg: "#eff6ff" },
  pro:        { label: "Pro",        color: "#7c3aed", bg: "#f5f3ff" },
  enterprise: { label: "Enterprise", color: "#b45309", bg: "#fffbeb" },
};

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  inactive:  { label: "未契約",           color: "#64748b", bg: "#f1f5f9" },
  trialing:  { label: "トライアル中",     color: "#0891b2", bg: "#ecfeff" },
  active:    { label: "利用中",           color: "#166534", bg: "#dcfce7" },
  past_due:  { label: "支払い要確認",     color: "#b45309", bg: "#fffbeb" },
  canceled:  { label: "解約済み",         color: "#b91c1c", bg: "#fef2f2" },
};

function fmtAnyTs(v: any) {
  if (!v) return "-";
  try {
    if (typeof v === "string") return v;
    if (typeof v?.toDate === "function") return v.toDate().toLocaleString("ja-JP");
    if (typeof v?.seconds === "number") return new Date(v.seconds * 1000).toLocaleString("ja-JP");
  } catch {}
  return String(v);
}

function fmtLimit(v: number | null | undefined) {
  if (v == null) return "無制限";
  return v.toLocaleString();
}

function workspaceKeyForUid(uid: string) {
  return `cx_admin_workspace_id:${uid}`;
}

function readSelectedWorkspaceId(uid?: string) {
  if (!uid) return "";
  try {
    return localStorage.getItem(workspaceKeyForUid(uid)) || "";
  } catch {
    return "";
  }
}

export default function WorkspaceBillingPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [currentUid, setCurrentUid] = useState<string>("");
  const canLoad = useMemo(() => !!workspaceId?.trim(), [workspaceId]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [billing, setBilling] = useState<Billing | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [misocaStatus, setMisocaStatus] = useState<{ connected: boolean; expired?: boolean; expires_at?: string } | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  // form fields
  const [plan, setPlan] = useState<Plan>("standard");
  const [status, setStatus] = useState<Status>("inactive");
  const [provider, setProvider] = useState<Provider>("stripe");
  const [trialDays, setTrialDays] = useState<number>(14);
  const [billingEmail, setBillingEmail] = useState<string>("");
  const [manualBillingNote, setManualBillingNote] = useState<string>("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  const applyFromBilling = useCallback((b: Billing | null) => {
    if (!b) return;
    setPlan((b.plan || "standard") as Plan);
    setStatus((b.status || "inactive") as Status);
    setProvider((b.provider || "stripe") as Provider);
    setBillingEmail(b.billing_email || "");
    setManualBillingNote(b.manual_billing_note || "");
  }, []);

  const load = useCallback(async () => {
    if (!workspaceId?.trim()) return;
    setErr("");
    setLoading(true);
    try {
      const data = await apiPostJson<any>(API_PATHS.get, { workspace_id: workspaceId.trim() });
      if (!data?.ok) throw new Error(data?.message || data?.error || "billing_get_failed");
      const b: Billing | null = data?.billing || null;
      setBilling(b);
      applyFromBilling(b);
    } catch (e: any) {
      setErr(e?.message || String(e));
      setBilling(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, applyFromBilling]);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      const uid = user?.uid || "";
      setCurrentUid(uid);
      setWorkspaceId(readSelectedWorkspaceId(uid));
    });
  }, []);

  useEffect(() => {
    if (!currentUid) { setWorkspaceId(""); return; }
    const apply = () => setWorkspaceId(readSelectedWorkspaceId(currentUid));
    apply();
    const onCustom = (e?: Event) => {
      const next = (e as CustomEvent | undefined)?.detail?.workspaceId;
      if (typeof next === "string") { setWorkspaceId(next); return; }
      apply();
    };
    window.addEventListener("cx_admin_workspace_changed", onCustom as EventListener);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener("cx_admin_workspace_changed", onCustom as EventListener);
      window.removeEventListener("storage", apply);
    };
  }, [currentUid]);

  useEffect(() => {
    if (!workspaceId?.trim()) { setBilling(null); setMisocaStatus(null); return; }
    load();
    // Misoca 連携状態を確認
    apiPostJson<any>(API_PATHS.misocaStatus, { workspace_id: workspaceId.trim() })
      .then((d) => { if (d?.ok) setMisocaStatus({ connected: d.connected, expired: d.expired, expires_at: d.expires_at }); })
      .catch(() => {});
  }, [workspaceId, load]);

  const openStripeCheckout = useCallback(async (planId: string) => {
    if (!workspaceId?.trim() || !planId) return;
    setStripeLoading(true);
    try {
      const origin = window.location.origin;
      const data = await apiPostJson<any>(API_PATHS.stripeCheckout, {
        workspace_id: workspaceId.trim(),
        plan_id: planId,
        success_url: `${origin}/billing?stripe_success=1`,
        cancel_url: `${origin}/billing?stripe_cancel=1`,
        billing_email: billing?.billing_email || undefined,
      });
      if (!data?.ok) throw new Error(data?.message || "checkout_failed");
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setStripeLoading(false);
    }
  }, [workspaceId, billing]);

  const openStripePortal = useCallback(async () => {
    if (!workspaceId?.trim()) return;
    setStripeLoading(true);
    try {
      const data = await apiPostJson<any>(API_PATHS.stripePortal, {
        workspace_id: workspaceId.trim(),
        return_url: window.location.href,
      });
      if (!data?.ok) throw new Error(data?.message || "portal_failed");
      if (data.portal_url) window.location.href = data.portal_url;
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setStripeLoading(false);
    }
  }, [workspaceId]);

  const connectMisoca = useCallback(() => {
    if (!workspaceId?.trim()) return;
    window.location.href = `/api/v1/misoca/auth?workspace_id=${encodeURIComponent(workspaceId.trim())}`;
  }, [workspaceId]);

  const save = useCallback(async () => {
    if (!workspaceId?.trim()) return;
    setErr("");
    setSaving(true);
    try {
      const payload: any = {
        workspace_id: workspaceId.trim(),
        plan,
        status,
        provider,
        billing_email: billingEmail?.trim() || null,
        manual_billing_note: manualBillingNote,
      };
      if (status === "trialing") payload.trial_days = Math.max(1, Math.min(60, Number(trialDays) || 14));
      const data = await apiPostJson<any>(API_PATHS.update, payload);
      if (!data?.ok) throw new Error(data?.message || data?.error || "billing_update_failed");
      const b: Billing | null = data?.billing || null;
      setBilling(b);
      applyFromBilling(b);
      setEditOpen(false);
      showToast("契約情報を保存しました ✓");
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }, [workspaceId, plan, status, provider, billingEmail, manualBillingNote, trialDays, applyFromBilling]);

  const pm = billing ? PLAN_META[billing.plan] ?? PLAN_META.standard : null;
  const sm = billing ? STATUS_META[billing.status] ?? STATUS_META.inactive : null;

  const effectiveLimits = billing ? {
    ワークスペース数: fmtLimit(billing.override?.limits?.workspaces ?? billing.plan_master?.limits?.workspaces),
    サイト数: fmtLimit(billing.override?.limits?.sites ?? billing.plan_master?.limits?.sites),
    シナリオ数: fmtLimit(billing.override?.limits?.scenarios ?? billing.plan_master?.limits?.scenarios),
    アクション数: fmtLimit(billing.override?.limits?.actions ?? billing.plan_master?.limits?.actions),
    AIインサイト数: fmtLimit(billing.override?.limits?.aiInsights ?? billing.plan_master?.limits?.aiInsights),
    メンバー数: fmtLimit(billing.override?.limits?.members ?? billing.plan_master?.limits?.members),
  } : null;

  return (
    <div className="container" style={{ minWidth: 0 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 9999,
          background: "#065f46", color: "#fff", padding: "10px 20px",
          borderRadius: 8, fontSize: 14, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,.18)",
          animation: "fadeInDown .2s ease",
        }}>
          {toast}
        </div>
      )}

      <div className="page-header">
        <div className="page-header__meta">
          <div className="small">MOKKEDA / Settings</div>
          <h1 className="h1">契約 / Billing</h1>
          <div className="small">ワークスペースの契約プラン・支払い状況を管理します。</div>
          <div className="small" style={{ marginTop: 4, opacity: 0.7 }}>
            workspace: <b>{workspaceId || "（未選択）"}</b>
          </div>
        </div>
        <div className="page-header__actions">
          <button className="btn" onClick={() => load()} disabled={!canLoad || loading}>
            {loading ? "読込中..." : "最新情報を取得"}
          </button>
        </div>
      </div>

      {err && (
        <div className="card" style={{ marginBottom: 14, background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c" }}>
          {err}
        </div>
      )}

      {/* Current plan status card */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Plan card */}
        <div className="card" style={{
          borderLeft: `4px solid ${pm?.color || "#64748b"}`,
          background: pm?.bg || "#f8fafc",
        }}>
          <div className="h2" style={{ marginTop: 0 }}>現在のプラン</div>
          {billing ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 800, color: pm?.color, marginBottom: 4 }}>
                {pm?.label || billing.plan}
              </div>
              <div className="small" style={{ marginBottom: 8 }}>
                {billing.plan_master?.currency || "JPY"} {(billing.plan_master?.price_monthly ?? 0).toLocaleString()} / 月
              </div>
              {billing.plan_master?.description && (
                <div className="small" style={{ opacity: 0.8 }}>{billing.plan_master.description}</div>
              )}
            </>
          ) : (
            <div className="small" style={{ opacity: 0.6, padding: "12px 0" }}>
              {loading ? "読み込み中..." : "データなし — 「最新情報を取得」してください"}
            </div>
          )}
        </div>

        {/* Status card */}
        <div className="card" style={{
          borderLeft: `4px solid ${sm?.color || "#64748b"}`,
        }}>
          <div className="h2" style={{ marginTop: 0 }}>契約状態</div>
          {billing ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{
                  fontSize: 14, fontWeight: 700, padding: "4px 14px", borderRadius: 20,
                  background: sm?.bg, color: sm?.color, border: `1px solid ${sm?.color}40`,
                }}>
                  {sm?.label || billing.status}
                </span>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <div className="small">
                  <span style={{ opacity: 0.7 }}>課金方式: </span>
                  <b>{billing.provider === "stripe" ? "Stripe（カード）" : billing.provider === "misoca" ? "Misoca（請求書）" : "手動管理"}</b>
                </div>
                {billing.trial_ends_at && (
                  <div className="small">
                    <span style={{ opacity: 0.7 }}>トライアル終了: </span>
                    <b>{fmtAnyTs(billing.trial_ends_at)}</b>
                  </div>
                )}
                {billing.current_period_ends_at && (
                  <div className="small">
                    <span style={{ opacity: 0.7 }}>次回更新: </span>
                    <b>{fmtAnyTs(billing.current_period_ends_at)}</b>
                  </div>
                )}
                {billing.billing_email && (
                  <div className="small">
                    <span style={{ opacity: 0.7 }}>請求先: </span>
                    <b>{billing.billing_email}</b>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 14 }}>
                <button className="btn btn--sm" onClick={() => { applyFromBilling(billing); setEditOpen(true); }}>
                  契約を変更
                </button>
              </div>
            </>
          ) : (
            <div className="small" style={{ opacity: 0.6, padding: "12px 0" }}>
              {loading ? "読み込み中..." : "データなし"}
            </div>
          )}
        </div>
      </div>

      {/* Limits */}
      {effectiveLimits && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="h2" style={{ marginTop: 0 }}>制限値</div>
          {billing?.override && (
            <div className="small" style={{ color: "#b45309", marginBottom: 8 }}>
              ⚠ カスタム override が適用されています
              {billing.override.note ? `（${billing.override.note}）` : ""}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {Object.entries(effectiveLimits).map(([label, value]) => (
              <div key={label} style={{
                background: "#f8fafc", borderRadius: 8, padding: "12px 16px",
                border: "1px solid rgba(15,23,42,.07)",
              }}>
                <div className="small" style={{ opacity: 0.7, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: value === "無制限" ? "#059669" : "#1e293b" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stripe info */}
      {billing && (billing.stripe_customer_id || billing.stripe_subscription_id || billing.stripe_price_id) && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="h2" style={{ marginTop: 0 }}>Stripe 情報</div>
          <table className="table">
            <tbody>
              {billing.stripe_customer_id && (
                <tr>
                  <th style={{ textAlign: "left", width: 200 }}>Customer ID</th>
                  <td style={{ textAlign: "left" }}><code>{billing.stripe_customer_id}</code></td>
                </tr>
              )}
              {billing.stripe_subscription_id && (
                <tr>
                  <th style={{ textAlign: "left" }}>Subscription ID</th>
                  <td style={{ textAlign: "left" }}><code>{billing.stripe_subscription_id}</code></td>
                </tr>
              )}
              {billing.stripe_price_id && (
                <tr>
                  <th style={{ textAlign: "left" }}>Price ID</th>
                  <td style={{ textAlign: "left" }}><code>{billing.stripe_price_id}</code></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Stripe actions */}
      {billing && billing.provider === "stripe" && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="h2" style={{ marginTop: 0 }}>Stripe 操作</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {billing.stripe_customer_id ? (
              <>
                <button
                  className="btn btn--primary"
                  onClick={openStripePortal}
                  disabled={stripeLoading}
                  style={{ background: "#635bff", borderColor: "#635bff" }}
                >
                  {stripeLoading ? "読込中..." : "Stripe カスタマーポータルを開く"}
                </button>
                <span className="small" style={{ opacity: 0.7 }}>
                  プラン変更・解約・支払い方法の変更ができます
                </span>
              </>
            ) : (
              <>
                <span className="small" style={{ opacity: 0.7 }}>
                  Stripe未連携。プランを選んでCheckoutを開始してください：
                </span>
                {["plan_standard", "plan_pro"].map((pid) => (
                  <button
                    key={pid}
                    className="btn"
                    onClick={() => openStripeCheckout(pid)}
                    disabled={stripeLoading}
                  >
                    {stripeLoading ? "処理中..." : pid === "plan_standard" ? "Standard で申し込む" : "Pro で申し込む"}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Misoca connection */}
      {billing && (billing.provider === "misoca" || billing.plan === "enterprise") && (
        <div className="card" style={{ marginBottom: 20, background: "#fffbeb", border: "1px solid #fde68a" }}>
          <div className="h2" style={{ marginTop: 0 }}>Misoca 請求書払い連携</div>
          {misocaStatus?.connected ? (
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                background: misocaStatus.expired ? "#fee2e2" : "#dcfce7",
                color: misocaStatus.expired ? "#b91c1c" : "#166534",
              }}>
                {misocaStatus.expired ? "トークン期限切れ" : "連携済み ✓"}
              </span>
              {misocaStatus.expires_at && (
                <span className="small" style={{ opacity: 0.7 }}>有効期限: {new Date(misocaStatus.expires_at).toLocaleString("ja-JP")}</span>
              )}
              <button className="btn btn--sm btn--ghost" onClick={connectMisoca}>
                再連携
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button className="btn" onClick={connectMisoca} style={{ background: "#b45309", borderColor: "#b45309", color: "#fff" }}>
                Misoca と連携する
              </button>
              <span className="small" style={{ opacity: 0.7 }}>
                Misoca のOAuth認証画面が開きます
              </span>
            </div>
          )}
        </div>
      )}

      {/* Manual note */}
      {billing?.manual_billing_note && (
        <div className="card" style={{ marginBottom: 20, background: "#fffbeb", border: "1px solid #fde68a" }}>
          <div className="h2" style={{ marginTop: 0 }}>手動課金メモ</div>
          <div style={{ fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{billing.manual_billing_note}</div>
        </div>
      )}

      {/* Bottom meta */}
      {billing && (
        <div className="small" style={{ opacity: 0.6, marginBottom: 40 }}>
          最終更新: {fmtAnyTs(billing.updatedAt)}
        </div>
      )}

      {/* Edit modal */}
      {editOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false); }}>
          <div className="card" style={{
            width: "min(580px, calc(100vw - 32px))", maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div className="h2" style={{ margin: 0 }}>契約情報を編集</div>
              <button className="btn btn--ghost btn--sm" onClick={() => setEditOpen(false)}>✕ 閉じる</button>
            </div>

            {err && (
              <div style={{ marginBottom: 12, padding: "8px 12px", background: "#fef2f2", color: "#b91c1c", borderRadius: 6, fontSize: 13 }}>
                {err}
              </div>
            )}

            <div className="row" style={{ gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ flex: "1 1 200px" }}>
                <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>プラン</div>
                <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
                  <option value="free">Free（無料）</option>
                  <option value="standard">Standard（標準）</option>
                  <option value="pro">Pro（上位）</option>
                  <option value="enterprise">Enterprise（個別契約）</option>
                </select>
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>利用状態</div>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                  <option value="inactive">未契約</option>
                  <option value="trialing">トライアル中</option>
                  <option value="active">利用中</option>
                  <option value="past_due">支払い要確認</option>
                  <option value="canceled">解約済み</option>
                </select>
              </div>
            </div>

            <div className="row" style={{ gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ flex: "1 1 200px" }}>
                <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>課金方式</div>
                <select className="input" value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
                  <option value="stripe">Stripe（カード自動課金）</option>
                  <option value="misoca">Misoca（請求書払い）</option>
                  <option value="manual">手動管理</option>
                </select>
              </div>
              <div style={{ flex: "0 0 160px", opacity: status === "trialing" ? 1 : 0.5 }}>
                <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>トライアル日数</div>
                <input
                  className="input"
                  type="number"
                  value={trialDays}
                  onChange={(e) => setTrialDays(Number(e.target.value))}
                  disabled={status !== "trialing"}
                  min={1}
                  max={60}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>請求先メールアドレス</div>
              <input
                className="input"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="billing@example.com"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: 16, opacity: provider === "manual" || provider === "misoca" ? 1 : 0.5 }}>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>
                手動課金メモ
                {provider === "misoca" && <span style={{ color: "#b45309", marginLeft: 6 }}>（Misoca請求書番号など）</span>}
              </div>
              <textarea
                className="input"
                rows={3}
                value={manualBillingNote}
                onChange={(e) => setManualBillingNote(e.target.value)}
                placeholder="請求書番号、稟議番号、特記事項など"
                disabled={provider === "stripe"}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button className="btn btn--ghost btn--sm" onClick={() => { applyFromBilling(billing); }}>
                元に戻す
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn--ghost" onClick={() => setEditOpen(false)}>キャンセル</button>
                <button className="btn btn--primary" onClick={save} disabled={!canLoad || saving}>
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
