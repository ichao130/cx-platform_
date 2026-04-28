import type { Express } from "express";
import { z } from "zod";
import { requireAuthUid } from "../services/admin";
import { assertWorkspaceRole, pickSiteById } from "../services/site";
import {
  getRmsCredentials,
  saveRmsCredentials,
  deleteRmsCredentials,
  syncRmsData,
  RmsClient,
} from "../services/rms";
import { adminDb } from "../services/admin";

// siteId から workspaceId を取得し、ユーザーのロールを検証するヘルパー
async function assertSiteRole(siteId: string, uid: string, allowedRoles: string[]) {
  const site = await pickSiteById(siteId);
  if (!site) throw new Error("site_not_found");
  const workspaceId = String(site.workspaceId || "");
  if (!workspaceId) throw new Error("site_has_no_workspace");
  await assertWorkspaceRole({ workspaceId, uid, allowedRoles });
  return { workspaceId };
}

const SaveCredsSchema = z.object({
  siteId: z.string().min(1),
  serviceSecret: z.string().min(1),
  licenseKey: z.string().min(1),
  shopUrl: z.string().optional(),
  enabled: z.boolean().optional(),
});

const SyncSchema = z.object({
  siteId: z.string().min(1),
  daysBack: z.number().int().min(1).max(90).optional().default(90),
});

export function registerRmsRoutes(app: Express) {
  // ---- 認証情報の保存 ----
  app.post("/v1/rms/credentials", async (req, res) => {
    try {
      const uid = await requireAuthUid(req);
      const body = SaveCredsSchema.parse(req.body);
      await assertSiteRole(body.siteId, uid, ["owner", "admin"]);

      // 接続テスト
      const client = new RmsClient(body.serviceSecret, body.licenseKey);
      const test = await client.testConnection();
      if (!test.ok) {
        res.status(400).json({ error: "rms_auth_failed", message: `RMS認証に失敗しました: ${test.error}` });
        return;
      }

      await saveRmsCredentials(body.siteId, body);

      // サイトに rmsEnabled フラグをセット
      const db = adminDb();
      await db.collection("sites").doc(body.siteId).set(
        { rmsEnabled: body.enabled ?? true },
        { merge: true }
      );

      res.json({ ok: true, shopName: test.shopName });
    } catch (e: any) {
      if (e.name === "ZodError") { res.status(400).json({ error: "validation", issues: e.issues }); return; }
      res.status(500).json({ error: "internal", message: e.message });
    }
  });

  // ---- 認証情報の取得（secretは返さない）----
  app.get("/v1/rms/credentials", async (req, res) => {
    try {
      const uid = await requireAuthUid(req);
      const siteId = String(req.query.siteId || "");
      if (!siteId) { res.status(400).json({ error: "siteId required" }); return; }
      await assertSiteRole(siteId, uid, ["owner", "admin", "member"]);

      const creds = await getRmsCredentials(siteId);
      if (!creds) { res.json({ exists: false }); return; }

      // secretは返さない
      res.json({
        exists: true,
        shopUrl: creds.shopUrl,
        enabled: creds.enabled,
        updatedAt: creds.updatedAt,
      });
    } catch (e: any) {
      res.status(500).json({ error: "internal", message: e.message });
    }
  });

  // ---- 認証情報の削除 ----
  app.delete("/v1/rms/credentials", async (req, res) => {
    try {
      const uid = await requireAuthUid(req);
      const siteId = String(req.query.siteId || "");
      if (!siteId) { res.status(400).json({ error: "siteId required" }); return; }
      await assertSiteRole(siteId, uid, ["owner", "admin"]);

      await deleteRmsCredentials(siteId);
      const db = adminDb();
      await db.collection("sites").doc(siteId).set({ rmsEnabled: false }, { merge: true });

      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: "internal", message: e.message });
    }
  });

  // ---- 手動同期 ----
  app.post("/v1/rms/sync", async (req, res) => {
    try {
      const uid = await requireAuthUid(req);
      const body = SyncSchema.parse(req.body);
      await assertSiteRole(body.siteId, uid, ["owner", "admin"]);

      const result = await syncRmsData(body.siteId, body.daysBack);
      res.json({ ok: true, ...result });
    } catch (e: any) {
      if (e.name === "ZodError") { res.status(400).json({ error: "validation", issues: e.issues }); return; }
      res.status(500).json({ error: "internal", message: e.message });
    }
  });

  // ---- 同期ステータス取得 ----
  app.get("/v1/rms/sync/status", async (req, res) => {
    try {
      const uid = await requireAuthUid(req);
      const siteId = String(req.query.siteId || "");
      if (!siteId) { res.status(400).json({ error: "siteId required" }); return; }
      await assertSiteRole(siteId, uid, ["owner", "admin", "member"]);

      const db = adminDb();
      const snap = await db.collection("rms_sync_logs").doc(siteId).get();
      if (!snap.exists) { res.json({ exists: false }); return; }
      res.json({ exists: true, ...snap.data() });
    } catch (e: any) {
      res.status(500).json({ error: "internal", message: e.message });
    }
  });

  // ---- 注文一覧取得 ----
  app.get("/v1/rms/orders", async (req, res) => {
    try {
      const uid = await requireAuthUid(req);
      const siteId = String(req.query.siteId || "");
      if (!siteId) { res.status(400).json({ error: "siteId required" }); return; }
      await assertSiteRole(siteId, uid, ["owner", "admin", "member"]);

      const db = adminDb();
      const snap = await db.collection("rms_orders")
        .where("siteId", "==", siteId)
        .orderBy("orderDate", "desc")
        .limit(100)
        .get();
      res.json({ orders: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
    } catch (e: any) {
      res.status(500).json({ error: "internal", message: e.message });
    }
  });

  // ---- 商品一覧取得 ----
  app.get("/v1/rms/items", async (req, res) => {
    try {
      const uid = await requireAuthUid(req);
      const siteId = String(req.query.siteId || "");
      if (!siteId) { res.status(400).json({ error: "siteId required" }); return; }
      await assertSiteRole(siteId, uid, ["owner", "admin", "member"]);

      const db = adminDb();
      const snap = await db.collection("rms_items")
        .where("siteId", "==", siteId)
        .limit(200)
        .get();
      res.json({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
    } catch (e: any) {
      res.status(500).json({ error: "internal", message: e.message });
    }
  });

  // ---- 売上集計取得 ----
  app.get("/v1/rms/sales", async (req, res) => {
    try {
      const uid = await requireAuthUid(req);
      const siteId = String(req.query.siteId || "");
      if (!siteId) { res.status(400).json({ error: "siteId required" }); return; }
      await assertSiteRole(siteId, uid, ["owner", "admin", "member"]);

      const dateFrom = String(req.query.from || "");
      const dateTo = String(req.query.to || "");

      const db = adminDb();
      let q = db.collection("rms_sales_daily").where("siteId", "==", siteId) as any;
      if (dateFrom) q = q.where("date", ">=", dateFrom);
      if (dateTo) q = q.where("date", "<=", dateTo);
      const snap = await q.orderBy("date", "desc").limit(90).get();
      res.json({ sales: snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) });
    } catch (e: any) {
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
