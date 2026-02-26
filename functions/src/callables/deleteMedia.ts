import * as functions from "firebase-functions";
import { adminDb } from "../services/admin"; // いつもの adminDb()
import { getAuthOrThrow, assertWorkspaceRole } from "../services/auth.js"; 
// ↑ここは君の既存の認証/権限ヘルパーに合わせて差し替えてOK
// もし無いなら、まずは auth必須だけで運用でもOK

type DeleteMediaReq = {
  workspaceId: string;
  mediaId: string;
};

export const deleteMedia = functions
  .region("asia-northeast1")
  .https.onCall(async (data: DeleteMediaReq, context) => {
    // ---- auth ----
    // フェーズ1は「ログイン必須」だけでもOK。後で role を強化すれば良い。
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", "login_required");
    }

    const workspaceId = String(data?.workspaceId || "").trim();
    const mediaId = String(data?.mediaId || "").trim();
    if (!workspaceId || !mediaId) {
      throw new functions.https.HttpsError("invalid-argument", "workspaceId and mediaId are required");
    }

    // もし権限があるならここでチェック（管理者のみ削除など）
    // assertWorkspaceRole({ uid, workspaceId, role: "admin" });

    const db = adminDb();

    // ---- media doc ----
    const mediaRef = db.collection("media").doc(mediaId);
    const mediaSnap = await mediaRef.get();
    if (!mediaSnap.exists) {
      throw new functions.https.HttpsError("not-found", "media_not_found");
    }

    const media = mediaSnap.data() as any;

    if (String(media.workspaceId || "") !== workspaceId) {
      throw new functions.https.HttpsError("permission-denied", "workspace_mismatch");
    }

    // ---- in-use guard ----
    // actions where workspaceId == ? AND mediaIds array-contains mediaId
    // ※ここは複合インデックス要求されることがある（その場合はリンクが出る）
    let usedSnap;
    try {
      usedSnap = await db
        .collection("actions")
        .where("workspaceId", "==", workspaceId)
        .where("mediaIds", "array-contains", mediaId)
        .limit(20)
        .get();
    } catch (e: any) {
      // failed-precondition: index required など
      console.error("[deleteMedia] query failed", e);
      throw new functions.https.HttpsError(
        "failed-precondition",
        "query_failed_maybe_index_required",
        { message: e?.message || String(e) }
      );
    }

    if (!usedSnap.empty) {
      const usedIn = usedSnap.docs.map((d) => {
        const a = d.data() as any;
        return {
          actionId: d.id,
          title: a?.creative?.title || null,
          type: a?.type || null,
        };
      });

      throw new functions.https.HttpsError(
        "failed-precondition",
        "media_in_use",
        { usedIn }
      );
    }

    // ---- delete storage (optional) ----
    // storagePath がある場合は Storage も消す
    // ※ admin storage を使ってるならここで削除
    // import { getStorage } from "firebase-admin/storage";
    // const bucket = getStorage().bucket();
    // if (media.storagePath) await bucket.file(media.storagePath).delete({ ignoreNotFound: true });

    // ---- delete media doc ----
    await mediaRef.delete();

    return { ok: true };
  });