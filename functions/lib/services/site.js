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
function assertAllowedOrigin(params) {
    const allowed = (params.allowed || []).map(normalizeOrigin).filter(Boolean);
    const origin = params.origin ? normalizeOrigin(params.origin) : "";
    let urlOrigin = "";
    if (params.url) {
        try {
            urlOrigin = normalizeOrigin(params.url);
        }
        catch {
            urlOrigin = "";
        }
    }
    // If we have an Origin header, prefer that; otherwise fall back to url.
    const check = origin || urlOrigin;
    if (!check) {
        // No origin info: allow (some server-to-server calls). You can tighten later.
        return;
    }
    const ok = allowed.some((a) => a === check);
    if (!ok) {
        const originHost = origin ? new URL(origin).host : "";
        const urlHost = urlOrigin ? new URL(urlOrigin).host : "";
        throw new Error(`origin not allowed (originHost=${originHost} urlHost=${urlHost})`);
    }
}
