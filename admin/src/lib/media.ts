// admin/src/lib/media.ts
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, storage } from "../firebase";
import { genId } from "../components/id";

export type MediaDoc = {
  workspaceId: string;
  siteId?: string;
  storagePath: string;
  downloadURL: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt: any;
  createdBy: string;
  tags?: string[];
};

// アップロード許可MIMEタイプ
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif"] as const;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function validateMediaFile(file: File): void {
  const mime = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mime as typeof ALLOWED_MIME_TYPES[number])) {
    throw new Error(
      `対応していないファイル形式です（${file.name}）。GIF / JPG / PNG のみアップロードできます。`
    );
  }
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `対応していない拡張子です（${file.name}）。.gif / .jpg / .jpeg / .png のみ使用できます。`
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `ファイルサイズが上限（10MB）を超えています（${file.name}: ${(file.size / 1024 / 1024).toFixed(1)}MB）`
    );
  }
}

function safeFilename(name: string) {
  return (name || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

export async function uploadMediaToWorkspace(opts: {
  workspaceId: string;
  siteId?: string;
  file: File;
}): Promise<{ mediaId: string; data: MediaDoc }> {
  const { workspaceId, siteId, file } = opts;
  if (!workspaceId) throw new Error("workspaceId required");

  // ファイル形式・サイズのバリデーション
  validateMediaFile(file);

  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("not signed in");

  const mediaId = genId("med");
  const ts = Date.now();
  const safeName = safeFilename(file.name);

  const storagePath = siteId
    ? `workspaces/${workspaceId}/sites/${siteId}/media/${mediaId}/${ts}_${safeName}`
    : `workspaces/${workspaceId}/media/${mediaId}/${ts}_${safeName}`;

  const r = ref(storage, storagePath);
  await uploadBytes(r, file, { contentType: file.type || "application/octet-stream" });

  const downloadURL = await getDownloadURL(r);


    function stripUndefined<T extends Record<string, any>>(obj: T): T {
        const out: any = {};
        Object.keys(obj).forEach((k) => {
            const v = (obj as any)[k];
            if (v !== undefined) out[k] = v;
        });
        return out;
    }

    // 使い方
    const payload = stripUndefined({
        workspaceId,
        siteId, // undefinedでもOK
        storagePath,
        downloadURL,
        originalName: file.name || safeName,
        contentType: file.type || "application/octet-stream",
        size: file.size || 0,
        createdAt: serverTimestamp(),
        createdBy: uid,
    });

    await setDoc(doc(db, "media", mediaId), payload, { merge: true });
  return { mediaId, data: payload };
}