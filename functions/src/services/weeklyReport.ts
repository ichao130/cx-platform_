// functions/src/services/weeklyReport.ts
//
// 週次レポートのデータ組み立てとHTML生成。
//
// 設計方針:
// - 数値はすべてここ（コード）で計算する。将来AIコメントを足す場合も、
//   AIには「文章化」だけをさせ、計算はさせない（AIは平気で数値を間違えるため）。
// - 対象は「直近の確定した1週間（月〜日・JST）」。集計途中の当日は絶対に含めない。
//   当日を混ぜると必ず少なく出て、誤った警告を出してしまう。
// - UV/セッションはレガシー(arrayUnion)を優先する。分散カウンタは実測で
//   systematically 過少（CLAUDE.md参照）。画面と同じ基準に揃える。

import { FieldValue } from "firebase-admin/firestore";

export type WeeklyMetrics = {
  pv: number;
  uv: number;
  sessions: number;
  impressions: number;
  clicks: number;
  conversions: number;
  purchases: number;
  revenue: number;
  newVisitorRevenue: number;
  repeatVisitorRevenue: number;
  unknownVisitorRevenue: number;
};

export type ScenarioRow = {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
};

export type WeeklyReportData = {
  siteId: string;
  siteName: string;
  period: { from: string; to: string };      // "YYYY-MM-DD"（JST・月〜日）
  prevPeriod: { from: string; to: string };
  current: WeeklyMetrics;
  previous: WeeklyMetrics;
  scenarios: ScenarioRow[];                   // 売上/CVの多い順
  sources: Array<{ name: string; sessions: number; revenue: number }>;
  dailyPv: Array<{ day: string; label: string; pv: number }>;
};

/* ========================= 日付ユーティリティ（JST基準） ========================= */

export function jstDay(d: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}`;
}

/** "YYYY-MM-DD" に日数を足す（JSTの暦日として扱う） */
function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00+09:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return jstDay(d);
}

/** JSTの曜日（0=日,1=月…6=土） */
function jstWeekday(day: string): number {
  return new Date(`${day}T12:00:00+09:00`).getUTCDay();
}

/**
 * 直近の「確定した1週間（月〜日）」を返す。
 * 例: 水曜に実行 → 先週の月〜日。月曜に実行 → 前日までの月〜日（＝先週）。
 * 当日を含む週は集計途中なので対象にしない。
 */
export function lastCompleteWeek(now: Date = new Date()): { from: string; to: string } {
  const today = jstDay(now);
  const wd = jstWeekday(today);             // 0=日..6=土
  const daysSinceMonday = (wd + 6) % 7;     // 月曜からの経過日数
  const thisMonday = addDays(today, -daysSinceMonday);
  const to = addDays(thisMonday, -1);       // 先週の日曜
  const from = addDays(to, -6);             // 先週の月曜
  return { from, to };
}

/** JSTの暦日レンジをUTCのISO範囲に変換（logsの createdAt 比較用） */
function jstRangeToIso(from: string, to: string): { startIso: string; endIso: string } {
  const startIso = new Date(`${from}T00:00:00+09:00`).toISOString();
  const endIso = new Date(`${to}T23:59:59.999+09:00`).toISOString();
  return { startIso, endIso };
}

const MD = (day: string) => `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;

/* ========================= データ組み立て ========================= */

function emptyMetrics(): WeeklyMetrics {
  return {
    pv: 0, uv: 0, sessions: 0, impressions: 0, clicks: 0,
    conversions: 0, purchases: 0, revenue: 0,
    newVisitorRevenue: 0, repeatVisitorRevenue: 0, unknownVisitorRevenue: 0,
  };
}

/** stats_daily から指標を集計する（UV/セッションはレガシー優先） */
async function collectStats(db: FirebaseFirestore.Firestore, siteId: string, from: string, to: string) {
  const snap = await db.collection("stats_daily")
    .where("siteId", "==", siteId)
    .where("day", ">=", from).where("day", "<=", to)
    .get();

  const m = emptyMetrics();
  // UV/セッションは「日ごとのユニーク」を合算する（週ユニークではない点に注意）
  const uvByDay = new Map<string, { legacy: number | null; counter: number }>();
  const ssByDay = new Map<string, { legacy: number | null; counter: number }>();
  const pvByDay = new Map<string, number>();
  const scenarioAgg = new Map<string, { impressions: number; clicks: number; conversions: number }>();

  snap.forEach((d) => {
    const x = d.data() as any;
    const ev = String(x.event || "");
    const c = Number(x.count || 0);
    const day = String(x.day || "");
    const scn = x.scenarioId ? String(x.scenarioId) : null;

    if (ev === "pageview") { m.pv += c; pvByDay.set(day, (pvByDay.get(day) || 0) + c); }
    else if (ev === "impression") m.impressions += c;
    else if (ev === "click" || ev === "click_link") m.clicks += c;
    else if (ev === "conversion") m.conversions += c;
    else if (ev === "uv") {
      const e = uvByDay.get(day) || { legacy: null, counter: 0 };
      if (Array.isArray(x.vids)) e.legacy = x.vids.length; else e.counter += c;
      uvByDay.set(day, e);
    } else if (ev === "session") {
      const e = ssByDay.get(day) || { legacy: null, counter: 0 };
      if (Array.isArray(x.sids)) e.legacy = x.sids.length; else e.counter += c;
      ssByDay.set(day, e);
    }

    // シナリオ別（表示/クリック/CV）
    if (scn && (ev === "impression" || ev === "click" || ev === "click_link" || ev === "conversion")) {
      const a = scenarioAgg.get(scn) || { impressions: 0, clicks: 0, conversions: 0 };
      if (ev === "impression") a.impressions += c;
      else if (ev === "conversion") a.conversions += c;
      else a.clicks += c;
      scenarioAgg.set(scn, a);
    }
  });

  uvByDay.forEach((e) => { m.uv += e.legacy != null ? e.legacy : e.counter; });
  ssByDay.forEach((e) => { m.sessions += e.legacy != null ? e.legacy : e.counter; });

  return { metrics: m, pvByDay, scenarioAgg };
}

/** 購入ログから売上・新規/リピート内訳を集計 */
async function collectPurchases(
  db: FirebaseFirestore.Firestore, siteId: string, from: string, to: string
) {
  const { startIso, endIso } = jstRangeToIso(from, to);

  const pSnap = await db.collection("logs")
    .where("site_id", "==", siteId).where("event", "==", "purchase")
    .where("createdAt", ">=", startIso).where("createdAt", "<=", endIso)
    .get();

  const seen = new Set<string>();
  const purchases: Array<{ vid: string | null; rev: number; scenarioId: string | null }> = [];
  pSnap.forEach((d) => {
    const x = d.data() as any;
    const oid = x.order_id ? String(x.order_id) : "";
    if (oid) { if (seen.has(oid)) return; seen.add(oid); }
    purchases.push({
      vid: x.vid || null,
      rev: typeof x.revenue === "number" ? x.revenue : 0,
      scenarioId: x.scenario_id || null,
    });
  });

  // 購入者の新規/リピート判定（pageviewのis_newを引く。journeyの件数上限に依存しない）
  const vids = [...new Set(purchases.map((p) => p.vid).filter(Boolean))] as string[];
  const isNewByVid = new Map<string, boolean>();
  const earliest = new Map<string, string>();
  const chunks: string[][] = [];
  for (let i = 0; i < vids.length; i += 10) chunks.push(vids.slice(i, i + 10));
  const runChunk = async (chunk: string[]) => {
    const s = await db.collection("logs")
      .where("site_id", "==", siteId).where("event", "==", "pageview")
      .where("vid", "in", chunk).get();
    s.forEach((d) => {
      const x = d.data() as any;
      if (!x.vid || typeof x.is_new !== "boolean") return;
      const at = String(x.createdAt || "");
      if (!at || at < startIso || at > endIso) return;
      const cur = earliest.get(x.vid);
      if (!cur || at < cur) { earliest.set(x.vid, at); isNewByVid.set(x.vid, x.is_new); }
    });
  };
  for (let i = 0; i < chunks.length; i += 12) {
    await Promise.all(chunks.slice(i, i + 12).map(runChunk));
  }

  let revenue = 0, nRev = 0, rRev = 0, uRev = 0;
  const revByScenario = new Map<string, number>();
  for (const p of purchases) {
    revenue += p.rev;
    const isNew = p.vid ? isNewByVid.get(p.vid) : undefined;
    if (isNew === true) nRev += p.rev;
    else if (isNew === false) rRev += p.rev;
    else uRev += p.rev;
    if (p.scenarioId) revByScenario.set(p.scenarioId, (revByScenario.get(p.scenarioId) || 0) + p.rev);
  }

  return {
    purchases: purchases.length,
    revenue,
    newVisitorRevenue: nRev,
    repeatVisitorRevenue: rRev,
    unknownVisitorRevenue: uRev,
    revByScenario,
  };
}

/** 流入元（utm_source優先、無ければ参照元ドメイン） */
async function collectSources(db: FirebaseFirestore.Firestore, siteId: string, from: string, to: string) {
  const { startIso, endIso } = jstRangeToIso(from, to);
  const snap = await db.collection("logs")
    .where("site_id", "==", siteId).where("event", "==", "pageview")
    .where("createdAt", ">=", startIso).where("createdAt", "<=", endIso)
    .get();

  const sidBySource = new Map<string, Set<string>>();
  snap.forEach((d) => {
    const x = d.data() as any;
    let src = String(x.utm_source || "").trim();
    if (!src) {
      const ref = String(x.ref || "").trim();
      if (ref) { try { src = new URL(ref).hostname; } catch { src = ref; } }
    }
    if (!src) src = x.referrer_app ? `${x.referrer_app}(アプリ内)` : "直接流入";
    if (!sidBySource.has(src)) sidBySource.set(src, new Set());
    if (x.sid) sidBySource.get(src)!.add(x.sid);
  });

  return [...sidBySource.entries()]
    .map(([name, sids]) => ({ name, sessions: sids.size, revenue: 0 }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);
}

export async function buildWeeklyReportData(
  db: FirebaseFirestore.Firestore,
  siteId: string,
  week?: { from: string; to: string }
): Promise<WeeklyReportData> {
  const period = week || lastCompleteWeek();
  const prevPeriod = { from: addDays(period.from, -7), to: addDays(period.to, -7) };

  const siteSnap = await db.collection("sites").doc(siteId).get();
  const siteName = String((siteSnap.data() as any)?.name || siteId);

  const [curStats, prevStats, curBuy, prevBuy, sources, scenarioDocs] = await Promise.all([
    collectStats(db, siteId, period.from, period.to),
    collectStats(db, siteId, prevPeriod.from, prevPeriod.to),
    collectPurchases(db, siteId, period.from, period.to),
    collectPurchases(db, siteId, prevPeriod.from, prevPeriod.to),
    collectSources(db, siteId, period.from, period.to),
    db.collection("scenarios").where("siteId", "==", siteId).get(),
  ]);

  const nameById = new Map<string, string>();
  scenarioDocs.forEach((d) => nameById.set(d.id, String((d.data() as any)?.name || d.id)));

  const current: WeeklyMetrics = {
    ...curStats.metrics,
    purchases: curBuy.purchases,
    revenue: curBuy.revenue,
    newVisitorRevenue: curBuy.newVisitorRevenue,
    repeatVisitorRevenue: curBuy.repeatVisitorRevenue,
    unknownVisitorRevenue: curBuy.unknownVisitorRevenue,
  };
  const previous: WeeklyMetrics = {
    ...prevStats.metrics,
    purchases: prevBuy.purchases,
    revenue: prevBuy.revenue,
    newVisitorRevenue: prevBuy.newVisitorRevenue,
    repeatVisitorRevenue: prevBuy.repeatVisitorRevenue,
    unknownVisitorRevenue: prevBuy.unknownVisitorRevenue,
  };

  const scenarios: ScenarioRow[] = [...curStats.scenarioAgg.entries()]
    .map(([id, a]) => ({
      id,
      name: nameById.get(id) || id,
      impressions: a.impressions,
      clicks: a.clicks,
      conversions: a.conversions,
      revenue: Math.round(curBuy.revByScenario.get(id) || 0),
    }))
    .filter((r) => r.impressions > 0)
    .sort((a, b) => b.revenue - a.revenue || b.conversions - a.conversions || b.impressions - a.impressions)
    .slice(0, 5);

  const dailyPv: WeeklyReportData["dailyPv"] = [];
  for (let d = period.from; d <= period.to; d = addDays(d, 1)) {
    dailyPv.push({ day: d, label: MD(d), pv: curStats.pvByDay.get(d) || 0 });
  }

  return { siteId, siteName, period, prevPeriod, current, previous, scenarios, sources, dailyPv };
}

/* ========================= HTML生成 ========================= */

/**
 * ブランドトークン。admin/src/styles/global.scss の :root と、
 * ロゴ(public/logo_mokkeda_v1.svg)のカラーに合わせている。
 * 管理画面とレポートで世界観がズレないよう、ここだけで色を管理する。
 */
const BRAND = {
  teal: "#1f7a8c",        // --brand
  teal2: "#59b7c6",       // --brand-2（グラデーション用）
  mark: "#49b1b8",        // ロゴのドット
  ink: "#172b3f",         // --text
  inkSoft: "#5c6f82",     // --muted
  bg: "#f3f7fb",          // --bg
  panel: "#ffffff",       // --panel
  panel2: "#f8fafd",      // --panel2
  border: "#e4ecf4",      // --border 相当（メールでは不透明色にする）
  success: "#1a8c54",     // --success
  danger: "#d0352e",      // --danger
  warning: "#e09622",     // --warning
};

/** メールで確実に表示されるロゴ（SVGはGmail/Outlookが表示できないためPNG） */
const LOGO_URL = "https://app.mokkeda.com/logo_mokkeda_email.png";

const yen = (n: number) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
const num = (n: number) => Math.round(n || 0).toLocaleString("ja-JP");
const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 前週比。前週0なら「新規」扱いで矢印を出さない（%が無限大になるため） */
function delta(cur: number, prev: number): { text: string; color: string } {
  if (!prev) return { text: cur ? "—" : "—", color: "#9ca3af" };
  const diff = cur - prev;
  if (diff === 0) return { text: "±0%", color: "#9ca3af" };
  const pct = Math.round((diff / prev) * 1000) / 10;
  return {
    text: `${diff > 0 ? "▲" : "▼"} ${Math.abs(pct)}%`,
    color: diff > 0 ? "#15803d" : "#b91c1c",
  };
}

function metricCell(label: string, value: string, cur: number, prev: number): string {
  const d = delta(cur, prev);
  return `
    <td style="padding:14px 10px;vertical-align:top;">
      <div style="font-size:11px;color:${BRAND.inkSoft};margin-bottom:5px;letter-spacing:.02em;">${esc(label)}</div>
      <div style="font-size:21px;font-weight:700;color:${BRAND.ink};line-height:1.2;">${esc(value)}</div>
      <div style="font-size:11px;color:${d.color};margin-top:4px;">${esc(d.text)}</div>
    </td>`;
}

/** 日別PVの簡易バー（画像を使わずテーブルで描く＝メールクライアント互換） */
function pvBars(rows: WeeklyReportData["dailyPv"]): string {
  const max = Math.max(1, ...rows.map((r) => r.pv));
  const cells = rows.map((r) => {
    const h = Math.max(3, Math.round((r.pv / max) * 62));
    return `
      <td style="vertical-align:bottom;text-align:center;padding:0 3px;">
        <div style="font-size:10px;color:${BRAND.inkSoft};margin-bottom:4px;">${num(r.pv)}</div>
        <div style="background:${BRAND.teal};height:${h}px;border-radius:4px 4px 0 0;"></div>
        <div style="font-size:10px;color:#9fb0c0;margin-top:5px;">${esc(r.label)}</div>
      </td>`;
  }).join("");
  return `<table role="presentation" width="100%" style="border-collapse:collapse;"><tr>${cells}</tr></table>`;
}

/** セクション見出し（左にブランド色のバーを添える） */
function sectionTitle(text: string): string {
  return `
    <table role="presentation" style="border-collapse:collapse;margin-bottom:10px;"><tr>
      <td style="width:3px;background:${BRAND.mark};border-radius:2px;">&nbsp;</td>
      <td style="padding-left:8px;font-size:13px;font-weight:700;color:${BRAND.ink};">${esc(text)}</td>
    </tr></table>`;
}

export function renderWeeklyReportHtml(
  d: WeeklyReportData,
  opts?: { dashboardUrl?: string; logoUrl?: string; ai?: WeeklyAiComment | null }
): string {
  const logoSrc = opts?.logoUrl || LOGO_URL;
  const c = d.current, p = d.previous;
  const cvr = c.sessions ? Math.round((c.purchases / c.sessions) * 1000) / 10 : 0;
  const prevCvr = p.sessions ? Math.round((p.purchases / p.sessions) * 1000) / 10 : 0;
  const ctr = c.impressions ? Math.round((c.clicks / c.impressions) * 1000) / 10 : 0;
  const prevCtr = p.impressions ? Math.round((p.clicks / p.impressions) * 1000) / 10 : 0;

  const revTotal = c.newVisitorRevenue + c.repeatVisitorRevenue + c.unknownVisitorRevenue;
  const pctOf = (v: number) => (revTotal ? Math.round((v / revTotal) * 100) : 0);

  const scenarioRows = d.scenarios.length
    ? d.scenarios.map((s, i) => `
      <tr style="background:${i % 2 ? BRAND.panel2 : "#ffffff"};">
        <td style="padding:10px 10px;border-top:1px solid ${BRAND.border};font-size:13px;color:${BRAND.ink};">${esc(s.name)}</td>
        <td style="padding:10px 8px;border-top:1px solid ${BRAND.border};font-size:13px;text-align:right;color:${BRAND.inkSoft};">${num(s.impressions)}</td>
        <td style="padding:10px 8px;border-top:1px solid ${BRAND.border};font-size:13px;text-align:right;color:${BRAND.inkSoft};">${num(s.clicks)}</td>
        <td style="padding:10px 8px;border-top:1px solid ${BRAND.border};font-size:13px;text-align:right;color:${BRAND.inkSoft};">${num(s.conversions)}</td>
        <td style="padding:10px 10px;border-top:1px solid ${BRAND.border};font-size:13px;text-align:right;font-weight:700;color:${BRAND.ink};">${s.revenue ? yen(s.revenue) : "—"}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" style="padding:14px 10px;border-top:1px solid ${BRAND.border};font-size:13px;color:#9fb0c0;">この期間に配信された施策はありません</td></tr>`;

  const sourceRows = d.sources.length
    ? d.sources.map((s, i) => `
      <tr style="background:${i % 2 ? BRAND.panel2 : "#ffffff"};">
        <td style="padding:9px 10px;border-top:1px solid ${BRAND.border};font-size:13px;color:${BRAND.ink};">${esc(s.name)}</td>
        <td style="padding:9px 10px;border-top:1px solid ${BRAND.border};font-size:13px;text-align:right;color:${BRAND.inkSoft};">${num(s.sessions)} セッション</td>
      </tr>`).join("")
    : "";

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>週次レポート ${esc(d.siteName)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
<!-- プレビュー行（受信箱の一覧に出る要約。本文には表示しない） -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  ${esc(d.siteName)} の週次レポート（${esc(MD(d.period.from))}〜${esc(MD(d.period.to))}）売上 ${yen(c.revenue)} / 購入 ${num(c.purchases)}件
</div>
<table role="presentation" width="100%" style="border-collapse:collapse;background:${BRAND.bg};padding:26px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" style="width:600px;max-width:100%;border-collapse:collapse;background:${BRAND.panel};border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Hiragino Sans','Noto Sans JP',sans-serif;box-shadow:0 2px 10px rgba(20,44,68,.06);">

    <!-- ロゴ（白地に置く。ロゴは濃色文字のため）
         ★多くのメールクライアントは既定で画像をブロックするため、
           画像が出なくてもブランドが伝わるようテキストのフォールバックを併記する。
           alt属性にスタイルを当て、画像非表示時もロゴ風に見えるようにしている。 -->
    <tr><td style="padding:24px 24px 12px;" align="left">
      <img src="${logoSrc}" width="168" height="41" alt="MOKKEDA"
           style="display:block;width:168px;max-width:168px;height:auto;border:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Hiragino Sans',sans-serif;font-size:21px;font-weight:700;color:${BRAND.ink};letter-spacing:.04em;line-height:41px;" />
      <div style="font-size:10px;color:${BRAND.mark};letter-spacing:.18em;margin-top:5px;">MAKE CX THANKABLE</div>
    </td></tr>

    <!-- 見出し帯（ブランドグラデーション） -->
    <tr><td style="background:linear-gradient(90deg, ${BRAND.teal}, ${BRAND.teal2});background-color:${BRAND.teal};padding:18px 24px;">
      <div style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:.02em;">週次レポート</div>
      <div style="color:rgba(255,255,255,.88);font-size:13px;margin-top:5px;">
        ${esc(d.siteName)}
      </div>
      <div style="color:rgba(255,255,255,.72);font-size:12px;margin-top:2px;">
        ${esc(MD(d.period.from))} 〜 ${esc(MD(d.period.to))}
      </div>
    </td></tr>

    <!-- 主要指標 -->
    <tr><td style="padding:8px 14px 0;">
      <table role="presentation" width="100%" style="border-collapse:collapse;">
        <tr>
          ${metricCell("売上", yen(c.revenue), c.revenue, p.revenue)}
          ${metricCell("購入件数", num(c.purchases) + " 件", c.purchases, p.purchases)}
          ${metricCell("購入率", cvr + " %", cvr, prevCvr)}
        </tr>
        <tr>
          ${metricCell("セッション", num(c.sessions), c.sessions, p.sessions)}
          ${metricCell("ユニーク訪問者", num(c.uv), c.uv, p.uv)}
          ${metricCell("ページビュー", num(c.pv), c.pv, p.pv)}
        </tr>
      </table>
      <div style="font-size:11px;color:#9fb0c0;padding:2px 10px 14px;">
        前週（${esc(MD(d.prevPeriod.from))}〜${esc(MD(d.prevPeriod.to))}）との比較
      </div>
    </td></tr>

    <!-- AIコメント（取得できた場合のみ） -->
    ${opts?.ai ? `
    <tr><td style="padding:0 24px 20px;">
      <table role="presentation" width="100%" style="border-collapse:collapse;background:${BRAND.panel2};border-left:3px solid ${BRAND.mark};border-radius:0 12px 12px 0;">
        <tr><td style="padding:16px 18px;">
          <div style="font-size:11px;color:${BRAND.mark};font-weight:700;letter-spacing:.08em;margin-bottom:8px;">今週のポイント</div>
          <div style="font-size:15px;font-weight:700;color:${BRAND.ink};line-height:1.5;margin-bottom:8px;">${esc(opts.ai.headline)}</div>
          <div style="font-size:13px;color:${BRAND.inkSoft};line-height:1.9;">${esc(opts.ai.summary)}</div>
          ${opts.ai.observations?.length ? `
          <div style="margin-top:12px;">
            ${opts.ai.observations.map((o) => `
              <div style="font-size:13px;color:${BRAND.ink};line-height:1.8;padding-left:14px;text-indent:-14px;margin-bottom:4px;">
                <span style="color:${BRAND.mark};">●</span> ${esc(o)}
              </div>`).join("")}
          </div>` : ""}
          ${opts.ai.suggestions?.length ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid ${BRAND.border};">
            <div style="font-size:11px;color:${BRAND.inkSoft};font-weight:700;margin-bottom:6px;">確認してみるとよい点</div>
            ${opts.ai.suggestions.map((v) => `
              <div style="font-size:13px;color:${BRAND.inkSoft};line-height:1.8;padding-left:14px;text-indent:-14px;margin-bottom:4px;">
                <span style="color:${BRAND.inkSoft};">—</span> ${esc(v)}
              </div>`).join("")}
          </div>` : ""}
        </td></tr>
      </table>
    </td></tr>` : ""}

    <!-- 日別PV -->
    <tr><td style="padding:6px 24px 20px;">
      ${sectionTitle("日別ページビュー")}
      ${pvBars(d.dailyPv)}
    </td></tr>

    <!-- 接客の成果 -->
    <tr><td style="padding:0 24px 20px;">
      ${sectionTitle("接客の成果")}
      <table role="presentation" width="100%" style="border-collapse:collapse;background:${BRAND.panel2};border-radius:12px;">
        <tr>
          ${metricCell("表示回数", num(c.impressions), c.impressions, p.impressions)}
          ${metricCell("クリック", num(c.clicks), c.clicks, p.clicks)}
          ${metricCell("クリック率", ctr + " %", ctr, prevCtr)}
        </tr>
      </table>
    </td></tr>

    <!-- 施策別 -->
    <tr><td style="padding:0 24px 20px;">
      ${sectionTitle("施策別の成果（上位5件）")}
      <table role="presentation" width="100%" style="border-collapse:collapse;border-radius:12px;overflow:hidden;">
        <tr style="background:${BRAND.panel2};">
          <th align="left"  style="padding:8px 10px;font-size:11px;color:${BRAND.inkSoft};font-weight:600;">施策</th>
          <th align="right" style="padding:8px 8px;font-size:11px;color:${BRAND.inkSoft};font-weight:600;">表示</th>
          <th align="right" style="padding:8px 8px;font-size:11px;color:${BRAND.inkSoft};font-weight:600;">クリック</th>
          <th align="right" style="padding:8px 8px;font-size:11px;color:${BRAND.inkSoft};font-weight:600;">CV</th>
          <th align="right" style="padding:8px 10px;font-size:11px;color:${BRAND.inkSoft};font-weight:600;">売上</th>
        </tr>
        ${scenarioRows}
      </table>
    </td></tr>

    <!-- 新規/リピート -->
    <tr><td style="padding:0 24px 20px;">
      ${sectionTitle("新規 / リピートの売上")}
      <table role="presentation" width="100%" style="border-collapse:collapse;background:${BRAND.panel2};border-radius:12px;">
        <tr>
          <td style="padding:14px 12px;">
            <div style="font-size:11px;color:${BRAND.inkSoft};">新規</div>
            <div style="font-size:18px;font-weight:700;color:${BRAND.teal};">${yen(c.newVisitorRevenue)}</div>
            <div style="font-size:11px;color:#9fb0c0;">${pctOf(c.newVisitorRevenue)}%</div>
          </td>
          <td style="padding:14px 12px;">
            <div style="font-size:11px;color:${BRAND.inkSoft};">リピート</div>
            <div style="font-size:18px;font-weight:700;color:${BRAND.ink};">${yen(c.repeatVisitorRevenue)}</div>
            <div style="font-size:11px;color:#9fb0c0;">${pctOf(c.repeatVisitorRevenue)}%</div>
          </td>
          ${c.unknownVisitorRevenue > 0 ? `
          <td style="padding:14px 12px;">
            <div style="font-size:11px;color:${BRAND.inkSoft};">判定不明</div>
            <div style="font-size:18px;font-weight:700;color:${BRAND.warning};">${yen(c.unknownVisitorRevenue)}</div>
            <div style="font-size:11px;color:#9fb0c0;">${pctOf(c.unknownVisitorRevenue)}%</div>
          </td>` : ""}
        </tr>
      </table>
    </td></tr>

    <!-- 流入元 -->
    ${sourceRows ? `
    <tr><td style="padding:0 24px 20px;">
      ${sectionTitle("流入元（上位5件）")}
      <table role="presentation" width="100%" style="border-collapse:collapse;border-radius:12px;overflow:hidden;">${sourceRows}</table>
    </td></tr>` : ""}

    ${opts?.dashboardUrl ? `
    <tr><td style="padding:4px 24px 28px;" align="center">
      <a href="${esc(opts.dashboardUrl)}" style="display:inline-block;background:${BRAND.teal};color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:12px;font-size:14px;font-weight:700;">ダッシュボードで詳しく見る</a>
    </td></tr>` : ""}

    <tr><td style="background:${BRAND.panel2};padding:18px 24px;border-top:1px solid ${BRAND.border};">
      <div style="font-size:11px;color:#9fb0c0;line-height:1.8;">
        <span style="color:${BRAND.teal};font-weight:700;">MOKKEDA</span>　Make CX Thankable<br/>
        このレポートは自動送信されています。集計はすべて日本時間で、確定した1週間分のみを対象としています（集計途中の当日は含みません）。${opts?.ai ? "<br/>「今週のポイント」は集計結果をもとにAIが作成した要約です。施策の判断は数値とあわせてご確認ください。" : ""}
      </div>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

// FieldValue は将来の配信履歴記録で使う（未使用警告回避のため参照しておく）
export const _unusedFieldValue = FieldValue;

/* ========================= AIコメント ========================= */

/**
 * AIコメント生成。
 *
 * ★設計の前提（ここを緩めると信用を落とす）
 * - 計算はすべてコード側で済ませ、AIには「文章化」だけをさせる。
 *   AIに割り算をさせると平気で間違えるため、変化率も事実もこちらで用意する。
 * - 原因の断定と将来予測を禁止する。レポートはクライアントに届くものなので、
 *   「バナー変更が効きました」「来週も伸びるでしょう」のような言い切りは
 *   外れたときにツールの信用を直接削る。
 * - 母数が小さい指標には言及させない。週34クリックのような数字で
 *   「クリック率が悪化」と書かれると誤った意思決定を招く。
 */

export type WeeklyAiComment = {
  headline: string;        // 一行の見出し
  summary: string;         // 2〜3文の要約
  observations: string[];  // 気づき（事実ベース）
  suggestions: string[];   // 確認・検討の提案（指示ではない）
};

/** 母数が小さく、増減を語るべきでない指標を洗い出す */
function lowSampleNotes(d: WeeklyReportData): string[] {
  const notes: string[] = [];
  const c = d.current;
  if (c.purchases < 30) notes.push(`購入件数が${c.purchases}件と少ないため、購入率の増減は誤差の影響を受けやすい`);
  if (c.clicks < 100) notes.push(`クリックが${c.clicks}件と少ないため、クリック率の増減には言及しない`);
  if (c.conversions < 30) notes.push(`CVが${c.conversions}件と少ないため、CV関連の増減には言及しない`);
  if (c.impressions < 500) notes.push(`接客表示が${c.impressions}回と少ないため、施策の効果は論じない`);
  return notes;
}

/** 変化率（前週比）。前週0なら null（比較不能） */
function pctChange(cur: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

/** AIに渡す「事実」。数値はすべてここで確定させる */
export function buildAiFacts(d: WeeklyReportData) {
  const c = d.current, p = d.previous;
  const cvr = c.sessions ? Math.round((c.purchases / c.sessions) * 1000) / 10 : 0;
  const prevCvr = p.sessions ? Math.round((p.purchases / p.sessions) * 1000) / 10 : 0;
  const aov = c.purchases ? Math.round(c.revenue / c.purchases) : 0;
  const prevAov = p.purchases ? Math.round(p.revenue / p.purchases) : 0;

  const metric = (label: string, cur: number, prev: number, unit = "") => ({
    指標: label, 今週: cur, 前週: prev, 変化率パーセント: pctChange(cur, prev), 単位: unit,
  });

  return {
    サイト名: d.siteName,
    対象期間: `${d.period.from} 〜 ${d.period.to}`,
    比較対象: `${d.prevPeriod.from} 〜 ${d.prevPeriod.to}`,
    主要指標: [
      metric("売上", c.revenue, p.revenue, "円"),
      metric("購入件数", c.purchases, p.purchases, "件"),
      metric("平均購入単価", aov, prevAov, "円"),
      metric("購入率", cvr, prevCvr, "%"),
      metric("セッション", c.sessions, p.sessions, ""),
      metric("ユニーク訪問者", c.uv, p.uv, ""),
      metric("ページビュー", c.pv, p.pv, ""),
      metric("接客表示", c.impressions, p.impressions, "回"),
    ],
    売上の内訳: {
      新規訪問者: c.newVisitorRevenue,
      リピート訪問者: c.repeatVisitorRevenue,
      判定不明: c.unknownVisitorRevenue,
    },
    施策別: d.scenarios.map((s) => ({
      施策名: s.name, 表示: s.impressions, クリック: s.clicks, CV: s.conversions, 売上: s.revenue,
    })),
    流入元上位: d.sources.map((s) => ({ 流入元: s.name, セッション: s.sessions })),
    言及を避けるべき点: lowSampleNotes(d),
  };
}

/** AIコメントのシステムプロンプト（制約を明示する） */
export const AI_COMMENT_SYSTEM_PROMPT = [
  "あなたはECサイトのアクセス解析レポートを書くアナリストです。日本語で、落ち着いた敬体で書いてください。",
  "渡されたJSONの数値は確定値です。計算はすでに済んでいるので、自分で割り算や推計をしないでください。",
  "",
  "【厳守】",
  "1. 原因を断定しないこと。『〜が効きました』『〜が原因です』は禁止。",
  "   因果に触れる場合は『〜の可能性があります』『〜との関連を確認する価値があります』と留保をつける。",
  "2. 将来の予測をしないこと。『来週は伸びるでしょう』のような記述は禁止。",
  "3. 『言及を避けるべき点』に挙がった指標の増減には触れないこと。母数が小さく誤差が大きいため。",
  "4. 煽らないこと。『急務』『危機的』『至急』などの強い語は使わない。",
  "5. 数値は渡された値をそのまま書くこと。桁区切りのカンマのみ可。",
  "   『約21万4500円』のような万・千表記や丸めは禁止。『214,515円』と書く。",
  "   どの指標の数値かを必ず明示すること（売上の変化率と購入率の変化率を取り違えない）。",
  "",
  "【書き方】",
  "- headline: 今週の状況を一行で（25文字程度）。",
  "- summary: 2〜3文。良い点と気になる点の両方に触れる。",
  "- observations: 事実ベースの気づきを2〜3個。数値を伴わせる。",
  "- suggestions: 次に確認・検討するとよいことを1〜2個。指示ではなく提案として書く。",
].join("\n");

/**
 * 生成されたコメントを機械的に検証する。
 *
 * AIは指示を守らないことがある（実測で「売上25%減少」と書いたが、実際は売上-19%・
 * 購入率-25%の取り違えが発生した）。レポートはクライアントに届くため、
 * プロンプトの指示だけに頼らず、コード側で弾く。
 */
export function validateAiComment(ai: WeeklyAiComment, facts: ReturnType<typeof buildAiFacts>): string[] {
  const problems: string[] = [];
  const all = [ai.headline, ai.summary, ...(ai.observations || []), ...(ai.suggestions || [])].join(" ");

  // ① 事実に存在しない数値を書いていないか（丸めは許さない＝完全一致のみ）
  const known = new Set<string>();
  const addNum = (v: unknown) => {
    const n = Number(v);
    if (!isFinite(n)) return;
    known.add(String(n));
    known.add(Math.abs(n).toString());
    known.add(Math.round(Math.abs(n)).toString());
  };
  facts.主要指標.forEach((m: any) => { addNum(m.今週); addNum(m.前週); addNum(m.変化率パーセント); });
  Object.values(facts.売上の内訳).forEach(addNum);
  facts.施策別.forEach((s: any) => { addNum(s.表示); addNum(s.クリック); addNum(s.CV); addNum(s.売上); });
  facts.流入元上位.forEach((s: any) => addNum(s.セッション));

  const nums = (all.match(/[0-9][0-9,]*(?:\.[0-9]+)?/g) || [])
    .map((x) => x.replace(/,/g, "").replace(/\.$/, ""))
    .filter((x) => x.length > 1); // 1桁は日付や箇条書き番号の可能性があるので除外
  const invented = [...new Set(nums)].filter((n) => !known.has(n) && !known.has(String(Number(n))));
  if (invented.length) problems.push(`事実に無い数値: ${invented.join(", ")}`);

  // ② 万・千表記（丸めが混入する温床）
  if (/[0-9]\s*万|[0-9]\s*千/.test(all)) problems.push("万/千表記が使われている（丸め誤差の原因になる）");

  // ③ 煽り・断定・予測。「〜でしょうか」は丁寧表現なので除外する
  const banned = ["急務", "危機", "至急", "深刻", "間違いなく", "確実に", "必ず増加", "必ず減少"];
  const hitBanned = banned.filter((w) => all.includes(w));
  if (/でしょう(?!か)/.test(all)) hitBanned.push("〜でしょう（予測）");
  if (hitBanned.length) problems.push(`不適切な表現: ${hitBanned.join(", ")}`);

  // ④ 因果の断定
  const causal = ["が効い", "のおかげ", "が原因で", "により増加", "により減少", "のため増加", "のため減少"];
  const hitCausal = causal.filter((w) => all.includes(w));
  if (hitCausal.length) problems.push(`因果を断定: ${hitCausal.join(", ")}`);

  // ⑤ 母数が小さい指標への言及
  const low: string[] = [];
  const notes = facts.言及を避けるべき点.join("");
  if (notes.includes("クリック率") && /クリック率/.test(all)) low.push("クリック率");
  if (notes.includes("CV") && /(CV率|コンバージョン率)/.test(all)) low.push("CV率");
  if (low.length) problems.push(`母数が小さい指標に言及: ${low.join(", ")}`);

  return problems;
}

/**
 * AIコメントを生成する。検証に通らなければ作り直し、それでもダメなら null を返す。
 *
 * null でもレポート自体は送れる設計にしてある（AIは付加価値であって、
 * 数値レポートの本体ではない）。誤ったコメントを載せるより、無いほうがよい。
 */
export async function generateWeeklyAiComment(
  data: WeeklyReportData,
  callOpenAIJson: (p: any) => Promise<any>,
  z: any,
  maxAttempts = 3
): Promise<{ comment: WeeklyAiComment | null; attempts: number; lastProblems: string[] }> {
  const facts = buildAiFacts(data);
  const schema = z.object({
    headline: z.string(),
    summary: z.string(),
    observations: z.array(z.string()).min(2).max(3),
    suggestions: z.array(z.string()).min(1).max(2),
  });

  let lastProblems: string[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // 2回目以降は、前回の違反内容を伝えて直させる
      const systemPrompt = lastProblems.length
        ? `${AI_COMMENT_SYSTEM_PROMPT}\n\n【前回の出力には次の問題がありました。必ず修正してください】\n- ${lastProblems.join("\n- ")}`
        : AI_COMMENT_SYSTEM_PROMPT;

      const out = await callOpenAIJson({
        model: "gpt-4.1-mini",
        input: facts,
        systemPrompt,
        schema,
      });

      const problems = validateAiComment(out as WeeklyAiComment, facts);
      if (!problems.length) return { comment: out as WeeklyAiComment, attempts: attempt, lastProblems: [] };

      console.warn(`[weeklyReport] AIコメント検証NG (${attempt}/${maxAttempts}):`, problems.join(" / "));
      lastProblems = problems;
    } catch (e: any) {
      console.error(`[weeklyReport] AIコメント生成失敗 (${attempt}/${maxAttempts}):`, e?.message || e);
      lastProblems = [`生成エラー: ${e?.message || e}`];
    }
  }
  // 諦める。コメント無しでレポートを送る
  return { comment: null, attempts: maxAttempts, lastProblems };
}
