

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { apiPostJson } from "../firebase";

type PlanCode = "standard" | "premium" | "custom";
type BillingProvider = "stripe" | "manual";

type Limits = {
  workspaces?: number | null;
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
  currency?: string;
  price_monthly?: number;
  price_yearly?: number | null;
  limits?: Limits;
  stripe_price_monthly_id?: string | null;
  stripe_price_yearly_id?: string | null;
  updatedAt?: any;
};

const API = {
  list: "/v1/plans/list",
  upsert: "/v1/plans/upsert",
};

function workspaceKeyForUid(uid: string) {
  return `cx_admin_workspace_id:${uid}`;
}

function getSelectedWorkspaceIdForUid(uid: string): string {
  try {
    return localStorage.getItem(workspaceKeyForUid(uid)) || "";
  } catch {
    return "";
  }
}

function fmtAnyTs(v: any): string {
  if (!v) return "-";
  try {
    if (typeof v?.toDate === "function") {
      return v.toDate().toLocaleString("ja-JP");
    }
    if (typeof v?.toMillis === "function") {
      return new Date(v.toMillis()).toLocaleString("ja-JP");
    }
    const d = new Date(v);
    if (!Number.isFinite(d.getTime())) return "-";
    return d.toLocaleString("ja-JP");
  } catch {
    return "-";
  }
}

function fmtLimit(v: number | null | undefined): string {
  if (v == null) return "無制限";
  return String(v);
}

function normalizeLimitInput(v: string): number | null {
  const t = String(v || "").trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function defaultLimits(): Required<Limits> {
  return {
    workspaces: null,
    sites: null,
    scenarios: null,
    actions: null,
    aiInsights: null,
    members: null,
  };
}

function normalizeLimits(v: Limits | undefined | null): Required<Limits> {
  return {
    workspaces: v?.workspaces ?? null,
    sites: v?.sites ?? null,
    scenarios: v?.scenarios ?? null,
    actions: v?.actions ?? null,
    aiInsights: v?.aiInsights ?? null,
    members: v?.members ?? null,
  };
}

function planCodeLabel(code: PlanCode | string | undefined) {
  if (code === "standard") return "standard（標準）";
  if (code === "premium") return "premium（上位）";
  if (code === "custom") return "custom（個別契約）";
  return String(code || "-");
}

function providerLabel(v: BillingProvider | string | undefined) {
  if (v === "stripe") return "stripe（自動課金）";
  if (v === "manual") return "manual（請求書 / 手動管理）";
  return String(v || "-");
}

function genPlanId(code: PlanCode) {
  return `plan_${code}`;
}

export default function PlansPage() {
  const [currentUid, setCurrentUid] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [planId, setPlanId] = useState(genPlanId("standard"));
  const [code, setCode] = useState<PlanCode>("standard");
  const [name, setName] = useState("Standard");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [billingProvider, setBillingProvider] = useState<BillingProvider>("stripe");
  const [currency, setCurrency] = useState("JPY");
  const [priceMonthly, setPriceMonthly] = useState<string>("0");
  const [priceYearly, setPriceYearly] = useState<string>("");
  const [stripePriceMonthlyId, setStripePriceMonthlyId] = useState("");
  const [stripePriceYearlyId, setStripePriceYearlyId] = useState("");
  const [limits, setLimits] = useState<Required<Limits>>(defaultLimits());

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (u) => {
      const uid = u?.uid || "";
      setCurrentUid(uid);
      setWorkspaceId(uid ? getSelectedWorkspaceIdForUid(uid) : "");
    });
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (currentUid && e.key === workspaceKeyForUid(currentUid)) {
        setWorkspaceId(getSelectedWorkspaceIdForUid(currentUid));
      }
    };
    const onCustom = (e: any) => {
      const next = e?.detail?.workspaceId;
      if (typeof next === "string") setWorkspaceId(next);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("cx_admin_workspace_changed" as any, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cx_admin_workspace_changed" as any, onCustom);
    };
  }, [currentUid]);

  const applyRow = useCallback((row: PlanRow | null) => {
    if (!row) {
      setSelectedPlanId("");
      setCode("standard");
      setPlanId(genPlanId("standard"));
      setName("Standard");
      setDescription("");
      setActive(true);
      setBillingProvider("stripe");
      setCurrency("JPY");
      setPriceMonthly("0");
      setPriceYearly("");
      setStripePriceMonthlyId("");
      setStripePriceYearlyId("");
      setLimits(defaultLimits());
      return;
    }
    setSelectedPlanId(row.plan_id);
    setCode((row.code || "standard") as PlanCode);
    setPlanId(row.plan_id || genPlanId((row.code || "standard") as PlanCode));
    setName(row.name || "");
    setDescription(row.description || "");
    setActive(typeof row.active === "boolean" ? row.active : true);
    setBillingProvider((row.billing_provider || ((row.code || "standard") === "custom" ? "manual" : "stripe")) as BillingProvider);
    setCurrency(row.currency || "JPY");
    setPriceMonthly(String(row.price_monthly ?? 0));
    setPriceYearly(row.price_yearly == null ? "" : String(row.price_yearly));
    setStripePriceMonthlyId(String(row.stripe_price_monthly_id || ""));
    setStripePriceYearlyId(String(row.stripe_price_yearly_id || ""));
    setLimits(normalizeLimits(row.limits));
  }, []);

  const load = useCallback(async () => {
    if (!workspaceId.trim()) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await apiPostJson(API.list, {
        workspace_id: workspaceId.trim(),
        include_inactive: includeInactive,
      });
      const items = Array.isArray(res?.items) ? (res.items as PlanRow[]) : [];
      setRows(items);
      if (!selectedPlanId && items.length) {
        applyRow(items[0]);
      } else if (selectedPlanId) {
        const found = items.find((x) => x.plan_id === selectedPlanId) || null;
        if (found) applyRow(found);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, includeInactive, selectedPlanId, applyRow]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => String(a.code || "").localeCompare(String(b.code || "")));
  }, [rows]);

  function onCodeChange(next: PlanCode) {
    setCode(next);
    if (!selectedPlanId || selectedPlanId === planId) {
      setPlanId(genPlanId(next));
    }
    if (next === "custom") {
      setBillingProvider("manual");
    }
  }

  function updateLimit(key: keyof Limits, value: string) {
    setLimits((prev) => ({ ...prev, [key]: normalizeLimitInput(value) }));
  }

  async function save() {
    if (!workspaceId.trim()) {
      setError("ワークスペースが選択されていません");
      return;
    }
    if (!planId.trim()) {
      setError("plan_id を入力してください");
      return;
    }
    if (!name.trim()) {
      setError("プラン名を入力してください");
      return;
    }

    setSaving(true);
    setError("");
    setInfo("");
    try {
      await apiPostJson(API.upsert, {
        workspace_id: workspaceId.trim(),
        plan_id: planId.trim(),
        code,
        name: name.trim(),
        description: description.trim(),
        active,
        billing_provider: billingProvider,
        currency: currency.trim() || "JPY",
        price_monthly: Number(priceMonthly || 0),
        price_yearly: priceYearly.trim() ? Number(priceYearly) : null,
        limits,
        stripe_price_monthly_id: stripePriceMonthlyId.trim() || null,
        stripe_price_yearly_id: stripePriceYearlyId.trim() || null,
      });
      setInfo("保存しました");
      await load();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container" style={{ minWidth: 0 }}>
      <div className="page-header">
        <div className="page-header__meta">
          <div className="small">Billing / Plans</div>
          <h1 className="h1">Plans</h1>
          <div className="small">料金・制限値・課金方式を BO で管理します。</div>
        </div>
        <div className="page-header__actions">
          <button className="btn" onClick={() => applyRow(null)}>
            新規プラン
          </button>
          <button className="btn" onClick={() => void load()} disabled={loading || !workspaceId.trim()}>
            {loading ? "読込中..." : "再読み込み"}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="small">workspace: <code>{workspaceId || "（未選択）"}</code></div>
          <label className="row" style={{ gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
            <span className="small">非アクティブなプランも表示</span>
          </label>
        </div>
        {error ? <div className="small" style={{ color: "#b91c1c", marginTop: 8 }}>{error}</div> : null}
        {info ? <div className="small" style={{ color: "#065f46", marginTop: 8 }}>{info}</div> : null}
      </div>

      <div className="grid grid--2" style={{ alignItems: "start" }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div className="h2" style={{ marginTop: 0 }}>プラン一覧</div>
          <table className="table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>code</th>
                <th style={{ textAlign: "left" }}>name</th>
                <th style={{ textAlign: "left" }}>月額</th>
                <th style={{ textAlign: "left" }}>状態</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length ? sortedRows.map((row) => (
                <tr
                  key={row.plan_id}
                  onClick={() => applyRow(row)}
                  style={{ cursor: "pointer", background: row.plan_id === selectedPlanId ? "rgba(59,130,246,.08)" : undefined }}
                >
                  <td style={{ textAlign: "left" }}>{planCodeLabel(row.code)}</td>
                  <td style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 700 }}>{row.name || "-"}</div>
                    <div className="small" style={{ opacity: 0.72 }}><code>{row.plan_id}</code></div>
                  </td>
                  <td style={{ textAlign: "left" }}>{row.currency || "JPY"} {row.price_monthly ?? 0}</td>
                  <td style={{ textAlign: "left" }}>{row.active === false ? "inactive" : "active"}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: "left" }}>プランがありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="h2" style={{ marginTop: 0 }}>プラン編集</div>

          <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ minWidth: 220 }}>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>plan_id</div>
              <input className="input" value={planId} onChange={(e) => setPlanId(e.target.value)} placeholder="plan_standard" />
            </div>
            <div style={{ minWidth: 220 }}>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>code</div>
              <select className="input" value={code} onChange={(e) => onCodeChange(e.target.value as PlanCode)}>
                <option value="standard">standard</option>
                <option value="premium">premium</option>
                <option value="custom">custom</option>
              </select>
            </div>
            <div style={{ minWidth: 220 }}>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>active</div>
              <select className="input" value={active ? "true" : "false"} onChange={(e) => setActive(e.target.value === "true")}>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
          </div>

          <div style={{ height: 10 }} />

          <div>
            <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>name</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Standard" style={{ width: "100%" }} />
          </div>

          <div style={{ height: 10 }} />

          <div>
            <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>description</div>
            <textarea className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="プランの説明" style={{ width: "100%" }} />
          </div>

          <div style={{ height: 10 }} />

          <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ minWidth: 220 }}>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>billing provider</div>
              <select className="input" value={billingProvider} onChange={(e) => setBillingProvider(e.target.value as BillingProvider)}>
                <option value="stripe">stripe</option>
                <option value="manual">manual</option>
              </select>
            </div>
            <div style={{ minWidth: 160 }}>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>currency</div>
              <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="JPY" />
            </div>
            <div style={{ minWidth: 180 }}>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>price monthly</div>
              <input className="input" type="number" value={priceMonthly} onChange={(e) => setPriceMonthly(e.target.value)} min={0} />
            </div>
            <div style={{ minWidth: 180 }}>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>price yearly</div>
              <input className="input" type="number" value={priceYearly} onChange={(e) => setPriceYearly(e.target.value)} min={0} placeholder="未設定なら空" />
            </div>
          </div>

          <div style={{ height: 10 }} />

          <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap", opacity: billingProvider === "stripe" ? 1 : 0.6 }}>
            <div style={{ minWidth: 280 }}>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>Stripe monthly price id</div>
              <input className="input" value={stripePriceMonthlyId} onChange={(e) => setStripePriceMonthlyId(e.target.value)} disabled={billingProvider !== "stripe"} />
            </div>
            <div style={{ minWidth: 280 }}>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>Stripe yearly price id</div>
              <input className="input" value={stripePriceYearlyId} onChange={(e) => setStripePriceYearlyId(e.target.value)} disabled={billingProvider !== "stripe"} />
            </div>
          </div>

          <div style={{ height: 14 }} />
          <div className="h2" style={{ marginTop: 0 }}>制限値</div>

          <div className="grid grid--2" style={{ gap: 10 }}>
            <div>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>ワークスペース数</div>
              <input className="input" value={limits.workspaces == null ? "" : String(limits.workspaces)} onChange={(e) => updateLimit("workspaces", e.target.value)} placeholder="空欄で無制限" />
            </div>
            <div>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>サイト数</div>
              <input className="input" value={limits.sites == null ? "" : String(limits.sites)} onChange={(e) => updateLimit("sites", e.target.value)} placeholder="空欄で無制限" />
            </div>
            <div>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>シナリオ数</div>
              <input className="input" value={limits.scenarios == null ? "" : String(limits.scenarios)} onChange={(e) => updateLimit("scenarios", e.target.value)} placeholder="空欄で無制限" />
            </div>
            <div>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>アクション数</div>
              <input className="input" value={limits.actions == null ? "" : String(limits.actions)} onChange={(e) => updateLimit("actions", e.target.value)} placeholder="空欄で無制限" />
            </div>
            <div>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>AIインサイト数</div>
              <input className="input" value={limits.aiInsights == null ? "" : String(limits.aiInsights)} onChange={(e) => updateLimit("aiInsights", e.target.value)} placeholder="空欄で無制限" />
            </div>
            <div>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>メンバー数</div>
              <input className="input" value={limits.members == null ? "" : String(limits.members)} onChange={(e) => updateLimit("members", e.target.value)} placeholder="空欄で無制限" />
            </div>
          </div>

          <div style={{ height: 14 }} />
          <div className="page-header__actions">
            <button className="btn btn--primary" onClick={() => void save()} disabled={saving || !workspaceId.trim()}>
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: 24 }} />

      <div className="card" style={{ background: "rgba(15,23,42,.02)", border: "1px solid rgba(15,23,42,.08)" }}>
        <div className="h2" style={{ marginTop: 0 }}>現在選択中のプラン要約</div>
        <table className="table">
          <tbody>
            <tr><th style={{ textAlign: "left", width: 220 }}>plan_id</th><td style={{ textAlign: "left" }}>{planId || "-"}</td></tr>
            <tr><th style={{ textAlign: "left" }}>code</th><td style={{ textAlign: "left" }}>{planCodeLabel(code)}</td></tr>
            <tr><th style={{ textAlign: "left" }}>課金方式</th><td style={{ textAlign: "left" }}>{providerLabel(billingProvider)}</td></tr>
            <tr><th style={{ textAlign: "left" }}>料金（月額）</th><td style={{ textAlign: "left" }}>{currency || "JPY"} {priceMonthly || 0}</td></tr>
            <tr><th style={{ textAlign: "left" }}>料金（年額）</th><td style={{ textAlign: "left" }}>{priceYearly.trim() ? `${currency || "JPY"} ${priceYearly}` : "-"}</td></tr>
            <tr><th style={{ textAlign: "left" }}>ワークスペース数</th><td style={{ textAlign: "left" }}>{fmtLimit(limits.workspaces)}</td></tr>
            <tr><th style={{ textAlign: "left" }}>サイト数</th><td style={{ textAlign: "left" }}>{fmtLimit(limits.sites)}</td></tr>
            <tr><th style={{ textAlign: "left" }}>シナリオ数</th><td style={{ textAlign: "left" }}>{fmtLimit(limits.scenarios)}</td></tr>
            <tr><th style={{ textAlign: "left" }}>アクション数</th><td style={{ textAlign: "left" }}>{fmtLimit(limits.actions)}</td></tr>
            <tr><th style={{ textAlign: "left" }}>AIインサイト数</th><td style={{ textAlign: "left" }}>{fmtLimit(limits.aiInsights)}</td></tr>
            <tr><th style={{ textAlign: "left" }}>メンバー数</th><td style={{ textAlign: "left" }}>{fmtLimit(limits.members)}</td></tr>
            <tr><th style={{ textAlign: "left" }}>最終更新日</th><td style={{ textAlign: "left" }}>{fmtAnyTs(sortedRows.find((x) => x.plan_id === selectedPlanId)?.updatedAt)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}