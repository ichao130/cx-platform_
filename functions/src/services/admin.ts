import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";
import type { Request } from "express";

export function ensureAdminApp() {
  if (getApps().length) return getApps()[0];
  return initializeApp(); // Cloud Functions 上はこれでOK（認証は自動）
}

export function adminDb() {
  return getFirestore(ensureAdminApp());
}

export function adminBucket() {
  return getStorage(ensureAdminApp()).bucket(); // デフォルトバケット
}

export function adminAuth() {
  return getAuth(ensureAdminApp());
}

export async function verifyIdToken(idToken: string) {
  if (!idToken) throw new Error("missing_authorization");
  try {
    return await adminAuth().verifyIdToken(idToken);
  } catch (e) {
    throw new Error("invalid_token");
  }
}

export function extractBearerToken(req: Request): string {
  const auth = req.header("Authorization") || "";
  if (!auth.startsWith("Bearer ")) throw new Error("missing_authorization");
  return auth.replace("Bearer ", "").trim();
}

export async function requireAuthUid(req: Request): Promise<string> {
  const token = extractBearerToken(req);
  const decoded = await verifyIdToken(token);
  if (!decoded?.uid) throw new Error("invalid_token");
  return decoded.uid;
}