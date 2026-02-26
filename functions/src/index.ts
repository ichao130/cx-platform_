// functions/src/index.ts
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";

import express from "express";
import cors from "cors";

import { getStorage } from "firebase-admin/storage";
import { adminDb } from "./services/admin";

// ★ ここ超重要：君のURLは asia-northeast1 なので揃える
setGlobalOptions({ region: "asia-northeast1" });

/**
 * ==========================
 * HTTP API: /api/v1/...
 * ==========================
 * ここで Express を関数名 `api` として公開する
 */
import { registerV1Routes } from "./routes/v1";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => res.status(200).send("ok"));
registerV1Routes(app);

export const api = onRequest(app);

/**
 * ==========================
 * Callable: deleteMedia
 * ==========================
 */
export const deleteMedia = onCall(async (req) => {
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