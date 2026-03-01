"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDomains = normalizeDomains;
exports.computeAllowedDomains = computeAllowedDomains;
exports.assertAllowedOrigin = assertAllowedOrigin;
exports.assertAllowedOriginForSite = assertAllowedOriginForSite;
exports.pickSiteById = pickSiteById;
exports.pickWorkspaceById = pickWorkspaceById;
exports.createWorkspace = createWorkspace;
exports.listWorkspacesForUser = listWorkspacesForUser;
exports.createSite = createSite;
exports.listSitesByWorkspace = listSitesByWorkspace;
exports.updateWorkspaceDomains = updateWorkspaceDomains;
exports.updateSiteDomains = updateSiteDomains;
exports.resolveWorkspaceIdFromSite = resolveWorkspaceIdFromSite;
exports.requireWorkspaceIdFromSite = requireWorkspaceIdFromSite;
exports.assertWorkspaceRole = assertWorkspaceRole;
exports.getWorkspaceRole = getWorkspaceRole;
exports.assertCanManageWorkspaceMembers = assertCanManageWorkspaceMembers;
exports.roleRank = roleRank;
exports.canManageMembers = canManageMembers;
exports.listWorkspaceMembers = listWorkspaceMembers;
exports.upsertWorkspaceMember = upsertWorkspaceMember;
exports.removeWorkspaceMember = removeWorkspaceMember;
exports.createWorkspaceInvite = createWorkspaceInvite;
exports.revokeWorkspaceInvite = revokeWorkspaceInvite;
exports.acceptWorkspaceInvite = acceptWorkspaceInvite;
exports.listInvitesByWorkspace = listInvitesByWorkspace;
// functions/src/services/site.ts
const admin_1 = require("./admin");
const firestore_1 = require("firebase-admin/firestore");
function hostOf(u) {
    try {
        return new URL(u).host;
    }
    catch {
        return "";
    }
}
function normalizeHost(h) {
    return String(h || "")
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .replace(/\.$/, "");
}
function isLocalhostHost(h) {
    const hh = normalizeHost(h);
    return (hh === "localhost" ||
        hh.startsWith("localhost:") ||
        hh === "127.0.0.1" ||
        hh.startsWith("127.0.0.1:"));
}
/**
 * allowed は ["branberyheag.jp", "https://branberyheag.jp", "www.branberyheag.jp"] みたいに揺れてOKにする
 */
function normalizeAllowedHosts(allowed) {
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
    const out = [];
    const seen = new Set();
    for (const h of hosts) {
        if (seen.has(h))
            continue;
        seen.add(h);
        out.push(h);
    }
    return out;
}
function uniqStrings(xs) {
    const out = [];
    const seen = new Set();
    for (const x of xs || []) {
        const v = String(x || "").trim();
        if (!v)
            continue;
        if (seen.has(v))
            continue;
        seen.add(v);
        out.push(v);
    }
    return out;
}
function normalizeDomains(domains) {
    return uniqStrings(normalizeAllowedHosts((domains || [])));
}
function computeAllowedDomains(params) {
    const siteDomains = normalizeDomains(params.site?.domains || []);
    if (siteDomains.length)
        return siteDomains;
    const wsDomains = normalizeDomains(params.workspace?.domains || []);
    return wsDomains;
}
/**
 * origin と url の host が allowed に入ってるかチェック
 * - 埋め込みSDK側は site/workspace domains を使って守る
 */
function assertAllowedOrigin(opts) {
    const allowedHosts = normalizeAllowedHosts(opts.allowed || []);
    const originHostRaw = hostOf(opts.origin || "");
    const urlHostRaw = opts.url ? hostOf(opts.url) : "";
    const originHost = normalizeHost(originHostRaw);
    const urlHost = normalizeHost(urlHostRaw);
    // dev は許可（localhost / 127.0.0.1）
    if (isLocalhostHost(originHost) || isLocalhostHost(urlHost))
        return;
    if (!allowedHosts.length) {
        throw new Error("no_allowed_domains");
    }
    // origin が無いケースは基本弾く（必要なら緩めてもいい）
    if (!originHost)
        throw new Error("missing_origin");
    const okOrigin = allowedHosts.includes(originHost);
    const okUrl = urlHost ? allowedHosts.includes(urlHost) : true; // urlが無いならスルー
    if (okOrigin && okUrl)
        return;
    throw new Error(`origin not allowed (originHost=${originHost || "-"}, urlHost=${urlHost || "-"}, allowed=${allowedHosts.join(",")})`);
}
/**
 * siteId から (site.domains or workspace.domains) を解決して origin/url を検証
 */
async function assertAllowedOriginForSite(opts) {
    const site = await pickSiteById(opts.siteId);
    if (!site)
        throw new Error("site_not_found");
    const ws = site.workspaceId ? await pickWorkspaceById(String(site.workspaceId)) : null;
    const allowed = computeAllowedDomains({ site, workspace: ws });
    return assertAllowedOrigin({ allowed, origin: opts.origin, url: opts.url });
}
/**
 * sites/{siteId} を読む
 */
async function pickSiteById(siteId) {
    const db = (0, admin_1.adminDb)();
    const snap = await db.collection("sites").doc(siteId).get();
    if (!snap.exists)
        return null;
    const d = (snap.data() || {});
    return { id: snap.id, ...d };
}
/**
 * workspaces/{workspaceId} を読む
 */
async function pickWorkspaceById(workspaceId) {
    const db = (0, admin_1.adminDb)();
    const snap = await db.collection("workspaces").doc(workspaceId).get();
    if (!snap.exists)
        return null;
    const d = (snap.data() || {});
    return { id: snap.id, ...d };
}
/**
 * workspace を新規作成（owner を members に自動登録）
 */
async function createWorkspace(opts) {
    const db = (0, admin_1.adminDb)();
    const name = String(opts.name || "").trim();
    if (!name)
        throw new Error("workspace_name_required");
    const ownerUid = String(opts.ownerUid || "").trim();
    if (!ownerUid)
        throw new Error("owner_uid_required");
    const doc = {
        name,
        domains: normalizeDomains(opts.domains || []),
        members: { [ownerUid]: "owner" },
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection("workspaces").add(doc);
    const snap = await ref.get();
    const d = (snap.data() || {});
    return { id: snap.id, ...d };
}
/**
 * uid が member の workspace 一覧
 */
async function listWorkspacesForUser(uid) {
    const db = (0, admin_1.adminDb)();
    const u = String(uid || "").trim();
    if (!u)
        return [];
    // members.{uid} が存在するものを拾う
    const q = await db.collection("workspaces").where(`members.${u}`, "!=", null).get();
    const items = [];
    q.forEach((snap) => {
        const d = (snap.data() || {});
        const ws = d;
        const role = (ws.members && ws.members[u]) ? ws.members[u] : "";
        if (!role)
            return;
        items.push({ id: snap.id, role: String(role), ...ws });
    });
    // createdAt があれば降順（無ければそのまま）
    items.sort((a, b) => {
        const at = a.createdAt?._seconds || 0;
        const bt = b.createdAt?._seconds || 0;
        return bt - at;
    });
    return items;
}
/**
 * workspace に site を作成
 */
async function createSite(opts) {
    const db = (0, admin_1.adminDb)();
    const workspaceId = String(opts.workspaceId || "").trim();
    if (!workspaceId)
        throw new Error("workspace_id_required");
    const ws = await pickWorkspaceById(workspaceId);
    if (!ws)
        throw new Error("workspace_not_found");
    const name = String(opts.name || "").trim();
    if (!name)
        throw new Error("site_name_required");
    const doc = {
        workspaceId,
        name,
        publicKey: opts.publicKey ? String(opts.publicKey) : undefined,
        domains: normalizeDomains(opts.domains || []),
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection("sites").add(doc);
    const snap = await ref.get();
    const d = (snap.data() || {});
    return { id: snap.id, ...d };
}
/**
 * workspace 配下の site 一覧
 */
async function listSitesByWorkspace(workspaceId) {
    const db = (0, admin_1.adminDb)();
    const wsId = String(workspaceId || "").trim();
    if (!wsId)
        return [];
    const q = await db.collection("sites").where("workspaceId", "==", wsId).get();
    const items = [];
    q.forEach((snap) => {
        const d = (snap.data() || {});
        items.push({ id: snap.id, ...d });
    });
    items.sort((a, b) => {
        const at = a.createdAt?._seconds || 0;
        const bt = b.createdAt?._seconds || 0;
        return bt - at;
    });
    return items;
}
/**
 * workspace / site の domains を更新（merge）
 */
async function updateWorkspaceDomains(workspaceId, domains) {
    const db = (0, admin_1.adminDb)();
    const wsId = String(workspaceId || "").trim();
    if (!wsId)
        throw new Error("workspace_id_required");
    await db.collection("workspaces").doc(wsId).set({
        domains: normalizeDomains(domains || []),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
}
async function updateSiteDomains(siteId, domains) {
    const db = (0, admin_1.adminDb)();
    const sId = String(siteId || "").trim();
    if (!sId)
        throw new Error("site_id_required");
    await db.collection("sites").doc(sId).set({
        domains: normalizeDomains(domains || []),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
}
/**
 * siteId -> workspaceId を解決
 */
async function resolveWorkspaceIdFromSite(siteId) {
    const site = await pickSiteById(siteId);
    const wsId = site?.workspaceId ? String(site.workspaceId) : "";
    return wsId ? wsId : null;
}
/**
 * siteId -> workspaceId を必ず返す（無ければ例外）
 * v1.ts 側の型を安定させるための helper
 */
async function requireWorkspaceIdFromSite(siteId) {
    const wsId = await resolveWorkspaceIdFromSite(siteId);
    if (!wsId)
        throw new Error("workspace_id_missing_for_site");
    return wsId;
}
/**
 * workspaceの members[uid] が allowedRoles に入ってるか
 */
async function assertWorkspaceRole(opts) {
    const { workspaceId, uid, allowedRoles } = opts;
    const ws = await pickWorkspaceById(workspaceId);
    if (!ws)
        throw new Error("workspace_not_found");
    const role = (ws.members && ws.members[uid]) ? String(ws.members[uid]) : "";
    if (!role)
        throw new Error("workspace_role_missing");
    const ok = (allowedRoles || []).map((r) => String(r).toLowerCase()).includes(String(role).toLowerCase());
    if (!ok)
        throw new Error(`forbidden_workspace_role(role=${role})`);
}
/**
 * workspace 内での uid の role を取得（無ければ null）
 */
async function getWorkspaceRole(opts) {
    const wsId = String(opts.workspaceId || "").trim();
    const uid = String(opts.uid || "").trim();
    if (!wsId || !uid)
        return null;
    const ws = await pickWorkspaceById(wsId);
    if (!ws)
        return null;
    const role = (ws.members && ws.members[uid]) ? String(ws.members[uid]) : "";
    return role ? role : null;
}
/**
 * members/invites を管理できる権限かチェック（admin以上）
 * - 成功したら actorRole を返す
 */
async function assertCanManageWorkspaceMembers(opts) {
    const wsId = String(opts.workspaceId || "").trim();
    const uid = String(opts.uid || "").trim();
    if (!wsId)
        throw new Error("workspace_id_required");
    if (!uid)
        throw new Error("uid_required");
    const role = await getWorkspaceRole({ workspaceId: wsId, uid });
    if (!role)
        throw new Error("workspace_role_missing");
    if (!canManageMembers(role)) {
        throw new Error(`forbidden_workspace_role(role=${role})`);
    }
    return role;
}
function randomToken(len = 32) {
    // node20 なので WebCrypto がある想定。無ければ Math.random fallback。
    try {
        const bytes = new Uint8Array(len);
        // @ts-ignore
        (globalThis.crypto || require("crypto").webcrypto).getRandomValues(bytes);
        return Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }
    catch {
        return (Math.random().toString(36).slice(2) +
            Math.random().toString(36).slice(2) +
            Date.now().toString(36)).slice(0, len * 2);
    }
}
function roleRank(role) {
    const r = String(role || "").toLowerCase();
    if (r === "owner")
        return 4;
    if (r === "admin")
        return 3;
    if (r === "member")
        return 2;
    if (r === "viewer")
        return 1;
    return 0;
}
function canManageMembers(actorRole, targetRole) {
    const ar = roleRank(actorRole);
    if (ar < roleRank("admin"))
        return false;
    // target未指定なら「メンバー管理権限あるか」だけ判定
    if (!targetRole)
        return true;
    const tr = roleRank(targetRole);
    // owner をいじれるのは owner だけ
    if (tr >= roleRank("owner"))
        return ar >= roleRank("owner");
    // admin は自分と同格以上は触れない（admin同士/ownerは不可）
    return ar > tr;
}
async function listWorkspaceMembers(workspaceId) {
    const wsId = String(workspaceId || "").trim();
    if (!wsId)
        return [];
    const ws = await pickWorkspaceById(wsId);
    if (!ws)
        throw new Error("workspace_not_found");
    const members = ws.members || {};
    const out = Object.keys(members).map((uid) => ({ uid, role: String(members[uid]) }));
    out.sort((a, b) => roleRank(String(b.role)) - roleRank(String(a.role)));
    return out;
}
async function upsertWorkspaceMember(opts) {
    const db = (0, admin_1.adminDb)();
    const wsId = String(opts.workspaceId || "").trim();
    const uid = String(opts.uid || "").trim();
    const role = String(opts.role || "").trim();
    if (!wsId)
        throw new Error("workspace_id_required");
    if (!uid)
        throw new Error("member_uid_required");
    if (!role)
        throw new Error("member_role_required");
    // owner の昇格/付与は別フローにしたい（事故防止）
    if (String(role).toLowerCase() === "owner") {
        throw new Error("owner_role_is_reserved");
    }
    const wsRef = db.collection("workspaces").doc(wsId);
    const wsSnap = await wsRef.get();
    if (!wsSnap.exists)
        throw new Error("workspace_not_found");
    await wsRef.set({
        [`members.${uid}`]: role,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
}
async function removeWorkspaceMember(opts) {
    const db = (0, admin_1.adminDb)();
    const wsId = String(opts.workspaceId || "").trim();
    const uid = String(opts.uid || "").trim();
    if (!wsId)
        throw new Error("workspace_id_required");
    if (!uid)
        throw new Error("member_uid_required");
    // owner は削除禁止（workspace が無人になる事故防止）
    const ws = await pickWorkspaceById(wsId);
    if (!ws)
        throw new Error("workspace_not_found");
    const curRole = (ws.members && ws.members[uid]) ? String(ws.members[uid]) : "";
    if (String(curRole).toLowerCase() === "owner") {
        throw new Error("cannot_remove_owner");
    }
    await db.collection("workspaces").doc(wsId).set({
        [`members.${uid}`]: firestore_1.FieldValue.delete(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
}
async function createWorkspaceInvite(opts) {
    const db = (0, admin_1.adminDb)();
    const wsId = String(opts.workspaceId || "").trim();
    const email = String(opts.email || "").trim().toLowerCase();
    const role = String(opts.role || "").trim() || "viewer";
    if (String(role).toLowerCase() === "owner")
        throw new Error("owner_role_is_reserved");
    const createdBy = String(opts.createdBy || "").trim();
    if (!wsId)
        throw new Error("workspace_id_required");
    if (!email)
        throw new Error("invite_email_required");
    if (!createdBy)
        throw new Error("created_by_required");
    const expiresInDays = Number.isFinite(opts.expiresInDays) ? Number(opts.expiresInDays) : 14;
    const token = randomToken(24);
    const expiresAt = firestore_1.Timestamp.fromDate(new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000));
    const doc = {
        workspaceId: wsId,
        email,
        role,
        status: "pending",
        token,
        createdBy,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        expiresAt,
    };
    const ref = await db.collection("workspace_invites").add(doc);
    const snap = await ref.get();
    const d = (snap.data() || {});
    return { id: snap.id, ...d };
}
async function revokeWorkspaceInvite(opts) {
    const db = (0, admin_1.adminDb)();
    const inviteId = String(opts.inviteId || "").trim();
    if (!inviteId)
        throw new Error("invite_id_required");
    await db.collection("workspace_invites").doc(inviteId).set({
        status: "revoked",
        revokedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
}
async function acceptWorkspaceInvite(opts) {
    const db = (0, admin_1.adminDb)();
    const token = String(opts.token || "").trim();
    const uid = String(opts.uid || "").trim();
    const email = opts.email ? String(opts.email).trim().toLowerCase() : "";
    if (!token)
        throw new Error("invite_token_required");
    if (!uid)
        throw new Error("uid_required");
    // token で検索
    const q = await db.collection("workspace_invites").where("token", "==", token).limit(1).get();
    if (q.empty)
        throw new Error("invite_not_found");
    const snap = q.docs[0];
    const inv = (snap.data() || {});
    if (!inv || !inv.workspaceId)
        throw new Error("invite_invalid");
    if (inv.status !== "pending")
        throw new Error(`invite_not_pending(status=${inv.status})`);
    // 期限切れ
    const exp = inv.expiresAt;
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
    await db.collection("workspace_invites").doc(snap.id).set({
        status: "accepted",
        acceptedBy: uid,
        acceptedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { workspaceId: inv.workspaceId, role: inv.role || "viewer", inviteId: snap.id };
}
async function listInvitesByWorkspace(workspaceId) {
    const db = (0, admin_1.adminDb)();
    const wsId = String(workspaceId || "").trim();
    if (!wsId)
        return [];
    const q = await db.collection("workspace_invites").where("workspaceId", "==", wsId).get();
    const items = [];
    q.forEach((snap) => {
        const d = (snap.data() || {});
        items.push({ id: snap.id, ...d });
    });
    items.sort((a, b) => {
        const at = a.createdAt?._seconds || 0;
        const bt = b.createdAt?._seconds || 0;
        return bt - at;
    });
    return items;
}
