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
  opts?: { dashboardUrl?: string; logoUrl?: string }
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

    <!-- ロゴ（白地に置く。ロゴは濃色文字のため） -->
    <tr><td style="padding:24px 24px 14px;" align="left">
      <img src="${logoSrc}" width="168" alt="MOKKEDA" style="display:block;width:168px;max-width:168px;height:auto;border:0;" />
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
        このレポートは自動送信されています。集計はすべて日本時間で、確定した1週間分のみを対象としています（集計途中の当日は含みません）。
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
