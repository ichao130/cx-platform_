import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, apiPostJson } from "../firebase";

type MemberRole = "owner" | "admin" | "member" | "viewer";

type MemberRecord = {
  role: MemberRole;
  invitedAt?: any;
  invitedEmail?: string;
  note?: string;
};

type WorkspaceInviteRecord = {
  email?: string;
  role?: MemberRole;
  status?: string;
  token?: string;
  createdAt?: any;
  expiresAt?: any;
};

type WorkspaceDoc = {
  name?: string;
  createdAt?: any;
  updatedAt?: any;
  members?: Record<string, MemberRecord>;
  invites?: Record<string, WorkspaceInviteRecord>;
};

type WorkspaceRow = {
  id: string;
  data: {
    name?: string;
  };
};

const LS_KEYS = ["cx_admin_workspace_id", "cx_admin_selected_workspace", "selectedWorkspaceId"];

function readWorkspaceIdFromStorage(): string | null {
  for (const k of LS_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v && typeof v === "string") return v;
  }
  return null;
}

function writeWorkspaceIdToStorage(workspaceId: string) {
  for (const k of LS_KEYS) {
    window.localStorage.setItem(k, workspaceId);
  }
  window.localStorage.setItem("cx_workspace_id", workspaceId);
  window.dispatchEvent(new CustomEvent("cx_admin_workspace_changed", { detail: { workspaceId } }));
}

function roleLabel(r: MemberRole) {
  return r.charAt(0).toUpperCase() + r.slice(1);
}

function pillStyle(role: MemberRole): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
  };
  if (role === "owner") return { ...base, background: "rgba(34,197,94,0.18)" };
  if (role === "admin") return { ...base, background: "rgba(59,130,246,0.18)" };
  if (role === "member") return { ...base, background: "rgba(245,158,11,0.18)" };
  return { ...base, background: "rgba(148,163,184,0.14)" };
}

export default function MembersPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : readWorkspaceIdFromStorage()
  );
  const [workspaceRows, setWorkspaceRows] = useState<WorkspaceRow[]>([]);

  const [workspace, setWorkspace] = useState<WorkspaceDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uidInput, setUidInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [role, setRole] = useState<MemberRole>("member");
  const [saving, setSaving] = useState(false);

  const currentUid = auth?.currentUser?.uid || null;

  useEffect(() => {
    const q = query(collection(db, "workspaces"), orderBy("__name__"));
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, data: d.data() as WorkspaceRow["data"] }));
      setWorkspaceRows(rows);
    });
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key || [...LS_KEYS, "cx_workspace_id"].includes(e.key)) {
        const next = readWorkspaceIdFromStorage();
        if (next) setWorkspaceId(next);
      }
    };
    const onCustom = (ev: any) => {
      const next = ev?.detail?.workspaceId;
      if (next) setWorkspaceId(next);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("cx_admin_workspace_changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cx_admin_workspace_changed", onCustom);
    };
  }, []);

  useEffect(() => {
    if (!workspaceRows.length) return;
    const exists = workspaceId && workspaceRows.some((w) => w.id === workspaceId);
    if (!exists) {
      const next = workspaceRows[0]?.id || null;
      setWorkspaceId(next);
      if (next) writeWorkspaceIdToStorage(next);
    }
  }, [workspaceRows, workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;

    const ref = doc(db, "workspaces", workspaceId);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        setWorkspace((snap.data() || null) as WorkspaceDoc);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [workspaceId]);

  const members = useMemo(() => {
    const m = workspace?.members || {};

    const roleOrder: Record<MemberRole, number> = {
      owner: 0,
      admin: 1,
      member: 2,
      viewer: 3,
    };

    return Object.entries(m)
      .map(([uid, rec]) => ({ uid, ...(rec as MemberRecord) }))
      .sort((a, b) => {
        const ra = roleOrder[a.role] ?? 9;
        const rb = roleOrder[b.role] ?? 9;
        if (ra !== rb) return ra - rb;
        return a.uid.localeCompare(b.uid);
      });
  }, [workspace]);

  const invites = useMemo(() => {
    const m = workspace?.invites || {};
    return Object.entries(m)
      .map(([id, rec]) => ({ id, ...(rec as WorkspaceInviteRecord) }))
      .sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));
  }, [workspace]);

  const addMember = async () => {
    if (!workspaceId) return;
    if (!uidInput.trim()) return;

    setSaving(true);

    try {
      const ref = doc(db, "workspaces", workspaceId);

      await updateDoc(ref, {
        [`members.${uidInput.trim()}`]: {
          role,
          invitedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      } as any);

      setUidInput("");
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    }

    setSaving(false);
  };

  const inviteMember = async () => {
    if (!workspaceId) return;
    if (!emailInput.trim()) return;

    setSaving(true);

    try {
      const email = emailInput.trim().toLowerCase();

      const result = await apiPostJson("/v1/workspaces/members/invite", {
        workspace_id: workspaceId,
        email,
        role,
      });

      const inviteId = result?.invite_id || `local_${Date.now()}`;
      const ref = doc(db, "workspaces", workspaceId);

      await updateDoc(ref, {
        [`invites.${inviteId}`]: {
          email,
          role,
          status: "pending",
          token: result?.token || null,
          createdAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      } as any);

      setEmailInput("");
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    }

    setSaving(false);
  };

  const removeMember = async (uid: string) => {
    if (!workspaceId) return;

    const owners = members.filter((m) => m.role === "owner");
    const target = members.find((m) => m.uid === uid);

    if (target?.role === "owner" && owners.length <= 1) {
      alert("最後の owner は削除できません");
      return;
    }

    const ref = doc(db, "workspaces", workspaceId);

    await updateDoc(ref, {
      [`members.${uid}`]: deleteField(),
    } as any);
  };

  const makeMeOwner = async () => {
    if (!workspaceId || !currentUid) return;

    const ref = doc(db, "workspaces", workspaceId);

    await setDoc(
      ref,
      {
        members: {
          [currentUid]: {
            role: "owner",
            invitedAt: serverTimestamp(),
          },
        },
      },
      { merge: true }
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Members</h2>

      <div style={{ marginBottom: 12 }}>
        workspace: <b>{workspaceId || "none"}</b>
      </div>
      <div style={{ marginBottom: 12, opacity: 0.72, fontSize: 12, lineHeight: 1.6 }}>
        `workspace_role_missing` が出る場合は、選択中 workspace と owner/admin を付与した workspace がズレている可能性があります。下のプルダウンで対象 workspace を確認してください。
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 8, opacity: 0.8, fontSize: 13 }}>
          workspace はプルダウンで選択します。現在の選択は他ページとも共有されます。
        </div>
        <select
          value={workspaceId || ""}
          onChange={(e) => {
            const next = e.target.value || null;
            setWorkspaceId(next);
            if (next) writeWorkspaceIdToStorage(next);
          }}
          style={{ minWidth: 360 }}
        >
          {workspaceRows.length === 0 ? (
            <option value="">workspace がありません</option>
          ) : null}
          {workspaceRows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.data?.name ? `${w.data.name} (${w.id})` : w.id}
            </option>
          ))}
        </select>
      </div>

      <button onClick={makeMeOwner} disabled={!workspaceId}>Make me Owner</button>

      <div style={{ marginTop: 20 }}>
        <div style={{ marginBottom: 8, opacity: 0.8, fontSize: 13 }}>
          メール招待と Firebase UID 直接追加の両方に対応しています。
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Email Invite</div>
            <input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="招待するメールアドレス"
            />
            <div style={{ height: 8 }} />
            <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
              <option value="owner">owner</option>
              <option value="admin">admin</option>
              <option value="member">member</option>
              <option value="viewer">viewer</option>
            </select>
            <div style={{ height: 8 }} />
            <button onClick={inviteMember} disabled={saving}>
              Invite by Email
            </button>
            <div style={{ marginTop: 8, opacity: 0.72, fontSize: 12, lineHeight: 1.6 }}>
              POST /v1/workspaces/members/invite を呼び出し、pending invite を作成します。
            </div>
          </div>

          <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Direct UID Add</div>
            <input
              value={uidInput}
              onChange={(e) => setUidInput(e.target.value)}
              placeholder="Firebase UID を入力"
            />
            <div style={{ height: 8 }} />
            <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
              <option value="owner">owner</option>
              <option value="admin">admin</option>
              <option value="member">member</option>
              <option value="viewer">viewer</option>
            </select>
            <div style={{ height: 8 }} />
            <button onClick={addMember} disabled={saving}>
              Add Member
            </button>
            <div style={{ marginTop: 8, opacity: 0.72, fontSize: 12, lineHeight: 1.6 }}>
              UID を追加すると、workspaces/{workspaceId}.members に直接 role を保存します。
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        {loading ? (
          <div>loading...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>UID</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.uid}>
                  <td>
                    {m.uid}
                    {currentUid === m.uid && (
                      <span style={{ marginLeft: 6, opacity: 0.7 }}>(me)</span>
                    )}
                  </td>
                  <td>
                    <span style={pillStyle(m.role)}>{roleLabel(m.role)}</span>

                    <select
                      value={m.role}
                      style={{ marginLeft: 10 }}
                      onChange={async (e) => {
                        if (!workspaceId) return;

                        const nextRole = e.target.value as MemberRole;

                        const ref = doc(db, "workspaces", workspaceId);

                        await updateDoc(ref, {
                          [`members.${m.uid}.role`]: nextRole,
                          updatedAt: serverTimestamp(),
                        } as any);
                      }}
                    >
                      <option value="owner">owner</option>
                      <option value="admin">admin</option>
                      <option value="member">member</option>
                      <option value="viewer">viewer</option>
                    </select>
                  </td>
                  <td>
                    <button onClick={() => removeMember(m.uid)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 8 }}>Pending Invites</h3>
        {invites.length === 0 ? (
          <div style={{ opacity: 0.72, fontSize: 13 }}>pending invite はまだありません。</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.id}</td>
                  <td>{inv.email || "-"}</td>
                  <td>{inv.role || "-"}</td>
                  <td>{inv.status || "pending"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {error && <div style={{ color: "red" }}>{error}</div>}

      <div style={{ marginTop: 24, padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, opacity: 0.9 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Invite API plan</div>
        <div style={{ fontSize: 12, lineHeight: 1.7, opacity: 0.8 }}>
          実装済み: POST /v1/workspaces/members/invite<br />
          body: {'{'} workspace_id, email, role {'}'}<br />
          現在は Email Invite と Direct UID Add の両方を使い分けできます。
        </div>
      </div>
    </div>
  );
}