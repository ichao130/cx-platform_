import React, { useCallback, useEffect, useState } from "react";
import { opsPost } from "../firebase";

type Client = { id: string; name: string; plan: string; status: string; billable: boolean };
type Agency = {
  id: string;
  name: string;
  note?: string;
  members: Record<string, string>;
  memberEmails: Record<string, string>;
  clientCount: number;
  billableCount: number;
  unitPrice: number;
  billingAmount: number;
  clients: Client[];
};
type WsRef = { id: string; name: string };

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 1200, margin: "0 auto" },
  title: { fontWeight: 800, fontSize: 22, marginBottom: 4 },
  subtitle: { opacity: 0.5, fontSize: 13, marginBottom: 20 },
  toolbar: { display: "flex", gap: 10, alignItems: "center", marginBottom: 18, flexWrap: "wrap" },
  card: { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 18, marginBottom: 16 },
  head: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 },
  agencyName: { fontWeight: 700, fontSize: 16 },
  kpiRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 },
  kpi: { background: "rgba(255,255,255,.05)", borderRadius: 10, padding: "10px 14px", minWidth: 130 },
  kpiLabel: { fontSize: 11, opacity: 0.55, marginBottom: 3 },
  kpiValue: { fontSize: 19, fontWeight: 700 },
  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", opacity: 0.5, margin: "14px 0 8px" },
  row: { display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "rgba(255,255,255,.03)", borderRadius: 8, marginBottom: 6, flexWrap: "wrap" },
  input: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, color: "#e2e8f0", padding: "8px 11px", fontSize: 13, outline: "none" },
  btn: { padding: "8px 14px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 12.5, cursor: "pointer" },
  btnPrimary: { background: "#2563eb", color: "#fff" },
  btnGhost: { background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.12)" },
  btnDanger: { background: "rgba(239,68,68,.14)", color: "#f87171", border: "1px solid rgba(239,68,68,.3)" },
  badge: { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5 },
  msg: { fontSize: 13, padding: "6px 12px", borderRadius: 8 },
  msgOk: { background: "rgba(16,185,129,.15)", color: "#34d399" },
  msgErr: { background: "rgba(239,68,68,.12)", color: "#f87171" },
};

const yen = (n: number) => "¥" + Math.round(n).toLocaleString();

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [unassigned, setUnassigned] = useState<WsRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [newName, setNewName] = useState("");
  const [draft, setDraft] = useState<Record<string, { email: string; ws: string; unitPrice: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await opsPost<{ agencies: Agency[]; unassigned: WsRef[] }>("/v1/ops/agencies/list");
      setAgencies(r.agencies || []);
      setUnassigned(r.unassigned || []);
    } catch (e: any) {
      setMsg({ text: e?.message || "読み込みに失敗しました", ok: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<any>, okText: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ text: okText, ok: true }); await load(); }
    catch (e: any) { setMsg({ text: e?.message || "失敗しました", ok: false }); }
    finally { setBusy(false); }
  };

  const d = (id: string) => draft[id] || { email: "", ws: "", unitPrice: "" };
  const setD = (id: string, patch: Partial<{ email: string; ws: string; unitPrice: string }>) =>
    setDraft((p) => ({ ...p, [id]: { ...d(id), ...patch } }));

  const totalBilling = agencies.reduce((sum, a) => sum + a.billingAmount, 0);

  return (
    <div style={s.container}>
      <div style={s.title}>代理店管理</div>
      <div style={s.subtitle}>
        代理店とその担当クライアントを管理します。請求額は「課金対象アカウント数 × 単価」で自動計算されます
        （課金対象 = 契約中 active / trialing / past_due のワークスペース）。
      </div>

      <div style={s.toolbar}>
        <input
          style={{ ...s.input, width: 240 }}
          placeholder="新しい代理店名"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          style={{ ...s.btn, ...s.btnPrimary }}
          disabled={busy || !newName.trim()}
          onClick={() => run(async () => {
            await opsPost("/v1/ops/agencies/save", { name: newName.trim() });
            setNewName("");
          }, "代理店を作成しました")}
        >＋ 代理店を追加</button>
        {agencies.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 13, opacity: 0.75 }}>
            全代理店の請求見込み合計: <b style={{ fontSize: 16 }}>{yen(totalBilling)}</b> / 月
          </span>
        )}
      </div>

      {msg && <div style={{ ...s.msg, ...(msg.ok ? s.msgOk : s.msgErr), marginBottom: 14 }}>{msg.text}</div>}

      {loading ? (
        <div style={{ opacity: 0.5, fontSize: 13 }}>読み込み中…</div>
      ) : agencies.length === 0 ? (
        <div style={{ ...s.card, opacity: 0.6, fontSize: 13 }}>
          代理店がまだ登録されていません。上のフォームから追加してください。
        </div>
      ) : (
        agencies.map((a) => (
          <div key={a.id} style={s.card}>
            <div style={s.head}>
              <span style={s.agencyName}>{a.name}</span>
              <code style={{ fontSize: 11, opacity: 0.45 }}>{a.id}</code>
            </div>

            <div style={s.kpiRow}>
              <div style={s.kpi}>
                <div style={s.kpiLabel}>担当クライアント</div>
                <div style={s.kpiValue}>{a.clientCount}</div>
              </div>
              <div style={s.kpi}>
                <div style={s.kpiLabel}>課金対象アカウント</div>
                <div style={{ ...s.kpiValue, color: "#34d399" }}>{a.billableCount}</div>
              </div>
              <div style={s.kpi}>
                <div style={s.kpiLabel}>単価（月/1件）</div>
                <div style={s.kpiValue}>{a.unitPrice ? yen(a.unitPrice) : "—"}</div>
              </div>
              <div style={s.kpi}>
                <div style={s.kpiLabel}>請求見込み（月）</div>
                <div style={{ ...s.kpiValue, color: "#60a5fa" }}>{yen(a.billingAmount)}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                style={{ ...s.input, width: 150 }}
                type="number"
                placeholder="単価を設定"
                value={d(a.id).unitPrice}
                onChange={(e) => setD(a.id, { unitPrice: e.target.value })}
              />
              <button
                style={{ ...s.btn, ...s.btnGhost }}
                disabled={busy || d(a.id).unitPrice === ""}
                onClick={() => run(async () => {
                  await opsPost("/v1/ops/agencies/save", { id: a.id, name: a.name, unit_price: Number(d(a.id).unitPrice) });
                  setD(a.id, { unitPrice: "" });
                }, "単価を更新しました")}
              >単価を保存</button>
            </div>

            {/* メンバー */}
            <div style={s.sectionLabel}>代理店メンバー（{Object.keys(a.members).length}）</div>
            {Object.keys(a.members).length === 0 && (
              <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 6 }}>メンバーがいません</div>
            )}
            {Object.entries(a.members).map(([uid, role]) => (
              <div key={uid} style={s.row}>
                <span style={{ flex: 1, fontSize: 13, minWidth: 200 }}>{a.memberEmails[uid] || uid}</span>
                <span style={{ ...s.badge, background: role === "owner" ? "rgba(96,165,250,.2)" : "rgba(255,255,255,.1)", color: role === "owner" ? "#60a5fa" : "rgba(255,255,255,.6)" }}>
                  {role === "owner" ? "オーナー" : "メンバー"}
                </span>
                <button
                  style={{ ...s.btn, ...s.btnDanger }}
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(`${a.memberEmails[uid] || uid} を代理店から外しますか？`)) return;
                    run(() => opsPost("/v1/ops/agencies/members/remove", { agency_id: a.id, uid }), "メンバーを削除しました");
                  }}
                >削除</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <input
                style={{ ...s.input, flex: 1, minWidth: 220 }}
                placeholder="追加するメンバーのメールアドレス"
                value={d(a.id).email}
                onChange={(e) => setD(a.id, { email: e.target.value })}
              />
              <button
                style={{ ...s.btn, ...s.btnGhost }}
                disabled={busy || !d(a.id).email.trim()}
                onClick={() => run(async () => {
                  await opsPost("/v1/ops/agencies/members/add", { agency_id: a.id, email: d(a.id).email.trim() });
                  setD(a.id, { email: "" });
                }, "メンバーを追加しました")}
              >メンバー追加</button>
            </div>

            {/* クライアント */}
            <div style={s.sectionLabel}>担当クライアント（{a.clients.length}）</div>
            {a.clients.length === 0 && (
              <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 6 }}>紐付けられたクライアントがありません</div>
            )}
            {a.clients.map((c) => (
              <div key={c.id} style={s.row}>
                <span style={{ flex: 1, fontSize: 13, minWidth: 200 }}>{c.name}</span>
                <span style={{ ...s.badge, background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.6)" }}>{c.plan}</span>
                <span style={{ ...s.badge, background: c.billable ? "rgba(16,185,129,.18)" : "rgba(255,255,255,.07)", color: c.billable ? "#34d399" : "rgba(255,255,255,.45)" }}>
                  {c.billable ? "課金対象" : c.status}
                </span>
                <button
                  style={{ ...s.btn, ...s.btnGhost }}
                  disabled={busy}
                  onClick={() => run(() => opsPost("/v1/ops/agencies/link", { workspace_id: c.id, agency_id: "" }), "紐付けを解除しました")}
                >解除</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <select
                style={{ ...s.input, flex: 1, minWidth: 220 }}
                value={d(a.id).ws}
                onChange={(e) => setD(a.id, { ws: e.target.value })}
              >
                <option value="">クライアント（ワークスペース）を選択…</option>
                {unassigned.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <button
                style={{ ...s.btn, ...s.btnGhost }}
                disabled={busy || !d(a.id).ws}
                onClick={() => run(async () => {
                  await opsPost("/v1/ops/agencies/link", { workspace_id: d(a.id).ws, agency_id: a.id });
                  setD(a.id, { ws: "" });
                }, "クライアントを紐付けました")}
              >紐付ける</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
