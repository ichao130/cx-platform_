"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMedia = void 0;
const functions = __importStar(require("firebase-functions"));
const admin_1 = require("../services/admin"); // いつもの adminDb()
exports.deleteMedia = functions
    .region("asia-northeast1")
    .https.onCall(async (data, context) => {
    // ---- auth ----
    // フェーズ1は「ログイン必須」だけでもOK。後で role を強化すれば良い。
    const uid = context.auth?.uid;
    if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", "login_required");
    }
    const workspaceId = String(data?.workspaceId || "").trim();
    const mediaId = String(data?.mediaId || "").trim();
    if (!workspaceId || !mediaId) {
        throw new functions.https.HttpsError("invalid-argument", "workspaceId and mediaId are required");
    }
    // もし権限があるならここでチェック（管理者のみ削除など）
    // assertWorkspaceRole({ uid, workspaceId, role: "admin" });
    const db = (0, admin_1.adminDb)();
    // ---- media doc ----
    const mediaRef = db.collection("media").doc(mediaId);
    const mediaSnap = await mediaRef.get();
    if (!mediaSnap.exists) {
        throw new functions.https.HttpsError("not-found", "media_not_found");
    }
    const media = mediaSnap.data();
    if (String(media.workspaceId || "") !== workspaceId) {
        throw new functions.https.HttpsError("permission-denied", "workspace_mismatch");
    }
    // ---- in-use guard ----
    // actions where workspaceId == ? AND mediaIds array-contains mediaId
    // ※ここは複合インデックス要求されることがある（その場合はリンクが出る）
    let usedSnap;
    try {
        usedSnap = await db
            .collection("actions")
            .where("workspaceId", "==", workspaceId)
            .where("mediaIds", "array-contains", mediaId)
            .limit(20)
            .get();
    }
    catch (e) {
        // failed-precondition: index required など
        console.error("[deleteMedia] query failed", e);
        throw new functions.https.HttpsError("failed-precondition", "query_failed_maybe_index_required", { message: e?.message || String(e) });
    }
    if (!usedSnap.empty) {
        const usedIn = usedSnap.docs.map((d) => {
            const a = d.data();
            return {
                actionId: d.id,
                title: a?.creative?.title || null,
                type: a?.type || null,
            };
        });
        throw new functions.https.HttpsError("failed-precondition", "media_in_use", { usedIn });
    }
    // ---- delete storage (optional) ----
    // storagePath がある場合は Storage も消す
    // ※ admin storage を使ってるならここで削除
    // import { getStorage } from "firebase-admin/storage";
    // const bucket = getStorage().bucket();
    // if (media.storagePath) await bucket.file(media.storagePath).delete({ ignoreNotFound: true });
    // ---- delete media doc ----
    await mediaRef.delete();
    return { ok: true };
});
