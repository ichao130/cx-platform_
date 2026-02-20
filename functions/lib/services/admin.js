"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAdminApp = ensureAdminApp;
exports.adminDb = adminDb;
exports.adminBucket = adminBucket;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
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
