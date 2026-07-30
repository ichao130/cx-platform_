import React, { useEffect, useMemo, useState, useCallback } from "react";
import { opsPost } from "../firebase";

type TemplateType = "modal" | "banner" | "toast" | "launcher";

const TEMPLATE_TYPES: { id: TemplateType; label: string }[] = [
  { id: "modal", label: "モーダル" },
  { id: "banner", label: "バナー" },
  { id: "toast", label: "トースト" },
  { id: "launcher", label: "ランチャー" },
];

type LibField = { key: string; label?: string; type?: string; default?: string };

type LibItem = {
  id: string;
  name: string;
  type: TemplateType;
  html: string;
  css: string;
  js?: string;
  fields?: LibField[];
  isDefault?: boolean;
};

// ---- プレビュー用の簡易レンダラ（SDKの {{key}} / {{#if}} と同じ挙動） ----
function renderMini(tpl: string, data: Record<string, string>): string {
  let out = tpl;
  out = out.replace(/\{\{#if\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, inner) =>
    data[key] ? inner : ""
  );
  out = out.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => data[key] ?? "");
  return out;
}

function buildPreviewDoc(item: LibItem | null): string {
  if (!item) return "<!doctype html><html><body></body></html>";
  const base: Record<string, string> = {
    title: "プレビュー表示",
    body: "これが標準テンプレートのプレビューです🔥",
    image_url: "",
    cta_text: "閉じる",
    cta_url: "https://example.com",
    cta_url_text: "詳細を見る",
    coupon_code: "SAMPLE10",
    launcher_image_url: "",
  };
  // 追加フィールドの初期値もプレビューに反映（空だと {{#if}} で消えて何も見えないため）
  for (const f of item.fields || []) {
    base[f.key] = f.default || (f.type === "number" ? "0" : `${f.label || f.key}`);
  }
  const body = renderMini(item.html, base);
  const js = item.js ? renderMini(item.js, base) : "";
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<style>
html,body{margin:0;padding:0;background:#0b0b0b;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto;}
.cx-overlay{position:relative!important;inset:auto!important;min-height:360px;}
.cx-modal{margin:24px auto;}
.cx-banner,.cx-toast,.cx-fcard,.cx-cbanner,.cx-ship,.cx-sp{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;top:auto!important;margin:24px auto;}
.cx-launcher-btn,.cx-lpulse{display:inline-flex!important;margin:40px auto;}
</style>
<style>${item.css}</style>
</head>
<body>${body}
<script>
(function(){
  var btns=document.querySelectorAll('[data-cx-copy]');
  for(var i=0;i<btns.length;i++){(function(b){b.addEventListener('click',function(e){
    e.stopPropagation();var t=b.getAttribute('data-cx-copy')||'';if(!t)return;
    try{navigator.clipboard&&navigator.clipboard.writeText(t);}catch(x){}
    var o=b.textContent;b.textContent='コピーしました！';b.setAttribute('data-cx-copied','1');
    setTimeout(function(){b.textContent=o;b.removeAttribute('data-cx-copied');},2000);
  });})(btns[i]);}
})();
<\/script>
${js ? `<script>\ntry{\n${js}\n}catch(e){console.error(e);}\n<\/script>` : ""}
</body>
</html>`;
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 1400, margin: "0 auto" },
  title: { fontWeight: 800, fontSize: 22, marginBottom: 4 },
  subtitle: { opacity: 0.5, fontSize: 13, marginBottom: 20 },
  toolbar: { display: "flex", gap: 10, alignItems: "center", marginBottom: 18, flexWrap: "wrap" },
  body: { display: "flex", gap: 20, alignItems: "flex-start" },
  listCol: { width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 },
  typeGroup: { background: "rgba(255,255,255,.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", overflow: "hidden" },
  typeHead: { padding: "8px 12px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", opacity: 0.55, borderBottom: "1px solid rgba(255,255,255,.06)" },
  row: { padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,.04)", display: "flex", alignItems: "center", gap: 8 },
  rowActive: { background: "rgba(59,130,246,.18)" },
  rowName: { flex: 1, fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  defBadge: { fontSize: 9, fontWeight: 700, background: "rgba(16,185,129,.2)", color: "#34d399", padding: "2px 6px", borderRadius: 4, flexShrink: 0 },
  editCol: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 },
  editorBox: { background: "rgba(255,255,255,.04)", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" },
  editorLabel: { padding: "8px 14px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", opacity: 0.5, borderBottom: "1px solid rgba(255,255,255,.06)", userSelect: "none" },
  textarea: { width: "100%", minHeight: 190, background: "transparent", border: "none", color: "#e2e8f0", fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, padding: 14, boxSizing: "border-box", resize: "vertical", outline: "none" },
  previewCol: { width: 400, flexShrink: 0, position: "sticky", top: 20 },
  preview: { borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", background: "#0b0b0b", width: "100%", height: 520 },
  input: { width: "100%", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, color: "#e2e8f0", padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none" },
  select: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, color: "#e2e8f0", padding: "9px 12px", fontSize: 13, outline: "none" },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  btn: { padding: "9px 18px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnPrimary: { background: "#2563eb", color: "#fff" },
  btnGhost: { background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.12)" },
  btnDanger: { background: "rgba(239,68,68,.14)", color: "#f87171", border: "1px solid rgba(239,68,68,.3)" },
  msg: { fontSize: 13, padding: "6px 12px", borderRadius: 8 },
  msgOk: { background: "rgba(16,185,129,.15)", color: "#34d399" },
  msgErr: { background: "rgba(239,68,68,.12)", color: "#f87171" },
  fieldRow: { display: "flex", gap: 6, alignItems: "center", padding: "6px 12px", fontSize: 12, opacity: 0.75 },
};

export default function PlatformTemplatesPage() {
  const [items, setItems] = useState<LibItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<LibItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async (keepId?: string) => {
    setLoading(true);
    try {
      const res = await opsPost<{ ok: boolean; items: LibItem[] }>("/v1/ops/platform-templates/library/list");
      const list = res.items || [];
      setItems(list);
      const next = keepId && list.some((x) => x.id === keepId) ? keepId : list[0]?.id || "";
      setSelectedId(next);
      setDraft(list.find((x) => x.id === next) || null);
    } catch (e: any) {
      setMsg({ text: e?.message || "読み込みに失敗しました", ok: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const select = (item: LibItem) => {
    setSelectedId(item.id);
    setDraft({ ...item });
    setMsg(null);
  };

  const grouped = useMemo(() => {
    const m: Record<TemplateType, LibItem[]> = { modal: [], banner: [], toast: [], launcher: [] };
    for (const it of items) if (m[it.type]) m[it.type].push(it);
    return m;
  }, [items]);

  const handleSeed = async () => {
    if (!window.confirm("プリセットの標準テンプレートを投入します。\n既存の同IDテンプレートは変更しません。よろしいですか？")) return;
    setSaving(true); setMsg(null);
    try {
      const r = await opsPost<{ created: number; updated: number; skipped: number; migrated: number }>("/v1/ops/platform-templates/library/seed");
      setMsg({
        text: `投入完了: 新規${r.created}件 / スキップ${r.skipped}件`
          + (r.migrated ? ` / 現行の標準を${r.migrated}件移行（既定として維持）` : ""),
        ok: true,
      });
      await load(selectedId);
    } catch (e: any) {
      setMsg({ text: e?.message || "投入に失敗しました", ok: false });
    } finally { setSaving(false); }
  };

  const handleNew = () => {
    setSelectedId("");
    setDraft({ id: "", name: "新しいテンプレート", type: "modal", html: "<div>\n  \n</div>", css: "", isDefault: false });
    setMsg(null);
  };

  const handleDuplicate = () => {
    if (!draft) return;
    setSelectedId("");
    setDraft({ ...draft, id: "", name: `${draft.name} のコピー`, isDefault: false });
    setMsg(null);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true); setMsg(null);
    try {
      const r = await opsPost<{ id: string }>("/v1/ops/platform-templates/library/save", {
        id: draft.id || undefined,
        name: draft.name,
        type: draft.type,
        html: draft.html,
        css: draft.css,
        js: draft.js ?? "",
        fields: draft.fields ?? [],
      });
      setMsg({ text: "保存しました", ok: true });
      await load(r.id);
    } catch (e: any) {
      setMsg({ text: e?.message || "保存に失敗しました", ok: false });
    } finally { setSaving(false); }
  };

  const handleSetDefault = async () => {
    if (!draft?.id) return;
    setSaving(true); setMsg(null);
    try {
      await opsPost("/v1/ops/platform-templates/library/set-default", { id: draft.id });
      setMsg({ text: `「${draft.name}」を${draft.type}の既定にしました（配信のフォールバックに反映）`, ok: true });
      await load(draft.id);
    } catch (e: any) {
      setMsg({ text: e?.message || "設定に失敗しました", ok: false });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!draft?.id) return;
    if (!window.confirm(`「${draft.name}」を削除します。よろしいですか？`)) return;
    setSaving(true); setMsg(null);
    try {
      await opsPost("/v1/ops/platform-templates/library/delete", { id: draft.id });
      setMsg({ text: "削除しました", ok: true });
      await load();
    } catch (e: any) {
      const m = e?.message === "cannot_delete_default"
        ? "既定テンプレートは削除できません。先に別のテンプレートを既定にしてください。"
        : (e?.message || "削除に失敗しました");
      setMsg({ text: m, ok: false });
    } finally { setSaving(false); }
  };

  const previewSrc = useMemo(() => buildPreviewDoc(draft), [draft]);

  return (
    <div style={s.container}>
      <div style={s.title}>標準テンプレート管理</div>
      <div style={s.subtitle}>
        全ワークスペース共通の雛形ライブラリです。タイプごとの「既定」はアクションにテンプレ未指定のときの配信フォールバックになり、
        それ以外は各ワークスペースの管理画面から「標準テンプレートから作成」で複製して使えます。
      </div>

      <div style={s.toolbar}>
        <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleNew} disabled={saving}>＋ 新規作成</button>
        <button style={{ ...s.btn, ...s.btnGhost }} onClick={handleSeed} disabled={saving}>標準セットを投入</button>
        {msg && <span style={{ ...s.msg, ...(msg.ok ? s.msgOk : s.msgErr) }}>{msg.text}</span>}
      </div>

      {loading ? (
        <div style={{ opacity: 0.5, fontSize: 13 }}>読み込み中…</div>
      ) : (
        <div style={s.body}>
          {/* ---- 一覧 ---- */}
          <div style={s.listCol}>
            {items.length === 0 && (
              <div style={{ ...s.typeGroup, padding: 14, fontSize: 12, opacity: 0.6, lineHeight: 1.7 }}>
                テンプレートがまだありません。<br />「標準セットを投入」で12種類の雛形を作成できます。
              </div>
            )}
            {TEMPLATE_TYPES.map(({ id, label }) => {
              const list = grouped[id];
              if (!list?.length) return null;
              return (
                <div key={id} style={s.typeGroup}>
                  <div style={s.typeHead}>{label}（{list.length}）</div>
                  {list.map((it) => (
                    <div
                      key={it.id}
                      style={{ ...s.row, ...(selectedId === it.id ? s.rowActive : {}) }}
                      onClick={() => select(it)}
                    >
                      <span style={s.rowName}>{it.name}</span>
                      {it.isDefault && <span style={s.defBadge}>既定</span>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* ---- エディタ ---- */}
          {draft ? (
            <div style={s.editCol}>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  style={{ ...s.input, flex: 1 }}
                  value={draft.name}
                  placeholder="テンプレート名"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
                <select
                  style={s.select}
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as TemplateType })}
                >
                  {TEMPLATE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>

              <div style={s.editorBox}>
                <div style={s.editorLabel}>HTML</div>
                <textarea style={s.textarea} value={draft.html} onChange={(e) => setDraft({ ...draft, html: e.target.value })} spellCheck={false} />
              </div>
              <div style={s.editorBox}>
                <div style={s.editorLabel}>CSS</div>
                <textarea style={s.textarea} value={draft.css} onChange={(e) => setDraft({ ...draft, css: e.target.value })} spellCheck={false} />
              </div>
              <div style={s.editorBox}>
                <div style={s.editorLabel}>JS（任意・表示直後に実行）</div>
                <textarea style={{ ...s.textarea, minHeight: 110 }} value={draft.js || ""} onChange={(e) => setDraft({ ...draft, js: e.target.value })} spellCheck={false} />
              </div>

              {!!draft.fields?.length && (
                <div style={s.editorBox}>
                  <div style={s.editorLabel}>追加フィールド（複製先のアクションで入力欄になる）</div>
                  {draft.fields.map((f) => (
                    <div key={f.key} style={s.fieldRow}>
                      <code style={{ color: "#7dd3fc" }}>{`{{${f.key}}}`}</code>
                      <span>— {f.label || "(ラベル未設定)"}</span>
                      {f.default ? <span style={{ opacity: 0.5 }}>既定値: {f.default}</span> : null}
                    </div>
                  ))}
                </div>
              )}

              <div style={s.actions}>
                <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleSave} disabled={saving}>
                  {saving ? "保存中…" : draft.id ? "保存" : "作成"}
                </button>
                {draft.id && !draft.isDefault && (
                  <button style={{ ...s.btn, ...s.btnGhost }} onClick={handleSetDefault} disabled={saving}>このタイプの既定にする</button>
                )}
                {draft.id && <button style={{ ...s.btn, ...s.btnGhost }} onClick={handleDuplicate} disabled={saving}>複製</button>}
                {draft.id && !draft.isDefault && (
                  <button style={{ ...s.btn, ...s.btnDanger }} onClick={handleDelete} disabled={saving}>削除</button>
                )}
              </div>
              {draft.isDefault && (
                <div style={{ fontSize: 12, opacity: 0.55 }}>
                  これは <b>{TEMPLATE_TYPES.find((t) => t.id === draft.type)?.label}</b> の既定テンプレートです。
                  保存すると配信のフォールバックにも即反映されます。
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...s.editCol, opacity: 0.5, fontSize: 13 }}>左の一覧から選択、または「新規作成」</div>
          )}

          {/* ---- プレビュー ---- */}
          <div style={s.previewCol}>
            <div style={s.editorLabel}>プレビュー</div>
            <iframe title="platform-template-preview" style={s.preview} sandbox="allow-scripts allow-modals" srcDoc={previewSrc} />
          </div>
        </div>
      )}
    </div>
  );
}
