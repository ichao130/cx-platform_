// admin/src/pages/QuestionsPage.tsx
// 質問型接客（質問→回答→属性蓄積）。Actionsの兄弟エンティティ。
// クリエイティブ（ヘッダー画像・トンマナ）＋質問文＋選択肢(表示名/保存値)＋属性キー＋回答形式 をビルド。
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, onSnapshot, doc, setDoc, deleteDoc,
} from "firebase/firestore";
import { db, apiPostJson } from "../firebase";
import RightDrawer from "../components/RightDrawer";

type AnswerSummary = {
  by_key: Record<string, Record<string, number>>;
  answered_counts: Record<string, number>;
  total_with_attrs: number;
};

type Choice = { label: string; value: string };
type Creative = {
  header_image_url?: string;
  accent_color?: string;
  bg_color?: string;
  text_color?: string;
  submit_label?: string;
};
type QuestionDoc = {
  siteId: string;
  workspaceId: string;
  title: string;
  answer_mode: "single" | "multi";
  attribute_key: string;
  choices: Choice[];
  creative: Creative;
  re_ask: "never" | "days";
  re_ask_days: number;
  status: string;
  updatedAt?: string;
};

function siteKeyForWs(workspaceId: string) { return `cx_admin_site_id:${workspaceId}`; }
function workspaceKeyForUid(uid: string) { return `cx_admin_workspace_id:${uid}`; }
function readLS(k: string) { try { return localStorage.getItem(k) || ""; } catch { return ""; } }

const DEFAULT_CREATIVE: Creative = {
  header_image_url: "",
  accent_color: "#6366f1",
  bg_color: "#ffffff",
  text_color: "#1e293b",
  submit_label: "回答する",
};

function emptyForm(): QuestionDoc {
  return {
    siteId: "", workspaceId: "",
    title: "", answer_mode: "single", attribute_key: "",
    choices: [{ label: "", value: "" }],
    creative: { ...DEFAULT_CREATIVE },
    re_ask: "never", re_ask_days: 90, status: "active",
  };
}

// 表示名から保存値を自動生成（英数と_のみ）
function slugify(s: string) {
  return String(s || "").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}

export default function QuestionsPage() {
  const [uid, setUid] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [rows, setRows] = useState<Array<{ id: string; data: QuestionDoc }>>([]);
  const [editing, setEditing] = useState<{ id: string; form: QuestionDoc } | null>(null);
  const [summary, setSummary] = useState<AnswerSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [ai, setAi] = useState<{ segment_suggestions: any[]; question_suggestions: any[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const navigate = useNavigate();

  const loadAiSuggest = useCallback(async () => {
    if (!siteId) return;
    setAiLoading(true); setAiErr("");
    try {
      const j = await apiPostJson<any>("/v1/questions/ai/suggest", { site_id: siteId, distribution: summary?.by_key || {} }, { siteId });
      setAi({ segment_suggestions: j.segment_suggestions || [], question_suggestions: j.question_suggestions || [] });
    } catch (e: any) {
      setAiErr(e?.message || String(e)); setAi(null);
    } finally { setAiLoading(false); }
  }, [siteId, summary]);

  const loadSummary = useCallback(async () => {
    if (!siteId) { setSummary(null); return; }
    setSummaryLoading(true);
    try {
      const j = await apiPostJson<AnswerSummary & { ok: boolean }>("/v1/questions/answers/summary", { site_id: siteId }, { siteId });
      setSummary({ by_key: j.by_key || {}, answered_counts: j.answered_counts || {}, total_with_attrs: j.total_with_attrs || 0 });
    } catch (e) {
      console.error("[questions summary]", e);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [siteId]);

  // auth → uid → workspace/site（アプリのグローバル選択と同期）
  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (u) => setUid(u?.uid || ""));
  }, []);
  useEffect(() => {
    if (!uid) return;
    const sync = () => {
      const ws = readLS(workspaceKeyForUid(uid));
      setWorkspaceId(ws);
      setSiteId(ws ? readLS(siteKeyForWs(ws)) : "");
    };
    sync();
    const onWs = () => sync();
    const onSite = () => sync();
    window.addEventListener("cx_admin_workspace_changed", onWs as any);
    window.addEventListener("cx_admin_site_changed", onSite as any);
    return () => {
      window.removeEventListener("cx_admin_workspace_changed", onWs as any);
      window.removeEventListener("cx_admin_site_changed", onSite as any);
    };
  }, [uid]);

  // questions 購読（siteId で絞る）
  useEffect(() => {
    if (!siteId) { setRows([]); return; }
    const q = query(collection(db, "questions"), where("siteId", "==", siteId));
    return onSnapshot(q, (snap) => {
      setRows(
        snap.docs
          .map((d) => ({ id: d.id, data: d.data() as QuestionDoc }))
          .filter((r) => r.data.status !== "deleted")
      );
    }, (e) => console.error("[questions] query error", e));
  }, [siteId]);

  // 回答集計（Phase2）
  useEffect(() => { loadSummary(); }, [loadSummary]);

  const openCreate = () => {
    const f = emptyForm();
    f.siteId = siteId; f.workspaceId = workspaceId;
    setEditing({ id: `q_${Math.random().toString(36).slice(2, 10)}`, form: f });
  };
  const openEdit = (r: { id: string; data: QuestionDoc }) => {
    setEditing({ id: r.id, form: { ...emptyForm(), ...r.data, creative: { ...DEFAULT_CREATIVE, ...(r.data.creative || {}) } } });
  };

  async function save() {
    if (!editing) return;
    const f = editing.form;
    const choices = (f.choices || [])
      .map((c) => ({ label: (c.label || "").trim(), value: (c.value || slugify(c.label)).trim() }))
      .filter((c) => c.label && c.value);
    if (!f.title.trim()) { alert("質問文を入力してください"); return; }
    if (!f.attribute_key.trim()) { alert("保存する属性キーを入力してください（例: concerns.uv）"); return; }
    if (choices.length < 1) { alert("選択肢を1つ以上入力してください"); return; }
    const payload: QuestionDoc = {
      siteId, workspaceId,
      title: f.title.trim(),
      answer_mode: f.answer_mode,
      attribute_key: f.attribute_key.trim(),
      choices,
      creative: { ...DEFAULT_CREATIVE, ...(f.creative || {}) },
      re_ask: f.re_ask,
      re_ask_days: Number(f.re_ask_days) || 0,
      status: "active",
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "questions", editing.id), payload, { merge: true });
    setEditing(null);
  }

  async function remove(id: string) {
    if (!window.confirm("この質問を削除します。よろしいですか？")) return;
    await deleteDoc(doc(db, "questions", id)).catch(async () => {
      await setDoc(doc(db, "questions", id), { status: "deleted" }, { merge: true });
    });
  }

  if (!siteId) {
    return (
      <div className="card">
        <div className="h1">質問接客</div>
        <div className="small" style={{ opacity: 0.7 }}>上部でサイトを選択してください。</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div className="h1" style={{ margin: 0 }}>🗣 質問接客</div>
          <div className="small" style={{ opacity: 0.7 }}>訪問者に質問し、回答をユーザー属性として蓄積 → 次の接客条件に使えます。</div>
        </div>
        <button className="btn btn--primary" onClick={openCreate}>+ 質問を作成</button>
      </div>

      {/* 🤖 AI提案（Phase3） */}
      <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 12, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.18)" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, color: "#4338ca" }}>🤖 AI提案</div>
            <div className="small" style={{ opacity: 0.7 }}>回答分布とサイト情報から、狙うべきセグメントと次に聞くべき質問をAIが提案します。</div>
          </div>
          <button className="btn" onClick={loadAiSuggest} disabled={aiLoading}>{aiLoading ? "考え中…" : ai ? "🔄 再提案" : "AIに提案してもらう"}</button>
        </div>
        {aiErr && <div className="small" style={{ color: "#dc2626", marginTop: 8 }}>AI提案に失敗: {aiErr}</div>}
        {ai && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
            {/* セグメント提案 */}
            <div>
              <div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>🎯 セグメント提案</div>
              <div style={{ display: "grid", gap: 8 }}>
                {(ai.segment_suggestions || []).length === 0 && <div className="small" style={{ opacity: 0.5 }}>提案なし（回答が溜まると精度が上がります）</div>}
                {(ai.segment_suggestions || []).map((s, i) => (
                  <div key={i} style={{ padding: "10px 12px", background: "#fff", borderRadius: 8, border: "1px solid rgba(15,23,42,.1)" }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{s.segment_label}</div>
                    <div className="small" style={{ opacity: 0.7, margin: "4px 0" }}>{s.why}</div>
                    <div className="small" style={{ background: "rgba(99,102,241,.08)", borderRadius: 6, padding: "6px 8px", marginBottom: 6 }}>💡 {s.message_idea}</div>
                    <div className="small" style={{ opacity: 0.6 }}>条件: <code>{s.attribute_key} = {s.attribute_value}</code></div>
                    <button className="btn" style={{ marginTop: 6, fontSize: 11, padding: "3px 8px" }}
                      onClick={() => { try { sessionStorage.setItem("cx_seg_hint", JSON.stringify({ key: s.attribute_key, value: s.attribute_value, label: s.segment_label })); } catch {} navigate("/scenarios"); }}>
                      この層に施策を作成 →
                    </button>
                  </div>
                ))}
              </div>
            </div>
            {/* 質問提案 */}
            <div>
              <div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>❓ 質問提案</div>
              <div style={{ display: "grid", gap: 8 }}>
                {(ai.question_suggestions || []).length === 0 && <div className="small" style={{ opacity: 0.5 }}>提案なし</div>}
                {(ai.question_suggestions || []).map((qs, i) => (
                  <div key={i} style={{ padding: "10px 12px", background: "#fff", borderRadius: 8, border: "1px solid rgba(15,23,42,.1)" }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{qs.title}</div>
                    <div className="small" style={{ opacity: 0.7, margin: "4px 0" }}>{qs.why}</div>
                    <div className="small" style={{ opacity: 0.6 }}>選択肢: {(qs.choices || []).map((c: any) => c.label).join(" / ")}</div>
                    <button className="btn" style={{ marginTop: 6, fontSize: 11, padding: "3px 8px" }}
                      onClick={() => {
                        const f = emptyForm(); f.siteId = siteId; f.workspaceId = workspaceId;
                        f.title = qs.title || ""; f.attribute_key = qs.attribute_key || "";
                        f.choices = (qs.choices || []).map((c: any) => ({ label: String(c.label || ""), value: String(c.value || slugify(c.label || "")) }));
                        setEditing({ id: `q_${Math.random().toString(36).slice(2, 10)}`, form: f });
                      }}>
                      この質問を作成 →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="small" style={{ opacity: 0.6 }}>まだ質問はありません。「+ 質問を作成」から追加してください。</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((r) => {
            const key = r.data.attribute_key;
            const dist = (summary?.by_key || {})[key] || {};
            const answered = (summary?.answered_counts || {})[r.id] || 0;
            const maxCount = Math.max(1, ...(r.data.choices || []).map((c) => dist[c.value] || 0));
            return (
              <div key={r.id} style={{ padding: "12px 14px", border: "1px solid rgba(15,23,42,.1)", borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{r.data.title || "（無題）"}</div>
                    <div className="small" style={{ opacity: 0.7 }}>
                      {r.data.answer_mode === "multi" ? "複数選択" : "単一選択"} ・ 選択肢{(r.data.choices || []).length} ・ 属性: <code>{key}</code> ・ 回答 <b>{answered}</b>人
                    </div>
                  </div>
                  <button className="btn" onClick={() => openEdit(r)}>編集</button>
                  <button className="btn btn--danger" onClick={() => remove(r.id)}>削除</button>
                </div>

                {/* 回答分布（Phase2）＋セグメント施策作成 */}
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  {(r.data.choices || []).map((c) => {
                    const n = dist[c.value] || 0;
                    const pct = Math.round((n / maxCount) * 100);
                    return (
                      <div key={c.value} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="small" style={{ width: 120, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</div>
                        <div style={{ flex: 1, height: 8, background: "rgba(15,23,42,.06)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "#6366f1", borderRadius: 99 }} />
                        </div>
                        <div className="small" style={{ width: 48, textAlign: "right", flexShrink: 0, fontWeight: 700 }}>{n}人</div>
                        <button
                          className="btn"
                          style={{ fontSize: 11, padding: "3px 8px", flexShrink: 0 }}
                          disabled={n === 0}
                          title={`「${c.label}」と回答した ${n}人 に接客を作成（属性条件 ${key} = ${c.value}）`}
                          onClick={() => {
                            try { sessionStorage.setItem("cx_seg_hint", JSON.stringify({ key, value: c.value, label: c.label })); } catch {}
                            navigate("/scenarios");
                          }}
                        >
                          施策を作成 →
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {summaryLoading && <div className="small" style={{ opacity: 0.5, marginTop: 8 }}>回答集計を読み込み中…</div>}

      <RightDrawer
        open={!!editing}
        width={1040}
        title="質問接客の編集"
        description="質問・選択肢・クリエイティブを設定します。右側にプレビューが出ます。"
        onClose={() => setEditing(null)}
      >
        {editing && (
          <QuestionEditor
            editing={editing}
            onChange={(form) => setEditing({ ...editing, form })}
            onClose={() => setEditing(null)}
            onSave={save}
          />
        )}
      </RightDrawer>
    </div>
  );
}

function QuestionEditor(props: {
  editing: { id: string; form: QuestionDoc };
  onChange: (f: QuestionDoc) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { editing, onChange, onClose, onSave } = props;
  const f = editing.form;
  const c = f.creative || {};
  const setF = (patch: Partial<QuestionDoc>) => onChange({ ...f, ...patch });
  const setC = (patch: Partial<Creative>) => onChange({ ...f, creative: { ...c, ...patch } });

  const previewChoices = useMemo(() => (f.choices || []).filter((x) => (x.label || "").trim()), [f.choices]);

  return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
          {/* 左: 設定 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div className="h2">質問文</div>
              <input className="input" value={f.title} onChange={(e) => setF({ title: e.target.value })} placeholder="例: 日焼け止めを選ぶ際、一番気になることは？" />
            </div>

            <div className="row" style={{ gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="h2">回答形式</div>
                <select className="input" value={f.answer_mode} onChange={(e) => setF({ answer_mode: e.target.value as any })}>
                  <option value="single">単一選択</option>
                  <option value="multi">複数選択</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div className="h2">保存する属性キー</div>
                <input className="input" value={f.attribute_key} onChange={(e) => setF({ attribute_key: e.target.value })} placeholder="例: concerns.uv" />
                <div className="small" style={{ opacity: 0.6, marginTop: 2 }}>ドット区切りのフラットキー。接客条件で使えます。</div>
              </div>
            </div>

            <div>
              <div className="h2">選択肢（表示名 / 保存値）</div>
              <div style={{ display: "grid", gap: 6 }}>
                {(f.choices || []).map((ch, i) => (
                  <div key={i} className="row" style={{ gap: 6, alignItems: "center" }}>
                    <input className="input" style={{ flex: 1 }} value={ch.label}
                      onChange={(e) => { const arr = [...f.choices]; arr[i] = { ...arr[i], label: e.target.value }; setF({ choices: arr }); }}
                      placeholder="表示名（例: ベタつき）" />
                    <input className="input" style={{ flex: 1 }} value={ch.value}
                      onChange={(e) => { const arr = [...f.choices]; arr[i] = { ...arr[i], value: e.target.value }; setF({ choices: arr }); }}
                      onBlur={(e) => { if (!e.target.value.trim() && ch.label.trim()) { const arr = [...f.choices]; arr[i] = { ...arr[i], value: slugify(ch.label) }; setF({ choices: arr }); } }}
                      placeholder="保存値（例: sticky）" />
                    <button className="btn btn--danger" style={{ fontSize: 12, padding: "4px 8px" }}
                      onClick={() => setF({ choices: f.choices.filter((_, j) => j !== i) })}>✕</button>
                  </div>
                ))}
              </div>
              <button className="btn" style={{ marginTop: 8, fontSize: 12 }} onClick={() => setF({ choices: [...f.choices, { label: "", value: "" }] })}>+ 選択肢を追加</button>
            </div>

            <div>
              <div className="h2">再表示（回答済みユーザー）</div>
              <div className="row" style={{ gap: 12, alignItems: "center" }}>
                <select className="input" style={{ flex: 1 }} value={f.re_ask} onChange={(e) => setF({ re_ask: e.target.value as any })}>
                  <option value="never">再表示しない（回答は1回のみ）</option>
                  <option value="days">一定期間後に再質問</option>
                </select>
                {f.re_ask === "days" && (
                  <div className="row" style={{ gap: 6, alignItems: "center" }}>
                    <input className="input" type="number" min={1} style={{ width: 90 }} value={f.re_ask_days} onChange={(e) => setF({ re_ask_days: Number(e.target.value) })} />
                    <span className="small">日後</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="h2">クリエイティブ（トンマナ）</div>
              <div style={{ display: "grid", gap: 8 }}>
                <input className="input" value={c.header_image_url || ""} onChange={(e) => setC({ header_image_url: e.target.value })} placeholder="ヘッダー画像URL（任意）https://..." />
                <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
                  <ColorField label="アクセント" value={c.accent_color || "#6366f1"} onChange={(v) => setC({ accent_color: v })} />
                  <ColorField label="背景" value={c.bg_color || "#ffffff"} onChange={(v) => setC({ bg_color: v })} />
                  <ColorField label="文字" value={c.text_color || "#1e293b"} onChange={(v) => setC({ text_color: v })} />
                </div>
                {f.answer_mode === "multi" && (
                  <input className="input" value={c.submit_label || ""} onChange={(e) => setC({ submit_label: e.target.value })} placeholder="送信ボタンの文言（例: 回答する）" />
                )}
              </div>
            </div>

            <div className="row" style={{ gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <button className="btn" onClick={onClose}>キャンセル</button>
              <button className="btn btn--primary" onClick={onSave}>保存</button>
            </div>
          </div>

          {/* 右: ライブプレビュー */}
          <div>
            <div className="h2">プレビュー</div>
            <div style={{ background: "#f1f5f9", borderRadius: 12, padding: 16, display: "flex", justifyContent: "center" }}>
              <div style={{ width: "100%", maxWidth: 300, background: c.bg_color || "#fff", color: c.text_color || "#1e293b", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,.15)" }}>
                {c.header_image_url ? (
                  <img src={c.header_image_url} alt="" style={{ width: "100%", maxHeight: 110, objectFit: "cover", display: "block" }} />
                ) : null}
                <div style={{ padding: "14px 16px 16px" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, lineHeight: 1.5 }}>{f.title || "質問文がここに表示されます"}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {(previewChoices.length ? previewChoices : [{ label: "選択肢", value: "" }]).map((ch, i) => (
                      <div key={i} style={{ textAlign: "left", padding: "8px 12px", borderRadius: 9, border: "1.5px solid rgba(15,23,42,.15)", fontSize: 13 }}>{ch.label || "選択肢"}</div>
                    ))}
                  </div>
                  {f.answer_mode === "multi" && (
                    <div style={{ marginTop: 10, textAlign: "center", padding: "9px", borderRadius: 9, background: c.accent_color || "#6366f1", color: "#fff", fontWeight: 700, fontSize: 13 }}>{c.submit_label || "回答する"}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="small" style={{ opacity: 0.6, marginTop: 8 }}>実際は画面下部中央にカードで表示されます。</div>
          </div>
        </div>
  );
}

function ColorField(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
      <span className="small" style={{ opacity: 0.7 }}>{props.label}</span>
      <input type="color" value={props.value} onChange={(e) => props.onChange(e.target.value)} style={{ width: 34, height: 26, padding: 0, border: "1px solid rgba(15,23,42,.15)", borderRadius: 6, cursor: "pointer" }} />
    </label>
  );
}
