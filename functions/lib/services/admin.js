"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAdminApp = ensureAdminApp;
exports.adminDb = adminDb;
exports.adminBucket = adminBucket;
exports.adminAuth = adminAuth;
exports.verifyIdToken = verifyIdToken;
exports.extractBearerToken = extractBearerToken;
exports.requireAuthUid = requireAuthUid;
exports.extractWorkspaceId = extractWorkspaceId;
exports.requireAuthWithWorkspace = requireAuthWithWorkspace;
exports.corsForAdmin = corsForAdmin;
exports.resolveHttpStatusFromError = resolveHttpStatusFromError;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const auth_1 = require("firebase-admin/auth");
function ensureAdminApp() {
    if ((0, app_1.getApps)().length)
        return (0, app_1.getApps)()[0];
    return (0, app_1.initializeApp)(); // Cloud Functions 上はこれでOK（認証は自動）
}
function adminDb() {
    return (0, firestore_1.getFirestore)(ensureAdminApp());
}
function adminBucket() {
    return (0, storage_1.getStorage)(ensureAdminApp()).bucket(); // デフォルトバケット
}
function adminAuth() {
    return (0, auth_1.getAuth)(ensureAdminApp());
}
async function verifyIdToken(idToken) {
    if (!idToken)
        throw new Error("missing_authorization");
    try {
        return await adminAuth().verifyIdToken(idToken);
    }
    catch (e) {
        throw new Error("invalid_token");
    }
}
function extractBearerToken(req) {
    const auth = req.header("Authorization") || "";
    if (!auth.startsWith("Bearer "))
        throw new Error("missing_authorization");
    return auth.replace("Bearer ", "").trim();
}
async function requireAuthUid(req) {
    const token = extractBearerToken(req);
    const decoded = await verifyIdToken(token);
    if (!decoded?.uid)
        throw new Error("invalid_token");
    return decoded.uid;
}
/**
 * Extract workspaceId from header.
 * We standardize on: x-workspace-id
 */
function extractWorkspaceId(req) {
    const wid = req.header("x-workspace-id");
    if (!wid)
        throw new Error("missing_workspace_id");
    return wid;
}
/**
 * Require both authenticated user and workspaceId.
 * Returns { uid, workspaceId }
 */
async function requireAuthWithWorkspace(req) {
    const uid = await requireAuthUid(req);
    const workspaceId = extractWorkspaceId(req);
    return { uid, workspaceId };
}
/**
 * Simple CORS handler for admin APIs.
 * Call at the top of route handler.
 */
function corsForAdmin(req, res) {
    const origin = req.header("Origin");
    if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-workspace-id, x-site-id");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
    if (req.method === "OPTIONS") {
        res.status(204).end();
        return true;
    }
    return false;
}
/**
 * Standard error → HTTP status mapping.
 */
function resolveHttpStatusFromError(e) {
    const msg = e?.message || "";
    if (msg === "missing_authorization" || msg === "invalid_token")
        return 401;
    if (msg === "missing_workspace_id")
        return 400;
    return 400;
}
