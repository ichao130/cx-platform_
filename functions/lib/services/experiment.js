"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickVariant = pickVariant;
function hash32(s) {
    // simple FNV-1a
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
}
function pickVariant(exp, key) {
    if (!exp?.enabled)
        return null;
    const vars = (exp.variants || []).filter(v => v?.id);
    if (!vars.length)
        return null;
    const weights = vars.map(v => Math.max(0, Number(v.weight ?? 0)));
    const total = weights.reduce((a, b) => a + b, 0);
    // ★均等割りにするのは「配分が全部0（＝未設定）」のときだけ。
    //   以前は sum を `|| vars.length` で補ったうえで `sum === vars.length` を
    //   均等割りの判定に使っていたため、配分の合計がたまたまパターン数と
    //   一致したときまで巻き添えで均等になっていた。
    //   例: 2パターンで 2:0 → 合計2 = パターン数2 → 100:0 のつもりが 50:50。
    //       3パターンで 2:1:0 → 合計3 = パターン数3 → 66:33:0 のつもりが均等。
    //   「片方を0にして止める」が効かない、という形で表に出る。
    const even = total <= 0;
    const sum = even ? vars.length : total;
    const r = hash32(key) % sum;
    let acc = 0;
    for (let i = 0; i < vars.length; i++) {
        acc += even ? 1 : weights[i];
        if (r < acc)
            return vars[i];
    }
    // 端数で抜けたときの保険。配分0のパターンを返さないよう、後ろから探す
    for (let i = vars.length - 1; i >= 0; i--) {
        if (even || weights[i] > 0)
            return vars[i];
    }
    return vars[0];
}
