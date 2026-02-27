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

export function assertAllowedOrigin({ allowed, origin, url }: { allowed: string[]; origin: string; url?: string }) {
  const allowedHosts = allowed
    .map((s) => {
      try { return new URL(s).host; } catch { return String(s).replace(/^https?:\/\//, "").split("/")[0]; }
    })
    .filter(Boolean);

  const originHost = origin ? new URL(origin).host : "";
  const urlHost = url ? (() => { try { return new URL(url).host; } catch { return ""; } })() : "";

  // ★url が無いときは origin だけで判定
  if (originHost && allowedHosts.includes(originHost)) return;

  // ★url があるときは urlHost でもOK
  if (urlHost && allowedHosts.includes(urlHost)) return;

  throw new Error(`origin not allowed (originHost=${originHost} urlHost=${urlHost})`);
}
