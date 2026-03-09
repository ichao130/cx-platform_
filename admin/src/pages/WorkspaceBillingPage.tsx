import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiPostJson } from "../firebase";

// =====================
// Adjust ONLY these paths if your backend uses different route names
// =====================
const API_PATHS = {
  get: "/v1/workspaces/billing/get",
  update: "/v1/workspaces/billing/update",
};

type Plan = "free" | "pro" | "business";
type Status = "inactive" | "trialing" | "active" | "past_due" | "canceled";

type Billing = {
  workspaceId: string;
  plan: Plan;
  status: Status;
  trialEndsAt?: any;
  billingEmail?: string;

  // optional fields if you later add Stripe etc
  customerId?: string;
  subscriptionId?: string;
  currentPeriodEnd?: any;
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
  if (plan === "free") return "free（無料）";
  if (plan === "pro") return "pro（標準）";
  if (plan === "business") return "business（法人向け）";
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

export default function WorkspaceBillingPage() {
  const [workspaceId, setWorkspaceId] = useState<string>(
    localStorage.getItem("cx_workspace_id") || ""
  );

  const canLoad = useMemo(() => !!workspaceId?.trim(), [workspaceId]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [billing, setBilling] = useState<Billing | null>(null);

  // edit form
  const [plan, setPlan] = useState<Plan>("free");
  const [status, setStatus] = useState<Status>("inactive");
  const [trialDays, setTrialDays] = useState<number>(14);
  const [billingEmail, setBillingEmail] = useState<string>("");

  const applyFromBilling = useCallback((b: Billing | null) => {
    if (!b) return;
    setPlan(b.plan || "free");
    setStatus(b.status || "inactive");
    setBillingEmail(b.billingEmail || "");
  }, []);

  const load = useCallback(async () => {
    if (!workspaceId?.trim()) return;
    setErr("");
    setLoading(true);

    try {
      localStorage.setItem("cx_workspace_id", workspaceId.trim());

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
    if (workspaceId?.trim()) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(async () => {
    if (!workspaceId?.trim()) return;
    setErr("");
    setSaving(true);

    try {
      const payload: any = {
        workspace_id: workspaceId.trim(),
        plan,
        status,
        billing_email: billingEmail?.trim() || null,
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
  }, [workspaceId, plan, status, billingEmail, trialDays, applyFromBilling]);

  return (
    <div className="container" style={{ minWidth: 0 }}>
      <div className="card" style={{ minWidth: 0 }}>
        <h1 className="h1">契約 / Billing</h1>
        <div className="small" style={{ opacity: 0.8 }}>
          ワークスペースごとの契約プラン、利用状態、トライアル、請求先メールを確認・更新できます。
        </div>

        <div style={{ height: 12 }} />

        {/* Workspace selector */}
        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="small" style={{ opacity: 0.8 }}>workspace</div>
          <input
            className="input"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            placeholder="workspace ID"
            style={{ minWidth: 320, flex: "1 1 320px" }}
          />
          <button onClick={() => load()} disabled={!canLoad || loading}>
            {loading ? "読込中..." : "現在の契約情報を取得"}
          </button>
        </div>

        {err ? (
          <div className="small" style={{ marginTop: 10, color: "#ff6b6b", whiteSpace: "pre-wrap" }}>
            {err}
          </div>
        ) : null}
      </div>

      <div style={{ height: 14 }} />

      {/* Editor */}
      <div className="card" style={{ minWidth: 0 }}>
        <div className="h2" style={{ margin: 0 }}>契約情報を編集</div>
        <div className="small" style={{ opacity: 0.75, marginTop: 6 }}>
          現在は手動更新の管理画面です。将来的に Stripe / 自動更新に接続する前提で使います。
        </div>

        <div style={{ height: 12 }} />

        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 220 }}>
            <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>プラン</div>
            <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
              <option value="free">free（無料）</option>
              <option value="pro">pro（標準）</option>
              <option value="business">business（法人向け）</option>
            </select>
          </div>

          <div style={{ minWidth: 220 }}>
            <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>利用状態</div>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              <option value="inactive">inactive（未契約）</option>
              <option value="trialing">trialing（トライアル中）</option>
              <option value="active">active（利用中）</option>
              <option value="past_due">past_due（支払い要確認）</option>
              <option value="canceled">canceled（解約済み）</option>
            </select>
          </div>

          <div style={{ minWidth: 220, opacity: status === "trialing" ? 1 : 0.5 }}>
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

        <div style={{ height: 12 }} />

        <div className="row" style={{ gap: 10 }}>
          <button onClick={save} disabled={!canLoad || saving}>
            {saving ? "保存中..." : "契約情報を保存"}
          </button>
          <button
            onClick={() => applyFromBilling(billing)}
            disabled={!billing}
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            読み込み内容に戻す
          </button>
        </div>
      </div>

      <div style={{ height: 14 }} />

      {/* Current billing */}
      <div className="card" style={{ minWidth: 0 }}>
        <div className="h2" style={{ margin: 0 }}>現在の契約情報</div>

        <div style={{ height: 10 }} />

        <table className="table">
          <tbody>
            <tr>
              <th style={{ textAlign: "left", width: 200 }}>workspace</th>
              <td style={{ textAlign: "left" }}>{billing?.workspaceId || "-"}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>プラン</th>
              <td style={{ textAlign: "left" }}>{planLabel(billing?.plan)}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>利用状態</th>
              <td style={{ textAlign: "left" }}>{statusLabel(billing?.status)}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>トライアル終了日</th>
              <td style={{ textAlign: "left" }}>{fmtAnyTs(billing?.trialEndsAt)}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>請求先メールアドレス</th>
              <td style={{ textAlign: "left" }}>{billing?.billingEmail || "-"}</td>
            </tr>

            {/* optional */}
            <tr>
              <th style={{ textAlign: "left" }}>customer ID</th>
              <td style={{ textAlign: "left" }}>{billing?.customerId || "-"}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>subscription ID</th>
              <td style={{ textAlign: "left" }}>{billing?.subscriptionId || "-"}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>契約更新日</th>
              <td style={{ textAlign: "left" }}>{fmtAnyTs(billing?.currentPeriodEnd)}</td>
            </tr>
            <tr>
              <th style={{ textAlign: "left" }}>最終更新日</th>
              <td style={{ textAlign: "left" }}>{fmtAnyTs(billing?.updatedAt)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ height: 10 }} />

        <div className="small" style={{ opacity: 0.7, lineHeight: 1.6 }}>
          この画面が安定して動けば、次は Stripe連携 / Checkout / Webhook / 自動更新 に進められます。
        </div>
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}