import { useEffect, useState } from "react";
import { apiPostJson } from "../firebase";

export type LimitResource = "workspaces" | "sites" | "scenarios" | "actions" | "templates" | "media" | "members" | "aiInsights";

export type PlanLimitState = {
  allowed: boolean;
  current: number;
  limit: number | null;
  loading: boolean;
};

/**
 * ワークスペースのプランリミットをリアルタイムで取得するフック。
 * workspaceId が変わるたびに再フェッチ。
 * - allowed: false → ボタンを disabled に
 * - limit: null → 無制限（disabled しない）
 */
export function usePlanLimit(workspaceId: string, resource: LimitResource): PlanLimitState {
  const [state, setState] = useState<PlanLimitState>({
    allowed: true, current: 0, limit: null, loading: false,
  });

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;

    const fetch = () => {
      setState((s) => ({ ...s, loading: true }));
      apiPostJson<{ ok: boolean; allowed: boolean; current: number; limit: number | null }>(
        "/v1/check-can-create",
        { workspace_id: workspaceId, resource }
      )
        .then((res) => {
          if (!cancelled) setState({ allowed: res.allowed, current: res.current, limit: res.limit, loading: false });
        })
        .catch(() => {
          if (!cancelled) setState({ allowed: true, current: 0, limit: null, loading: false });
        });
    };

    fetch();

    // ウィンドウフォーカス時に再取得（特別トライアル付与後などに即反映）
    const onFocus = () => { if (!cancelled) fetch(); };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [workspaceId, resource]);

  return state;
}
