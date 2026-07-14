// admin/src/components/MediaPickerModal.tsx
// メディア（画像）選択モーダル。ActionsPage / QuestionsPage 等で共有。
import React from "react";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export type PickerMediaDoc = {
  workspaceId?: string;
  siteId?: string | null;
  storagePath?: string;
  downloadURL: string;
  originalName?: string;
  contentType?: string;
  size?: number;
  createdAt?: any;
  createdBy?: string;
};

export default function MediaPickerModal(props: {
  open: boolean;
  siteId: string;
  onClose: () => void;
  onPick: (row: { id: string; data: PickerMediaDoc }) => void;
}) {
  const { open, siteId, onClose, onPick } = props;
  const [qText, setQText] = React.useState("");
  const [rows, setRows] = React.useState<Array<{ id: string; data: PickerMediaDoc }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (!siteId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // index不要の確実版：where + limit
        const ref = query(
          collection(db, "media"),
          where("siteId", "==", siteId),
          limit(50)
        );
        const snap = await getDocs(ref);
        if (cancelled) return;

        const list = snap.docs.map((d) => ({ id: d.id, data: d.data() as PickerMediaDoc }));
        setRows(list);
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, siteId]);

  if (!open) return null;

  const key = qText.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (!key) return true;
    const name = (r.data.originalName || "").toLowerCase();
    const url = (r.data.downloadURL || "").toLowerCase();
    return name.includes(key) || url.includes(key);
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(980px, 96vw)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "#111",
          color: "#fff",
          borderRadius: 16,
          padding: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Media Picker</div>
          <div style={{ marginLeft: "auto" }}>
            <button className="btn" onClick={onClose}>
              ✕ 閉じる
            </button>
          </div>
        </div>

        <div style={{ height: 10 }} />

        <input
          className="input"
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          placeholder="検索（ファイル名 / URL）"
        />

        <div style={{ height: 10 }} />

        {err && (
          <div className="small" style={{ color: "#ff6b6b" }}>
            {err}
          </div>
        )}
        {loading && <div className="small">Loading...</div>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          {filtered.map((r) => {
            const isImage = (r.data.contentType || "").startsWith("image/");
            return (
              <button
                key={r.id}
                onClick={() => onPick(r)}
                style={{
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 14,
                  background: "rgba(255,255,255,.06)",
                  padding: 10,
                  textAlign: "left",
                  cursor: "pointer",
                  color: "#fff",
                  minWidth: 0,
                  maxWidth: "100%",
                  overflow: "hidden",
                  boxSizing: "border-box",
                }}
                title={r.data.originalName || r.id}
              >
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.85,
                    marginBottom: 6,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r.data.originalName || r.id}
                </div>

                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "rgba(0,0,0,.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isImage ? (
                    <img
                      src={r.data.downloadURL}
                      alt={r.data.originalName || r.id}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.8 }}>file</div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    opacity: 0.7,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                  }}
                >
                  {r.data.contentType || "unknown"} / {r.id}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
