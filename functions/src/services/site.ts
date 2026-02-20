import { getFirestore } from "firebase-admin/firestore";
import { Site, Workspace } from "../types/db";
// functions/src/services/site.ts
import { adminDb } from "./admin"; // ← パスはプロジェクトに合わせて調整
// もし今 "../services/admin" ならそれでOK


function normalizeOrigin(input: string): string {
  // Ensure scheme + host only (no path)
  try {
    const u = new URL(input);
    return `${u.protocol}//${u.host}`;
  } catch {
    return input;
  }
}

export async function pickSiteById(siteId: string) {
  const db = adminDb();
  const snap = await db.collection("sites").doc(siteId).get();
  return snap.exists ? ({ id: snap.id, ...(snap.data() as any) }) : null;
}

export async function pickWorkspaceById(workspaceId: string) {
  const db = adminDb();
  const snap = await db.collection("workspaces").doc(workspaceId).get();
  return snap.exists ? ({ id: snap.id, ...(snap.data() as any) }) : null;
}

export function assertAllowedOrigin(params: { allowed: string[]; origin?: string; url?: string }) {
  const allowed = (params.allowed || []).map(normalizeOrigin).filter(Boolean);
  const origin = params.origin ? normalizeOrigin(params.origin) : "";

  let urlOrigin = "";
  if (params.url) {
    try {
      urlOrigin = normalizeOrigin(params.url);
    } catch {
      urlOrigin = "";
    }
  }

  // If we have an Origin header, prefer that; otherwise fall back to url.
  const check = origin || urlOrigin;

  if (!check) {
    // No origin info: allow (some server-to-server calls). You can tighten later.
    return;
  }

  const ok = allowed.some((a) => a === check);
  if (!ok) {
    const originHost = origin ? new URL(origin).host : "";
    const urlHost = urlOrigin ? new URL(urlOrigin).host : "";
    throw new Error(`origin not allowed (originHost=${originHost} urlHost=${urlHost})`);
  }
}
