"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BACKUP_OMITTED_COLLECTIONS = exports.BACKUP_INCLUDED_COLLECTIONS = void 0;
exports.getBackupSettings = getBackupSettings;
exports.upsertBackupSettings = upsertBackupSettings;
exports.enqueueBackupRun = enqueueBackupRun;
exports.listBackupRuns = listBackupRuns;
exports.createBackupDownloadUrl = createBackupDownloadUrl;
exports.maybeEnqueueScheduledBackup = maybeEnqueueScheduledBackup;
exports.executeQueuedBackupRun = executeQueuedBackupRun;
const firestore_1 = require("firebase-admin/firestore");
const admin_1 = require("./admin");
const SYSTEM_CONFIG_COLLECTION = "system_config";
const BACKUP_SETTINGS_DOC = "backups";
const BACKUP_RUNS_COLLECTION = "backup_runs";
const BACKUP_ARTIFACT_PREFIX = "backups";
exports.BACKUP_INCLUDED_COLLECTIONS = [
    "workspaces",
    "workspace_billing",
    "workspace_limit_overrides",
    "users",
    "sites",
    "scenarios",
    "actions",
    "templates",
    "media",
    "workspace_invites",
];
exports.BACKUP_OMITTED_COLLECTIONS = [
    "logs",
    "stats_daily",
    "storage_files",
];
function nowIso() {
    return new Date().toISOString();
}
function formatJstDate(date) {
    const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return jst.toISOString().slice(0, 10);
}
function defaultSettings() {
    return {
        enabled: true,
        hourJst: 3,
        retentionDays: 30,
        updatedAt: nowIso(),
        updatedBy: "system",
    };
}
function toIsoSafe(value) {
    if (!value)
        return null;
    if (typeof value === "string")
        return value;
    if (value instanceof Date)
        return value.toISOString();
    if (value instanceof firestore_1.Timestamp)
        return value.toDate().toISOString();
    if (typeof value?.toDate === "function") {
        try {
            return value.toDate().toISOString();
        }
        catch {
            return null;
        }
    }
    return null;
}
function serializeForJson(value) {
    if (value == null)
        return value;
    if (value instanceof Date)
        return value.toISOString();
    if (value instanceof firestore_1.Timestamp)
        return value.toDate().toISOString();
    if (typeof value?.toDate === "function") {
        try {
            return value.toDate().toISOString();
        }
        catch {
            return null;
        }
    }
    if (Array.isArray(value))
        return value.map((item) => serializeForJson(item));
    if (typeof value === "object") {
        const out = {};
        for (const [key, nested] of Object.entries(value)) {
            out[key] = serializeForJson(nested);
        }
        return out;
    }
    return value;
}
function mergeCounts(target, source) {
    for (const [key, value] of Object.entries(source)) {
        target[key] = (target[key] || 0) + value;
    }
}
async function listDocumentsByField(collectionName, field, value) {
    const snap = await (0, admin_1.adminDb)().collection(collectionName).where(field, "==", value).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...serializeForJson(doc.data()) }));
}
async function getWorkspaceDisplayName(workspaceId) {
    if (!workspaceId)
        return "";
    const snap = await (0, admin_1.adminDb)().collection("workspaces").doc(workspaceId).get();
    const data = snap.exists ? snap.data() : null;
    return String(data?.name || "");
}
async function buildWorkspaceBackup(workspaceId) {
    const db = (0, admin_1.adminDb)();
    const workspaceSnap = await db.collection("workspaces").doc(workspaceId).get();
    if (!workspaceSnap.exists)
        throw new Error(`workspace_not_found:${workspaceId}`);
    const workspaceData = serializeForJson({ id: workspaceSnap.id, ...(workspaceSnap.data() || {}) });
    const memberUids = Object.keys((workspaceSnap.data()?.members || {}));
    const [workspaceBillingSnap, workspaceLimitOverrideSnap, usersSnaps, sites, scenarios, actions, templates, media, workspaceInvites,] = await Promise.all([
        db.collection("workspace_billing").doc(workspaceId).get(),
        db.collection("workspace_limit_overrides").doc(workspaceId).get(),
        Promise.all(memberUids.map((uid) => db.collection("users").doc(uid).get())),
        listDocumentsByField("sites", "workspaceId", workspaceId),
        listDocumentsByField("scenarios", "workspaceId", workspaceId),
        listDocumentsByField("actions", "workspaceId", workspaceId),
        listDocumentsByField("templates", "workspaceId", workspaceId),
        listDocumentsByField("media", "workspaceId", workspaceId),
        listDocumentsByField("workspace_invites", "workspaceId", workspaceId),
    ]);
    const users = usersSnaps
        .filter((snap) => snap.exists)
        .map((snap) => ({ id: snap.id, ...serializeForJson(snap.data() || {}) }));
    const payload = {
        workspace: workspaceData,
        workspaceBilling: workspaceBillingSnap.exists
            ? serializeForJson({ id: workspaceBillingSnap.id, ...(workspaceBillingSnap.data() || {}) })
            : null,
        workspaceLimitOverride: workspaceLimitOverrideSnap.exists
            ? serializeForJson({ id: workspaceLimitOverrideSnap.id, ...(workspaceLimitOverrideSnap.data() || {}) })
            : null,
        users,
        sites,
        scenarios,
        actions,
        templates,
        media,
        workspaceInvites,
    };
    return {
        payload,
        counts: {
            workspaces: 1,
            workspace_billing: workspaceBillingSnap.exists ? 1 : 0,
            workspace_limit_overrides: workspaceLimitOverrideSnap.exists ? 1 : 0,
            users: users.length,
            sites: sites.length,
            scenarios: scenarios.length,
            actions: actions.length,
            templates: templates.length,
            media: media.length,
            workspace_invites: workspaceInvites.length,
        },
    };
}
async function uploadBackupArtifact(runId, payload) {
    const bucket = (0, admin_1.adminBucket)();
    const createdAt = nowIso();
    const path = `${BACKUP_ARTIFACT_PREFIX}/${createdAt.slice(0, 4)}/${createdAt.slice(5, 7)}/${createdAt.slice(8, 10)}/${runId}.json`;
    const body = JSON.stringify(payload, null, 2);
    await bucket.file(path).save(body, {
        resumable: false,
        contentType: "application/json; charset=utf-8",
        metadata: {
            cacheControl: "private, max-age=0, no-store",
        },
    });
    return { path, sizeBytes: Buffer.byteLength(body, "utf8") };
}
async function cleanupExpiredArtifacts(retentionDays) {
    if (!Number.isFinite(retentionDays) || retentionDays <= 0)
        return;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const snap = await (0, admin_1.adminDb)()
        .collection(BACKUP_RUNS_COLLECTION)
        .where("finishedAt", "<=", cutoff)
        .limit(100)
        .get();
    if (snap.empty)
        return;
    const bucket = (0, admin_1.adminBucket)();
    for (const doc of snap.docs) {
        const data = doc.data();
        if (!data?.artifactPath || data?.artifactDeletedAt)
            continue;
        try {
            await bucket.file(String(data.artifactPath)).delete({ ignoreNotFound: true });
            await doc.ref.set({ artifactDeletedAt: nowIso() }, { merge: true });
        }
        catch (error) {
            console.error("[backup] failed to cleanup artifact", doc.id, error);
        }
    }
}
async function markRunFailed(runId, message) {
    await (0, admin_1.adminDb)().collection(BACKUP_RUNS_COLLECTION).doc(runId).set({
        status: "failed",
        errorMessage: message,
        finishedAt: nowIso(),
    }, { merge: true });
}
async function getBackupSettings() {
    const snap = await (0, admin_1.adminDb)().collection(SYSTEM_CONFIG_COLLECTION).doc(BACKUP_SETTINGS_DOC).get();
    const base = defaultSettings();
    if (!snap.exists)
        return base;
    const data = (snap.data() || {});
    return {
        enabled: typeof data.enabled === "boolean" ? data.enabled : base.enabled,
        hourJst: Number.isFinite(data.hourJst) ? Math.max(0, Math.min(23, Number(data.hourJst))) : base.hourJst,
        retentionDays: Number.isFinite(data.retentionDays) ? Math.max(1, Math.min(365, Number(data.retentionDays))) : base.retentionDays,
        updatedAt: toIsoSafe(data.updatedAt) || base.updatedAt,
        updatedBy: String(data.updatedBy || base.updatedBy),
    };
}
async function upsertBackupSettings(input, updatedBy) {
    const current = await getBackupSettings();
    const next = {
        enabled: typeof input.enabled === "boolean" ? input.enabled : current.enabled,
        hourJst: Number.isFinite(input.hourJst) ? Math.max(0, Math.min(23, Number(input.hourJst))) : current.hourJst,
        retentionDays: Number.isFinite(input.retentionDays) ? Math.max(1, Math.min(365, Number(input.retentionDays))) : current.retentionDays,
        updatedAt: nowIso(),
        updatedBy,
    };
    await (0, admin_1.adminDb)().collection(SYSTEM_CONFIG_COLLECTION).doc(BACKUP_SETTINGS_DOC).set(next, { merge: true });
    return next;
}
async function enqueueBackupRun(input) {
    const db = (0, admin_1.adminDb)();
    const createdAt = nowIso();
    const workspaceName = input.scope === "workspace"
        ? await getWorkspaceDisplayName(input.workspaceId || null)
        : "";
    const ref = db.collection(BACKUP_RUNS_COLLECTION).doc();
    await ref.set({
        mode: input.mode,
        status: "queued",
        scope: input.scope,
        workspaceId: input.scope === "workspace" ? String(input.workspaceId || "") : null,
        workspaceName,
        startedAt: null,
        finishedAt: null,
        createdAt,
        createdBy: input.createdBy,
        scheduledDateJst: input.scheduledDateJst || null,
        artifactPath: null,
        artifactDeletedAt: null,
        artifactSizeBytes: null,
        summary: null,
        errorMessage: "",
    });
    return { runId: ref.id };
}
async function listBackupRuns(limit = 30) {
    const snap = await (0, admin_1.adminDb)()
        .collection(BACKUP_RUNS_COLLECTION)
        .orderBy("createdAt", "desc")
        .limit(Math.max(1, Math.min(limit, 100)))
        .get();
    return snap.docs.map((doc) => {
        const data = (doc.data() || {});
        return {
            id: doc.id,
            mode: (data.mode || "manual"),
            status: (data.status || "queued"),
            scope: (data.scope || "all"),
            workspaceId: data.workspaceId ? String(data.workspaceId) : null,
            workspaceName: String(data.workspaceName || ""),
            startedAt: toIsoSafe(data.startedAt),
            finishedAt: toIsoSafe(data.finishedAt),
            createdAt: toIsoSafe(data.createdAt) || nowIso(),
            createdBy: String(data.createdBy || ""),
            scheduledDateJst: data.scheduledDateJst ? String(data.scheduledDateJst) : null,
            artifactPath: data.artifactPath ? String(data.artifactPath) : null,
            artifactDeletedAt: toIsoSafe(data.artifactDeletedAt),
            artifactSizeBytes: typeof data.artifactSizeBytes === "number" ? data.artifactSizeBytes : null,
            summary: data.summary || null,
            errorMessage: String(data.errorMessage || ""),
        };
    });
}
async function createBackupDownloadUrl(runId) {
    const runSnap = await (0, admin_1.adminDb)().collection(BACKUP_RUNS_COLLECTION).doc(runId).get();
    if (!runSnap.exists)
        throw new Error("backup_run_not_found");
    const data = (runSnap.data() || {});
    if (!data?.artifactPath)
        throw new Error("backup_artifact_not_ready");
    if (data?.artifactDeletedAt)
        throw new Error("backup_artifact_expired");
    const bucket = (0, admin_1.adminBucket)();
    const [url] = await bucket.file(String(data.artifactPath)).getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000,
        version: "v4",
    });
    return { url, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() };
}
async function maybeEnqueueScheduledBackup() {
    const settings = await getBackupSettings();
    if (!settings.enabled)
        return { queued: false, reason: "disabled" };
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const hourJst = jst.getUTCHours();
    if (hourJst !== settings.hourJst) {
        return { queued: false, reason: "outside_hour", hourJst };
    }
    const scheduledDateJst = formatJstDate(now);
    const existingSnap = await (0, admin_1.adminDb)()
        .collection(BACKUP_RUNS_COLLECTION)
        .where("scheduledDateJst", "==", scheduledDateJst)
        .limit(10)
        .get();
    if (existingSnap.docs.some((doc) => String(doc.data()?.mode || "") === "scheduled")) {
        return { queued: false, reason: "already_exists", scheduledDateJst };
    }
    const result = await enqueueBackupRun({
        mode: "scheduled",
        scope: "all",
        createdBy: "scheduler",
        scheduledDateJst,
    });
    return { queued: true, runId: result.runId, scheduledDateJst };
}
async function executeQueuedBackupRun(runId) {
    const db = (0, admin_1.adminDb)();
    const ref = db.collection(BACKUP_RUNS_COLLECTION).doc(runId);
    const startedAt = nowIso();
    const locked = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists)
            throw new Error("backup_run_not_found");
        const data = snap.data();
        if (data.status !== "queued")
            return null;
        tx.set(ref, { status: "running", startedAt, errorMessage: "" }, { merge: true });
        return {
            scope: (data.scope || "all"),
            workspaceId: data.workspaceId ? String(data.workspaceId) : null,
            mode: (data.mode || "manual"),
            scheduledDateJst: data.scheduledDateJst ? String(data.scheduledDateJst) : null,
        };
    });
    if (!locked)
        return { skipped: true };
    try {
        const settings = await getBackupSettings();
        const summary = { totalWorkspaces: 0, collections: {} };
        const createdAt = nowIso();
        const payload = {
            meta: {
                version: 1,
                createdAt,
                runId,
                mode: locked.mode,
                scope: locked.scope,
                workspaceId: locked.workspaceId,
                includedCollections: exports.BACKUP_INCLUDED_COLLECTIONS,
                omittedCollections: exports.BACKUP_OMITTED_COLLECTIONS,
            },
        };
        if (locked.scope === "workspace") {
            if (!locked.workspaceId)
                throw new Error("workspace_id_required");
            const result = await buildWorkspaceBackup(locked.workspaceId);
            summary.totalWorkspaces = 1;
            mergeCounts(summary.collections, result.counts);
            payload.workspace = result.payload;
        }
        else {
            const workspaceSnaps = await db.collection("workspaces").orderBy("createdAt", "asc").get();
            const workspaces = [];
            for (const workspaceSnap of workspaceSnaps.docs) {
                const workspaceId = workspaceSnap.id;
                const result = await buildWorkspaceBackup(workspaceId);
                workspaces.push(result.payload);
                summary.totalWorkspaces += 1;
                mergeCounts(summary.collections, result.counts);
            }
            payload.workspaces = workspaces;
        }
        payload.summary = summary;
        const artifact = await uploadBackupArtifact(runId, payload);
        await ref.set({
            status: "succeeded",
            finishedAt: nowIso(),
            artifactPath: artifact.path,
            artifactSizeBytes: artifact.sizeBytes,
            summary,
        }, { merge: true });
        await cleanupExpiredArtifacts(settings.retentionDays);
        return { skipped: false, artifactPath: artifact.path };
    }
    catch (error) {
        console.error("[backup] run failed", runId, error);
        await markRunFailed(runId, error?.message || String(error));
        throw error;
    }
}
