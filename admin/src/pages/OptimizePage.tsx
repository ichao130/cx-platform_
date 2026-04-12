// admin/src/pages/OptimizePage.tsx
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, apiPostJson } from "../firebase";

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}
function workspaceKeyForUid(uid: string) {
  return `cx_admin_workspace_id:${uid}`;
}
function readSelectedWorkspaceId(uid: string) {
  try { return localStorage.getItem(workspaceKeyForUid(uid)) || ""; } catch { return ""; }
}

type Suggestion = {
  id: string;
  type: "add_url" | "remove_url" | "create_scenario";
  scenario_id?: string;
  scenario_name?: string;
  action_id?: string;
  action_name?: string;
  url_mode: "prefix" | "contains" | "equals";
  url_value: string;
  reason: string;
  confidence: "high" | "medium" | "low";
};

const CONFIDENCE_COLOR: Record<string, string> = {
  high: "#16a34a", medium: "#d97706", low: "#94a3b8",
};
const CONFIDENCE_LABEL: Record<string, string> = {
  high: "確実性：高", medium: "確実性：中", low: "確実性：低",
};
const TYPE_LABEL: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  add_url:         { label: "URL追加", color: "#2563eb", bg: "#eff6ff", icon: "＋" },
  remove_url:      { label: "URL削除", color: "#dc2626", bg: "#fef2f2", icon: "－" },
  create_scenario: { label: "新規シナリオ", color: "#7c3aed", bg: "#f5f3ff", icon: "★" },
};
const MODE_LABEL: Record<string, string> = {
  prefix: "前方一致", contains: "含む", equals: "完全一致",
};

export default function OptimizePage() {
  const [sites, setSites] = useState<Array<{ id: string; data: any }>>([]);
  const [siteId, setSiteId] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [currentUid, setCurrentUid] = useState("");

  const [dayFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 13); return isoDay(d); });
  const [dayTo] = useState(() => isoDay(new Date()));

  const [mode, setMode] = useState<"suggest" | "auto">("suggest");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [error, setError] = useState("");

  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [applyError, setApplyError] = useState<Record<string, string>>({});

  // Auth + workspace
  useEffect(() => {
    return onAuthStateChanged(getAuth(), (u) => {
      if (!u) return;
      setCurrentUid(u.uid);
      const wsId = readSelectedWorkspaceId(u.uid);
      setWorkspaceId(wsId);
    });
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    const q = query(collection(db, "sites"), where("workspaceId", "==", workspaceId));
    return onSnapshot(q, (snap) => {
      setSites(snap.docs.map((d) => ({ id: d.id, data: d.data() as any })));
    });
  }, [workspaceId]);

  useEffect(() => {
    if (!siteId && sites.length > 0) setSiteId(sites[0].id);
  }, [sites]);

  const generate = async () => {
    if (!siteId) return;
    setLoading(true);
    setError("");
    setSuggestions(null);
    setApplied(new Set());
    setApplyError({});
    try {
      const res = await apiPostJson("/v1/ai/optimize", { site_id: siteId, day_from: dayFrom, day_to: dayTo });
      if (!res.ok) throw new Error(res.error || "failed");
      setSuggestions(res.suggestions || []);
      setMeta(res.meta || null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const apply = async (s: Suggestion) => {
    setApplying(s.id);
    setApplyError((prev) => { const n = { ...prev }; delete n[s.id]; return n; });
    try {
      const res = await apiPostJson("/v1/ai/optimize/apply", { site_id: siteId, suggestion: s });
      if (!res.ok) throw new Error(res.error || "failed");
      setApplied((prev) => new Set([...prev, s.id]));
    } catch (e: any) {
      setApplyError((prev) => ({ ...prev, [s.id]: e?.message || String(e) }));
    } finally {
      setApplying(null);
    }
  };

  const applyAll = async () => {
    if (!suggestions) return;
    const pending = suggestions.filter((s) => !applied.has(s.id));
    for (const s of pending) {
      await apply(s);
    }
  };

  const selectedSite = sites.find((s) => s.id === siteId);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900 }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 24 }}>
        <div className="h1" style={{ marginBottom: 4 }}>配信最適化</div>
        <div className="small" style={{ color: "var(--muted)" }}>
          AIがパフォーマンスとページトラフィックを分析し、シナリオのURL配信条件を提案します
        </div>
      </div>

      {/* 設定エリア */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          {/* サイト選択 */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>サイト</div>
            <select
              className="input"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              style={{ width: "100%" }}
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.data?.name || s.id}</option>
              ))}
            </select>
          </div>

          {/* 分析期間 */}
          <div>
            <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>分析期間</div>
            <div style={{ fontSize: 13, color: "var(--muted)", padding: "9px 12px", background: "var(--bg2)", borderRadius: 8, border: "1px solid rgba(15,23,42,.08)" }}>
              {dayFrom} 〜 {dayTo}
            </div>
          </div>

          {/* モード切り替え */}
          <div>
            <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>適用モード</div>
            <div style={{ display: "flex", border: "1px solid rgba(15,23,42,.12)", borderRadius: 8, overflow: "hidden" }}>
              <button
                onClick={() => setMode("suggest")}
                style={{
                  padding: "8px 16px", border: "none", fontSize: 13, cursor: "pointer",
                  background: mode === "suggest" ? "#2563eb" : "transparent",
                  color: mode === "suggest" ? "#fff" : "var(--muted)",
                  fontWeight: mode === "suggest" ? 700 : 400,
                }}
              >
                提案型
              </button>
              <button
                onClick={() => setMode("auto")}
                style={{
                  padding: "8px 16px", border: "none", fontSize: 13, cursor: "pointer",
                  background: mode === "auto" ? "#7c3aed" : "transparent",
                  color: mode === "auto" ? "#fff" : "var(--muted)",
                  fontWeight: mode === "auto" ? 700 : 400,
                }}
              >
                自動適用型
              </button>
            </div>
          </div>

          {/* 生成ボタン */}
          <button
            className="btn btn--primary"
            onClick={generate}
            disabled={loading || !siteId}
            style={{ height: 38, minWidth: 140, fontWeight: 700 }}
          >
            {loading ? "分析中..." : "🤖 提案を生成"}
          </button>
        </div>

        {mode === "auto" && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8, fontSize: 12, color: "#7c3aed" }}>
            ⚡ 自動適用モード：生成後に「全て適用」ボタンで一括反映できます。新規シナリオは <strong>inactive</strong> 状態で作成されるため、確認後に有効化してください。
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ローディング */}
      {loading && (
        <div style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>AIが分析中...</div>
          <div className="small" style={{ color: "var(--muted)" }}>
            シナリオ・パフォーマンス・ページトラフィックを解析しています
          </div>
        </div>
      )}

      {/* 提案リスト */}
      {suggestions && !loading && (
        <>
          {/* メタ情報 + 全適用ボタン */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div className="small" style={{ color: "var(--muted)" }}>
              {meta && `シナリオ ${meta.scenarios}件 / 上位ページ ${meta.topPages}件 を分析 → `}
              <strong style={{ color: "var(--text)" }}>{suggestions.length}件の提案</strong>
            </div>
            {suggestions.length > 0 && mode === "auto" && (
              <button
                className="btn btn--primary"
                onClick={applyAll}
                disabled={applying !== null || suggestions.every((s) => applied.has(s.id))}
                style={{ marginLeft: "auto", background: "#7c3aed", fontSize: 13 }}
              >
                ⚡ 全て適用（{suggestions.filter((s) => !applied.has(s.id)).length}件）
              </button>
            )}
          </div>

          {suggestions.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700 }}>現在の設定は最適化されています</div>
              <div className="small" style={{ color: "var(--muted)", marginTop: 4 }}>明確な改善提案はありませんでした</div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {suggestions.map((s) => {
              const typeInfo = TYPE_LABEL[s.type];
              const isApplied = applied.has(s.id);
              const isApplying = applying === s.id;
              const err = applyError[s.id];

              return (
                <div
                  key={s.id}
                  className="card"
                  style={{
                    padding: 18,
                    border: isApplied ? "1px solid #bbf7d0" : "1px solid rgba(15,23,42,.08)",
                    background: isApplied ? "#f0fdf4" : "#fff",
                    opacity: isApplied ? 0.85 : 1,
                    transition: "all .2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    {/* タイプバッジ */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: typeInfo.bg, color: typeInfo.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontWeight: 900,
                    }}>
                      {typeInfo.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* ヘッダー行 */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                          background: typeInfo.bg, color: typeInfo.color,
                        }}>
                          {typeInfo.label}
                        </span>
                        {s.scenario_name && (
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{s.scenario_name}</span>
                        )}
                        {s.action_name && (
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>
                            アクション: {s.action_name}
                          </span>
                        )}
                        <span style={{
                          marginLeft: "auto", fontSize: 11, fontWeight: 600,
                          color: CONFIDENCE_COLOR[s.confidence],
                        }}>
                          {CONFIDENCE_LABEL[s.confidence]}
                        </span>
                      </div>

                      {/* URL情報 */}
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "var(--bg2)", borderRadius: 6, padding: "4px 10px",
                        marginBottom: 8, fontSize: 13,
                      }}>
                        <span style={{ color: "var(--muted)", fontSize: 11 }}>{MODE_LABEL[s.url_mode]}</span>
                        <code style={{ fontWeight: 700 }}>{s.url_value}</code>
                      </div>

                      {/* 理由 */}
                      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                        {s.reason}
                      </div>

                      {err && (
                        <div style={{ marginTop: 8, fontSize: 12, color: "#dc2626" }}>⚠ {err}</div>
                      )}
                    </div>

                    {/* 適用ボタン */}
                    <div style={{ flexShrink: 0 }}>
                      {isApplied ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#16a34a", fontSize: 13, fontWeight: 700 }}>
                          ✓ 適用済み
                        </div>
                      ) : (
                        <button
                          className="btn btn--primary"
                          onClick={() => apply(s)}
                          disabled={isApplying || applying !== null}
                          style={{ fontSize: 13, minWidth: 80 }}
                        >
                          {isApplying ? "適用中..." : "適用する"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
            ※ 「add_url / remove_url」は即時反映されます。「新規シナリオ」は inactive 状態で作成されるため、シナリオ画面で確認・有効化してください。
          </div>
        </>
      )}
    </div>
  );
}
