"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRmsRoutes = registerRmsRoutes;
const zod_1 = require("zod");
const admin_1 = require("../services/admin");
const site_1 = require("../services/site");
const rms_1 = require("../services/rms");
const admin_2 = require("../services/admin");
// siteId から workspaceId を取得し、ユーザーのロールを検証するヘルパー
async function assertSiteRole(siteId, uid, allowedRoles) {
    const site = await (0, site_1.pickSiteById)(siteId);
    if (!site)
        throw new Error("site_not_found");
    const workspaceId = String(site.workspaceId || "");
    if (!workspaceId)
        throw new Error("site_has_no_workspace");
    await (0, site_1.assertWorkspaceRole)({ workspaceId, uid, allowedRoles });
    return { workspaceId };
}
const SaveCredsSchema = zod_1.z.object({
    siteId: zod_1.z.string().min(1),
    serviceSecret: zod_1.z.string().min(1),
    licenseKey: zod_1.z.string().min(1),
    shopUrl: zod_1.z.string().optional(),
    enabled: zod_1.z.boolean().optional(),
});
const SyncSchema = zod_1.z.object({
    siteId: zod_1.z.string().min(1),
    daysBack: zod_1.z.number().int().min(1).max(90).optional().default(90),
});
function registerRmsRoutes(app) {
    // ---- 認証情報の保存 ----
    app.post("/v1/rms/credentials", async (req, res) => {
        try {
            const uid = await (0, admin_1.requireAuthUid)(req);
            const body = SaveCredsSchema.parse(req.body);
            await assertSiteRole(body.siteId, uid, ["owner", "admin"]);
            // 接続テスト
            const client = new rms_1.RmsClient(body.serviceSecret, body.licenseKey);
            const test = await client.testConnection();
            if (!test.ok) {
                res.status(400).json({ error: "rms_auth_failed", message: `RMS認証に失敗しました: ${test.error}` });
                return;
            }
            await (0, rms_1.saveRmsCredentials)(body.siteId, body);
            // サイトに rmsEnabled フラグをセット
            const db = (0, admin_2.adminDb)();
            await db.collection("sites").doc(body.siteId).set({ rmsEnabled: body.enabled ?? true }, { merge: true });
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
            const siteId = String(req.query.siteId || "");
            if (!siteId) {
                res.status(400).json({ error: "siteId required" });
                return;
            }
            await assertSiteRole(siteId, uid, ["owner", "admin", "member"]);
            const creds = await (0, rms_1.getRmsCredentials)(siteId);
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
            const siteId = String(req.query.siteId || "");
            if (!siteId) {
                res.status(400).json({ error: "siteId required" });
                return;
            }
            await assertSiteRole(siteId, uid, ["owner", "admin"]);
            await (0, rms_1.deleteRmsCredentials)(siteId);
            const db = (0, admin_2.adminDb)();
            await db.collection("sites").doc(siteId).set({ rmsEnabled: false }, { merge: true });
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
            await assertSiteRole(body.siteId, uid, ["owner", "admin"]);
            const result = await (0, rms_1.syncRmsData)(body.siteId, body.daysBack);
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
            const siteId = String(req.query.siteId || "");
            if (!siteId) {
                res.status(400).json({ error: "siteId required" });
                return;
            }
            await assertSiteRole(siteId, uid, ["owner", "admin", "member"]);
            const db = (0, admin_2.adminDb)();
            const snap = await db.collection("rms_sync_logs").doc(siteId).get();
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
            const siteId = String(req.query.siteId || "");
            if (!siteId) {
                res.status(400).json({ error: "siteId required" });
                return;
            }
            await assertSiteRole(siteId, uid, ["owner", "admin", "member"]);
            const db = (0, admin_2.adminDb)();
            const snap = await db.collection("rms_orders")
                .where("siteId", "==", siteId)
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
            const siteId = String(req.query.siteId || "");
            if (!siteId) {
                res.status(400).json({ error: "siteId required" });
                return;
            }
            await assertSiteRole(siteId, uid, ["owner", "admin", "member"]);
            const db = (0, admin_2.adminDb)();
            const snap = await db.collection("rms_items")
                .where("siteId", "==", siteId)
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
            const siteId = String(req.query.siteId || "");
            if (!siteId) {
                res.status(400).json({ error: "siteId required" });
                return;
            }
            await assertSiteRole(siteId, uid, ["owner", "admin", "member"]);
            const dateFrom = String(req.query.from || "");
            const dateTo = String(req.query.to || "");
            const db = (0, admin_2.adminDb)();
            let q = db.collection("rms_sales_daily").where("siteId", "==", siteId);
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
    // ---- APIデバッグ（開発用） ----
    app.post("/v1/rms/debug", async (req, res) => {
        try {
            const uid = await (0, admin_1.requireAuthUid)(req);
            const siteId = String(req.body?.siteId || "");
            if (!siteId) {
                res.status(400).json({ error: "siteId required" });
                return;
            }
            await assertSiteRole(siteId, uid, ["owner", "admin"]);
            const creds = await (0, rms_1.getRmsCredentials)(siteId);
            if (!creds) {
                res.status(404).json({ error: "no credentials" });
                return;
            }
            const encoded = Buffer.from(`${creds.serviceSecret}:${creds.licenseKey}`).toString("base64");
            const authHeader = `ESA ${encoded}`;
            const BASE = "https://api.rms.rakuten.co.jp";
            const results = [];
            const today = new Date().toISOString().slice(0, 10);
            const week = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
            // テストするリクエスト一覧
            const todaySlash = today.replace(/-/g, "/");
            const weekSlash = week.replace(/-/g, "/");
            const tests = [
                // 別のURLパス
                { label: "order v1 searchOrder", method: "POST", url: `${BASE}/es/1.0/order/searchOrder`,
                    body: { dateType: 1, startDatetime: `${week} 00:00:00`, endDatetime: `${today} 23:59:59` } },
                { label: "order v2 search (no Order)", method: "POST", url: `${BASE}/es/2.0/order/search`,
                    body: { dateType: 1, startDatetime: `${week} 00:00:00`, endDatetime: `${today} 23:59:59` } },
                // ボディのラッパー構造
                { label: "order wrapped SearchOrderRequest", method: "POST", url: `${BASE}/es/2.0/order/searchOrder`,
                    body: { SearchOrderRequest: { dateType: 1, startDatetime: `${week} 00:00:00`, endDatetime: `${today} 23:59:59` } } },
                { label: "order wrapped searchOrderRequest", method: "POST", url: `${BASE}/es/2.0/order/searchOrder`,
                    body: { searchOrderRequest: { dateType: 1, startDatetime: `${week} 00:00:00`, endDatetime: `${today} 23:59:59` } } },
                // ボディなし（GET的な使い方）
                { label: "order v2 GET", method: "GET", url: `${BASE}/es/2.0/order/searchOrder?dateType=1&startDatetime=${encodeURIComponent(week + " 00:00:00")}&endDatetime=${encodeURIComponent(today + " 23:59:59")}` },
                // 全く空のボディ
                { label: "order empty body", method: "POST", url: `${BASE}/es/2.0/order/searchOrder`, body: {} },
            ];
            for (const t of tests) {
                try {
                    const fetchOpts = {
                        method: t.method,
                        headers: { Authorization: authHeader, "Content-Type": "application/json" },
                    };
                    if (t.method === "POST" && t.body) {
                        fetchOpts.body = JSON.stringify(t.body);
                    }
                    const r = await fetch(t.url, fetchOpts);
                    const text = await r.text().catch(() => "");
                    results.push({ label: t.label, status: r.status, body: text.slice(0, 300) });
                }
                catch (e) {
                    results.push({ label: t.label, status: "error", body: e.message });
                }
            }
            res.json({ results });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
    app.options("/v1/rms/debug", (_req, res) => {
        res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.status(204).send("");
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
