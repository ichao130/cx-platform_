// admin/src/components/WeeklyReportSettings.tsx
// 週次レポートのメール配信設定。流入計測から開く。
import React, { useCallback, useEffect, useState } from "react";
import { apiPostJson } from "../firebase";

type Props = { siteId: string; open: boolean; onClose: () => void };
type Settings = {
  enabled: boolean; recipients: string[]; withAi: boolean;
  weekday: number; hour: number;
  lastSentAt?: string | null; lastPeriod?: string | null;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function WeeklyReportSettings({ siteId, open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [withAi, setWithAi] = useState(true);
  const [recipientsText, setRecipientsText] = useState("");
  const [weekday, setWeekday] = useState(1); // 既定: 月曜
  const [hour, setHour] = useState(9);       // 既定: 9時(JST)
  const [lastSent, setLastSent] = useState<{ at?: string | null; period?: string | null }>({});

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true); setMsg(null);
    try {
      const r = await apiPostJson<{ settings: Settings }>("/v1/reports/weekly/settings/get", { site_id: siteId });
      setEnabled(!!r.settings.enabled);
      setWithAi(r.settings.withAi !== false);
      setRecipientsText((r.settings.recipients || []).join("\n"));
      setWeekday(Number.isInteger(r.settings.weekday) ? r.settings.weekday : 1);
      setHour(Number.isInteger(r.settings.hour) ? r.settings.hour : 9);
      setLastSent({ at: r.settings.lastSentAt, period: r.settings.lastPeriod });
    } catch (e: any) {
      setMsg({ text: e?.message || "設定の取得に失敗しました", ok: false });
    } finally { setLoading(false); }
  }, [siteId]);

  useEffect(() => { if (open) { load(); setPreviewHtml(null); } }, [open, load]);

  if (!open) return null;

  const recipients = recipientsText.split(/[\s,、]+/).map((s) => s.trim()).filter(Boolean);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      await apiPostJson("/v1/reports/weekly/settings/save", {
        site_id: siteId, enabled, recipients, with_ai: withAi, weekday, hour,
      });
      setMsg({ text: "保存しました", ok: true });
    } catch (e: any) {
      const m = String(e?.message || "");
      setMsg({
        text: m.startsWith("invalid_email:") ? `メールアドレスの形式が正しくありません: ${m.split(":")[1]}`
          : m === "recipients_required" ? "配信をONにするには宛先が必要です"
          : m === "too_many_recipients" ? "宛先は20件までです"
          : m === "invalid_weekday" || m === "invalid_hour" ? "配信タイミングの指定が正しくありません"
          : m || "保存に失敗しました",
        ok: false,
      });
    } finally { setSaving(false); }
  };

  const preview = async () => {
    setPreviewing(true); setMsg(null); setPreviewHtml(null);
    try {
      const r = await apiPostJson<{ html: string; aiProblems: string[] }>("/v1/reports/weekly/preview", {
        site_id: siteId, with_ai: withAi,
      });
      setPreviewHtml(r.html);
      if (r.aiProblems?.length) {
        setMsg({ text: "AIコメントは品質チェックに通らなかったため省略されています（レポート本体は正常です）", ok: false });
      }
    } catch (e: any) {
      setMsg({ text: e?.message || "プレビューの生成に失敗しました", ok: false });
    } finally { setPreviewing(false); }
  };

  const sendTest = async () => {
    if (!testTo.trim()) { setMsg({ text: "テスト送信先を入力してください", ok: false }); return; }
    setSending(true); setMsg(null);
    try {
      const r = await apiPostJson<{ sent: number }>("/v1/reports/weekly/send-test", {
        site_id: siteId, to: testTo, with_ai: withAi,
      });
      setMsg({ text: `テスト送信しました（${r.sent}件）。件名に [テスト] が付きます。`, ok: true });
    } catch (e: any) {
      setMsg({ text: e?.message || "テスト送信に失敗しました", ok: false });
    } finally { setSending(false); }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9997, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 14, width: "min(780px, 96vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px rgba(15,23,42,.25)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(15,23,42,.08)", display: "flex", alignItems: "center" }}>
          <div>
            <div className="h2" style={{ margin: 0 }}>📧 週次レポートのメール配信</div>
            <div className="small" style={{ opacity: 0.68 }}>前週（月〜日）の実績を、指定した曜日・時刻にお送りします。</div>
          </div>
          <button className="btn" style={{ marginLeft: "auto" }} onClick={onClose}>✕ 閉じる</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {loading ? <div className="small">読み込み中…</div> : (
            <>
              <label className="badge" style={{ cursor: "pointer", fontSize: 14, padding: "8px 14px" }}>
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                {" "}毎週このレポートを配信する
              </label>

              <div style={{ height: 16 }} />
              <div className="h2">配信タイミング</div>
              <div className="small" style={{ opacity: 0.68, marginBottom: 6 }}>
                日本時間で、毎週この曜日・時刻にお送りします。
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className="small">毎週</span>
                <select className="input" style={{ width: 90 }} value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                  {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}曜日</option>)}
                </select>
                <select className="input" style={{ width: 100 }} value={hour} onChange={(e) => setHour(Number(e.target.value))}>
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}:00</option>)}
                </select>
                <span className="small" style={{ opacity: 0.7 }}>（日本時間）</span>
              </div>
              {weekday !== 1 && (
                <div className="small" style={{ marginTop: 6, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "6px 10px", lineHeight: 1.7 }}>
                  集計対象は「先週の月曜〜日曜」で固定です。{WEEKDAYS[weekday]}曜日に受け取る場合、
                  直近の{weekday === 0 ? "日" : WEEKDAYS[weekday]}曜日までの実績は次回分に含まれます。
                </div>
              )}
              {lastSent.at && (
                <div className="small" style={{ opacity: 0.6, marginTop: 6 }}>
                  最終送信: {String(lastSent.at).slice(0, 16).replace("T", " ")}（対象 {lastSent.period}）
                </div>
              )}

              <div style={{ height: 16 }} />
              <div className="h2">宛先</div>
              <div className="small" style={{ opacity: 0.68, marginBottom: 6 }}>
                1行に1つ、または カンマ区切りで入力してください（最大20件）。
              </div>
              <textarea
                className="input"
                style={{ minHeight: 90, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }}
                value={recipientsText}
                onChange={(e) => setRecipientsText(e.target.value)}
                placeholder={"tanaka@example.com\nsuzuki@example.com"}
              />
              <div className="small" style={{ opacity: 0.6, marginTop: 4 }}>
                現在 {recipients.length} 件
              </div>

              <div style={{ height: 16 }} />
              <label className="badge" style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={withAi} onChange={(e) => setWithAi(e.target.checked)} />
                {" "}AIによる「今週のポイント」を入れる
              </label>
              <div className="small" style={{ opacity: 0.68, marginTop: 6, lineHeight: 1.8 }}>
                集計結果をもとにAIが要約を書きます。内容は自動で品質チェックされ、
                事実と異なる数値や断定的な表現が含まれる場合は作り直します。
                それでも通らなかった場合は、コメントを省いてレポートだけをお送りします。
              </div>

              <div style={{ height: 18 }} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button className="btn btn--primary" onClick={save} disabled={saving}>
                  {saving ? "保存中…" : "設定を保存"}
                </button>
                <button className="btn" onClick={preview} disabled={previewing}>
                  {previewing ? "生成中…" : "プレビュー"}
                </button>
              </div>

              <div style={{ height: 16 }} />
              <div className="h2">テスト送信</div>
              <div className="small" style={{ opacity: 0.68, marginBottom: 6 }}>
                実際のメールで見え方を確認できます（最大3件・件名に [テスト] が付きます）。
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  className="input"
                  style={{ flex: 1, minWidth: 220 }}
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="自分のメールアドレス"
                />
                <button className="btn" onClick={sendTest} disabled={sending}>
                  {sending ? "送信中…" : "テスト送信"}
                </button>
              </div>

              {msg && (
                <div className="small" style={{ marginTop: 14, padding: "8px 12px", borderRadius: 8, background: msg.ok ? "#f0fdf4" : "#fef2f2", color: msg.ok ? "#15803d" : "#b91c1c", lineHeight: 1.7 }}>
                  {msg.text}
                </div>
              )}

              {previewHtml && (
                <div style={{ marginTop: 18 }}>
                  <div className="h2" style={{ marginBottom: 8 }}>プレビュー</div>
                  <iframe
                    title="weekly-report-preview"
                    sandbox=""
                    srcDoc={previewHtml}
                    style={{ width: "100%", height: 560, border: "1px solid rgba(15,23,42,.12)", borderRadius: 10, background: "#f3f7fb" }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
