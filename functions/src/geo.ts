/**
 * GeoIP（MaxMind GeoLite2-City + GeoLite2-ASN）でIP→地域・回線種別を解決する。
 * .mmdb は functions/geo/ に配置（無料DL: https://www.maxmind.com/en/geolite2/signup）。
 *   - GeoLite2-City.mmdb … 国/都道府県/市区町村/緯度経度
 *   - GeoLite2-ASN.mmdb  … 回線事業者(ISP/ASN)。モバイル/固定の推定に使う
 * ファイルが無い場合は null を返すだけで安全に動く。
 *
 * ⚠️ 日本のモバイル回線はキャリア拠点(多くが東京)に寄るため、都道府県は参考値。
 *    → conn(固定/モバイル)で「固定回線=WiFi」だけ信頼する運用が可能。
 */
import path from "path";
import type { CityResponse, AsnResponse, Reader } from "maxmind";

let cityReader: Reader<CityResponse> | null = null;
let asnReader: Reader<AsnResponse> | null = null;
let cityLoadAttempted = false;
let asnLoadAttempted = false;

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

async function getAsnReader(): Promise<Reader<AsnResponse> | null> {
  if (asnReader || asnLoadAttempted) return asnReader;
  asnLoadAttempted = true;
  try {
    const maxmind = (await import("maxmind")).default;
    asnReader = await maxmind.open<AsnResponse>(path.join(__dirname, "..", "geo", "GeoLite2-ASN.mmdb"));
    console.log("[geo] GeoLite2-ASN loaded");
  } catch (e) {
    asnReader = null;
    console.warn("[geo] GeoLite2-ASN.mmdb not available (conn判定なし)");
  }
  return asnReader;
}

export interface GeoResult {
  country: string | null; // ISOコード（例: JP）
  region: string | null;  // 都道府県（日本語優先）
  city: string | null;    // 市区町村（日本語優先）
  lat: number | null;     // 緯度（天気取得用・ログには保存しない）
  lng: number | null;     // 経度（同上）
  isp: string | null;     // 回線事業者名（AS organization）
  conn: "mobile" | "fixed" | "unknown" | null; // 回線種別の推定
}

// ISP名(AS org)から回線種別を推定。日本のキャリアを中心にキーワード判定。
// ※ KDDI/SoftBankは固定とモバイルでASNが混在するため "unknown" 寄り。
//   ドコモ/楽天モバイル等は比較的クリーンに mobile 判定できる。
function classifyConnection(org: string): "mobile" | "fixed" | "unknown" {
  const s = org.toLowerCase();
  // 明確にモバイル
  if (/docomo|rakuten mobile|uqmobile|uq communications|ntt docomo|povo|ahamo/.test(s)) return "mobile";
  // 明確に固定（主要な固定ブロードバンド/ISP）
  if (/ntt communications|ocn|ntt east|ntt west|flets|so-net|sony network|biglobe|nifty|k-opticom|optage|j:com|jcom|asahi net|internet initiative|iij|arteria|commufa|eo |@nifty|plala|hi-ho|interlink|usen|tokai|nuro|its communications/.test(s)) return "fixed";
  // KDDI / SoftBank は判別困難（au Hikari か au mobile か等）→ unknown
  return "unknown";
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

  const ar = await getAsnReader();
  if (ar) {
    try {
      const a = ar.get(ip);
      const org = a?.autonomous_system_organization || "";
      if (org) {
        result.isp = org;
        result.conn = classifyConnection(org);
      }
    } catch (e) { /* noop */ }
  }

  return result;
}
