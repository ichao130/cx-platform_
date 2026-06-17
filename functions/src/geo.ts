/**
 * GeoIP（MaxMind GeoLite2-City）でIP→地域を解決する。
 * .mmdb は functions/geo/GeoLite2-City.mmdb に配置（無料DL: https://www.maxmind.com/en/geolite2/signup）。
 * ファイルが無い場合は null を返すだけで安全に動く。
 *
 * ⚠️ 日本のモバイル回線はキャリア拠点(多くが東京)に寄るため、都道府県は参考値。
 */
import path from "path";
import type { CityResponse, Reader } from "maxmind";

let reader: Reader<CityResponse> | null = null;
let loadAttempted = false;

async function getReader(): Promise<Reader<CityResponse> | null> {
  if (reader || loadAttempted) return reader;
  loadAttempted = true;
  try {
    // 動的importで、maxmindが無くてもビルド/起動を壊さない
    const maxmind = (await import("maxmind")).default;
    // __dirname は lib/ を指すので ../geo/ で functions/geo/ を参照
    const dbPath = path.join(__dirname, "..", "geo", "GeoLite2-City.mmdb");
    reader = await maxmind.open<CityResponse>(dbPath);
    console.log("[geo] GeoLite2-City loaded");
  } catch (e) {
    reader = null;
    console.warn("[geo] GeoLite2-City.mmdb not available (geo disabled)");
  }
  return reader;
}

export interface GeoResult {
  country: string | null; // ISOコード（例: JP）
  region: string | null;  // 都道府県（日本語優先）
  city: string | null;    // 市区町村（日本語優先）
}

/** x-forwarded-for 等からクライアントIPを取り出す */
export function clientIpFrom(xff: string | undefined, fallback?: string): string {
  const first = String(xff || "").split(",")[0].trim();
  return first || String(fallback || "").trim();
}

/** IP→地域を解決。失敗時は全フィールドnull。 */
export async function resolveGeo(ip: string): Promise<GeoResult> {
  const empty: GeoResult = { country: null, region: null, city: null };
  if (!ip) return empty;
  const r = await getReader();
  if (!r) return empty;
  try {
    const res = r.get(ip);
    if (!res) return empty;
    const sub = res.subdivisions && res.subdivisions[0];
    return {
      country: res.country?.iso_code || null,
      region: sub?.names?.ja || sub?.names?.en || null,
      city: res.city?.names?.ja || res.city?.names?.en || null,
    };
  } catch (e) {
    return empty;
  }
}
