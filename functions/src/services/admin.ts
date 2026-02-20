import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

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