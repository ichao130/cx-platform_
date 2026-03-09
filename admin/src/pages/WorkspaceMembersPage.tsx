import React, { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { apiPostJson, auth, db } from "../firebase";

// =====================
// Adjust ONLY these paths if your backend uses different route names
// =====================
const API_PATHS = {
  list: "/v1/workspaces/members/list",
  invite: "/v1/workspaces/members/invite",
  invitesList: "/v1/workspaces/invites/list",
  updateRole: "/v1/workspaces/members/upsert",
  remove: "/v1/workspaces/members/remove",
  revokeInvite: "/v1/workspaces/invites/revoke",
};

type Role = "owner" | "admin" | "member" | "viewer";

type Member = {
  uid: string;
  email?: string;
  displayName?: string;
  role: Role;
  joinedAt?: any;
};

type Invite = {
  invite_id: string;
  email: string;
  role: Role;
  token?: string;
  createdAt?: any;
  expiresAt?: any;
  acceptedAt?: any;
  revokedAt?: any;
};

type WorkspaceRow = {
  id: string;
  data: {
    name?: string;
  };
};

function workspaceKeyForUid(uid: string) {
  return `cx_admin_workspace_id:${uid}`;
}

function readSelectedWorkspaceIdForUid(uid?: string): string {
  if (!uid) return "";
  try {
    return window.localStorage.getItem(workspaceKeyForUid(uid)) || "";
  } catch {
    return "";
  }
}

function writeSelectedWorkspaceId(workspaceId: string, uid?: string) {
  if (!uid) return;
  try {
    window.localStorage.setItem(workspaceKeyForUid(uid), workspaceId);
    window.dispatchEvent(new CustomEvent("cx_admin_workspace_changed", { detail: { workspaceId } }));
  } catch {
    // ignore
  }
}

function roleLabel(r: Role) {
  if (r === "owner") return "owner（オーナー）";
  if (r === "admin") return "admin（管理者）";
  if (r === "member") return "member（運用メンバー）";
  return "viewer（閲覧のみ）";
}

function roleColor(r: Role) {
  if (r === "owner") return "#a855f7";
  if (r === "admin") return "#3b82f6";
  if (r === "member") return "#22c55e";
  return "#94a3b8";
}

function fmtAnyTs(v: any) {
  // Firestore Timestamp or ISO string etc
  if (!v) return "-";
  try {
    if (typeof v === "string") return v;
    if (typeof v?.toDate === "function") return v.toDate().toISOString();
    if (typeof v?.seconds === "number") return new Date(v.seconds * 1000).toISOString();
  } catch {}
  return String(v);
}

function workspaceLabel(row?: WorkspaceRow) {
  if (!row) return "";
  return row.data?.name ? `${row.data.name}` : row.id;
}

function mapMemberActionError(message: string) {
  const text = String(message || "");
  if (text.includes("cannot_remove_owner")) return "owner は削除できません。";
  if (text.includes("cannot_remove_self")) return "自分自身はこの画面から削除できません。";
  if (text.includes("member_not_found")) return "対象メンバーが見つかりませんでした。";
  if (text.includes("insufficient_role")) return "この操作を行う権限がありません。";
  if (text.includes("workspace_role_missing")) return "このワークスペースに対する権限がありません。";
  return text;
}

export default function WorkspaceMembersPage() {
  const [currentUid, setCurrentUid] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [workspaceRows, setWorkspaceRows] = useState<WorkspaceRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const currentEmail = auth.currentUser?.email || "";
  const currentDisplayName = auth.currentUser?.displayName || "";
  const [userProfiles, setUserProfiles] = useState<Record<string, { email?: string; displayName?: string }>>({});
  useEffect(() => {
    let cancelled = false;

    const fillProfiles = async () => {
      const uids = Array.from(new Set(members.map((m) => m.uid).filter(Boolean)));
      if (!uids.length) {
        setUserProfiles({});
        return;
      }

      const entries = await Promise.all(
        uids.map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, "users", uid));
            if (!snap.exists()) return [uid, {}] as const;
            const data = (snap.data() || {}) as any;
            return [
              uid,
              {
                email: typeof data.email === "string" ? data.email : "",
                displayName: typeof data.displayName === "string" ? data.displayName : "",
              },
            ] as const;
          } catch {
            return [uid, {}] as const;
          }
        })
      );

      if (!cancelled) {
        setUserProfiles(Object.fromEntries(entries));
      }
    };

    fillProfiles();

    return () => {
      cancelled = true;
    };
  }, [members]);

  const getVisibleAccount = useCallback(
    (m: Member) => {
      if (m.uid === currentUid) {
        return {
          displayName: m.displayName || currentDisplayName || userProfiles[m.uid]?.displayName || "",
          email: m.email || currentEmail || userProfiles[m.uid]?.email || "",
        };
      }
      return {
        displayName: m.displayName || userProfiles[m.uid]?.displayName || "",
        email: m.email || userProfiles[m.uid]?.email || "",
      };
    },
    [currentUid, currentEmail, currentDisplayName, userProfiles]
  );

  // invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [inviting, setInviting] = useState(false);

  const canLoad = useMemo(() => !!workspaceId?.trim(), [workspaceId]);
  const visibleInvites = useMemo(() => {
    return invites.filter((x) => !x.revokedAt);
  }, [invites]);
  const selectedWorkspaceRow = useMemo(
    () => workspaceRows.find((w) => w.id === workspaceId),
    [workspaceRows, workspaceId]
  );
  const selectedWorkspaceName = useMemo(
    () => workspaceLabel(selectedWorkspaceRow),
    [selectedWorkspaceRow]
  );

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      const uid = user?.uid || "";
      setCurrentUid(uid);
      setWorkspaceId("");
      setWorkspaceId(readSelectedWorkspaceIdForUid(uid));
    });
  }, []);

  useEffect(() => {
    if (!currentUid) {
      setWorkspaceRows([]);
      setMembers([]);
      setInvites([]);
      setWorkspaceId("");
      return;
    }

    const q = query(
      collection(db, "workspaces"),
      where(`members.${currentUid}`, "in", ["owner", "admin", "member", "viewer"])
    );

    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, data: d.data() as WorkspaceRow["data"] }));
      setWorkspaceRows(rows);
    });
  }, [currentUid]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (currentUid && e.key === workspaceKeyForUid(currentUid)) {
        setWorkspaceId(readSelectedWorkspaceIdForUid(currentUid));
      }
    };
    const onCustom = (e: any) => {
      const next = e?.detail?.workspaceId;
      if (typeof next === "string") setWorkspaceId(next || "");
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("cx_admin_workspace_changed" as any, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cx_admin_workspace_changed" as any, onCustom);
    };
  }, [currentUid]);

  useEffect(() => {
    if (!currentUid) return;
    if (!workspaceRows.length) {
      setWorkspaceId("");
      return;
    }
    const exists = workspaceId && workspaceRows.some((w) => w.id === workspaceId);
    if (!exists) {
      const next = workspaceRows[0]?.id || "";
      setWorkspaceId(next);
      if (next) writeSelectedWorkspaceId(next, currentUid);
      return;
    }
    if (workspaceId) {
      writeSelectedWorkspaceId(workspaceId, currentUid);
    }
  }, [currentUid, workspaceRows, workspaceId]);

  const load = useCallback(async () => {
    if (!workspaceId?.trim()) return;
    setErr("");
    setLoading(true);

    try {
      writeSelectedWorkspaceId(workspaceId.trim(), currentUid);

      const membersRes = await apiPostJson<any>(API_PATHS.list, {
        workspace_id: workspaceId.trim(),
      });

      if (!membersRes?.ok) {
        throw new Error(membersRes?.message || membersRes?.error || "members_list_failed");
      }

      const memberItems = Array.isArray(membersRes.items) ? membersRes.items : [];
      setMembers(
        memberItems.map((m: any) => ({
          uid: String(m.uid || ""),
          email: m.email || "",
          role: (m.role || "member") as Role,
          joinedAt: m.joinedAt || m.createdAt || null,
        }))
      );

      const invitesRes = await apiPostJson<any>(API_PATHS.invitesList, {
        workspace_id: workspaceId.trim(),
      });

      if (!invitesRes?.ok) {
        throw new Error(invitesRes?.message || invitesRes?.error || "invites_list_failed");
      }

      const inviteItems = Array.isArray(invitesRes.items) ? invitesRes.items : [];
      setInvites(
        inviteItems.map((x: any) => ({
          invite_id: String(x.invite_id || ""),
          email: String(x.email || ""),
          role: (x.role || "member") as Role,
          token: String(x.token || ""),
          createdAt: x.createdAt || null,
          expiresAt: x.expiresAt || null,
          acceptedAt: x.acceptedAt || null,
          revokedAt: x.revokedAt || null,
        }))
      );
    } catch (e: any) {
      console.error(e);
      setErr(mapMemberActionError(e?.message || String(e)));
      setMembers([]);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, currentUid]);

  useEffect(() => {
    // auto-load if workspaceId already present
    if (workspaceId?.trim()) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doInvite = useCallback(async () => {
    if (!workspaceId?.trim()) return;
    if (!inviteEmail.trim()) return;

    setErr("");
    setInviting(true);
    try {
      const data = await apiPostJson<any>(API_PATHS.invite, {
        workspace_id: workspaceId.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      if (!data?.ok) {
        throw new Error(data?.message || data?.error || "invite_failed");
      }

      setInviteEmail("");
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(mapMemberActionError(e?.message || String(e)));
    } finally {
      setInviting(false);
    }
  }, [workspaceId, inviteEmail, inviteRole, load]);

  const buildInviteUrl = useCallback((inv: Invite) => {
    if (!inv.token) return "";
    return `${window.location.origin}/invite?token=${encodeURIComponent(inv.token)}`;
  }, []);

  const copyInviteUrl = useCallback(async (inv: Invite) => {
    const url = buildInviteUrl(inv);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch (e: any) {
      console.error(e);
      setErr("招待URLのコピーに失敗しました。");
    }
  }, [buildInviteUrl]);

  const inviteStatus = useCallback((inv: Invite) => {
    if (inv.revokedAt) return "revoked";
    if (inv.acceptedAt) return "accepted";
    return "pending";
  }, []);

  const revokeInvite = useCallback(
    async (inviteId: string) => {
      if (!workspaceId?.trim()) return;
      if (!confirm("この招待を取り消しますか？")) return;

      setErr("");
      try {
        const data = await apiPostJson<any>(API_PATHS.revokeInvite, {
          workspace_id: workspaceId.trim(),
          invite_id: inviteId,
        });

        if (!data?.ok) {
          throw new Error(data?.message || data?.error || "invite_revoke_failed");
        }

        await load();
      } catch (e: any) {
        console.error(e);
        setErr(mapMemberActionError(e?.message || String(e)));
      }
    },
    [workspaceId, load]
  );

  const updateRole = useCallback(
    async (uid: string, nextRole: Role) => {
      if (!workspaceId?.trim()) return;
      const currentMember = members.find((m) => m.uid === uid);
      if (uid === currentUid && currentMember?.role === "owner" && nextRole !== "owner") {
        setErr("owner は自分自身のロールを変更できません。");
        return;
      }
      setErr("");
      try {
        const data = await apiPostJson<any>(API_PATHS.updateRole, {
          workspace_id: workspaceId.trim(),
          uid,
          role: nextRole,
        });

        if (!data?.ok) {
          throw new Error(data?.message || data?.error || "update_role_failed");
        }

        setMembers((prev) => prev.map((m) => (m.uid === uid ? { ...m, role: nextRole } : m)));
        } catch (e: any) {
          console.error(e);
          setErr(mapMemberActionError(e?.message || String(e)));
        }
    },
    [workspaceId, members, currentUid]
  );


  const removeMember = useCallback(
    async (uid: string) => {
      if (!workspaceId?.trim()) return;
      const currentMember = members.find((m) => m.uid === uid);
      const visible = currentMember ? getVisibleAccount(currentMember) : { displayName: "", email: "" };
      const label = visible.displayName || visible.email || uid;

      if (currentMember?.role === "owner") {
        setErr("owner は削除できません。必要な場合は別の owner を用意してから対応してください。");
        return;
      }
      if (uid === currentUid) {
        setErr("自分自身はこの画面から削除できません。");
        return;
      }
      if (!confirm(`「${label}」をこのワークスペースから削除しますか？`)) return;

      setErr("");
      try {
        const data = await apiPostJson<any>(API_PATHS.remove, {
          workspace_id: workspaceId.trim(),
          uid,
        });

        if (!data?.ok) {
          throw new Error(data?.message || data?.error || "remove_member_failed");
        }

        setMembers((prev) => prev.filter((m) => m.uid !== uid));
      } catch (e: any) {
        console.error(e);
        setErr(mapMemberActionError(e?.message || String(e)));
      }
    },
    [workspaceId, members, currentUid, getVisibleAccount]
  );



  return (
    <div className="container" style={{ minWidth: 0 }}>
      <div className="card" style={{ minWidth: 0 }}>
        <h1 className="h1">メンバー管理</h1>
        <div className="small" style={{ opacity: 0.8 }}>
          ワークスペースごとのメンバー招待、権限変更、削除を行う画面です。
        </div>
        <div className="small" style={{ marginTop: 8, opacity: 0.72, lineHeight: 1.6 }}>
          `workspace_role_missing` が出る場合は、選択中のワークスペースと権限を付与したワークスペースがズレている可能性があります。まず下のワークスペース選択を確認してください。
        </div>

        <div style={{ height: 12 }} />

        <div className="small" style={{ opacity: 0.72, marginBottom: 8 }}>
          現在のワークスペース: <b>{selectedWorkspaceName || workspaceId || "-"}</b>
        </div>

        {/* Workspace selector */}
        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="small" style={{ opacity: 0.8 }}>ワークスペース</div>
          <select
            className="input"
            value={workspaceId}
            onChange={(e) => {
              const next = e.target.value;
              setWorkspaceId(next);
              writeSelectedWorkspaceId(next, currentUid);
            }}
            style={{ minWidth: 320, flex: "1 1 320px" }}
          >
            {workspaceRows.length === 0 ? (
              <option value="">ワークスペースがありません</option>
            ) : null}
            {workspaceRows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.data?.name ? `${w.data.name} (${w.id})` : w.id}
              </option>
            ))}
          </select>
          <button onClick={() => load()} disabled={!canLoad || loading}>
            {loading ? "読込中..." : "メンバー情報を取得"}
          </button>
        </div>

        {err ? (
          <div className="small" style={{ marginTop: 10, color: "#ff6b6b", whiteSpace: "pre-wrap" }}>
            {err}
          </div>
        ) : null}
      </div>

      <div style={{ height: 14 }} />

      {/* Invite */}
      <div className="card" style={{ minWidth: 0 }}>
        <div className="h2" style={{ margin: 0 }}>メンバーを招待</div>
        <div className="small" style={{ opacity: 0.75, marginTop: 6 }}>
          メールアドレスと権限を指定して招待リンクを作成します。作成後は下の招待一覧から URL をワンクリックでコピーできます。
        </div>

        <div style={{ height: 10 }} />

        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="input"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@example.com"
            style={{ minWidth: 320, flex: "1 1 320px" }}
          />
          <select
            className="input"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
            style={{ width: 160 }}
          >
            <option value="admin">admin（管理者）</option>
            <option value="member">member（運用メンバー）</option>
            <option value="viewer">viewer（閲覧のみ）</option>
          </select>

          <button onClick={doInvite} disabled={!canLoad || inviting || !inviteEmail.trim()}>
            {inviting ? "招待中..." : "招待リンクを作成"}
          </button>
        </div>
      </div>

      <div style={{ height: 14 }} />

      {/* Members */}
      <div className="card" style={{ minWidth: 0 }}>
        <div className="h2" style={{ margin: 0 }}>メンバー一覧</div>

        <div style={{ height: 10 }} />

        <table className="table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>アカウント</th>
              <th style={{ textAlign: "left" }}>メールアドレス</th>
              <th style={{ textAlign: "left" }}>UID</th>
              <th style={{ textAlign: "left" }}>権限</th>
              <th style={{ textAlign: "left" }}>参加日時</th>
              <th style={{ textAlign: "right" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {members.length ? (
              members.map((m) => (
                <tr key={m.uid}>
                  <td style={{ textAlign: "left" }}>
                    {(() => {
                      const visible = getVisibleAccount(m);
                      const isSelfOwner = m.uid === currentUid && m.role === "owner";
                      return (
                        <div>
                          <div>{visible.displayName || "-"}</div>
                          {isSelfOwner ? (
                            <div className="small" style={{ opacity: 0.72 }}>
                              現在のオーナー
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ textAlign: "left" }}>{getVisibleAccount(m).email || "-"}</td>
                  <td style={{ textAlign: "left", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", opacity: 0.82 }}>
                    {m.uid}
                  </td>
                  <td style={{ textAlign: "left" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.06)",
                        border: `1px solid ${roleColor(m.role)}`,
                        color: "white",
                        marginRight: 10,
                      }}
                    >
                      {roleLabel(m.role)}
                    </span>

                    <select
                      className="input"
                      value={m.role}
                      onChange={(e) => updateRole(m.uid, e.target.value as Role)}
                      style={{ width: 160 }}
                      disabled={m.role === "owner"}
                    >
                      {m.role === "owner" ? <option value="owner">owner（オーナー）</option> : null}
                      <option value="admin">admin（管理者）</option>
                      <option value="member">member（運用メンバー）</option>
                      <option value="viewer">viewer（閲覧のみ）</option>
                    </select>
                    {m.role === "owner" ? (
                      <div className="small" style={{ marginTop: 6, opacity: 0.72 }}>
                        owner はこの画面から変更できません
                      </div>
                    ) : null}
                  </td>
                  <td style={{ textAlign: "left" }}>{fmtAnyTs(m.joinedAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      onClick={() => removeMember(m.uid)}
                      style={{ background: "rgba(239,68,68,0.15)" }}
                      disabled={m.role === "owner" || m.uid === currentUid}
                    >
                      削除する
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ opacity: 0.75 }}>
                  メンバーはまだ登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ height: 14 }} />

      {/* Invites */}
      <div className="card" style={{ minWidth: 0 }}>
        <div className="h2" style={{ margin: 0 }}>招待一覧</div>
        <div className="small" style={{ opacity: 0.75, marginTop: 6 }}>
          取り消し済みの招待は一覧から非表示にしています。pending / accepted を中心に確認できます。
        </div>

        <div style={{ height: 10 }} />

        <table className="table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>招待ID</th>
              <th style={{ textAlign: "left" }}>メールアドレス</th>
              <th style={{ textAlign: "left" }}>権限</th>
              <th style={{ textAlign: "left" }}>状態</th>
              <th style={{ textAlign: "left" }}>招待URL</th>
              <th style={{ textAlign: "left" }}>作成日時</th>
              <th style={{ textAlign: "left" }}>有効期限</th>
              <th style={{ textAlign: "left" }}>承認日時</th>
              <th style={{ textAlign: "left" }}>取り消し日時</th>
              <th style={{ textAlign: "right" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {visibleInvites.length ? (
              visibleInvites.map((x) => (
                <tr key={x.invite_id}>
                  <td style={{ textAlign: "left", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                    {x.invite_id}
                  </td>
                  <td style={{ textAlign: "left" }}>{x.email}</td>
                  <td style={{ textAlign: "left" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.06)",
                        border: `1px solid ${roleColor(x.role)}`,
                        color: "white",
                      }}
                    >
                      {roleLabel(x.role)}
                    </span>
                  </td>
                  <td style={{ textAlign: "left" }}>{inviteStatus(x)}</td>
                  <td style={{ textAlign: "left", minWidth: 360 }}>
                    {x.token ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <input className="input" readOnly value={buildInviteUrl(x)} />
                        <button onClick={() => copyInviteUrl(x)} style={{ width: 140 }}>
                          URLをコピー
                        </button>
                      </div>
                    ) : (
                      <span style={{ opacity: 0.7 }}>-</span>
                    )}
                  </td>
                  <td style={{ textAlign: "left" }}>{fmtAnyTs(x.createdAt)}</td>
                  <td style={{ textAlign: "left" }}>{fmtAnyTs(x.expiresAt)}</td>
                  <td style={{ textAlign: "left" }}>{fmtAnyTs(x.acceptedAt)}</td>
                  <td style={{ textAlign: "left" }}>{fmtAnyTs(x.revokedAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    {!x.acceptedAt && !x.revokedAt ? (
                      <button onClick={() => revokeInvite(x.invite_id)} style={{ background: "rgba(239,68,68,0.15)" }}>
                        招待を取り消す
                      </button>
                    ) : (
                      <span style={{ opacity: 0.7 }}>-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} style={{ opacity: 0.75 }}>
                  招待中のメンバーはいません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}