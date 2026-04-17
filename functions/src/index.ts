// functions/src/index.ts
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";

import express from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";

import { getStorage } from "firebase-admin/storage";
import { adminDb } from "./services/admin";


// ★ ここ超重要：君のURLは asia-northeast1 なので揃える
setGlobalOptions({ region: "asia-northeast1" });

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const POSTMARK_SERVER_TOKEN = defineSecret("POSTMARK_SERVER_TOKEN");
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const MISOCA_CLIENT_ID = defineSecret("MISOCA_CLIENT_ID");
const MISOCA_CLIENT_SECRET = defineSecret("MISOCA_CLIENT_SECRET");


/**
 * ==========================
 * HTTP API: /api/v1/...
 * ==========================
 * ここで Express を関数名 `api` として公開する
 */
import { registerV1Routes } from "./routes/v1";
import { registerMcpRoutes } from "./routes/mcp";
import { sendMisocaInvoicesJob } from "./services/misoca";
import { executeQueuedBackupRun, maybeEnqueueScheduledBackup } from "./services/backup";

const app = express();
app.set("etag", false);
app.use(cors({ origin: true }));
// rawBody を保持（Stripe webhook の署名検証で必要）
app.use(express.json({
  limit: "1mb",
  verify: (req: any, _res, buf) => { req.rawBody = buf; },
}));
// Shopify Web Pixel の sendBeacon は text/plain で送ってくるため JSON としてパース
app.use(express.text({ type: "text/plain", limit: "1mb" }));
app.use((req: any, _res, next) => {
  if (typeof req.body === "string") {
    try { req.body = JSON.parse(req.body); } catch {}
  }
  next();
});

// Firebase Hosting 経由（/api/v1/...）と直接URL（/v1/...）の両方に対応
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/")) req.url = req.url.slice(4); // "/api" を除去
  next();
});

/* ──────────────────────────────────────────────────────────
   レートリミット設定
   ※ Cloud Functions はインスタンスが複数立ち上がる可能性があるため
      per-instance の制限になる。グローバル制限が必要な場合は
      Cloud Armor（GCP WAF）を追加で設定すること。
────────────────────────────────────────────────────────── */

// AI系（OpenAI コスト保護）: 1分あたり15リクエスト/IP
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "rate_limit_exceeded", message: "Too many requests, please try again later." },
  skip: (req) => req.method === "OPTIONS",
});

// ログ・トラッキング（公開エンドポイント）: 1分あたり60リクエスト/IP
const logLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "rate_limit_exceeded" },
  skip: (req) => req.method === "OPTIONS",
});

// 一般API（認証あり）: 1分あたり120リクエスト/IP
const apiLimiter = rateLimit({
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
registerV1Routes(app);
registerMcpRoutes(app);
export const api = onRequest(
{
  region: "asia-northeast1",
  // コスト爆発防止: インスタンスの最大数を制限
  maxInstances: 20,
  // メモリとタイムアウトの上限設定
  memory: "256MiB",
  timeoutSeconds: 60,
  secrets: [OPENAI_API_KEY, POSTMARK_SERVER_TOKEN, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, MISOCA_CLIENT_ID, MISOCA_CLIENT_SECRET],
},
app
);


/**
 * ワークスペースの全データを完全削除するヘルパー
 * - workspaces, workspace_billing, workspace_limit_overrides, workspace_invites
 * - sites, scenarios, actions, templates
 * - media（Firestoreドキュメント＋Storageファイル）
 * - logs, stats_daily（siteId経由・コスト節約のため全削除）
 */
async function deleteWorkspaceAllData(workspaceId: string): Promise<void> {
  const db = adminDb();
  const storage = getStorage().bucket();

  /** バッチ削除ヘルパー（400件ずつ）*/
  async function batchDelete(refs: FirebaseFirestore.DocumentReference[]) {
    for (let i = 0; i < refs.length; i += 400) {
      const batch = db.batch();
      refs.slice(i, i + 400).forEach((r) => batch.delete(r));
      await batch.commit();
    }
  }

  /** クエリ結果を全件削除（大量データ対応・ページネーション）*/
  async function deleteQuery(q: FirebaseFirestore.Query) {
    let deleted = 0;
    while (true) {
      const snap = await q.limit(400).get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deleted += snap.size;
      if (snap.size < 400) break;
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
  await Promise.allSettled(
    mediaSnap.docs.map(async (d) => {
      const storagePath = (d.data() as any).storagePath;
      if (storagePath) {
        try { await storage.file(storagePath).delete({ ignoreNotFound: true } as any); } catch {}
      }
    })
  );

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
 * 最終ログインから30日間未ログイン + 10日グレース後にFreeアカウントを完全削除する。
 * - Firebase Auth の lastSignInTime を基準にする
 * - 有料プランへ移行済みはスキップ
 * - 特別トライアル中（access_override_active）はスキップ
 * ==========================
 */
export const cleanupExpiredFreeAccounts = onSchedule(
  { region: "asia-northeast1", schedule: "0 18 * * *", timeZone: "UTC", timeoutSeconds: 540 }, // UTC 18:00 = JST 03:00
  async () => {
    const db = adminDb();
    const { getAuth: getAdminAuth } = await import("firebase-admin/auth");
    const now = Date.now();
    const INACTIVE_MS = 30 * 24 * 60 * 60 * 1000; // 未ログイン判定: 30日
    const GRACE_MS   = 10 * 24 * 60 * 60 * 1000; // 猶予期間: 10日

    const wsSnap = await db.collection("workspaces").get();
    let deleted = 0;

    for (const doc of wsSnap.docs) {
      const ws = doc.data() as any;
      const billing = (ws.billing || {}) as any;

      // 有料プランへ移行済みはスキップ
      if (billing.plan && billing.plan !== "free") continue;

      // 特別トライアル中はスキップ
      const accessSnap = await db.collection("workspace_billing").doc(doc.id).get();
      const access = (accessSnap.data() || {}) as any;
      if (access.access_override_active) {
        const until = access.access_override_until ? new Date(access.access_override_until).getTime() : Infinity;
        if (until > now) continue;
      }

      // ワークスペースのオーナーUIDを取得
      const ownerUid = String(ws.ownerUid || "");
      if (!ownerUid) continue;

      // Firebase Auth から最終ログイン日時を取得
      let lastSignInMs: number;
      try {
        const authUser = await getAdminAuth().getUser(ownerUid);
        lastSignInMs = authUser.metadata.lastSignInTime
          ? new Date(authUser.metadata.lastSignInTime).getTime()
          : new Date(authUser.metadata.creationTime).getTime();
      } catch {
        // ユーザーが存在しない場合はスキップ
        continue;
      }

      // 最終ログインから30日+10日（猶予）を過ぎていなければスキップ
      if (now < lastSignInMs + INACTIVE_MS + GRACE_MS) continue;

      // 完全削除
      try {
        await deleteWorkspaceAllData(doc.id);
        deleted++;
        console.log(`[cleanupExpiredFreeAccounts] deleted workspaceId=${doc.id} ownerUid=${ownerUid} lastSignIn=${new Date(lastSignInMs).toISOString()}`);
      } catch (e) {
        console.error(`[cleanupExpiredFreeAccounts] failed to delete workspaceId=${doc.id}:`, e);
      }
    }

    console.log(`[cleanupExpiredFreeAccounts] deleted ${deleted} expired free workspaces`);
  }
);

/**
 * ==========================
 * Scheduled: 毎月25日 MISOCA 請求書自動発行
 * UTC 00:00 = JST 09:00 に実行
 * ==========================
 */
export const sendMonthlyMisocaInvoices = onSchedule(
  {
    region: "asia-northeast1",
    schedule: "0 0 25 * *", // UTC 00:00 = JST 09:00
    timeZone: "UTC",
    timeoutSeconds: 300,
    secrets: [MISOCA_CLIENT_ID, MISOCA_CLIENT_SECRET],
  },
  async () => {
    const clientId = MISOCA_CLIENT_ID.value().trim();
    const clientSecret = MISOCA_CLIENT_SECRET.value().trim();
    if (!clientId || !clientSecret) {
      console.error("[sendMonthlyMisocaInvoices] MISOCA シークレットが未設定です");
      return;
    }
    try {
      const result = await sendMisocaInvoicesJob(clientId, clientSecret);
      console.log("[sendMonthlyMisocaInvoices] 完了:", result);
    } catch (e) {
      console.error("[sendMonthlyMisocaInvoices] エラー:", e);
    }
  }
);

/**
 * ==========================
 * Scheduled: 毎日バックアップのキュー投入
 * 毎時0分に起動し、JST時刻が設定値と一致する場合だけ queued を作成する
 * ==========================
 */
export const enqueueDailyBackups = onSchedule(
  {
    region: "asia-northeast1",
    schedule: "0 * * * *",
    timeZone: "UTC",
    timeoutSeconds: 180,
  },
  async () => {
    try {
      const result = await maybeEnqueueScheduledBackup();
      console.log("[enqueueDailyBackups] result:", result);
    } catch (e) {
      console.error("[enqueueDailyBackups] error:", e);
    }
  }
);

/**
 * ==========================
 * Firestore Trigger: backup_runs の queued を処理
 * ==========================
 */
export const processBackupRun = onDocumentCreated(
  {
    region: "asia-northeast1",
    document: "backup_runs/{runId}",
    memory: "1GiB",
    timeoutSeconds: 540,
  },
  async (event) => {
    const runId = String(event.params.runId || "");
    if (!runId) return;
    try {
      await executeQueuedBackupRun(runId);
    } catch (e) {
      console.error(`[processBackupRun] runId=${runId} error:`, e);
    }
  }
);

/**
 * ==========================
 * Callable: deleteMedia
 * ==========================
 */
export const deleteMedia = onCall({ region: "asia-northeast1" }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign in required");

  const mediaId = String((req.data as any)?.mediaId || "");
  if (!mediaId) throw new HttpsError("invalid-argument", "mediaId required");

  const db = adminDb();

  const mediaRef = db.collection("media").doc(mediaId);
  const mediaSnap = await mediaRef.get();
  if (!mediaSnap.exists) throw new HttpsError("not-found", "media not found");

  const media = mediaSnap.data() as any;
  const workspaceId = String(media.workspaceId || "");
  const storagePath = String(media.storagePath || "");
  const createdBy = String(media.createdBy || "");

  if (!workspaceId) throw new HttpsError("failed-precondition", "workspaceId missing");
  if (!storagePath) throw new HttpsError("failed-precondition", "storagePath missing");

  // “管理者のみ”チェック（暫定）
  const wsSnap = await db.collection("workspaces").doc(workspaceId).get();
  const ws = (wsSnap.exists ? wsSnap.data() : null) as any;

  const adminUids: string[] = Array.isArray(ws?.adminUids) ? ws.adminUids : [];
  const ownerUid: string = String(ws?.ownerUid || "");

  const isAdmin = adminUids.includes(uid) || ownerUid === uid || createdBy === uid;
  if (!isAdmin) throw new HttpsError("permission-denied", "not allowed");

  // Storage delete
  try {
    const bucket = getStorage().bucket();
    await bucket.file(storagePath).delete({ ignoreNotFound: true } as any);
  } catch {
    // ファイルが無い/削除済みでも進める
  }

  // Firestore meta delete
  await mediaRef.delete();

  return { ok: true };
});
