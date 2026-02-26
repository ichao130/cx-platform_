// functions/src/services/auth.ts
import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export function getAuthOrThrow(req: CallableRequest) {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Login required");
  return { uid };
}

/**
 * roles doc example:
 * workspaces/{workspaceId}/members/{uid} { role: "admin" }
 */
export async function assertWorkspaceRole(
  workspaceId: string,
  uid: string,
  allowed: WorkspaceRole[] = ["owner", "admin"]
) {
  if (!workspaceId) throw new HttpsError("invalid-argument", "workspaceId required");

  const db = getFirestore();
  const snap = await db.doc(`workspaces/${workspaceId}/members/${uid}`).get();
  const role = (snap.exists ? (snap.data()?.role as WorkspaceRole) : null);

  if (!role || !allowed.includes(role)) {
    throw new HttpsError("permission-denied", "Not allowed for this workspace");
  }
  return { role };
}