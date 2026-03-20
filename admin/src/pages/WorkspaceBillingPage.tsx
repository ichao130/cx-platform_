import React, { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { apiPostJson, auth } from "../firebase";

// =====================
// Adjust ONLY these paths if your backend uses different route names
// =====================
const API_PATHS = {
  get: "/v1/workspaces/billing/get",
  update: "/v1/workspaces/billing/update",
};

type Plan = "standard" | "premium" | "custom";
type Status = "inactive" | "trialing" | "active" | "past_due" | "canceled";
type Provider = "stripe" | "manual";

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
  stripe_price_monthly_id?: string | null;
  stripe_price_yearly_id?: string | null;
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

function fmtAnyTs(v: any) {
  if (!v) return "-";
  try {
    if (typeof v === "string") return v;
    if (typeof v?.toDate === "function") return v.toDate().toISOString();
    if (typeof v?.seconds === "number") return new Date(v.seconds * 1000).toISOString();
  } catch {}
  return String(v);
}

function planLabel(plan: Plan | string | undefined) {
  if (plan === "standard") return "standard（標準）";
  if (plan === "premium") return "premium（上位）";
  if (plan === "custom") return "custom（個別契約）";
  return String(plan || "-");
}

function statusLabel(status: Status | string | undefined) {
  if (status === "inactive") return "inactive（未契約）";
  if (status === "trialing") return "trialing（トライアル中）";
  if (status === "active") return "active（利用中）";
  if (status === "past_due") return "past_due（支払い要確認）";
  if (status === "canceled") return "canceled（解約済み）";
  return String(status || "-");
}

function providerLabel(provider: Provider | string | undefined) {
  if (provider === "stripe") return "stripe（自動課金）";
  if (provider === "manual") return "manual（請求書 / 手動管理）";
  return String(provider || "-");
}

function fmtLimit(v: number | null | undefined) {
  if (v == null) return "無制限";
  return String(v);
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

  const [billing, setBilling] = useState<Billing | null>(null);

  // edit form
  const [plan, setPlan] = useState<Plan>("standard");
  const [status, setStatus] = useState<Status>("inactive");
  const [provider, setProvider] = useState<Provider>("stripe");
  const [trialDays, setTrialDays] = useState<number>(14);
  const [billingEmail, setBillingEmail] = useState<string>("");
  const [manualBillingNote, setManualBillingNote] = useState<string>("");

  const applyFromBilling = useCallback((b: Billing | null) => {
    if (!b) return;
    setPlan((b.plan || "standard") as Plan);
    setStatus((b.status || "inactive") as Status);
    setProvider((b.provider || (b.plan === "custom" ? "manual" : "stripe")) as Provider);
    setBillingEmail(b.billing_email || "");
    setManualBillingNote(b.manual_billing_note || "");
  }, []);

  const load = useCallback(async () => {
    if (!workspaceId?.trim()) return;
    setErr("");
    setLoading(true);

    try {
      const data = await apiPostJson<any>(API_PATHS.get, {
        workspace_id: workspaceId.trim(),
      });

      if (!data?.ok) throw new Error(data?.message || data?.error || "billing_get_failed");

      const b: Billing | null = data?.billing || null;
      setBilling(b);
      applyFromBilling(b);
    } catch (e: any) {
      console.error(e);
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
    if (!currentUid) {
      setWorkspaceId("");
      return;
    }

    const applySelectedWorkspace = () => {
      setWorkspaceId(readSelectedWorkspaceId(currentUid));
    };

    applySelectedWorkspace();

    const onWorkspaceChanged = (e?: Event) => {
      const next = (e as CustomEvent | undefined)?.detail?.workspaceId;
      if (typeof next === "string") {
        setWorkspaceId(next);
        return;
      }
      applySelectedWorkspace();
    };

    const onStorageChanged = () => applySelectedWorkspace();

    window.addEventListener("cx_admin_workspace_changed", onWorkspaceChanged as EventListener);
    window.addEventListener("storage", onStorageChanged);
    return () => {
      window.removeEventListener("cx_admin_workspace_changed", onWorkspaceChanged as EventListener);
      window.removeEventListener("storage", onStorageChanged);
    };
  }, [currentUid]);

  useEffect(() => {
    if (!workspaceId?.trim()) {
      setBilling(null);
      return;
    }
    load();
  }, [workspaceId, load]);

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

      // trialing のときだけ trial_days を送る（API側の実装に合わせやすい）
      if (status === "trialing") payload.trial_days = Math.max(1, Math.min(60, Number(trialDays) || 14));

      const data = await apiPostJson<any>(API_PATHS.update, payload);

      if (!data?.ok) throw new Error(data?.message || data?.error || "billing_update_failed");

      const b: Billing | null = data?.billing || null;
      setBilling(b);
      applyFromBilling(b);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }, [workspaceId, plan, status, provider, billingEmail, manualBillingNote, trialDays, applyFromBilling]);

  return (
    <div className="container liquid-page" style={{ minWidth: 0 }}>
      <div className="page-header">
        <div className="page-header__meta">
          <div className="small" style={{ marginBottom: 6, opacity: 0.7 }}>MOKKEDA / Settings</div>
          <h1 className="h1">契約 / Billing</h1>
          <div className="small">ワークスペースごとの契約プラン、利用状態、トライアル、請求先メールを確認・更新する画面です。まずは現在の状態を確認してから編集します。</div>
          <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>
            現在のワークスペース: <b>{workspaceId || '（未選択）'}</b>
          </div>
        </div>
        <div className="page-header__actions" style={{ flexWrap: "wrap" }}>
          <button className="btn" onClick={() => load()} disabled={!canLoad || loading}>
            {loading ? "読込中..." : "現在の契約情報を取得"}
          </button>
        </div>
      </div>

      <div className="card liquid-page" style={{ minWidth: 0, marginBottom: 14 }}>
        <div className="list-toolbar">
          <div className="list-toolbar__filters" style={{ flex: 1 }}>
            <div style={{ minWidth: 320, flex: "1 1 360px" }}>
              <div className="h2">ワークスペース</div>
              <input
                className="input"
                value={workspaceId}
                readOnly
                placeholder="workspace ID"
                style={{ minWidth: 320 }}
              />
            </div>
          </div>
          <div className="list-toolbar__actions">
            <div className="small" style={{ lineHeight: 1.6, opacity: 0.74, maxWidth: 480 }}>
              現時点では手動更新用の管理画面です。将来的に Stripe / Checkout / Webhook と連携する前提で利用します。
            </div>
          </div>
        </div>

        {err ? (
          <div className="small" style={{ marginTop: 10, color: "#d93025", whiteSpace: "pre-wrap" }}>
            {err}
          </div>
        ) : null}
      </div>

      <div
        className="card liquid-page"
        style={{
          minWidth: 0,
          marginBottom: 14,
          border: "1px solid rgba(15,23,42,.08)",
          background: "linear-gradient(180deg,#ffffff,#f8fbff)",
        }}
      >
        <div className="h2" style={{ margin: 0 }}>契約情報を編集</div>
        <div className="small" style={{ opacity: 0.75, marginTop: 6 }}>
          現在は手動更新の管理画面です。ベータ運用では trialing を使いながら、後から Stripe 連携へ移行できる構成にしています。
        </div>

        <div style={{ height: 12 }} />

        <div className="row liquid-page" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 200, flex: "1 1 200px" }}>
            <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>プラン</div>
            <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
              <option value="standard">standard（標準）</option>
              <option value="premium">premium（上位）</option>
              <option value="custom">custom（個別契約）</option>
            </select>
          </div>

          <div style={{ minWidth: 200, flex: "1 1 200px" }}>
            <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>利用状態</div>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              <option value="inactive">inactive（未契約）</option>
              <option value="trialing">trialing（トライアル中）</option>
              <option value="active">active（利用中）</option>
              <option value="past_due">past_due（支払い要確認）</option>
              <option value="canceled">canceled（解約済み）</option>
            </select>
          </div>

          <div style={{ minWidth: 200, flex: "1 1 200px" }}>
            <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>課金方式</div>
            <select className="input" value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
              <option value="stripe">stripe（自動課金）</option>
              <option value="manual">manual（請求書 / 手動管理）</option>
            </select>
          </div>

          <div style={{ minWidth: 200, flex: "1 1 200px", opacity: status === "trialing" ? 1 : 0.5 }}>
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

        <div style={{ height: 10 }} />

        <div style={{ minWidth: 0 }}>
          <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>請求先メールアドレス</div>
          <input
            className="input"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            placeholder="billing@example.com"
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ height: 10 }} />

        <div style={{ minWidth: 0, opacity: provider === "manual" ? 1 : 0.6 }}>
          <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>手動課金メモ</div>
          <textarea
            className="input"
            rows={4}
            value={manualBillingNote}
            onChange={(e) => setManualBillingNote(e.target.value)}
            placeholder="請求書払い、個別見積、稟議待ちなどのメモ"
            disabled={provider !== "manual"}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ height: 12 }} />

        <div className="page-header__actions" style={{ flexWrap: "wrap" }}>
          <button className="btn btn--primary" onClick={save} disabled={!canLoad || saving}>
            {saving ? "保存中..." : "契約情報を保存"}
          </button>
          <button
            className="btn"
            onClick={() => applyFromBilling(billing)}
            disabled={!billing}
          >
            読み込み内容に戻す
          </button>
        </div>
      </div>

      <div className="card liquid-page" style={{ minWidth: 0 }}>
        <div className="list-toolbar">
          <div className="list-toolbar__filters">
            <div>
              <div className="h2" style={{ margin: 0 }}>現在の契約情報</div>
              <div className="small" style={{ opacity: 0.75, marginTop: 6 }}>
                Stripe 連携前の確認用として、現在の Billing ドキュメント内容を一覧で確認できます。
              </div>
            </div>
          </div>
        </div>

        <div className="liquid-scroll-x">
          <table className="table">
            <tbody>
            <tr>
              <th style={{ textAlign: "left", width: 220 }}>プラン</th>
              <td style={{ textAlign: "left" }}>{planLabel(billing?.plan)}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>利用状態</th>
              <td style={{ textAlign: "left" }}>{statusLabel(billing?.status)}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>課金方式</th>
              <td style={{ textAlign: "left" }}>{providerLabel(billing?.provider)}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>トライアル終了日</th>
              <td style={{ textAlign: "left" }}>{fmtAnyTs(billing?.trial_ends_at)}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>契約更新日</th>
              <td style={{ textAlign: "left" }}>{fmtAnyTs(billing?.current_period_ends_at)}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>請求先メールアドレス</th>
              <td style={{ textAlign: "left" }}>{billing?.billing_email || "-"}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>Stripe customer ID</th>
              <td style={{ textAlign: "left" }}>{billing?.stripe_customer_id || "-"}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>Stripe subscription ID</th>
              <td style={{ textAlign: "left" }}>{billing?.stripe_subscription_id || "-"}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>Stripe price ID</th>
              <td style={{ textAlign: "left" }}>{billing?.stripe_price_id || "-"}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>手動課金メモ</th>
              <td style={{ textAlign: "left", whiteSpace: "pre-wrap" }}>{billing?.manual_billing_note || "-"}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>最終更新日</th>
              <td style={{ textAlign: "left" }}>{fmtAnyTs(billing?.updatedAt)}</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div style={{ height: 12 }} />

        <div className="card liquid-page" style={{ background: "rgba(15,23,42,.02)", border: "1px solid rgba(15,23,42,.08)", minWidth: 0 }}>
          <div className="h2" style={{ margin: 0 }}>プランマスタ</div>
          <div className="small" style={{ opacity: 0.75, marginTop: 6 }}>
            今の契約にひもづいているプラン定義です。制限や料金は plan master から参照する前提です。
          </div>

          <div className="liquid-scroll-x">
            <table className="table" style={{ marginTop: 10 }}>
              <tbody>
              <tr>
                <th style={{ textAlign: "left", width: 220 }}>name</th>
                <td style={{ textAlign: "left" }}>{billing?.plan_master?.name || "-"}</td>
              </tr>
              <tr>
                <th style={{ textAlign: "left" }}>description</th>
                <td style={{ textAlign: "left" }}>{billing?.plan_master?.description || "-"}</td>
              </tr>
              <tr>
                <th style={{ textAlign: "left" }}>料金（月額）</th>
                <td style={{ textAlign: "left" }}>
                  {billing?.plan_master?.currency || "JPY"} {billing?.plan_master?.price_monthly ?? "-"}
                </td>
              </tr>
              <tr>
                <th style={{ textAlign: "left" }}>料金（年額）</th>
                <td style={{ textAlign: "left" }}>
                  {billing?.plan_master?.price_yearly == null ? "-" : `${billing?.plan_master?.currency || "JPY"} ${billing?.plan_master?.price_yearly}`}
                </td>
              </tr>
              <tr>
                <th style={{ textAlign: "left" }}>課金方式</th>
                <td style={{ textAlign: "left" }}>{providerLabel(billing?.plan_master?.billing_provider)}</td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ height: 12 }} />

        <div className="card liquid-page" style={{ background: "rgba(15,23,42,.02)", border: "1px solid rgba(15,23,42,.08)", minWidth: 0 }}>
          <div className="h2" style={{ margin: 0 }}>制限値</div>
          <div className="small" style={{ opacity: 0.75, marginTop: 6 }}>
            下段の override が入っていれば、plan master よりそちらを優先して扱う想定です。
          </div>

          <div className="liquid-scroll-x">
            <table className="table" style={{ marginTop: 10 }}>
              <tbody>
                <tr><th style={{ textAlign: "left", width: 220 }}>ワークスペース数</th><td style={{ textAlign: "left" }}>{fmtLimit(billing?.override?.limits?.workspaces ?? billing?.plan_master?.limits?.workspaces)}</td></tr>
                <tr><th style={{ textAlign: "left" }}>サイト数</th><td style={{ textAlign: "left" }}>{fmtLimit(billing?.override?.limits?.sites ?? billing?.plan_master?.limits?.sites)}</td></tr>
                <tr><th style={{ textAlign: "left" }}>シナリオ数</th><td style={{ textAlign: "left" }}>{fmtLimit(billing?.override?.limits?.scenarios ?? billing?.plan_master?.limits?.scenarios)}</td></tr>
                <tr><th style={{ textAlign: "left" }}>アクション数</th><td style={{ textAlign: "left" }}>{fmtLimit(billing?.override?.limits?.actions ?? billing?.plan_master?.limits?.actions)}</td></tr>
                <tr><th style={{ textAlign: "left" }}>AIインサイト数</th><td style={{ textAlign: "left" }}>{fmtLimit(billing?.override?.limits?.aiInsights ?? billing?.plan_master?.limits?.aiInsights)}</td></tr>
                <tr><th style={{ textAlign: "left" }}>メンバー数</th><td style={{ textAlign: "left" }}>{fmtLimit(billing?.override?.limits?.members ?? billing?.plan_master?.limits?.members)}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="small" style={{ marginTop: 8, opacity: 0.72, whiteSpace: "pre-wrap" }}>
            override note: {billing?.override?.note || "-"}
          </div>
        </div>
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}