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

/**
 * Extract workspaceId from header.
 * We standardize on: x-workspace-id
 */
export function extractWorkspaceId(req: Request): string {
  const wid = req.header("x-workspace-id");
  if (!wid) throw new Error("missing_workspace_id");
  return wid;
}

/**
 * Require both authenticated user and workspaceId.
 * Returns { uid, workspaceId }
 */
export async function requireAuthWithWorkspace(
  req: Request
): Promise<{ uid: string; workspaceId: string }> {
  const uid = await requireAuthUid(req);
  const workspaceId = extractWorkspaceId(req);
  return { uid, workspaceId };
}

/**
 * Simple CORS handler for admin APIs.
 * Call at the top of route handler.
 */
export function corsForAdmin(req: Request, res: any) {
  const origin = req.header("Origin");
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-workspace-id, x-site-id");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

/**
 * Standard error → HTTP status mapping.
 */
export function resolveHttpStatusFromError(e: any): number {
  const msg = e?.message || "";
  if (msg === "missing_authorization" || msg === "invalid_token") return 401;
  if (msg === "missing_workspace_id") return 400;
  return 400;
}