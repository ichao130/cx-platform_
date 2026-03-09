import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiPostJson, auth } from "../firebase";

type AcceptResult = {
  ok?: boolean;
  workspace_id?: string;
  workspace_name?: string;
  role?: string;
  message?: string;
  error?: string;
};

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function writeSelectedWorkspaceId(workspaceId: string) {
  try {
    window.localStorage.setItem("cx_admin_workspace_id", workspaceId);
    window.localStorage.setItem("cx_admin_selected_workspace", workspaceId);
    window.localStorage.setItem("selectedWorkspaceId", workspaceId);
    window.localStorage.setItem("cx_workspace_id", workspaceId);
    window.dispatchEvent(
      new CustomEvent("cx_admin_workspace_changed", { detail: { workspaceId } })
    );
  } catch {
    // ignore
  }
}

export default function AcceptInvitePage() {
  const query = useQuery();
  const navigate = useNavigate();

  const token = query.get("token") || "";
  const inviteCode = query.get("code") || "";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<AcceptResult | null>(null);

  const signedIn = !!auth.currentUser;

  useEffect(() => {
    if (!token && !inviteCode) {
      setErr("招待トークンが見つかりません。");
    }
  }, [token, inviteCode]);

  const acceptInvite = async () => {
    if (!signedIn) {
      setErr("先にGoogleログインしてください。");
      return;
    }
    if (!token && !inviteCode) {
      setErr("招待トークンが見つかりません。");
      return;
    }

    setErr("");
    setLoading(true);

    try {
      const data = await apiPostJson<AcceptResult>("/v1/workspaces/invites/accept", {
        token: token || inviteCode,
      });

      if (!data?.ok) {
        throw new Error(data?.message || data?.error || "invite_accept_failed");
      }

      setResult(data);

      if (data.workspace_id) {
        writeSelectedWorkspaceId(data.workspace_id);
      }
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ minWidth: 0 }}>
      <div className="card" style={{ minWidth: 0 }}>
        <h1 className="h1">招待を受け取る</h1>
        <div className="small" style={{ opacity: 0.8 }}>
          招待リンクの token を使って workspace に参加します。
        </div>

        <div style={{ height: 14 }} />

        <div className="small" style={{ opacity: 0.75 }}>
          login: <b>{signedIn ? auth.currentUser?.email || "signed in" : "not signed in"}</b>
        </div>

        <div style={{ height: 10 }} />

        <div className="small" style={{ opacity: 0.75 }}>
          token
        </div>
        <input
          className="input"
          value={token || inviteCode}
          readOnly
          style={{ width: "100%" }}
        />

        {err ? (
          <div
            className="small"
            style={{ marginTop: 10, color: "#ff6b6b", whiteSpace: "pre-wrap" }}
          >
            {err}
          </div>
        ) : null}

        {result?.ok ? (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(34,197,94,0.35)",
              background: "rgba(34,197,94,0.08)",
            }}
          >
            <div style={{ fontWeight: 700 }}>参加できました</div>
            <div className="small" style={{ marginTop: 6, opacity: 0.82 }}>
              workspace: <b>{result.workspace_name || result.workspace_id || "-"}</b>
            </div>
            <div className="small" style={{ marginTop: 4, opacity: 0.82 }}>
              role: <b>{result.role || "-"}</b>
            </div>

            <div style={{ height: 10 }} />

            <button
              onClick={() => navigate("/dashboard")}
              className="btn btn--primary"
            >
              ダッシュボードへ
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <button
              onClick={acceptInvite}
              className="btn btn--primary"
              disabled={loading || !signedIn || (!token && !inviteCode)}
            >
              {loading ? "Accepting..." : "招待を受け取る"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}