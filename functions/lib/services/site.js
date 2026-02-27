"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickSiteById = pickSiteById;
exports.pickWorkspaceById = pickWorkspaceById;
exports.assertAllowedOrigin = assertAllowedOrigin;
// functions/src/services/site.ts
const admin_1 = require("./admin"); // ← パスはプロジェクトに合わせて調整
// もし今 "../services/admin" ならそれでOK
function normalizeOrigin(input) {
    // Ensure scheme + host only (no path)
    try {
        const u = new URL(input);
        return `${u.protocol}//${u.host}`;
    }
    catch {
        return input;
    }
}
async function pickSiteById(siteId) {
    const db = (0, admin_1.adminDb)();
    const snap = await db.collection("sites").doc(siteId).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() }) : null;
}
async function pickWorkspaceById(workspaceId) {
    const db = (0, admin_1.adminDb)();
    const snap = await db.collection("workspaces").doc(workspaceId).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() }) : null;
}
function assertAllowedOrigin({ allowed, origin, url }) {
    const allowedHosts = allowed
        .map((s) => {
        try {
            return new URL(s).host;
        }
        catch {
            return String(s).replace(/^https?:\/\//, "").split("/")[0];
        }
    })
        .filter(Boolean);
    const originHost = origin ? new URL(origin).host : "";
    const urlHost = url ? (() => { try {
        return new URL(url).host;
    }
    catch {
        return "";
    } })() : "";
    // ★url が無いときは origin だけで判定
    if (originHost && allowedHosts.includes(originHost))
        return;
    // ★url があるときは urlHost でもOK
    if (urlHost && allowedHosts.includes(urlHost))
        return;
    throw new Error(`origin not allowed (originHost=${originHost} urlHost=${urlHost})`);
}
