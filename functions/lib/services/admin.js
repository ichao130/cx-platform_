"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAdminApp = ensureAdminApp;
exports.adminDb = adminDb;
exports.adminBucket = adminBucket;
exports.adminAuth = adminAuth;
exports.verifyIdToken = verifyIdToken;
exports.extractBearerToken = extractBearerToken;
exports.requireAuthUid = requireAuthUid;
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
