"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMedia = exports.cleanupExpiredFreeAccounts = exports.api = void 0;
// functions/src/index.ts
const v2_1 = require("firebase-functions/v2");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = require("express-rate-limit");
const storage_1 = require("firebase-admin/storage");
const admin_1 = require("./services/admin");
// ★ ここ超重要：君のURLは asia-northeast1 なので揃える
(0, v2_1.setGlobalOptions)({ region: "asia-northeast1" });
const OPENAI_API_KEY = (0, params_1.defineSecret)("OPENAI_API_KEY");
const POSTMARK_SERVER_TOKEN = (0, params_1.defineSecret)("POSTMARK_SERVER_TOKEN");
const STRIPE_SECRET_KEY = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
const MISOCA_CLIENT_ID = (0, params_1.defineSecret)("MISOCA_CLIENT_ID");
const MISOCA_CLIENT_SECRET = (0, params_1.defineSecret)("MISOCA_CLIENT_SECRET");
/**
 * ==========================
 * HTTP API: /api/v1/...
 * ==========================
 * ここで Express を関数名 `api` として公開する
 */
const v1_1 = require("./routes/v1");
const mcp_1 = require("./routes/mcp");
const app = (0, express_1.default)();
app.set("etag", false);
app.use((0, cors_1.default)({ origin: true }));
// rawBody を保持（Stripe webhook の署名検証で必要）
app.use(express_1.default.json({
    limit: "1mb",
    verify: (req, _res, buf) => { req.rawBody = buf; },
}));
// Shopify Web Pixel の sendBeacon は text/plain で送ってくるため JSON としてパース
app.use(express_1.default.text({ type: "text/plain", limit: "1mb" }));
app.use((req, _res, next) => {
    if (typeof req.body === "string") {
        try {
            req.body = JSON.parse(req.body);
        }
        catch { }
    }
    next();
});
// Firebase Hosting 経由（/api/v1/...）と直接URL（/v1/...）の両方に対応
app.use((req, _res, next) => {
    if (req.url.startsWith("/api/"))
        req.url = req.url.slice(4); // "/api" を除去
    next();
});
/* ──────────────────────────────────────────────────────────
   レートリミット設定
   ※ Cloud Functions はインスタンスが複数立ち上がる可能性があるため
      per-instance の制限になる。グローバル制限が必要な場合は
      Cloud Armor（GCP WAF）を追加で設定すること。
────────────────────────────────────────────────────────── */
// AI系（OpenAI コスト保護）: 1分あたり15リクエスト/IP
const aiLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "rate_limit_exceeded", message: "Too many requests, please try again later." },
    skip: (req) => req.method === "OPTIONS",
});
// ログ・トラッキング（公開エンドポイント）: 1分あたり60リクエスト/IP
const logLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "rate_limit_exceeded" },
    skip: (req) => req.method === "OPTIONS",
});
// 一般API（認証あり）: 1分あたり120リクエスト/IP
const apiLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "rate_limit_exceeded", message: "Too many requests, please try again later." },
    skip: (req) => req.method === "OPTIONS",
});
app.use("/v1/ai/", aiLimiter);
app.use("/v1/log", logLimiter);
app.use("/v1/variant", logLimiter);
app.use("/v1/serve", logLimiter);
app.use("/v1/", apiLimiter);
app.get("/", (_req, res) => res.status(200).send("ok"));
(0, v1_1.registerV1Routes)(app);
(0, mcp_1.registerMcpRoutes)(app);
exports.api = (0, https_1.onRequest)({
    region: "asia-northeast1",
    // コスト爆発防止: インスタンスの最大数を制限
    maxInstances: 20,
    // メモリとタイムアウトの上限設定
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [OPENAI_API_KEY, POSTMARK_SERVER_TOKEN, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, MISOCA_CLIENT_ID, MISOCA_CLIENT_SECRET],
}, app);
/**
 * ワークスペースの全データを完全削除するヘルパー
 * - workspaces, workspace_billing, workspace_limit_overrides, workspace_invites
 * - sites, scenarios, actions, templates
 * - media（Firestoreドキュメント＋Storageファイル）
 * - logs, stats_daily（siteId経由・コスト節約のため全削除）
 */
async function deleteWorkspaceAllData(workspaceId) {
    const db = (0, admin_1.adminDb)();
    const storage = (0, storage_1.getStorage)().bucket();
    /** バッチ削除ヘルパー（400件ずつ）*/
    async function batchDelete(refs) {
        for (let i = 0; i < refs.length; i += 400) {
            const batch = db.batch();
            refs.slice(i, i + 400).forEach((r) => batch.delete(r));
            await batch.commit();
        }
    }
    /** クエリ結果を全件削除（大量データ対応・ページネーション）*/
    async function deleteQuery(q) {
        let deleted = 0;
        while (true) {
            const snap = await q.limit(400).get();
            if (snap.empty)
                break;
            const batch = db.batch();
            snap.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
            deleted += snap.size;
            if (snap.size < 400)
                break;
        }
        return deleted;
    }
    // 1. workspaceに紐づく基本コレクションを一括取得
    const [sitesSnap, scenariosSnap, actionsSnap, templatesSnap, mediaSnap, invitesSnap] = await Promise.all([
        db.collection("sites").where("workspaceId", "==", workspaceId).get(),
        db.collection("scenarios").where("workspaceId", "==", workspaceId).get(),
        db.collection("actions").where("workspaceId", "==", workspaceId).get(),
        db.collection("templates").where("workspaceId", "==", workspaceId).get(),
        db.collection("media").where("workspaceId", "==", workspaceId).get(),
        db.collection("workspace_invites").where("workspaceId", "==", workspaceId).get(),
    ]);
    // 2. サイトIDを収集してログ・統計を削除（最大30件のwhereIn制約対応）
    const siteIds = sitesSnap.docs.map((d) => d.id);
    let logsDeleted = 0;
    let statsDeleted = 0;
    if (siteIds.length > 0) {
        // whereIn は30件まで → チャンク処理
        for (let i = 0; i < siteIds.length; i += 30) {
            const chunk = siteIds.slice(i, i + 30);
            logsDeleted += await deleteQuery(db.collection("logs").where("site_id", "in", chunk));
            statsDeleted += await deleteQuery(db.collection("stats_daily").where("siteId", "in", chunk));
        }
    }
    // 3. メディアのStorageファイルを削除
    await Promise.allSettled(mediaSnap.docs.map(async (d) => {
        const storagePath = d.data().storagePath;
        if (storagePath) {
            try {
                await storage.file(storagePath).delete({ ignoreNotFound: true });
            }
            catch { }
        }
    }));
    // 4. Firestoreドキュメントを削除（基本コレクション）
    await batchDelete([
        ...sitesSnap.docs.map((d) => d.ref),
        ...scenariosSnap.docs.map((d) => d.ref),
        ...actionsSnap.docs.map((d) => d.ref),
        ...templatesSnap.docs.map((d) => d.ref),
        ...mediaSnap.docs.map((d) => d.ref),
        ...invitesSnap.docs.map((d) => d.ref),
        db.collection("workspace_billing").doc(workspaceId),
        db.collection("workspace_limit_overrides").doc(workspaceId),
        db.collection("workspaces").doc(workspaceId),
    ]);
    console.log(`[deleteWorkspaceAllData] workspaceId=${workspaceId}: sites=${sitesSnap.size} scenarios=${scenariosSnap.size} actions=${actionsSnap.size} templates=${templatesSnap.size} media=${mediaSnap.size} logs=${logsDeleted} stats=${statsDeleted}`);
}
/**
 * ==========================
 * Scheduled: 期限切れFreeアカウント自動削除
 * 毎日JST 03:00 に実行。
 * free_expires_at + 10日 を過ぎたワークスペースを完全削除する。
 * 特別トライアル中（access_override_active）は対象外。
 * ==========================
 */
exports.cleanupExpiredFreeAccounts = (0, scheduler_1.onSchedule)({ region: "asia-northeast1", schedule: "0 18 * * *", timeZone: "UTC", timeoutSeconds: 540 }, // UTC 18:00 = JST 03:00
async () => {
    const db = (0, admin_1.adminDb)();
    const now = Date.now();
    const GRACE_MS = 10 * 24 * 60 * 60 * 1000; // 10日
    const wsSnap = await db.collection("workspaces").get();
    let deleted = 0;
    for (const doc of wsSnap.docs) {
        const ws = doc.data();
        const billing = (ws.billing || {});
        if (!billing.free_expires_at)
            continue;
        // 有料プランへ移行済みはスキップ
        if (billing.plan && billing.plan !== "free")
            continue;
        // 特別トライアル中はスキップ
        const accessSnap = await db.collection("workspace_billing").doc(doc.id).get();
        const access = (accessSnap.data() || {});
        if (access.access_override_active) {
            const until = access.access_override_until ? new Date(access.access_override_until).getTime() : Infinity;
            if (until > now)
                continue;
        }
        const expiresAt = new Date(billing.free_expires_at).getTime();
        if (now < expiresAt + GRACE_MS)
            continue;
        // 完全削除
        try {
            await deleteWorkspaceAllData(doc.id);
            deleted++;
        }
        catch (e) {
            console.error(`[cleanupExpiredFreeAccounts] failed to delete workspaceId=${doc.id}:`, e);
        }
    }
    console.log(`[cleanupExpiredFreeAccounts] deleted ${deleted} expired workspaces`);
});
/**
 * ==========================
 * Callable: deleteMedia
 * ==========================
 */
exports.deleteMedia = (0, https_1.onCall)({ region: "asia-northeast1" }, async (req) => {
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
