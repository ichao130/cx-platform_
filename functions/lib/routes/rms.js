"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRmsRoutes = registerRmsRoutes;
const zod_1 = require("zod");
const admin_1 = require("../services/admin");
const site_1 = require("../services/site");
const rms_1 = require("../services/rms");
const admin_2 = require("../services/admin");
const SaveCredsSchema = zod_1.z.object({
    workspaceId: zod_1.z.string().min(1),
    serviceSecret: zod_1.z.string().min(1),
    licenseKey: zod_1.z.string().min(1),
    shopUrl: zod_1.z.string().optional(),
    enabled: zod_1.z.boolean().optional(),
});
const SyncSchema = zod_1.z.object({
    workspaceId: zod_1.z.string().min(1),
    daysBack: zod_1.z.number().int().min(1).max(90).optional().default(90),
});
function registerRmsRoutes(app) {
    // ---- 認証情報の保存 ----
    app.post("/v1/rms/credentials", async (req, res) => {
        try {
            const uid = await (0, admin_1.requireAuthUid)(req);
            const body = SaveCredsSchema.parse(req.body);
            await (0, site_1.assertWorkspaceRole)({ workspaceId: body.workspaceId, uid, allowedRoles: ["owner", "admin"] });
            // 接続テスト
            const client = new rms_1.RmsClient(body.serviceSecret, body.licenseKey);
            const test = await client.testConnection();
            if (!test.ok) {
                res.status(400).json({ error: "rms_auth_failed", message: `RMS認証に失敗しました: ${test.error}` });
                return;
            }
            await (0, rms_1.saveRmsCredentials)(body.workspaceId, body);
            // ワークスペースに rmsEnabled フラグをセット
            const db = (0, admin_2.adminDb)();
            await db.collection("workspaces").doc(body.workspaceId).set({ rmsEnabled: body.enabled ?? true }, { merge: true });
            res.json({ ok: true, shopName: test.shopName });
        }
        catch (e) {
            if (e.name === "ZodError") {
                res.status(400).json({ error: "validation", issues: e.issues });
                return;
            }
            res.status(500).json({ error: "internal", message: e.message });
        }
    });
    // ---- 認証情報の取得（secretは返さない）----
    app.get("/v1/rms/credentials", async (req, res) => {
        try {
            const uid = await (0, admin_1.requireAuthUid)(req);
            const workspaceId = String(req.query.workspaceId || "");
            if (!workspaceId) {
                res.status(400).json({ error: "workspaceId required" });
                return;
            }
            await (0, site_1.assertWorkspaceRole)({ workspaceId, uid, allowedRoles: ["owner", "admin", "member"] });
            const creds = await (0, rms_1.getRmsCredentials)(workspaceId);
            if (!creds) {
                res.json({ exists: false });
                return;
            }
            // secretは返さない
            res.json({
                exists: true,
                shopUrl: creds.shopUrl,
                enabled: creds.enabled,
                updatedAt: creds.updatedAt,
            });
        }
        catch (e) {
            res.status(500).json({ error: "internal", message: e.message });
        }
    });
    // ---- 認証情報の削除 ----
    app.delete("/v1/rms/credentials", async (req, res) => {
        try {
            const uid = await (0, admin_1.requireAuthUid)(req);
            const workspaceId = String(req.query.workspaceId || "");
            if (!workspaceId) {
                res.status(400).json({ error: "workspaceId required" });
                return;
            }
            await (0, site_1.assertWorkspaceRole)({ workspaceId, uid, allowedRoles: ["owner", "admin"] });
            await (0, rms_1.deleteRmsCredentials)(workspaceId);
            const db = (0, admin_2.adminDb)();
            await db.collection("workspaces").doc(workspaceId).set({ rmsEnabled: false }, { merge: true });
            res.json({ ok: true });
        }
        catch (e) {
            res.status(500).json({ error: "internal", message: e.message });
        }
    });
    // ---- 手動同期 ----
    app.post("/v1/rms/sync", async (req, res) => {
        try {
            const uid = await (0, admin_1.requireAuthUid)(req);
            const body = SyncSchema.parse(req.body);
            await (0, site_1.assertWorkspaceRole)({ workspaceId: body.workspaceId, uid, allowedRoles: ["owner", "admin"] });
            const result = await (0, rms_1.syncRmsData)(body.workspaceId, body.daysBack);
            res.json({ ok: true, ...result });
        }
        catch (e) {
            if (e.name === "ZodError") {
                res.status(400).json({ error: "validation", issues: e.issues });
                return;
            }
            res.status(500).json({ error: "internal", message: e.message });
        }
    });
    // ---- 同期ステータス取得 ----
    app.get("/v1/rms/sync/status", async (req, res) => {
        try {
            const uid = await (0, admin_1.requireAuthUid)(req);
            const workspaceId = String(req.query.workspaceId || "");
            if (!workspaceId) {
                res.status(400).json({ error: "workspaceId required" });
                return;
            }
            await (0, site_1.assertWorkspaceRole)({ workspaceId, uid, allowedRoles: ["owner", "admin", "member"] });
            const db = (0, admin_2.adminDb)();
            const snap = await db.collection("rms_sync_logs").doc(workspaceId).get();
            if (!snap.exists) {
                res.json({ exists: false });
                return;
            }
            res.json({ exists: true, ...snap.data() });
        }
        catch (e) {
            res.status(500).json({ error: "internal", message: e.message });
        }
    });
    // ---- 注文一覧取得 ----
    app.get("/v1/rms/orders", async (req, res) => {
        try {
            const uid = await (0, admin_1.requireAuthUid)(req);
            const workspaceId = String(req.query.workspaceId || "");
            if (!workspaceId) {
                res.status(400).json({ error: "workspaceId required" });
                return;
            }
            await (0, site_1.assertWorkspaceRole)({ workspaceId, uid, allowedRoles: ["owner", "admin", "member"] });
            const db = (0, admin_2.adminDb)();
            const snap = await db.collection("rms_orders")
                .where("workspaceId", "==", workspaceId)
                .orderBy("orderDate", "desc")
                .limit(100)
                .get();
            res.json({ orders: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
        }
        catch (e) {
            res.status(500).json({ error: "internal", message: e.message });
        }
    });
    // ---- 商品一覧取得 ----
    app.get("/v1/rms/items", async (req, res) => {
        try {
            const uid = await (0, admin_1.requireAuthUid)(req);
            const workspaceId = String(req.query.workspaceId || "");
            if (!workspaceId) {
                res.status(400).json({ error: "workspaceId required" });
                return;
            }
            await (0, site_1.assertWorkspaceRole)({ workspaceId, uid, allowedRoles: ["owner", "admin", "member"] });
            const db = (0, admin_2.adminDb)();
            const snap = await db.collection("rms_items")
                .where("workspaceId", "==", workspaceId)
                .limit(200)
                .get();
            res.json({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
        }
        catch (e) {
            res.status(500).json({ error: "internal", message: e.message });
        }
    });
    // ---- 売上集計取得 ----
    app.get("/v1/rms/sales", async (req, res) => {
        try {
            const uid = await (0, admin_1.requireAuthUid)(req);
            const workspaceId = String(req.query.workspaceId || "");
            if (!workspaceId) {
                res.status(400).json({ error: "workspaceId required" });
                return;
            }
            await (0, site_1.assertWorkspaceRole)({ workspaceId, uid, allowedRoles: ["owner", "admin", "member"] });
            const dateFrom = String(req.query.from || "");
            const dateTo = String(req.query.to || "");
            const db = (0, admin_2.adminDb)();
            let q = db.collection("rms_sales_daily").where("workspaceId", "==", workspaceId);
            if (dateFrom)
                q = q.where("date", ">=", dateFrom);
            if (dateTo)
                q = q.where("date", "<=", dateTo);
            const snap = await q.orderBy("date", "desc").limit(90).get();
            res.json({ sales: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
        }
        catch (e) {
            res.status(500).json({ error: "internal", message: e.message });
        }
    });
    // OPTIONS（CORS）
    for (const path of ["/v1/rms/credentials", "/v1/rms/sync", "/v1/rms/sync/status", "/v1/rms/orders", "/v1/rms/items", "/v1/rms/sales"]) {
        app.options(path, (_req, res) => {
            res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
            res.status(204).send("");
        });
    }
}
