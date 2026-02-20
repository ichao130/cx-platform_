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
    const sum = weights.reduce((a, b) => a + b, 0) || vars.length;
    const r = hash32(key) % sum;
    let acc = 0;
    for (let i = 0; i < vars.length; i++) {
        const w = sum === vars.length ? 1 : weights[i];
        acc += w;
        if (r < acc)
            return vars[i];
    }
    return vars[0];
}
