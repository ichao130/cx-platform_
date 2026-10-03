// functions/src/services/pvAggregates.ts
//
// pageviewログを元にした集計をサーバー側で行う。
//
// 背景:
// 画面はこれまで logs を直接ブラウザに読み込んで集計していたが、
// Firestoreクライアントの limit は1クエリ10,000件が上限で、
// ページネーションしても American Needle は14日で60,733件・30日で98,118件あり、
// 全件読むと24〜39秒／47〜77MB かかって実用にならない。
// サーバー側（Firestoreに近い）で集計し、結果だけを返す。

export type PvAggregates = {
  period: { from: string; to: string };
  totals: { pv: number; sessions: number; visitors: number; bounceRate: number };
  pages: Array<{ path: string; pv: number; exits: number; exitRate: number }>;
  sources: Array<{ name: string; sessions: number; pv: number }>;
  regions: Array<{ region: string; pv: number }>;
  campaigns: Array<{ campaign: string; sessions: number }>;
  scanned: number;
};

/** 流入元の判定（画面側と同じ優先順位: utm_source → 参照元ドメイン → アプリ内 → 直接流入） */
function resolveSource(utmSource?: string, ref?: string, app?: string): string {
  const u = String(utmSource || "").trim();
  if (u) return u;
  const r = String(ref || "").trim();
  if (r) {
    try { return new URL(r).hostname || r; } catch { return r; }
  }
  if (app) return `${app}(アプリ内)`;
  return "直接流入";
}

export async function buildPvAggregates(
  db: FirebaseFirestore.Firestore,
  siteId: string,
  fromIso: string,
  toIso: string,
  opts?: { excludePrefixes?: string[] }
): Promise<PvAggregates> {
  const excludes = (opts?.excludePrefixes || []).filter(Boolean);
  const isExcluded = (p: string) => excludes.some((pre) => p.startsWith(pre));

  // セッション単位の情報を貯める（直帰率・離脱ページの判定に必要）
  type Sess = { pages: string[]; source: string; campaign: string };
  const sessions = new Map<string, Sess>();
  const vids = new Set<string>();
  const pageView = new Map<string, number>();
  const regionPv = new Map<string, number>();
  let pv = 0;
  let scanned = 0;

  // Admin SDK は limit 10,000 の制約を受けないが、メモリを守るため
  // ページングしながら逐次集計する（生ログは保持しない）
  const PAGE = 20000;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    let q = db.collection("logs")
      .where("site_id", "==", siteId)
      .where("event", "==", "pageview")
      .where("createdAt", ">", fromIso)
      .where("createdAt", "<=", toIso)
      .orderBy("createdAt", "asc");          // セッション内の順序を保つため昇順
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.limit(PAGE).get();
    if (snap.empty) break;
    scanned += snap.size;

    for (const d of snap.docs) {
      const x = d.data() as any;
      const path = String(x.path || "");
      if (path && isExcluded(path)) continue;

      pv++;
      if (x.vid) vids.add(String(x.vid));
      if (path) pageView.set(path, (pageView.get(path) || 0) + 1);
      regionPv.set(String(x.geo_region || "(不明)"), (regionPv.get(String(x.geo_region || "(不明)")) || 0) + 1);

      const sid = String(x.sid || x.vid || "");
      if (sid) {
        let s = sessions.get(sid);
        if (!s) {
          s = {
            pages: [],
            source: resolveSource(x.utm_source, x.ref, x.referrer_app),
            campaign: String(x.utm_campaign || ""),
          };
          sessions.set(sid, s);
        }
        // 連続した同一パスは1つにまとめる（リロードを別ページ遷移に数えない）
        if (path && s.pages[s.pages.length - 1] !== path) s.pages.push(path);
      }
    }

    if (snap.size < PAGE) break;
    cursor = snap.docs[snap.docs.length - 1];
  }

  // 直帰（1ページで終わったセッション）と離脱ページ
  let bounces = 0;
  const exits = new Map<string, number>();
  const sourceSessions = new Map<string, number>();
  const sourcePv = new Map<string, number>();
  const campaignSessions = new Map<string, number>();
  sessions.forEach((s) => {
    if (s.pages.length <= 1) bounces++;
    const last = s.pages[s.pages.length - 1];
    if (last) exits.set(last, (exits.get(last) || 0) + 1);
    sourceSessions.set(s.source, (sourceSessions.get(s.source) || 0) + 1);
    sourcePv.set(s.source, (sourcePv.get(s.source) || 0) + s.pages.length);
    if (s.campaign) campaignSessions.set(s.campaign, (campaignSessions.get(s.campaign) || 0) + 1);
  });

  const pages = [...pageView.entries()]
    .map(([path, n]) => {
      const ex = exits.get(path) || 0;
      return { path, pv: n, exits: ex, exitRate: n ? Math.round((ex / n) * 1000) / 10 : 0 };
    })
    .sort((a, b) => b.pv - a.pv)
    .slice(0, 50);

  return {
    period: { from: fromIso, to: toIso },
    totals: {
      pv,
      sessions: sessions.size,
      visitors: vids.size,
      bounceRate: sessions.size ? Math.round((bounces / sessions.size) * 1000) / 10 : 0,
    },
    pages,
    sources: [...sourceSessions.entries()]
      .map(([name, s]) => ({ name, sessions: s, pv: sourcePv.get(name) || 0 }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 30),
    regions: [...regionPv.entries()]
      .map(([region, n]) => ({ region, pv: n }))
      .sort((a, b) => b.pv - a.pv)
      .slice(0, 50),
    campaigns: [...campaignSessions.entries()]
      .map(([campaign, s]) => ({ campaign, sessions: s }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 30),
    scanned,
  };
}

/* ============================================================
   日次ロールアップ
   ------------------------------------------------------------
   毎回ログを走査すると American Needle で30日37秒かかり実用にならない。
   1日分だけを集計して pv_daily/{siteId}__{day} に保存し、
   画面は日次ドキュメントを読んで合算する（30日なら30件の読み取りで済む）。
   ============================================================ */

export type PvDailyDoc = {
  siteId: string;
  day: string;                  // JST
  pv: number;
  sessions: number;
  visitors: number;
  bounces: number;              // 1ページで終わったセッション数
  pages: Record<string, { pv: number; exits: number }>;
  sources: Record<string, { sessions: number; pv: number }>;
  regions: Record<string, number>;
  campaigns: Record<string, number>;
  updatedAt: FirebaseFirestore.FieldValue | string;
};

/** JSTの暦日 → UTCのISO範囲 */
function jstDayRange(day: string): { from: string; to: string } {
  return {
    from: new Date(`${day}T00:00:00+09:00`).toISOString(),
    to: new Date(`${day}T23:59:59.999+09:00`).toISOString(),
  };
}

/**
 * 指定日(JST)のpageviewを集計して pv_daily に保存する。
 * セッションが日をまたぐ場合、その日の分だけで直帰を判定するため
 * 深夜跨ぎのセッションは直帰寄りに出る（日次集計の原理的な限界。
 * 月次で見ても日ごとの合算になる点に注意）。
 */
export async function rollupPvDaily(
  db: FirebaseFirestore.Firestore,
  siteId: string,
  day: string
): Promise<PvDailyDoc> {
  const { from, to } = jstDayRange(day);
  const agg = await buildPvAggregates(db, siteId, from, to);

  // buildPvAggregates は上位N件に絞るため、保存用に素のマップを作り直す
  const pages: PvDailyDoc["pages"] = {};
  for (const p of agg.pages) pages[p.path] = { pv: p.pv, exits: p.exits };
  const sources: PvDailyDoc["sources"] = {};
  for (const s of agg.sources) sources[s.name] = { sessions: s.sessions, pv: s.pv };
  const regions: PvDailyDoc["regions"] = {};
  for (const r of agg.regions) regions[r.region] = r.pv;
  const campaigns: PvDailyDoc["campaigns"] = {};
  for (const c of agg.campaigns) campaigns[c.campaign] = c.sessions;

  const bounces = Math.round((agg.totals.bounceRate / 100) * agg.totals.sessions);

  const doc: PvDailyDoc = {
    siteId, day,
    pv: agg.totals.pv,
    sessions: agg.totals.sessions,
    visitors: agg.totals.visitors,
    bounces,
    pages, sources, regions, campaigns,
    updatedAt: new Date().toISOString(),
  };
  await db.collection("pv_daily").doc(`${siteId}__${day}`).set(doc, { merge: false });
  return doc;
}

/** 保存済みの日次集計を読んで期間合計にする（画面はこれを使う） */
export async function readPvAggregatesFromDaily(
  db: FirebaseFirestore.Firestore,
  siteId: string,
  dayFrom: string,
  dayTo: string
): Promise<PvAggregates & { days: number; missingDays: string[] }> {
  const snap = await db.collection("pv_daily")
    .where("siteId", "==", siteId)
    .where("day", ">=", dayFrom).where("day", "<=", dayTo)
    .get();

  const found = new Set<string>();
  let pv = 0, sessions = 0, visitors = 0, bounces = 0;
  const pages = new Map<string, { pv: number; exits: number }>();
  const sources = new Map<string, { sessions: number; pv: number }>();
  const regions = new Map<string, number>();
  const campaigns = new Map<string, number>();

  snap.forEach((d) => {
    const x = d.data() as PvDailyDoc;
    found.add(x.day);
    pv += x.pv || 0;
    sessions += x.sessions || 0;
    visitors += x.visitors || 0;   // ※日ごとのユニークの合算（期間ユニークではない）
    bounces += x.bounces || 0;
    for (const [k, v] of Object.entries(x.pages || {})) {
      const cur = pages.get(k) || { pv: 0, exits: 0 };
      cur.pv += v.pv; cur.exits += v.exits; pages.set(k, cur);
    }
    for (const [k, v] of Object.entries(x.sources || {})) {
      const cur = sources.get(k) || { sessions: 0, pv: 0 };
      cur.sessions += v.sessions; cur.pv += v.pv; sources.set(k, cur);
    }
    for (const [k, v] of Object.entries(x.regions || {})) regions.set(k, (regions.get(k) || 0) + v);
    for (const [k, v] of Object.entries(x.campaigns || {})) campaigns.set(k, (campaigns.get(k) || 0) + v);
  });

  // 未集計の日を洗い出す（画面で「一部未集計」と出せるように）
  const missingDays: string[] = [];
  for (let d = dayFrom; d <= dayTo; ) {
    if (!found.has(d)) missingDays.push(d);
    const nx = new Date(`${d}T00:00:00+09:00`);
    nx.setUTCDate(nx.getUTCDate() + 1);
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(nx);
    const g = (t: string) => p.find((x) => x.type === t)!.value;
    d = `${g("year")}-${g("month")}-${g("day")}`;
  }

  return {
    period: { from: dayFrom, to: dayTo },
    totals: { pv, sessions, visitors, bounceRate: sessions ? Math.round((bounces / sessions) * 1000) / 10 : 0 },
    pages: [...pages.entries()].map(([path, v]) => ({ path, pv: v.pv, exits: v.exits, exitRate: v.pv ? Math.round((v.exits / v.pv) * 1000) / 10 : 0 })).sort((a, b) => b.pv - a.pv).slice(0, 50),
    sources: [...sources.entries()].map(([name, v]) => ({ name, sessions: v.sessions, pv: v.pv })).sort((a, b) => b.sessions - a.sessions).slice(0, 30),
    regions: [...regions.entries()].map(([region, n]) => ({ region, pv: n })).sort((a, b) => b.pv - a.pv).slice(0, 50),
    campaigns: [...campaigns.entries()].map(([campaign, s]) => ({ campaign, sessions: s })).sort((a, b) => b.sessions - a.sessions).slice(0, 30),
    scanned: 0,
    days: found.size,
    missingDays,
  };
}
