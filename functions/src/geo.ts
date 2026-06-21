/**
 * GeoIP（MaxMind GeoLite2-City）でIP→地域を解決し、
 * 回線種別(固定/モバイル)を ASN範囲テーブル(asn-jp.json) で推定する。
 *   - GeoLite2-City.mmdb … 国/都道府県/市区町村/緯度経度（functions/geo/）
 *   - asn-jp.json … GeoLite2-ASN CSVから生成した日本キャリア/ISPのIP範囲表
 *                   （asn-build/build.js で生成。functions/geo/に配置）
 * ファイルが無い場合は null を返すだけで安全に動く。
 *
 * ⚠️ 日本のモバイルはキャリア拠点(東京)に寄るため都道府県は参考値。
 *    conn=fixed(固定回線/WiFi)に絞れば地域の信頼性が上がる。
 */
import fs from "fs";
import path from "path";
import type { CityResponse, Reader } from "maxmind";

let cityReader: Reader<CityResponse> | null = null;
let cityLoadAttempted = false;

async function getCityReader(): Promise<Reader<CityResponse> | null> {
  if (cityReader || cityLoadAttempted) return cityReader;
  cityLoadAttempted = true;
  try {
    const maxmind = (await import("maxmind")).default;
    cityReader = await maxmind.open<CityResponse>(path.join(__dirname, "..", "geo", "GeoLite2-City.mmdb"));
    console.log("[geo] GeoLite2-City loaded");
  } catch (e) {
    cityReader = null;
    console.warn("[geo] GeoLite2-City.mmdb not available (geo disabled)");
  }
  return cityReader;
}

// ── ASN範囲テーブル（固定/モバイル推定）──
type Conn = "mobile" | "fixed" | "unknown";
interface AsnTable {
  v4Start: number[]; v4End: number[]; v4Conn: Conn[]; v4Isp: string[];
  v6Start: bigint[]; v6End: bigint[]; v6Conn: Conn[]; v6Isp: string[];
}
let asnTable: AsnTable | null = null;
let asnLoadAttempted = false;

function loadAsnTable(): AsnTable | null {
  if (asnTable || asnLoadAttempted) return asnTable;
  asnLoadAttempted = true;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "geo", "asn-jp.json"), "utf8"));
    const t: AsnTable = { v4Start: [], v4End: [], v4Conn: [], v4Isp: [], v6Start: [], v6End: [], v6Conn: [], v6Isp: [] };
    for (const [s, e, c, isp] of raw.v4 as [number, number, Conn, string][]) { t.v4Start.push(s); t.v4End.push(e); t.v4Conn.push(c); t.v4Isp.push(isp); }
    for (const [s, e, c, isp] of raw.v6 as [string, string, Conn, string][]) { t.v6Start.push(BigInt(s)); t.v6End.push(BigInt(e)); t.v6Conn.push(c); t.v6Isp.push(isp); }
    asnTable = t;
    console.log(`[geo] asn-jp.json loaded (v4=${t.v4Start.length}, v6=${t.v6Start.length})`);
  } catch (e) {
    asnTable = null;
    console.warn("[geo] asn-jp.json not available (conn判定なし)");
  }
  return asnTable;
}

function ipv4ToInt(ip: string): number | null {
  const p = ip.split(".");
  if (p.length !== 4) return null;
  let n = 0;
  for (const x of p) { const v = Number(x); if (!(v >= 0 && v <= 255)) return null; n = n * 256 + v; }
  return n >>> 0;
}

function ipv6ToBigInt(ip: string): bigint | null {
  try {
    let s = ip;
    // v4-mapped (::ffff:1.2.3.4) は v4扱いにするので呼ばれない想定だが一応
    if (s.includes(".")) return null;
    let groups: number[];
    if (s.includes("::")) {
      const [l, r] = s.split("::");
      const lp = l ? l.split(":") : [];
      const rp = r ? r.split(":") : [];
      const fill = 8 - lp.length - rp.length;
      if (fill < 0) return null;
      groups = [...lp, ...Array(fill).fill("0"), ...rp].map((g) => parseInt(g || "0", 16));
    } else {
      groups = s.split(":").map((g) => parseInt(g, 16));
    }
    if (groups.length !== 8) return null;
    let n = 0n;
    for (const g of groups) { if (!(g >= 0 && g <= 0xffff)) return null; n = (n << 16n) + BigInt(g); }
    return n;
  } catch { return null; }
}

// 範囲表を二分探索（start<=ip<=end）
function lookupV4(t: AsnTable, ip: number): { conn: Conn; isp: string } | null {
  let lo = 0, hi = t.v4Start.length - 1, idx = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (t.v4Start[m] <= ip) { idx = m; lo = m + 1; } else hi = m - 1; }
  if (idx >= 0 && ip <= t.v4End[idx]) return { conn: t.v4Conn[idx], isp: t.v4Isp[idx] };
  return null;
}
function lookupV6(t: AsnTable, ip: bigint): { conn: Conn; isp: string } | null {
  let lo = 0, hi = t.v6Start.length - 1, idx = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (t.v6Start[m] <= ip) { idx = m; lo = m + 1; } else hi = m - 1; }
  if (idx >= 0 && ip <= t.v6End[idx]) return { conn: t.v6Conn[idx], isp: t.v6Isp[idx] };
  return null;
}

export interface GeoResult {
  country: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  isp: string | null;
  conn: Conn | null;
}

/** x-forwarded-for 等からクライアントIPを取り出す */
export function clientIpFrom(xff: string | undefined, fallback?: string): string {
  const first = String(xff || "").split(",")[0].trim();
  return first || String(fallback || "").trim();
}

/** IP→地域・回線種別を解決。失敗時は全フィールドnull。 */
export async function resolveGeo(ip: string): Promise<GeoResult> {
  const empty: GeoResult = { country: null, region: null, city: null, lat: null, lng: null, isp: null, conn: null };
  if (!ip) return empty;
  const result: GeoResult = { ...empty };

  const cr = await getCityReader();
  if (cr) {
    try {
      const res = cr.get(ip);
      if (res) {
        const sub = res.subdivisions && res.subdivisions[0];
        result.country = res.country?.iso_code || null;
        result.region = sub?.names?.ja || sub?.names?.en || null;
        result.city = res.city?.names?.ja || res.city?.names?.en || null;
        result.lat = typeof res.location?.latitude === "number" ? res.location.latitude : null;
        result.lng = typeof res.location?.longitude === "number" ? res.location.longitude : null;
      }
    } catch (e) { /* noop */ }
  }

  const t = loadAsnTable();
  if (t) {
    try {
      let hit: { conn: Conn; isp: string } | null = null;
      // v4-mapped を素のv4へ
      const v4mapped = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
      const plain = v4mapped ? v4mapped[1] : ip;
      if (plain.includes(":")) {
        const b = ipv6ToBigInt(plain);
        if (b != null) hit = lookupV6(t, b);
      } else {
        const n = ipv4ToInt(plain);
        if (n != null) hit = lookupV4(t, n);
      }
      if (hit) { result.isp = hit.isp; result.conn = hit.conn; }
    } catch (e) { /* noop */ }
  }

  return result;
}
