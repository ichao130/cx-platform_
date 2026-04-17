import React, { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { apiPostJson, auth, db } from "../firebase";
import RightDrawer from "../components/RightDrawer";

type WorkspaceRow = { id: string; name: string };

function workspaceKeyForUid(uid?: string | null) {
  return uid ? `cx_admin_workspace_id:${uid}` : "cx_admin_workspace_id";
}
function readSelectedWorkspaceId(uid?: string | null) {
  return (
    window.localStorage.getItem(workspaceKeyForUid(uid)) ||
    window.localStorage.getItem("cx_admin_workspace_id") ||
    window.localStorage.getItem("selectedWorkspaceId") ||
    ""
  );
}

type Status = "inactive" | "trialing" | "active" | "past_due" | "canceled";
type Provider = "stripe" | "misoca" | "manual";

type Billing = {
  plan: string;
  status: Status;
  provider?: Provider;
  billing_email?: string | null;
  billing_company_name?: string | null;
  billing_contact_name?: string | null;
  billing_contact_phone?: string | null;
  billing_zip?: string | null;
  billing_prefecture?: string | null;
  billing_city?: string | null;
  billing_address?: string | null;
  free_expires_at?: string | null;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  manual_billing_note?: string;
  access_override_active?: boolean;
  access_override_until?: string | null;
  access_override_note?: string;
  plan_master?: {
    name?: string;
    price_monthly?: number;
    currency?: string;
    description?: string;
  } | null;
  updatedAt?: any;
};

// バックヤードで登録したプランマスタ
type PlanMaster = {
  id: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  price_monthly: number;
  log_sample_rate?: number; // ログサンプリングレート（0〜1）
  stripe_price_monthly_id?: string | null;
};

const CODE_COLOR: Record<string, string> = {
  free:     "#64748b",
  standard: "#2563eb",
  premium:  "#7c3aed",
  custom:   "#b45309",
  // Stripe Billing プランコード
  pro:      "#2563eb",
  advanced: "#7c3aed",
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

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  try { return new Date(v).toLocaleDateString("ja-JP"); } catch { return v; }
}

function fmtPrice(n: number, currency = "JPY") {
  return n === 0 ? "無料" : `¥${n.toLocaleString()} / 月`;
}

// ── コンポーネント ──────────────────────────────────────────────
export default function WorkspaceBillingPage() {
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [wsId, setWsId] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  // モーダル
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showProvider, setShowProvider] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("free");
  const [selectedProvider, setSelectedProvider] = useState<Provider>("stripe");

  // プランマスタ（バックヤードから）
  const [planMasterList, setPlanMasterList] = useState<PlanMaster[]>([]);
  const [planMasterLoading, setPlanMasterLoading] = useState(false);

  // Stripe
  const [stripeLoading, setStripeLoading] = useState(false);

  // 請求先フォーム
  const [billingEmail, setBillingEmail] = useState("");
  const [billingCompany, setBillingCompany] = useState("");
  const [billingContact, setBillingContact] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [billingZip, setBillingZip] = useState("");
  const [billingPrefecture, setBillingPrefecture] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingAddress, setBillingAddress] = useState("");

  const workspaceName = useMemo(() => {
    const found = workspaces.find((w) => w.id === wsId);
    return found?.name || wsId || "（未選択）";
  }, [workspaces, wsId]);

  // Stripe Checkout 完了 / キャンセル メッセージ表示
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success") {
      setSaved("✅ お支払いが完了しました！プランが更新されるまで数秒お待ちください。");
      // URL からパラメータを除去
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.toString());
    } else if (checkout === "cancel") {
      setError("⚠️ お支払いがキャンセルされました。");
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // 認証ユーザー取得
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setCurrentUid(u?.uid ?? null);
    });
  }, []);

  // workspaceId を localStorage + イベントで取得
  useEffect(() => {
    const read = () => readSelectedWorkspaceId(currentUid);
    setWsId(read());
    const handler = (e: Event) => {
      const next = (e as CustomEvent)?.detail?.workspaceId;
      if (next) setWsId(next);
    };
    window.addEventListener("cx_admin_workspace_changed", handler);
    return () => window.removeEventListener("cx_admin_workspace_changed", handler);
  }, [currentUid]);

  // ワークスペース一覧（名前表示用・自分がメンバーのもののみ）
  useEffect(() => {
    if (!currentUid) return;
    const q = query(
      collection(db, "workspaces"),
      where(`members.${currentUid}`, "in", ["owner", "admin", "member", "viewer"])
    );
    const unsub = onSnapshot(q, (snap) => {
      setWorkspaces(snap.docs.map((d) => ({ id: d.id, name: String(d.data()?.name || d.id) })));
    });
    return unsub;
  }, [currentUid]);

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
      setBillingZip(b.billing_zip ?? "");
      setBillingPrefecture(b.billing_prefecture ?? "");
      setBillingCity(b.billing_city ?? "");
      setBillingAddress(b.billing_address ?? "");
    } catch (e: any) { setError(e.message ?? "取得失敗"); }
    finally { setLoading(false); }
  }, [wsId]);

  useEffect(() => { load(); }, [load]);

  // プランマスタ取得（Firestore直読み・認証済みユーザー全員可）
  const loadPlanMaster = useCallback(async () => {
    if (planMasterList.length > 0) return;
    setPlanMasterLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "plans"), where("active", "==", true)));
      const list: PlanMaster[] = snap.docs
        .map((d) => {
          const p = d.data() as any;
          return { id: d.id, code: p.code || d.id, name: p.name || d.id, description: p.description || "", active: true, price_monthly: Number(p.price_monthly || 0), log_sample_rate: typeof p.limits?.log_sample_rate === "number" ? p.limits.log_sample_rate : 1, stripe_price_monthly_id: p.stripe_price_monthly_id || null };
        })
        .sort((a, b) => a.price_monthly - b.price_monthly);
      setPlanMasterList(list);
    } catch { /* 取得失敗時は空 */ }
    finally { setPlanMasterLoading(false); }
  }, [planMasterList.length]);

  // Stripe Checkout でプランアップグレード（plan = プランのdoc ID）
  const openStripeCheckout = useCallback(async (planDocId: string) => {
    if (!wsId) return;
    setStripeLoading(true); setError("");
    try {
      const successUrl = `${window.location.origin}/workspace/billing?checkout=success`;
      const cancelUrl  = `${window.location.origin}/workspace/billing?checkout=cancel`;
      const res = await apiPostJson("/v1/stripe/checkout", {
        workspace_id: wsId,
        plan: planDocId,
        success_url: successUrl,
        cancel_url:  cancelUrl,
      });
      if (res.url) window.location.href = res.url;
      else setError(res.message || "Checkout URLの取得に失敗しました");
    } catch (e: any) { setError(e.message ?? "Stripe Checkout 失敗"); }
    finally { setStripeLoading(false); }
  }, [wsId]);

  // Stripe Customer Portal を開く
  const openStripePortal = useCallback(async () => {
    if (!wsId) return;
    setStripeLoading(true); setError("");
    try {
      const returnUrl = `${window.location.origin}/workspace/billing`;
      const res = await apiPostJson("/v1/stripe/portal", {
        workspace_id: wsId,
        return_url: returnUrl,
      });
      if (res.url) window.location.href = res.url;
      else setError(res.message || "Portal URLの取得に失敗しました");
    } catch (e: any) { setError(e.message ?? "Stripe Portal 失敗"); }
    finally { setStripeLoading(false); }
  }, [wsId]);

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
        billing_zip: billingZip,
        billing_prefecture: billingPrefecture,
        billing_city: billingCity,
        billing_address: billingAddress,
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
        billing_zip: billingZip,
        billing_prefecture: billingPrefecture,
        billing_city: billingCity,
        billing_address: billingAddress,
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
        billing_zip: billingZip,
        billing_prefecture: billingPrefecture,
        billing_city: billingCity,
        billing_address: billingAddress,
      });
      setShowProvider(false);
      setSaved("支払い方法を変更しました");
      await load();
    } catch (e: any) { setError(e.message ?? "変更失敗"); }
    finally { setLoading(false); }
  }, [wsId, billing, selectedProvider, billingEmail, billingCompany, billingContact, billingPhone, load]);

  // ── UI ────────────────────────────────────────────────────────
  const planCode = billing?.plan ?? "free";
  const status = billing?.status ?? "inactive";
  const provider = billing?.provider ?? "manual";
  const planColor = CODE_COLOR[planCode] ?? CODE_COLOR.standard;
  const planName = billing?.plan_master?.name ?? planCode.charAt(0).toUpperCase() + planCode.slice(1);
  const planPrice = billing?.plan_master?.price_monthly != null
    ? fmtPrice(billing.plan_master.price_monthly)
    : "";
  const statusMeta = STATUS_META[status] ?? STATUS_META.inactive;
  const providerMeta = PROVIDER_META[provider] ?? PROVIDER_META.manual;

  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700 }}>契約・Billing</h2>
        <div style={{ fontSize: 14, color: "#64748b" }}>
          対象ワークスペース：
          <span style={{ fontWeight: 600, color: "#1e293b" }}>{workspaceName}</span>
          {wsId && <span style={{ marginLeft: 8, fontSize: 12, color: "#94a3b8" }}>（{wsId}）</span>}
        </div>
      </div>

      {error && <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#b91c1c", fontSize: 14 }}>{error}</div>}
      {saved && <div style={{ marginBottom: 16, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, color: "#166534", fontSize: 14 }}>{saved}</div>}

      {loading && <div style={{ color: "#64748b", marginBottom: 16 }}>読み込み中…</div>}

      {billing && (
        <>
          {/* ── 現在のプランカード ── */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 16, overflow: "hidden", borderTop: `4px solid ${planColor}` }}>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>現在のプラン</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: planColor }}>{planName}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: statusMeta.bg, color: statusMeta.color }}>
                    {statusMeta.label}
                  </span>
                  {!billing.access_override_active && (
                    <button
                      onClick={async () => { setSelectedPlan(planCode); await loadPlanMaster(); setShowUpgrade(true); }}
                      style={{ padding: "6px 14px", background: planColor, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                    >
                      プランを変更
                    </button>
                  )}
                  {billing.stripe_subscription_id && (
                    <button
                      onClick={openStripePortal}
                      disabled={stripeLoading}
                      style={{ padding: "6px 14px", background: "#f1f5f9", color: "#374151", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
                    >
                      {stripeLoading ? "…" : "💳 請求・解約管理"}
                    </button>
                  )}
                </div>
              </div>
              {planPrice && <div style={{ fontSize: 20, fontWeight: 600, color: "#1e293b", marginBottom: 12 }}>{planPrice}</div>}
              <div style={{ display: "flex", gap: 24, fontSize: 13, color: "#64748b" }}>
                {billing.trial_ends_at && <span>トライアル終了: {fmtDate(billing.trial_ends_at)}</span>}
                {billing.current_period_ends_at && <span>次回更新: {fmtDate(billing.current_period_ends_at)}</span>}
              </div>
              {billing.access_override_active && billing.access_override_until && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: "#f5f3ff", borderRadius: 6, fontSize: 13, color: "#7c3aed", fontWeight: 600 }}>
                  🔑 フルアクセス付与中（{fmtDate(billing.access_override_until)} まで）
                  {billing.access_override_note && <span style={{ fontWeight: 400, marginLeft: 8 }}>— {billing.access_override_note}</span>}
                </div>
              )}
              {(() => {
                const master = planMasterList.find((p) => p.code === planCode);
                const rate = billing.access_override_active ? 1 : (master?.log_sample_rate ?? 1);
                return (
                  <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
                    ログサンプリングレート: <b style={{ color: "#1e293b" }}>{Math.round(rate * 100)}%</b>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── 無料プラン期限警告 ── */}
          {billing.free_expires_at && !billing.access_override_active && (() => {
            const expMs = new Date(billing.free_expires_at).getTime();
            const daysLeft = Math.ceil((expMs - Date.now()) / (1000 * 60 * 60 * 24));
            const deleteDate = new Date(expMs + 10 * 24 * 60 * 60 * 1000).toLocaleDateString("ja-JP");
            const isExpired = daysLeft <= 0;
            return (
              <div style={{ background: isExpired ? "#fef2f2" : "#fffbeb", border: `1px solid ${isExpired ? "#fca5a5" : "#fcd34d"}`, borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>
                {isExpired
                  ? <>⚠️ 無料プランの有効期限が切れています。<strong>{deleteDate}</strong> にアカウントが自動削除されます。有料プランへのアップグレードをご検討ください。</>
                  : <>⏰ 無料プランの有効期限：<strong>{fmtDate(billing.free_expires_at)}</strong>（残り{daysLeft}日）。期限後10日（{deleteDate}）に自動削除されます。</>
                }
              </div>
            );
          })()}

          {/* ── 支払い方法カード（¥0プランは非表示） ── */}
          {(billing.plan_master?.price_monthly ?? 0) > 0 && <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 16, padding: "20px 24px" }}>
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
          </div>}

          {/* ── 請求先住所フォーム（請求書払いの場合のみ表示） ── */}
          {provider !== "stripe" && <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 16, padding: "20px 24px" }}>
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
                  placeholder="03-1234-5678"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>郵便番号</label>
                <input
                  value={billingZip}
                  onChange={(e) => setBillingZip(e.target.value)}
                  placeholder="123-4567"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>都道府県</label>
                <input
                  value={billingPrefecture}
                  onChange={(e) => setBillingPrefecture(e.target.value)}
                  placeholder="東京都"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>市区町村</label>
                <input
                  value={billingCity}
                  onChange={(e) => setBillingCity(e.target.value)}
                  placeholder="渋谷区〇〇1-2-3"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>建物名・部屋番号</label>
                <input
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="〇〇ビル 5F"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={saveAddress}
                disabled={loading}
                style={{ padding: "8px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
              >
                保存する
              </button>
            </div>
          </div>}
        </>
      )}

      {/* ── プラン変更ドロワー ── */}
      <RightDrawer
        open={showUpgrade}
        width={560}
        title="プランを変更する"
        description="現在の契約状況を見ながら、候補プランと決済導線を右側で確認できます。"
        onClose={() => setShowUpgrade(false)}
      >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>プランを変更する</div>
            {planMasterLoading ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b" }}>読み込み中…</div>
            ) : planMasterList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 14 }}>
                利用可能なプランがありません。<br />バックヤードでプランを登録してください。
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {planMasterList.map((p) => {
                  const color = CODE_COLOR[p.code] ?? CODE_COLOR.standard;
                  const isSelected = selectedPlan === p.code;
                  return (
                    <label
                      key={p.id}
                      style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: `2px solid ${isSelected ? color : "#e2e8f0"}`, borderRadius: 8, cursor: "pointer", background: isSelected ? `${color}10` : "#fff", transition: "all .15s" }}
                    >
                      <input type="radio" name="plan" value={p.code} checked={isSelected} onChange={() => setSelectedPlan(p.code)} style={{ accentColor: color }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color, fontSize: 15 }}>{p.name}</div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>{fmtPrice(p.price_monthly)}</div>
                        {p.description && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{p.description}</div>}
                      </div>
                      {billing?.plan === p.code && <span style={{ fontSize: 12, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 10 }}>現在</span>}
                    </label>
                  );
                })}
              </div>
            )}
            {/* Stripe 有料プランへのアップグレード説明 */}
            {(() => {
              const selectedPlanData = planMasterList.find((p) => p.code === selectedPlan);
              // stripe_price_monthly_id が設定されているプランは Stripe 経由
              const isStripeUpgrade = !!selectedPlanData?.stripe_price_monthly_id && selectedPlan !== billing?.plan;
              if (!isStripeUpgrade) return null;
              return (
                <div style={{ marginBottom: 16, padding: "10px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 13, color: "#1e40af" }}>
                  💳 Stripe の決済画面に移動してクレジットカードでお支払いください。決済完了後、プランが自動的に更新されます。
                  {selectedPlanData && <span style={{ marginLeft: 8, fontWeight: 600 }}>{selectedPlanData.name}：¥{selectedPlanData.price_monthly.toLocaleString()} / 月（税込）</span>}
                </div>
              );
            })()}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowUpgrade(false)} style={{ padding: "9px 20px", background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>キャンセル</button>
              {(() => {
                const selectedPlanData = planMasterList.find((p) => p.code === selectedPlan);
                const isStripeUpgrade = !!selectedPlanData?.stripe_price_monthly_id && selectedPlan !== billing?.plan;
                if (isStripeUpgrade && selectedPlanData) {
                  return (
                    <button
                      onClick={() => openStripeCheckout(selectedPlanData.id)}
                      disabled={stripeLoading}
                      style={{ padding: "9px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
                    >
                      {stripeLoading ? "移動中…" : "💳 Stripe でお支払い"}
                    </button>
                  );
                }
                return (
                  <button
                    onClick={changePlan}
                    disabled={loading || selectedPlan === billing?.plan || planMasterList.length === 0}
                    style={{ padding: "9px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: selectedPlan === billing?.plan || planMasterList.length === 0 ? .5 : 1 }}
                  >
                    {loading ? "変更中…" : "変更する"}
                  </button>
                );
              })()}
            </div>
      </RightDrawer>

      {/* ── 支払い方法変更ドロワー ── */}
      <RightDrawer
        open={showProvider}
        width={500}
        title="支払い方法を変更する"
        description="現在の方法を見比べながら、その場で切り替えられるようにしています。"
        onClose={() => setShowProvider(false)}
      >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>支払い方法を変更する</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {(["stripe", "misoca"] as Provider[]).map((pv) => {
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
      </RightDrawer>
    </div>
  );
}
