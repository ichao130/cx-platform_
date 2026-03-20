import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

export async function uploadImageToWorkspace(opts: {
  workspaceId: string;
  siteId?: string;
  file: File;
}): Promise<{ mediaId: string; storagePath: string; downloadURL: string }> {
  const { workspaceId, siteId, file } = opts;
  if (!workspaceId) throw new Error("workspaceId required");

  const safeName = (file.name || "image")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
  const ts = Date.now();

  const path = siteId
    ? `workspaces/${workspaceId}/sites/${siteId}/images/${ts}_${safeName}`
    : `workspaces/${workspaceId}/images/${ts}_${safeName}`;

  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type || "image/*" });
  const downloadURL = await getDownloadURL(r);

  const mediaRef = await addDoc(collection(db, "media"), {
    workspaceId,
    siteId: siteId || "",
    storagePath: path,
    downloadURL,
    originalName: file.name || safeName,
    contentType: file.type || "image/*",
    size: Number(file.size || 0),
    createdAt: serverTimestamp(),
  });

  return {
    mediaId: mediaRef.id,
    storagePath: path,
    downloadURL,
  };
}
