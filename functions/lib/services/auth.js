"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthOrThrow = getAuthOrThrow;
exports.assertWorkspaceRole = assertWorkspaceRole;
// functions/src/services/auth.ts
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
function getAuthOrThrow(req) {
    const uid = req.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    return { uid };
}
/**
 * roles doc example:
 * workspaces/{workspaceId}/members/{uid} { role: "admin" }
 */
async function assertWorkspaceRole(workspaceId, uid, allowed = ["owner", "admin"]) {
    if (!workspaceId)
        throw new https_1.HttpsError("invalid-argument", "workspaceId required");
    const db = (0, firestore_1.getFirestore)();
    const snap = await db.doc(`workspaces/${workspaceId}/members/${uid}`).get();
    const role = (snap.exists ? snap.data()?.role : null);
    if (!role || !allowed.includes(role)) {
        throw new https_1.HttpsError("permission-denied", "Not allowed for this workspace");
    }
    return { role };
}
