// functions/src/index.ts
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

import express from "express";
import cors from "cors";

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

// Firebase Hosting 経由（/api/v1/...）と直接URL（/v1/...）の両方に対応
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/")) req.url = req.url.slice(4); // "/api" を除去
  next();
});

app.get("/", (_req, res) => res.status(200).send("ok"));
registerV1Routes(app);
export const api = onRequest(
{
  region: "asia-northeast1",
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