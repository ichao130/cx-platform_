"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMedia = exports.api = void 0;
// functions/src/index.ts
const v2_1 = require("firebase-functions/v2");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const storage_1 = require("firebase-admin/storage");
const admin_1 = require("./services/admin");
// ★ ここ超重要：君のURLは asia-northeast1 なので揃える
(0, v2_1.setGlobalOptions)({ region: "asia-northeast1" });
const OPENAI_API_KEY = (0, params_1.defineSecret)("OPENAI_API_KEY");
/**
 * ==========================
 * HTTP API: /api/v1/...
 * ==========================
 * ここで Express を関数名 `api` として公開する
 */
const v1_1 = require("./routes/v1");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json({ limit: "1mb" }));
app.get("/", (_req, res) => res.status(200).send("ok"));
(0, v1_1.registerV1Routes)(app);
exports.api = (0, https_1.onRequest)({
    region: "asia-northeast1",
    secrets: [OPENAI_API_KEY],
}, app);
/**
 * ==========================
 * Callable: deleteMedia
 * ==========================
 */
exports.deleteMedia = (0, https_1.onCall)(async (req) => {
    const uid = req.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "sign in required");
    const mediaId = String(req.data?.mediaId || "");
    if (!mediaId)
        throw new https_1.HttpsError("invalid-argument", "mediaId required");
    const db = (0, admin_1.adminDb)();
    const mediaRef = db.collection("media").doc(mediaId);
    const mediaSnap = await mediaRef.get();
    if (!mediaSnap.exists)
        throw new https_1.HttpsError("not-found", "media not found");
    const media = mediaSnap.data();
    const workspaceId = String(media.workspaceId || "");
    const storagePath = String(media.storagePath || "");
    const createdBy = String(media.createdBy || "");
    if (!workspaceId)
        throw new https_1.HttpsError("failed-precondition", "workspaceId missing");
    if (!storagePath)
        throw new https_1.HttpsError("failed-precondition", "storagePath missing");
    // “管理者のみ”チェック（暫定）
    const wsSnap = await db.collection("workspaces").doc(workspaceId).get();
    const ws = (wsSnap.exists ? wsSnap.data() : null);
    const adminUids = Array.isArray(ws?.adminUids) ? ws.adminUids : [];
    const ownerUid = String(ws?.ownerUid || "");
    const isAdmin = adminUids.includes(uid) || ownerUid === uid || createdBy === uid;
    if (!isAdmin)
        throw new https_1.HttpsError("permission-denied", "not allowed");
    // Storage delete
    try {
        const bucket = (0, storage_1.getStorage)().bucket();
        await bucket.file(storagePath).delete({ ignoreNotFound: true });
    }
    catch {
        // ファイルが無い/削除済みでも進める
    }
    // Firestore meta delete
    await mediaRef.delete();
    return { ok: true };
});
