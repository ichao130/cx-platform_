// functions/src/services/site.ts
import { adminDb } from "./admin";
import type { Timestamp } from "firebase-admin/firestore";
import { FieldValue, Timestamp as TimestampValue } from "firebase-admin/firestore";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer" | string;

export type SiteDoc = {
  id?: string;
  workspaceId: string;
  name?: string;
  publicKey?: string;
  domains?: string[]; // site専用の許可ドメイン（空ならworkspace側を見る）
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type WorkspaceDoc = {
  id?: string;
  name?: string;
  domains?: string[]; // workspace全体の許可ドメイン
  members?: Record<string, WorkspaceRole>; // uid -> role
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

function hostOf(u: string): string {
  try {
    return new URL(u).host;
  } catch {
    return "";
  }
}

function normalizeHost(h: string): string {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function isLocalhostHost(h: string): boolean {
  const hh = normalizeHost(h);
  return (
    hh === "localhost" ||
    hh.startsWith("localhost:") ||
    hh === "127.0.0.1" ||
    hh.startsWith("127.0.0.1:")
  );
}

/**
 * allowed は ["branberyheag.jp", "https://branberyheag.jp", "www.branberyheag.jp"] みたいに揺れてOKにする
 */
function normalizeAllowedHosts(allowed: string[]): string[] {
  const hosts = (allowed || [])
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .map((x) => {
      // URLでもドメインでもOK
      const host = x.includes("://") ? hostOf(x) : x.split("/")[0];
      return normalizeHost(host);
    })
    .filter(Boolean);

  // uniq
  const out: string[] = [];
  const seen = new Set<string>();
  for (const h of hosts) {
    if (seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out;
}

function uniqStrings(xs: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs || []) {
    const v = String(x || "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export function normalizeDomains(domains: string[] | undefined | null): string[] {
  return uniqStrings(normalizeAllowedHosts((domains || []) as any));
}

export function computeAllowedDomains(params: {
  site?: SiteDoc | null;
  workspace?: WorkspaceDoc | null;
}): string[] {
  const siteDomains = normalizeDomains(params.site?.domains || []);
  if (siteDomains.length) return siteDomains;
  const wsDomains = normalizeDomains(params.workspace?.domains || []);
  return wsDomains;
}

/**
 * origin と url の host が allowed に入ってるかチェック
 * - 埋め込みSDK側は site/workspace domains を使って守る
 */
export function assertAllowedOrigin(opts: { allowed: string[]; origin: string; url?: string }) {
  const allowedHosts = normalizeAllowedHosts(opts.allowed || []);

  const originHostRaw = hostOf(opts.origin || "");
  const urlHostRaw = opts.url ? hostOf(opts.url) : "";
  const originHost = normalizeHost(originHostRaw);
  const urlHost = normalizeHost(urlHostRaw);

  // dev は許可（localhost / 127.0.0.1）
  if (isLocalhostHost(originHost) || isLocalhostHost(urlHost)) return;

  if (!allowedHosts.length) {
    throw new Error("no_allowed_domains");
  }

  // origin が無いケースは基本弾く（必要なら緩めてもいい）
  if (!originHost) throw new Error("missing_origin");

  const okOrigin = allowedHosts.includes(originHost);
  const okUrl = urlHost ? allowedHosts.includes(urlHost) : true; // urlが無いならスルー

  if (okOrigin && okUrl) return;

  throw new Error(
    `origin not allowed (originHost=${originHost || "-"}, urlHost=${urlHost || "-"}, allowed=${allowedHosts.join(",")})`
  );
}

/**
 * siteId から (site.domains or workspace.domains) を解決して origin/url を検証
 */
export async function assertAllowedOriginForSite(opts: { siteId: string; origin: string; url?: string }) {
  const site = await pickSiteById(opts.siteId);
  if (!site) throw new Error("site_not_found");

  const ws = site.workspaceId ? await pickWorkspaceById(String(site.workspaceId)) : null;
  const allowed = computeAllowedDomains({ site, workspace: ws });

  return assertAllowedOrigin({ allowed, origin: opts.origin, url: opts.url });
}

/**
 * sites/{siteId} を読む
 */
export async function pickSiteById(siteId: string): Promise<SiteDoc & { id: string } | null> {
  const db = adminDb();
  const snap = await db.collection("sites").doc(siteId).get();
  if (!snap.exists) return null;
  const d = (snap.data() || {}) as any;
  return { id: snap.id, ...(d as SiteDoc) };
}

/**
 * workspaces/{workspaceId} を読む
 */
export async function pickWorkspaceById(workspaceId: string): Promise<WorkspaceDoc & { id: string } | null> {
  const db = adminDb();
  const snap = await db.collection("workspaces").doc(workspaceId).get();
  if (!snap.exists) return null;
  const d = (snap.data() || {}) as any;
  return { id: snap.id, ...(d as WorkspaceDoc) };
}

/**
 * workspace を新規作成（owner を members に自動登録）
 */
export async function createWorkspace(opts: {
  name: string;
  ownerUid: string;
  domains?: string[];
}): Promise<WorkspaceDoc & { id: string }> {
  const db = adminDb();

  const name = String(opts.name || "").trim();
  if (!name) throw new Error("workspace_name_required");

  const ownerUid = String(opts.ownerUid || "").trim();
  if (!ownerUid) throw new Error("owner_uid_required");

  const doc: WorkspaceDoc = {
    name,
    domains: normalizeDomains(opts.domains || []),
    members: { [ownerUid]: "owner" },
    createdAt: FieldValue.serverTimestamp() as any,
    updatedAt: FieldValue.serverTimestamp() as any,
  };

  const ref = await db.collection("workspaces").add(doc as any);
  const snap = await ref.get();
  const d = (snap.data() || {}) as any;
  return { id: snap.id, ...(d as WorkspaceDoc) };
}

/**
 * uid が member の workspace 一覧
 */
export async function listWorkspacesForUser(uid: string): Promise<Array<WorkspaceDoc & { id: string; role: WorkspaceRole }>> {
  const db = adminDb();
  const u = String(uid || "").trim();
  if (!u) return [];

  // members.{uid} が存在するものを拾う
  const q = await db.collection("workspaces").where(`members.${u}`, "!=", null).get();
  const items: Array<WorkspaceDoc & { id: string; role: WorkspaceRole }> = [];

  q.forEach((snap) => {
    const d = (snap.data() || {}) as any;
    const ws = d as WorkspaceDoc;
    const role = (ws.members && ws.members[u]) ? (ws.members[u] as any) : "";
    if (!role) return;
    items.push({ id: snap.id, role: String(role), ...(ws as WorkspaceDoc) });
  });

  // createdAt があれば降順（無ければそのまま）
  items.sort((a, b) => {
    const at = (a.createdAt as any)?._seconds || 0;
    const bt = (b.createdAt as any)?._seconds || 0;
    return bt - at;
  });

  return items;
}

/**
 * workspace に site を作成
 */
export async function createSite(opts: {
  workspaceId: string;
  name: string;
  publicKey?: string;
  domains?: string[];
}): Promise<SiteDoc & { id: string }> {
  const db = adminDb();

  const workspaceId = String(opts.workspaceId || "").trim();
  if (!workspaceId) throw new Error("workspace_id_required");

  const ws = await pickWorkspaceById(workspaceId);
  if (!ws) throw new Error("workspace_not_found");

  const name = String(opts.name || "").trim();
  if (!name) throw new Error("site_name_required");

  const doc: SiteDoc = {
    workspaceId,
    name,
    publicKey: opts.publicKey ? String(opts.publicKey) : undefined,
    domains: normalizeDomains(opts.domains || []),
    createdAt: FieldValue.serverTimestamp() as any,
    updatedAt: FieldValue.serverTimestamp() as any,
  };

  const ref = await db.collection("sites").add(doc as any);
  const snap = await ref.get();
  const d = (snap.data() || {}) as any;
  return { id: snap.id, ...(d as SiteDoc) };
}

/**
 * workspace 配下の site 一覧
 */
export async function listSitesByWorkspace(workspaceId: string): Promise<Array<SiteDoc & { id: string }>> {
  const db = adminDb();
  const wsId = String(workspaceId || "").trim();
  if (!wsId) return [];

  const q = await db.collection("sites").where("workspaceId", "==", wsId).get();
  const items: Array<SiteDoc & { id: string }> = [];
  q.forEach((snap) => {
    const d = (snap.data() || {}) as any;
    items.push({ id: snap.id, ...(d as SiteDoc) });
  });

  items.sort((a, b) => {
    const at = (a.createdAt as any)?._seconds || 0;
    const bt = (b.createdAt as any)?._seconds || 0;
    return bt - at;
  });

  return items;
}

/**
 * workspace / site の domains を更新（merge）
 */
export async function updateWorkspaceDomains(workspaceId: string, domains: string[]): Promise<void> {
  const db = adminDb();
  const wsId = String(workspaceId || "").trim();
  if (!wsId) throw new Error("workspace_id_required");

  await db.collection("workspaces").doc(wsId).set(
    {
      domains: normalizeDomains(domains || []),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateSiteDomains(siteId: string, domains: string[]): Promise<void> {
  const db = adminDb();
  const sId = String(siteId || "").trim();
  if (!sId) throw new Error("site_id_required");

  await db.collection("sites").doc(sId).set(
    {
      domains: normalizeDomains(domains || []),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * siteId -> workspaceId を解決
 */
export async function resolveWorkspaceIdFromSite(siteId: string): Promise<string | null> {
  const site = await pickSiteById(siteId);
  const wsId = site?.workspaceId ? String(site.workspaceId) : "";
  return wsId ? wsId : null;
}

/**
 * siteId -> workspaceId を必ず返す（無ければ例外）
 * v1.ts 側の型を安定させるための helper
 */
export async function requireWorkspaceIdFromSite(siteId: string): Promise<string> {
  const wsId = await resolveWorkspaceIdFromSite(siteId);
  if (!wsId) throw new Error("workspace_id_missing_for_site");
  return wsId;
}

/**
 * workspaceの members[uid] が allowedRoles に入ってるか
 */
export async function assertWorkspaceRole(opts: { workspaceId: string; uid: string; allowedRoles: WorkspaceRole[] }) {
  const { workspaceId, uid, allowedRoles } = opts;

  const ws = await pickWorkspaceById(workspaceId);
  if (!ws) throw new Error("workspace_not_found");

  const role = (ws.members && ws.members[uid]) ? String(ws.members[uid]) : "";

  if (!role) throw new Error("workspace_role_missing");

  const ok = (allowedRoles || []).map((r) => String(r).toLowerCase()).includes(String(role).toLowerCase());
  if (!ok) throw new Error(`forbidden_workspace_role(role=${role})`);
}

/**
 * workspace 内での uid の role を取得（無ければ null）
 */
export async function getWorkspaceRole(opts: { workspaceId: string; uid: string }): Promise<WorkspaceRole | null> {
  const wsId = String(opts.workspaceId || "").trim();
  const uid = String(opts.uid || "").trim();
  if (!wsId || !uid) return null;

  const ws = await pickWorkspaceById(wsId);
  if (!ws) return null;

  const role = (ws.members && ws.members[uid]) ? String(ws.members[uid]) : "";
  return role ? role : null;
}

/**
 * members/invites を管理できる権限かチェック（admin以上）
 * - 成功したら actorRole を返す
 */
export async function assertCanManageWorkspaceMembers(opts: {
  workspaceId: string;
  uid: string;
}): Promise<WorkspaceRole> {
  const wsId = String(opts.workspaceId || "").trim();
  const uid = String(opts.uid || "").trim();
  if (!wsId) throw new Error("workspace_id_required");
  if (!uid) throw new Error("uid_required");

  const role = await getWorkspaceRole({ workspaceId: wsId, uid });
  if (!role) throw new Error("workspace_role_missing");

  if (!canManageMembers(role)) {
    throw new Error(`forbidden_workspace_role(role=${role})`);
  }

  return role;
}

// ------------------ MEMBERS / INVITES (Phase3 admin) ------------------

export type WorkspaceMember = { uid: string; role: WorkspaceRole };

export type WorkspaceInviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type WorkspaceInviteDoc = {
  id?: string;
  workspaceId: string;
  email: string; // 招待先（ログインメール想定）
  role: WorkspaceRole;
  status: WorkspaceInviteStatus;
  token: string; // URLに埋め込む（推測困難）
  createdBy: string; // uid
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  acceptedBy?: string; // uid
  acceptedAt?: Timestamp;
  revokedAt?: Timestamp;
  expiresAt?: Timestamp;
};

function randomToken(len = 32): string {
  // node20 なので WebCrypto がある想定。無ければ Math.random fallback。
  try {
    const bytes = new Uint8Array(len);
    // @ts-ignore
    (globalThis.crypto || require("crypto").webcrypto).getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return (
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36)
    ).slice(0, len * 2);
  }
}

export function roleRank(role: WorkspaceRole): number {
  const r = String(role || "").toLowerCase();
  if (r === "owner") return 4;
  if (r === "admin") return 3;
  if (r === "member") return 2;
  if (r === "viewer") return 1;
  return 0;
}

export function canManageMembers(actorRole: WorkspaceRole, targetRole?: WorkspaceRole): boolean {
  const ar = roleRank(actorRole);
  if (ar < roleRank("admin")) return false;

  // target未指定なら「メンバー管理権限あるか」だけ判定
  if (!targetRole) return true;

  const tr = roleRank(targetRole);

  // owner をいじれるのは owner だけ
  if (tr >= roleRank("owner")) return ar >= roleRank("owner");

  // admin は自分と同格以上は触れない（admin同士/ownerは不可）
  return ar > tr;
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const wsId = String(workspaceId || "").trim();
  if (!wsId) return [];
  const ws = await pickWorkspaceById(wsId);
  if (!ws) throw new Error("workspace_not_found");
  const members = ws.members || {};
  const out: WorkspaceMember[] = Object.keys(members).map((uid) => ({ uid, role: String(members[uid]) }));
  out.sort((a, b) => roleRank(String(b.role)) - roleRank(String(a.role)));
  return out;
}

export async function upsertWorkspaceMember(opts: {
  workspaceId: string;
  uid: string;
  role: WorkspaceRole;
}): Promise<void> {
  const db = adminDb();
  const wsId = String(opts.workspaceId || "").trim();
  const uid = String(opts.uid || "").trim();
  const role = String(opts.role || "").trim();
  if (!wsId) throw new Error("workspace_id_required");
  if (!uid) throw new Error("member_uid_required");
  if (!role) throw new Error("member_role_required");

  // owner の昇格/付与は別フローにしたい（事故防止）
  if (String(role).toLowerCase() === "owner") {
    throw new Error("owner_role_is_reserved");
  }

  const wsRef = db.collection("workspaces").doc(wsId);
  const wsSnap = await wsRef.get();
  if (!wsSnap.exists) throw new Error("workspace_not_found");

  await wsRef.set(
    {
      [`members.${uid}`]: role,
      updatedAt: FieldValue.serverTimestamp(),
    } as any,
    { merge: true }
  );
}

export async function removeWorkspaceMember(opts: {
  workspaceId: string;
  uid: string;
}): Promise<void> {
  const db = adminDb();
  const wsId = String(opts.workspaceId || "").trim();
  const uid = String(opts.uid || "").trim();
  if (!wsId) throw new Error("workspace_id_required");
  if (!uid) throw new Error("member_uid_required");

  // owner は削除禁止（workspace が無人になる事故防止）
  const ws = await pickWorkspaceById(wsId);
  if (!ws) throw new Error("workspace_not_found");
  const curRole = (ws.members && ws.members[uid]) ? String(ws.members[uid]) : "";
  if (String(curRole).toLowerCase() === "owner") {
    throw new Error("cannot_remove_owner");
  }

  await db.collection("workspaces").doc(wsId).set(
    {
      [`members.${uid}`]: FieldValue.delete() as any,
      updatedAt: FieldValue.serverTimestamp(),
    } as any,
    { merge: true }
  );
}

export async function createWorkspaceInvite(opts: {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  createdBy: string;
  expiresInDays?: number; // default 14
}): Promise<WorkspaceInviteDoc & { id: string }> {
  const db = adminDb();
  const wsId = String(opts.workspaceId || "").trim();
  const email = String(opts.email || "").trim().toLowerCase();
  const role = String(opts.role || "").trim() || "viewer";
  if (String(role).toLowerCase() === "owner") throw new Error("owner_role_is_reserved");
  const createdBy = String(opts.createdBy || "").trim();
  if (!wsId) throw new Error("workspace_id_required");
  if (!email) throw new Error("invite_email_required");
  if (!createdBy) throw new Error("created_by_required");
  const expiresInDays = Number.isFinite(opts.expiresInDays as any) ? Number(opts.expiresInDays) : 14;
  const token = randomToken(24);

  const expiresAt = TimestampValue.fromDate(new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000));

  const doc: WorkspaceInviteDoc = {
    workspaceId: wsId,
    email,
    role,
    status: "pending",
    token,
    createdBy,
    createdAt: FieldValue.serverTimestamp() as any,
    updatedAt: FieldValue.serverTimestamp() as any,
    expiresAt,
  };

  const ref = await db.collection("workspace_invites").add(doc as any);
  const snap = await ref.get();
  const d = (snap.data() || {}) as any;
  return { id: snap.id, ...(d as WorkspaceInviteDoc) };
}

export async function revokeWorkspaceInvite(opts: {
  inviteId: string;
}): Promise<void> {
  const db = adminDb();
  const inviteId = String(opts.inviteId || "").trim();
  if (!inviteId) throw new Error("invite_id_required");
  await db.collection("workspace_invites").doc(inviteId).set(
    {
      status: "revoked",
      revokedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function acceptWorkspaceInvite(opts: {
  token: string;
  uid: string;
  email?: string; // optional: 招待メールと一致確認したい場合
}): Promise<{ workspaceId: string; role: WorkspaceRole; inviteId: string }> {
  const db = adminDb();
  const token = String(opts.token || "").trim();
  const uid = String(opts.uid || "").trim();
  const email = opts.email ? String(opts.email).trim().toLowerCase() : "";
  if (!token) throw new Error("invite_token_required");
  if (!uid) throw new Error("uid_required");

  // token で検索
  const q = await db.collection("workspace_invites").where("token", "==", token).limit(1).get();
  if (q.empty) throw new Error("invite_not_found");

  const snap = q.docs[0];
  const inv = (snap.data() || {}) as WorkspaceInviteDoc;
  if (!inv || !inv.workspaceId) throw new Error("invite_invalid");
  if (inv.status !== "pending") throw new Error(`invite_not_pending(status=${inv.status})`);

  // 期限切れ
  const exp = (inv as any).expiresAt as any;
  const expMs = exp && typeof exp.toDate === "function" ? exp.toDate().getTime() : 0;
  if (expMs && Date.now() > expMs) {
    throw new Error("invite_expired");
  }

  if (email && inv.email && String(inv.email).toLowerCase() !== email) {
    throw new Error("invite_email_mismatch");
  }

  // members に追加
  await upsertWorkspaceMember({ workspaceId: inv.workspaceId, uid, role: inv.role || "viewer" });

  // invite を accepted
  await db.collection("workspace_invites").doc(snap.id).set(
    {
      status: "accepted",
      acceptedBy: uid,
      acceptedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { workspaceId: inv.workspaceId, role: inv.role || "viewer", inviteId: snap.id };
}

export async function listInvitesByWorkspace(workspaceId: string): Promise<Array<WorkspaceInviteDoc & { id: string }>> {
  const db = adminDb();
  const wsId = String(workspaceId || "").trim();
  if (!wsId) return [];
  const q = await db.collection("workspace_invites").where("workspaceId", "==", wsId).get();
  const items: Array<WorkspaceInviteDoc & { id: string }> = [];
  q.forEach((snap) => {
    const d = (snap.data() || {}) as any;
    items.push({ id: snap.id, ...(d as WorkspaceInviteDoc) });
  });
  items.sort((a, b) => {
    const at = (a.createdAt as any)?._seconds || 0;
    const bt = (b.createdAt as any)?._seconds || 0;
    return bt - at;
  });
  return items;
}