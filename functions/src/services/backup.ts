import { Timestamp } from "firebase-admin/firestore";
import { adminDb, adminBucket } from "./admin";

const SYSTEM_CONFIG_COLLECTION = "system_config";
const BACKUP_SETTINGS_DOC = "backups";
const BACKUP_RUNS_COLLECTION = "backup_runs";
const BACKUP_ARTIFACT_PREFIX = "backups";

export const BACKUP_INCLUDED_COLLECTIONS = [
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
] as const;

export const BACKUP_OMITTED_COLLECTIONS = [
  "logs",
  "stats_daily",
  "storage_files",
] as const;

export type BackupScope = "all" | "workspace";
export type BackupRunMode = "manual" | "scheduled";
export type BackupRunStatus = "queued" | "running" | "succeeded" | "failed";

export type BackupSettings = {
  enabled: boolean;
  hourJst: number;
  retentionDays: number;
  updatedAt: string;
  updatedBy: string;
};

export type BackupRunSummary = {
  totalWorkspaces: number;
  collections: Record<string, number>;
};

export type BackupRunRecord = {
  id: string;
  mode: BackupRunMode;
  status: BackupRunStatus;
  scope: BackupScope;
  workspaceId: string | null;
  workspaceName: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  createdBy: string;
  scheduledDateJst: string | null;
  artifactPath: string | null;
  artifactDeletedAt: string | null;
  artifactSizeBytes: number | null;
  summary: BackupRunSummary | null;
  errorMessage: string;
};

type EnqueueBackupRunInput = {
  mode: BackupRunMode;
  scope: BackupScope;
  workspaceId?: string | null;
  createdBy: string;
  scheduledDateJst?: string | null;
};

type WorkspaceBackupPayload = {
  workspace: any;
  workspaceBilling: any | null;
  workspaceLimitOverride: any | null;
  users: any[];
  sites: any[];
  scenarios: any[];
  actions: any[];
  templates: any[];
  media: any[];
  workspaceInvites: any[];
};

function nowIso() {
  return new Date().toISOString();
}

function formatJstDate(date: Date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function defaultSettings(): BackupSettings {
  return {
    enabled: true,
    hourJst: 3,
    retentionDays: 30,
    updatedAt: nowIso(),
    updatedBy: "system",
  };
}

function toIsoSafe(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

function serializeForJson(value: any): any {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (Array.isArray(value)) return value.map((item) => serializeForJson(item));
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = serializeForJson(nested);
    }
    return out;
  }
  return value;
}

function mergeCounts(target: Record<string, number>, source: Record<string, number>) {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] || 0) + value;
  }
}

async function listDocumentsByField(collectionName: string, field: string, value: string) {
  const snap = await adminDb().collection(collectionName).where(field, "==", value).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...serializeForJson(doc.data()) }));
}

async function getWorkspaceDisplayName(workspaceId: string | null | undefined): Promise<string> {
  if (!workspaceId) return "";
  const snap = await adminDb().collection("workspaces").doc(workspaceId).get();
  const data = snap.exists ? (snap.data() as any) : null;
  return String(data?.name || "");
}

async function buildWorkspaceBackup(workspaceId: string): Promise<{ payload: WorkspaceBackupPayload; counts: Record<string, number> }> {
  const db = adminDb();
  const workspaceSnap = await db.collection("workspaces").doc(workspaceId).get();
  if (!workspaceSnap.exists) throw new Error(`workspace_not_found:${workspaceId}`);

  const workspaceData = serializeForJson({ id: workspaceSnap.id, ...(workspaceSnap.data() || {}) });
  const memberUids = Object.keys(((workspaceSnap.data() as any)?.members || {}) as Record<string, unknown>);

  const [
    workspaceBillingSnap,
    workspaceLimitOverrideSnap,
    usersSnaps,
    sites,
    scenarios,
    actions,
    templates,
    media,
    workspaceInvites,
  ] = await Promise.all([
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

  const payload: WorkspaceBackupPayload = {
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

async function uploadBackupArtifact(runId: string, payload: any) {
  const bucket = adminBucket();
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

async function cleanupExpiredArtifacts(retentionDays: number) {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return;

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const snap = await adminDb()
    .collection(BACKUP_RUNS_COLLECTION)
    .where("finishedAt", "<=", cutoff)
    .limit(100)
    .get();

  if (snap.empty) return;

  const bucket = adminBucket();
  for (const doc of snap.docs) {
    const data = doc.data() as any;
    if (!data?.artifactPath || data?.artifactDeletedAt) continue;
    try {
      await bucket.file(String(data.artifactPath)).delete({ ignoreNotFound: true } as any);
      await doc.ref.set({ artifactDeletedAt: nowIso() }, { merge: true });
    } catch (error) {
      console.error("[backup] failed to cleanup artifact", doc.id, error);
    }
  }
}

async function markRunFailed(runId: string, message: string) {
  await adminDb().collection(BACKUP_RUNS_COLLECTION).doc(runId).set(
    {
      status: "failed",
      errorMessage: message,
      finishedAt: nowIso(),
    },
    { merge: true }
  );
}

export async function getBackupSettings(): Promise<BackupSettings> {
  const snap = await adminDb().collection(SYSTEM_CONFIG_COLLECTION).doc(BACKUP_SETTINGS_DOC).get();
  const base = defaultSettings();
  if (!snap.exists) return base;
  const data = (snap.data() || {}) as any;
  return {
    enabled: typeof data.enabled === "boolean" ? data.enabled : base.enabled,
    hourJst: Number.isFinite(data.hourJst) ? Math.max(0, Math.min(23, Number(data.hourJst))) : base.hourJst,
    retentionDays: Number.isFinite(data.retentionDays) ? Math.max(1, Math.min(365, Number(data.retentionDays))) : base.retentionDays,
    updatedAt: toIsoSafe(data.updatedAt) || base.updatedAt,
    updatedBy: String(data.updatedBy || base.updatedBy),
  };
}

export async function upsertBackupSettings(input: Partial<BackupSettings>, updatedBy: string): Promise<BackupSettings> {
  const current = await getBackupSettings();
  const next: BackupSettings = {
    enabled: typeof input.enabled === "boolean" ? input.enabled : current.enabled,
    hourJst: Number.isFinite(input.hourJst) ? Math.max(0, Math.min(23, Number(input.hourJst))) : current.hourJst,
    retentionDays: Number.isFinite(input.retentionDays) ? Math.max(1, Math.min(365, Number(input.retentionDays))) : current.retentionDays,
    updatedAt: nowIso(),
    updatedBy,
  };
  await adminDb().collection(SYSTEM_CONFIG_COLLECTION).doc(BACKUP_SETTINGS_DOC).set(next, { merge: true });
  return next;
}

export async function enqueueBackupRun(input: EnqueueBackupRunInput) {
  const db = adminDb();
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

export async function listBackupRuns(limit = 30): Promise<BackupRunRecord[]> {
  const snap = await adminDb()
    .collection(BACKUP_RUNS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(Math.max(1, Math.min(limit, 100)))
    .get();

  return snap.docs.map((doc) => {
    const data = (doc.data() || {}) as any;
    return {
      id: doc.id,
      mode: (data.mode || "manual") as BackupRunMode,
      status: (data.status || "queued") as BackupRunStatus,
      scope: (data.scope || "all") as BackupScope,
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

export async function createBackupDownloadUrl(runId: string) {
  const runSnap = await adminDb().collection(BACKUP_RUNS_COLLECTION).doc(runId).get();
  if (!runSnap.exists) throw new Error("backup_run_not_found");
  const data = (runSnap.data() || {}) as any;
  if (!data?.artifactPath) throw new Error("backup_artifact_not_ready");
  if (data?.artifactDeletedAt) throw new Error("backup_artifact_expired");

  const bucket = adminBucket();
  const [url] = await bucket.file(String(data.artifactPath)).getSignedUrl({
    action: "read",
    expires: Date.now() + 15 * 60 * 1000,
    version: "v4",
  });
  return { url, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() };
}

export async function maybeEnqueueScheduledBackup() {
  const settings = await getBackupSettings();
  if (!settings.enabled) return { queued: false, reason: "disabled" as const };

  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hourJst = jst.getUTCHours();
  if (hourJst !== settings.hourJst) {
    return { queued: false, reason: "outside_hour" as const, hourJst };
  }

  const scheduledDateJst = formatJstDate(now);
  const existingSnap = await adminDb()
    .collection(BACKUP_RUNS_COLLECTION)
    .where("scheduledDateJst", "==", scheduledDateJst)
    .limit(10)
    .get();

  if (existingSnap.docs.some((doc) => String((doc.data() as any)?.mode || "") === "scheduled")) {
    return { queued: false, reason: "already_exists" as const, scheduledDateJst };
  }

  const result = await enqueueBackupRun({
    mode: "scheduled",
    scope: "all",
    createdBy: "scheduler",
    scheduledDateJst,
  });

  return { queued: true, runId: result.runId, scheduledDateJst };
}

export async function executeQueuedBackupRun(runId: string) {
  const db = adminDb();
  const ref = db.collection(BACKUP_RUNS_COLLECTION).doc(runId);
  const startedAt = nowIso();

  const locked = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("backup_run_not_found");
    const data = snap.data() as any;
    if (data.status !== "queued") return null;
    tx.set(ref, { status: "running", startedAt, errorMessage: "" }, { merge: true });
    return {
      scope: (data.scope || "all") as BackupScope,
      workspaceId: data.workspaceId ? String(data.workspaceId) : null,
      mode: (data.mode || "manual") as BackupRunMode,
      scheduledDateJst: data.scheduledDateJst ? String(data.scheduledDateJst) : null,
    };
  });

  if (!locked) return { skipped: true };

  try {
    const settings = await getBackupSettings();
    const summary: BackupRunSummary = { totalWorkspaces: 0, collections: {} };
    const createdAt = nowIso();
    const payload: Record<string, any> = {
      meta: {
        version: 1,
        createdAt,
        runId,
        mode: locked.mode,
        scope: locked.scope,
        workspaceId: locked.workspaceId,
        includedCollections: BACKUP_INCLUDED_COLLECTIONS,
        omittedCollections: BACKUP_OMITTED_COLLECTIONS,
      },
    };

    if (locked.scope === "workspace") {
      if (!locked.workspaceId) throw new Error("workspace_id_required");
      const result = await buildWorkspaceBackup(locked.workspaceId);
      summary.totalWorkspaces = 1;
      mergeCounts(summary.collections, result.counts);
      payload.workspace = result.payload;
    } else {
      const workspaceSnaps = await db.collection("workspaces").orderBy("createdAt", "asc").get();
      const workspaces: WorkspaceBackupPayload[] = [];
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
    await ref.set(
      {
        status: "succeeded",
        finishedAt: nowIso(),
        artifactPath: artifact.path,
        artifactSizeBytes: artifact.sizeBytes,
        summary,
      },
      { merge: true }
    );

    await cleanupExpiredArtifacts(settings.retentionDays);

    return { skipped: false, artifactPath: artifact.path };
  } catch (error: any) {
    console.error("[backup] run failed", runId, error);
    await markRunFailed(runId, error?.message || String(error));
    throw error;
  }
}
