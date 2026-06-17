/**
 * Open-Meteo（無料・APIキー不要）で緯度経度→その時刻の天気を取得する。
 * 「位置グリッド × 時間(1時間)」でインメモリキャッシュし、API呼び出しを最小化する。
 * 失敗時は null を返すだけで安全に動く。
 */

export interface WeatherResult {
  code: number | null;   // WMO weather code
  temp: number | null;   // 気温(℃)
  label: string | null;  // 集計用の粗いカテゴリ（晴れ/曇り/雨/雪/その他）
}

const EMPTY: WeatherResult = { code: null, temp: null, label: null };

// インメモリキャッシュ（インスタンスごと。グリッド×時間で使い回す）
const cache = new Map<string, WeatherResult>();
const MAX_CACHE = 2000;

// JSTの "YYYYMMDDHH"
function hourKeyJST(d = new Date()): string {
  const j = new Date(d.getTime() + 9 * 3600 * 1000);
  return `${j.getUTCFullYear()}${String(j.getUTCMonth() + 1).padStart(2, "0")}${String(j.getUTCDate()).padStart(2, "0")}${String(j.getUTCHours()).padStart(2, "0")}`;
}

// WMO weather code → 粗いカテゴリ
function labelFromCode(code: number): string {
  if (code === 0) return "快晴";
  if (code <= 3) return "晴れ/曇り";
  if (code === 45 || code === 48) return "霧";
  if (code >= 51 && code <= 67) return "雨";
  if (code >= 71 && code <= 77) return "雪";
  if (code >= 80 && code <= 82) return "にわか雨";
  if (code >= 85 && code <= 86) return "にわか雪";
  if (code >= 95) return "雷雨";
  return "その他";
}

/** 緯度経度→天気。グリッド×時間でキャッシュ。失敗時は全null。 */
export async function resolveWeather(lat: number | null, lng: number | null): Promise<WeatherResult> {
  if (typeof lat !== "number" || typeof lng !== "number") return EMPTY;
  // グリッド: 0.1度(約11km)に丸める。同一グリッド・同一時間はキャッシュ共有
  const latR = Math.round(lat * 10) / 10;
  const lngR = Math.round(lng * 10) / 10;
  const key = `${latR}_${lngR}__${hourKeyJST()}`;

  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latR}&longitude=${lngR}&current_weather=true`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return EMPTY;
    const data: any = await res.json();
    const cw = data && data.current_weather;
    if (!cw || typeof cw.weathercode !== "number") return EMPTY;
    const result: WeatherResult = {
      code: cw.weathercode,
      temp: typeof cw.temperature === "number" ? cw.temperature : null,
      label: labelFromCode(cw.weathercode),
    };
    if (cache.size > MAX_CACHE) cache.clear(); // 簡易プルーニング
    cache.set(key, result);
    return result;
  } catch (e) {
    return EMPTY;
  }
}
