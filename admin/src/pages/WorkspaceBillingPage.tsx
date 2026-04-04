import React, { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { apiPostJson, auth, db } from "../firebase";

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
};

const CODE_COLOR: Record<string, string> = {
  free:     "#64748b",
  standard: "#2563eb",
  premium:  "#7c3aed",
  custom:   "#b45309",
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

  // 請求先フォーム
  const [billingEmail, setBillingEmail] = useState("");
  const [billingCompany, setBillingCompany] = useState("");
  const [billingContact, setBillingContact] = useState("");
  const [billingPhone, setBillingPhone] = useState("");

  const workspaceName = useMemo(() => {
    const found = workspaces.find((w) => w.id === wsId);
    return found?.name || wsId || "（未選択）";
  }, [workspaces, wsId]);

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

  // ワークスペース一覧（名前表示用）
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "workspaces"), (snap) => {
      setWorkspaces(snap.docs.map((d) => ({ id: d.id, name: String(d.data()?.name || d.id) })));
    });
    return unsub;
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
          return { id: d.id, code: p.code || d.id, name: p.name || d.id, description: p.description || "", active: true, price_monthly: Number(p.price_monthly || 0) };
        })
        .sort((a, b) => a.price_monthly - b.price_monthly);
      setPlanMasterList(list);
    } catch { /* 取得失敗時は空 */ }
    finally { setPlanMasterLoading(false); }
  }, [planMasterList.length]);

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
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: statusMeta.bg, color: statusMeta.color }}>
                    {statusMeta.label}
                  </span>
                  <button
                    onClick={async () => { setSelectedPlan(planCode); await loadPlanMaster(); setShowUpgrade(true); }}
                    style={{ padding: "6px 14px", background: planColor, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                  >
                    プランを変更
                  </button>
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
                  placeholder="03-1234-5678"
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
          </div>
        </>
      )}

      {/* ── プラン変更モーダル ── */}
      {showUpgrade && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 500, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto" }}>
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
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowUpgrade(false)} style={{ padding: "9px 20px", background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>キャンセル</button>
              <button
                onClick={changePlan}
                disabled={loading || selectedPlan === billing?.plan || planMasterList.length === 0}
                style={{ padding: "9px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: selectedPlan === billing?.plan || planMasterList.length === 0 ? .5 : 1 }}
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
