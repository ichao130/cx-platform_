/**
 * GeoLite2-ASN CSV から「日本の主要キャリア/ISPのみ」を抽出し、
 * IP範囲→回線種別(mobile/fixed/unknown)+ISP名 の軽量テーブルJSONを生成する。
 * 出力: functions/geo/asn-jp.json  { v4: [[startU32,endU32,conn,isp]...], v6: [[startDec,endDec,conn,isp]...] }
 *
 * 実行: node asn-build/build.js <CSVフォルダ>
 */
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const SRC = process.argv[2] || path.join(process.env.HOME, "Downloads", "GeoLite2-ASN-CSV_20260620");
const OUT = path.join(__dirname, "..", "functions", "geo", "asn-jp.json");

// 取り込む日本のキャリア/ISP（orgキーワード）。これ以外はテーブルに入れない＝null扱い。
const JP =
  /docomo|kddi|softbank|rakuten|\bntt\b|ntt communications|ocn|ntt east|ntt west|so-net|sony network|biglobe|nifty|nuro|k-opticom|optage|j:?com|asahi net|internet initiative|\biij\b|arteria|commufa|plala|usen|tokai communications|sakura internet|gmo|\bau\b|\buq\b|hi-ho|interlink|its communications|chubu telecom|energia|stnet|qtnet|bbiq|coara|au one net/i;

function classify(org) {
  const s = org.toLowerCase();
  if (/docomo|rakuten mobile|uqmobile|uq communications|povo|ahamo/.test(s)) return "mobile";
  if (/ntt communications|ocn|ntt east|ntt west|flets|so-net|sony network|biglobe|nifty|k-opticom|optage|j:?com|asahi net|internet initiative|\biij\b|arteria|commufa|plala|usen|tokai communications|sakura internet|nuro|hi-ho|interlink|its communications|chubu telecom|energia|stnet|qtnet|bbiq|au one net/.test(s)) return "fixed";
  return "unknown"; // KDDI / SoftBank 等は判別困難
}

// "1.66.20.0/22" -> [startU32, endU32]
function v4range(cidr) {
  const [ip, pfx] = cidr.split("/");
  const parts = ip.split(".").map(Number);
  const base = ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  const size = 2 ** (32 - Number(pfx));
  return [base >>> 0, (base + size - 1) >>> 0];
}

// "2400:4150::/32" -> [startBigInt, endBigInt]
function v6range(cidr) {
  const [ip, pfx] = cidr.split("/");
  // 展開
  let full = ip;
  if (ip.includes("::")) {
    const [l, r] = ip.split("::");
    const lp = l ? l.split(":") : [];
    const rp = r ? r.split(":") : [];
    const fill = 8 - lp.length - rp.length;
    full = [...lp, ...Array(fill).fill("0"), ...rp].join(":");
  }
  const groups = full.split(":").map((g) => (g === "" ? 0 : parseInt(g, 16)));
  let start = 0n;
  for (const g of groups) start = (start << 16n) + BigInt(g);
  const hostBits = BigInt(128 - Number(pfx));
  const end = start + ((1n << hostBits) - 1n);
  return [start, end];
}

(async () => {
  const v4 = [], v6 = [];
  for (const [file, isV6] of [["GeoLite2-ASN-Blocks-IPv4.csv", false], ["GeoLite2-ASN-Blocks-IPv6.csv", true]]) {
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(SRC, file)), crlfDelay: Infinity });
    let first = true;
    for await (const line of rl) {
      if (first) { first = false; continue; }
      if (!line) continue;
      const m = line.match(/^([^,]+),([^,]+),(.*)$/);
      if (!m) continue;
      const cidr = m[1];
      let org = m[3].trim();
      if (org.startsWith('"') && org.endsWith('"')) org = org.slice(1, -1);
      if (!JP.test(org)) continue;
      const conn = classify(org);
      if (isV6) { const [s, e] = v6range(cidr); v6.push([s.toString(), e.toString(), conn, org]); }
      else { const [s, e] = v4range(cidr); v4.push([s, e, conn, org]); }
    }
  }
  v4.sort((a, b) => a[0] - b[0]);
  v6.sort((a, b) => (BigInt(a[0]) < BigInt(b[0]) ? -1 : 1));
  fs.writeFileSync(OUT, JSON.stringify({ v4, v6 }));
  const stat = fs.statSync(OUT);
  console.log(`✓ 出力: ${OUT}`);
  console.log(`  v4: ${v4.length} ranges / v6: ${v6.length} ranges / size: ${(stat.size / 1024 / 1024).toFixed(1)}MB`);
  // 内訳サンプル
  const cnt = {};
  for (const r of [...v4, ...v6]) cnt[r[2]] = (cnt[r[2]] || 0) + 1;
  console.log(`  conn内訳(range数): ${JSON.stringify(cnt)}`);
})();
