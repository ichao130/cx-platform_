

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { apiPostJson } from "../firebase";

type PlanCode = "free" | "standard" | "pro" | "enterprise";
type BillingProvider = "stripe" | "misoca" | "manual";

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

// ─── Plan definitions for the feature matrix ───────────────────────────────
const PLAN_DEFS: {
  code: PlanCode;
  label: string;
  color: string;
  bg: string;
  price: string;
  description: string;
  features: string[];
  limits: { label: string; value: string }[];
}[] = [
  {
    code: "free",
    label: "Free",
    color: "#64748b",
    bg: "#f8fafc",
    price: "¥0 / 月",
    description: "小規模の試験運用に。クレジットカード不要。",
    features: ["シナリオ配信", "基本分析", "埋め込みタグ"],
    limits: [
      { label: "サイト数", value: "1" },
      { label: "シナリオ数", value: "3" },
      { label: "アクション数", value: "5" },
      { label: "メンバー数", value: "1" },
      { label: "AIインサイト", value: "なし" },
    ],
  },
  {
    code: "standard",
    label: "Standard",
    color: "#2563eb",
    bg: "#eff6ff",
    price: "¥9,800 / 月",
    description: "中規模チームの本番運用に最適。",
    features: ["シナリオ配信", "高度な分析 (流入計測)", "日時スケジュール", "AIインサイト", "Slack通知"],
    limits: [
      { label: "サイト数", value: "5" },
      { label: "シナリオ数", value: "20" },
      { label: "アクション数", value: "50" },
      { label: "メンバー数", value: "5" },
      { label: "AIインサイト", value: "月50回" },
    ],
  },
  {
    code: "pro",
    label: "Pro",
    color: "#7c3aed",
    bg: "#f5f3ff",
    price: "¥29,800 / 月",
    description: "大規模運用・マルチサイトに対応。",
    features: ["Standard の全機能", "A/Bテスト", "カスタムドメイン", "優先サポート", "APIアクセス"],
    limits: [
      { label: "サイト数", value: "20" },
      { label: "シナリオ数", value: "100" },
      { label: "アクション数", value: "300" },
      { label: "メンバー数", value: "20" },
      { label: "AIインサイト", value: "月300回" },
    ],
  },
  {
    code: "enterprise",
    label: "Enterprise",
    color: "#b45309",
    bg: "#fffbeb",
    price: "お問い合わせ",
    description: "大企業・個別要件・SLA保証が必要な場合。",
    features: ["Pro の全機能", "SLA保証", "専任サポート", "SSO/SAML", "カスタム制限値", "Misoca請求書払い対応"],
    limits: [
      { label: "サイト数", value: "無制限" },
      { label: "シナリオ数", value: "無制限" },
      { label: "アクション数", value: "無制限" },
      { label: "メンバー数", value: "無制限" },
      { label: "AIインサイト", value: "無制限" },
    ],
  },
];

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
    if (typeof v?.toDate === "function") return v.toDate().toLocaleString("ja-JP");
    if (typeof v?.toMillis === "function") return new Date(v.toMillis()).toLocaleString("ja-JP");
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
  return { workspaces: null, sites: null, scenarios: null, actions: null, aiInsights: null, members: null };
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
  const [toast, setToast] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

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
    const def = PLAN_DEFS.find(d => d.code === "standard")!;
    if (!row) {
      setSelectedPlanId("");
      setCode("standard");
      setPlanId(genPlanId("standard"));
      setName(def.label);
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
    setBillingProvider((row.billing_provider || "stripe") as BillingProvider);
    setCurrency(row.currency || "JPY");
    setPriceMonthly(String(row.price_monthly ?? 0));
    setPriceYearly(row.price_yearly == null ? "" : String(row.price_yearly));
    setStripePriceMonthlyId(String(row.stripe_price_monthly_id || ""));
    setStripePriceYearlyId(String(row.stripe_price_yearly_id || ""));
    setLimits(normalizeLimits(row.limits));
  }, []);

  const load = useCallback(async () => {
    if (!workspaceId.trim()) { setRows([]); return; }
    setLoading(true);
    setError("");
    try {
      const res = await apiPostJson(API.list, { workspace_id: workspaceId.trim(), include_inactive: includeInactive });
      const items = Array.isArray(res?.items) ? (res.items as PlanRow[]) : [];
      setRows(items);
      if (!selectedPlanId && items.length) applyRow(items[0]);
      else if (selectedPlanId) {
        const found = items.find((x) => x.plan_id === selectedPlanId) || null;
        if (found) applyRow(found);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, includeInactive, selectedPlanId, applyRow]);

  useEffect(() => { void load(); }, [load]);

  const sortedRows = useMemo(() => {
    const order: Record<string, number> = { free: 0, standard: 1, pro: 2, enterprise: 3 };
    return [...rows].sort((a, b) => (order[a.code] ?? 9) - (order[b.code] ?? 9));
  }, [rows]);

  function onCodeChange(next: PlanCode) {
    setCode(next);
    if (!selectedPlanId || selectedPlanId === planId) setPlanId(genPlanId(next));
    if (next === "enterprise") setBillingProvider("manual");
  }

  function updateLimit(key: keyof Limits, value: string) {
    setLimits((prev) => ({ ...prev, [key]: normalizeLimitInput(value) }));
  }

  async function save() {
    if (!workspaceId.trim()) { setError("ワークスペースが選択されていません"); return; }
    if (!planId.trim()) { setError("plan_id を入力してください"); return; }
    if (!name.trim()) { setError("プラン名を入力してください"); return; }
    setSaving(true);
    setError("");
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
      showToast("プランを保存しました ✓");
      setEditOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  const planCodeColors: Record<string, string> = { free: "#64748b", standard: "#2563eb", pro: "#7c3aed", enterprise: "#b45309" };

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
          <div className="small">Billing / Plans</div>
          <h1 className="h1">料金プラン</h1>
          <div className="small">プランごとの料金・機能・制限値を管理します。</div>
        </div>
        <div className="page-header__actions">
          <button className="btn" onClick={() => { applyRow(null); setEditOpen(true); }}>
            + 新規プラン
          </button>
          <button className="btn" onClick={() => void load()} disabled={loading || !workspaceId.trim()}>
            {loading ? "読込中..." : "再読み込み"}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 12, background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c" }}>
          {error}
        </div>
      )}

      {/* Feature matrix cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
        {PLAN_DEFS.map((def) => {
          const row = rows.find(r => r.code === def.code);
          const isRegistered = !!row;
          return (
            <div
              key={def.code}
              className="card"
              style={{
                borderTop: `4px solid ${def.color}`,
                background: def.bg,
                cursor: "pointer",
                transition: "box-shadow .15s",
                position: "relative",
              }}
              onClick={() => {
                if (row) { applyRow(row); setEditOpen(true); }
                else {
                  applyRow(null);
                  setCode(def.code);
                  setPlanId(genPlanId(def.code));
                  setName(def.label);
                  setDescription(def.description);
                  setEditOpen(true);
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 18, color: def.color }}>{def.label}</span>
                {isRegistered && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, background: def.color, color: "#fff",
                    padding: "2px 7px", borderRadius: 20,
                  }}>
                    {row?.active === false ? "inactive" : "active"}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: def.color, marginBottom: 6 }}>{def.price}</div>
              <div className="small" style={{ opacity: 0.8, marginBottom: 12 }}>{def.description}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px 0" }}>
                {def.features.map(f => (
                  <li key={f} style={{ fontSize: 12, padding: "3px 0", display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ color: def.color, fontWeight: 700, fontSize: 14, lineHeight: 1 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div style={{ borderTop: "1px solid rgba(0,0,0,.08)", paddingTop: 8 }}>
                {def.limits.map(l => (
                  <div key={l.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", opacity: 0.8 }}>
                    <span>{l.label}</span>
                    <span style={{ fontWeight: 600 }}>{
                      row && row.limits
                        ? (row.limits[l.label === "サイト数" ? "sites" : l.label === "シナリオ数" ? "scenarios" : l.label === "アクション数" ? "actions" : l.label === "メンバー数" ? "members" : "aiInsights"] == null ? "無制限" : String(row.limits[l.label === "サイト数" ? "sites" : l.label === "シナリオ数" ? "scenarios" : l.label === "アクション数" ? "actions" : l.label === "メンバー数" ? "members" : "aiInsights"]))
                        : l.value
                    }</span>
                  </div>
                ))}
              </div>
              {!isRegistered && (
                <div style={{ position: "absolute", bottom: 12, right: 12, fontSize: 11, color: def.color, fontWeight: 600 }}>
                  未登録 → クリックして作成
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Plan list table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <div className="h2" style={{ margin: 0 }}>プラン一覧</div>
          <label className="row" style={{ gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
            <span className="small">非アクティブなプランも表示</span>
          </label>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>コード</th>
              <th style={{ textAlign: "left" }}>プラン名</th>
              <th style={{ textAlign: "left" }}>月額</th>
              <th style={{ textAlign: "left" }}>課金方式</th>
              <th style={{ textAlign: "left" }}>状態</th>
              <th style={{ textAlign: "left" }}>最終更新</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sortedRows.length ? sortedRows.map((row) => (
              <tr key={row.plan_id} style={{ cursor: "pointer", background: row.plan_id === selectedPlanId ? "rgba(59,130,246,.06)" : undefined }}>
                <td style={{ textAlign: "left" }}>
                  <span style={{
                    display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: (planCodeColors[row.code] || "#64748b") + "1a",
                    color: planCodeColors[row.code] || "#64748b",
                  }}>
                    {row.code}
                  </span>
                </td>
                <td style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 600 }}>{row.name || "-"}</div>
                  <div className="small" style={{ opacity: 0.6 }}><code>{row.plan_id}</code></div>
                </td>
                <td style={{ textAlign: "left" }}>{row.currency || "JPY"} {(row.price_monthly ?? 0).toLocaleString()}</td>
                <td style={{ textAlign: "left", fontSize: 12 }}>{
                  row.billing_provider === "stripe" ? "Stripe" :
                  row.billing_provider === "misoca" ? "Misoca" : "手動"
                }</td>
                <td style={{ textAlign: "left" }}>
                  <span style={{
                    fontSize: 12, padding: "2px 8px", borderRadius: 20,
                    background: row.active === false ? "#fee2e2" : "#dcfce7",
                    color: row.active === false ? "#b91c1c" : "#166534",
                  }}>
                    {row.active === false ? "inactive" : "active"}
                  </span>
                </td>
                <td style={{ textAlign: "left", fontSize: 12, opacity: 0.7 }}>{fmtAnyTs(row.updatedAt)}</td>
                <td>
                  <button className="btn btn--sm btn--ghost" onClick={() => { applyRow(row); setEditOpen(true); }}>
                    編集
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}>
                  {loading ? "読み込み中..." : "プランがありません。上の「+ 新規プラン」から作成してください。"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal / panel */}
      {editOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false); }}>
          <div className="card" style={{
            width: "min(680px, calc(100vw - 32px))", maxHeight: "90vh",
            overflowY: "auto", position: "relative",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div className="h2" style={{ margin: 0 }}>
                {selectedPlanId ? "プラン編集" : "新規プラン"}
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => setEditOpen(false)}>✕ 閉じる</button>
            </div>

            {error && (
              <div style={{ marginBottom: 12, padding: "8px 12px", background: "#fef2f2", color: "#b91c1c", borderRadius: 6, fontSize: 13 }}>
                {error}
              </div>
            )}

            <div className="row" style={{ gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ minWidth: 200, flex: "1 1 200px" }}>
                <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>コード</div>
                <select className="input" value={code} onChange={(e) => onCodeChange(e.target.value as PlanCode)}>
                  <option value="free">free（無料）</option>
                  <option value="standard">standard（標準）</option>
                  <option value="pro">pro（上位）</option>
                  <option value="enterprise">enterprise（個別契約）</option>
                </select>
              </div>
              <div style={{ minWidth: 200, flex: "1 1 200px" }}>
                <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>plan_id</div>
                <input className="input" value={planId} onChange={(e) => setPlanId(e.target.value)} placeholder="plan_standard" />
              </div>
              <div style={{ minWidth: 140, flex: "0 0 140px" }}>
                <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>状態</div>
                <select className="input" value={active ? "true" : "false"} onChange={(e) => setActive(e.target.value === "true")}>
                  <option value="true">active</option>
                  <option value="false">inactive</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>プラン名</div>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Standard" style={{ width: "100%" }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>説明</div>
              <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="プランの説明" style={{ width: "100%" }} />
            </div>

            <div className="row" style={{ gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ minWidth: 200, flex: "1 1 200px" }}>
                <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>課金方式</div>
                <select className="input" value={billingProvider} onChange={(e) => setBillingProvider(e.target.value as BillingProvider)}>
                  <option value="stripe">Stripe（カード自動課金）</option>
                  <option value="misoca">Misoca（請求書払い）</option>
                  <option value="manual">手動管理</option>
                </select>
              </div>
              <div style={{ minWidth: 100, flex: "0 0 100px" }}>
                <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>通貨</div>
                <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="JPY" />
              </div>
              <div style={{ minWidth: 160, flex: "1 1 160px" }}>
                <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>月額（円）</div>
                <input className="input" type="number" value={priceMonthly} onChange={(e) => setPriceMonthly(e.target.value)} min={0} />
              </div>
              <div style={{ minWidth: 160, flex: "1 1 160px" }}>
                <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>年額（円・省略可）</div>
                <input className="input" type="number" value={priceYearly} onChange={(e) => setPriceYearly(e.target.value)} min={0} placeholder="省略で非表示" />
              </div>
            </div>

            {billingProvider === "stripe" && (
              <div className="row" style={{ gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div style={{ flex: "1 1 240px" }}>
                  <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>Stripe 月額 price_id</div>
                  <input className="input" value={stripePriceMonthlyId} onChange={(e) => setStripePriceMonthlyId(e.target.value)} placeholder="price_xxxxx" />
                </div>
                <div style={{ flex: "1 1 240px" }}>
                  <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>Stripe 年額 price_id</div>
                  <input className="input" value={stripePriceYearlyId} onChange={(e) => setStripePriceYearlyId(e.target.value)} placeholder="price_xxxxx" />
                </div>
              </div>
            )}

            <div className="h2" style={{ marginTop: 8 }}>制限値（空欄で無制限）</div>
            <div className="grid grid--2" style={{ gap: 10, marginBottom: 16 }}>
              {([
                ["ワークスペース数", "workspaces"],
                ["サイト数", "sites"],
                ["シナリオ数", "scenarios"],
                ["アクション数", "actions"],
                ["AIインサイト数", "aiInsights"],
                ["メンバー数", "members"],
              ] as [string, keyof Limits][]).map(([label, key]) => (
                <div key={key}>
                  <div className="small" style={{ opacity: 0.8, marginBottom: 6 }}>{label}</div>
                  <input
                    className="input"
                    value={limits[key] == null ? "" : String(limits[key])}
                    onChange={(e) => updateLimit(key, e.target.value)}
                    placeholder="空欄で無制限"
                  />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn btn--ghost" onClick={() => setEditOpen(false)}>キャンセル</button>
              <button className="btn btn--primary" onClick={() => void save()} disabled={saving || !workspaceId.trim()}>
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 40 }} />
    </div>
  );
}
