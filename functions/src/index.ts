// functions/src/index.ts
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
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