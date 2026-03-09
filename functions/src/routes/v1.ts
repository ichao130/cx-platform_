// functions/src/routes/v1.ts
import type { Express } from "express";
import { z } from "zod";
import { adminDb, requireAuthUid } from "../services/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import {
  pickSiteById,
  pickWorkspaceById,
  assertAllowedOrigin,
  requireWorkspaceIdFromSite,
  assertWorkspaceRole,
  canManageMembers,
} from "../services/site";
import { generateCopy3 } from "../services/openaiCopy";
import { pickVariant } from "../services/experiment";
import { callOpenAIJson } from "../services/openaiJson";
import { defineString, defineSecret } from "firebase-functions/params";
/* =========================================
   Schemas
========================================= */
const AiReviewReqSchema = z.object({
  site_id: z.string().min(1),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scenario_id: z.string().min(1),
  variant_id: z.string().optional().default("na"),
});

const CopyReqSchema = z.object({
  site_id: z.string().min(1),
  goal: z.string().optional(),
  base_creative: z.object({
    title: z.string(),
    body: z.string(),
    cta: z.string(),
    url: z.string().optional(),
  }),
  brand_tone: z
    .object({
      style: z.string().optional(),
      ng_words: z.array(z.string()).optional(),
      max_chars: z
        .object({
          title: z.number().optional(),
          body: z.number().optional(),
          cta: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

const LogReqSchema = z.object({
  site_id: z.string().min(1),
  scenario_id: z.string().nullable().optional(),
  action_id: z.string().nullable().optional(),
  template_id: z.string().nullable().optional(),
  variant_id: z.string().nullable().optional(),
  event: z.enum(["impression", "click", "click_link", "close", "conversion"]),
  url: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  ref: z.string().nullable().optional(),
  vid: z.string().nullable().optional(),
  sid: z.string().nullable().optional(),
});

const AiInsightReqSchema = z.object({
  site_id: z.string().min(1),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // "2026-02-26"
  scope: z.enum(["site", "scenario", "action"]),
  scope_id: z.string().min(1), // siteなら "all" でもOK
  variant_id: z.string().nullable().optional(), // null or "v1"
  metrics: z.object({
    impressions: z.number().nonnegative(),
    clicks: z.number().nonnegative(),
    closes: z.number().nonnegative().optional().default(0),
    conversions: z.number().nonnegative().optional().default(0),
  }),
  context: z
    .object({
      scenario_name: z.string().optional(),
      action_title: z.string().optional(),
      url_hint: z.string().optional(),
    })
    .optional(),
});


const StatsSummaryReqSchema = z.object({
  site_id: z.string().min(1),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // "2026-02-27"
  scope: z.enum(["site", "scenario", "action"]),
  scope_id: z.string().min(1), // site の場合は "all"
  variant_id: z.string().nullable().optional(), // null or "A"/"B"/"na"
});

// Workspace management schemas
const WorkspaceCreateReqSchema = z.object({
  name: z.string().min(1).max(80),
});

const WorkspaceListReqSchema = z.object({});

// Workspace members / invites schemas
const WorkspaceMembersListReqSchema = z.object({
  workspace_id: z.string().min(1),
});

const WorkspaceMemberUpsertReqSchema = z.object({
  workspace_id: z.string().min(1),
  uid: z.string().min(1),
  role: z.string().min(1), // owner/admin/member/viewer
});

const WorkspaceMemberRemoveReqSchema = z.object({
  workspace_id: z.string().min(1),
  uid: z.string().min(1),
});

const WorkspaceInviteCreateReqSchema = z.object({
  workspace_id: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1).default("member"),
});

const WorkspaceInviteListReqSchema = z.object({
  workspace_id: z.string().min(1),
});

const WorkspaceInviteRevokeReqSchema = z.object({
  invite_id: z.string().min(1),
});

const WorkspaceInviteAcceptReqSchema = z.object({
  token: z.string().min(8),
  email: z.string().email().optional(), // optional check
});

// Site management schemas
const SiteCreateReqSchema = z.object({
  workspace_id: z.string().min(1),
  name: z.string().min(1).max(80),
  public_key: z.string().min(8).max(120),
  domains: z.array(z.string().min(1)).optional().default([]),
});

const SiteListReqSchema = z.object({
  workspace_id: z.string().min(1),
});

const WorkspaceDomainsUpdateReqSchema = z.object({
  workspace_id: z.string().min(1),
  domains: z.array(z.string().min(1)).optional().default([]),
});

// Workspace billing/subscription schemas
const WorkspaceBillingGetReqSchema = z.object({
  workspace_id: z.string().min(1),
});

const WorkspaceBillingUpdateReqSchema = z.object({
  workspace_id: z.string().min(1),
  plan: z.enum(["free", "starter", "pro", "team", "enterprise"]).optional(),
  status: z.enum(["inactive", "trialing", "active", "past_due", "canceled"]).optional(),
  // trial end: days from now (recommended)
  trial_days: z.number().int().min(0).max(365).optional(),
  // or explicit ISO timestamps (if provided, takes precedence)
  trial_ends_at: z.string().datetime().optional(),
  current_period_ends_at: z.string().datetime().optional(),
  billing_email: z.string().email().optional(),
});

const SiteDomainsUpdateReqSchema = z.object({
  site_id: z.string().min(1),
  domains: z.array(z.string().min(1)).optional().default([]),
});

const SiteDeleteReqSchema = z.object({
  site_id: z.string().min(1),
});

/* =========================================
   Admin auth helpers (for dashboard)
   - Verify Firebase ID token
   - Enforce workspace role (via siteId -> workspaceId)
========================================= */




type WorkspaceRole = "owner" | "admin" | "member" | "viewer" | string;

type AccessKey =
  | "dashboard"
  | "workspaces"
  | "sites"
  | "scenarios"
  | "actions"
  | "templates"
  | "media"
  | "ai"
  | "members"
  | "billing";

type AccessMatrix = Record<string, Partial<Record<AccessKey, boolean>>>;


const ROLE_RANK: Record<string, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

const ACCESS_KEYS: AccessKey[] = [
  "dashboard",
  "workspaces",
  "sites",
  "scenarios",
  "actions",
  "templates",
  "media",
  "ai",
  "members",
  "billing",
];

function defaultAccessMatrix(): AccessMatrix {
  return {
    owner: {
      dashboard: true,
      workspaces: true,
      sites: true,
      scenarios: true,
      actions: true,
      templates: true,
      media: true,
      ai: true,
      members: true,
      billing: true,
    },
    admin: {
      dashboard: true,
      workspaces: false,
      sites: true,
      scenarios: true,
      actions: true,
      templates: true,
      media: true,
      ai: true,
      members: true,
      billing: false,
    },
    member: {
      dashboard: true,
      workspaces: false,
      sites: true,
      scenarios: true,
      actions: true,
      templates: false,
      media: false,
      ai: true,
      members: false,
      billing: false,
    },
    viewer: {
      dashboard: true,
      workspaces: false,
      sites: true,
      scenarios: true,
      actions: false,
      templates: false,
      media: false,
      ai: true,
      members: false,
      billing: false,
    },
  };
}

function normalizeAccessMatrix(input: any): AccessMatrix {
  const base = defaultAccessMatrix();
  for (const role of Object.keys(base)) {
    for (const key of ACCESS_KEYS) {
      const next = input?.[role]?.[key];
      if (typeof next === "boolean") {
        base[role][key] = next;
      }
    }
  }
  return base;
}

function readMemberRole(raw: any): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw.role === "string") return raw.role;
  return "";
}

function hasWorkspaceAccess(role: string | null | undefined, access: AccessMatrix, key: AccessKey): boolean {
  const r = String(role || "").toLowerCase();
  if (!r) return false;
  return !!access?.[r]?.[key];
}

function rankOfRole(role: string | null | undefined): number {
  const r = String(role || "").toLowerCase();
  return ROLE_RANK[r] ?? 0;
}

function isOwnerOrAdmin(role: string | null | undefined): boolean {
  return rankOfRole(role) >= ROLE_RANK.admin;
}

function isOwner(role: string | null | undefined): boolean {
  return String(role || "").toLowerCase() === "owner";
}

function isRoleValidForMember(role: string | null | undefined): boolean {
  const r = String(role || "").toLowerCase();
  return r === "admin" || r === "member" || r === "viewer"; // owner is excluded from upsert via API
}

function nowTs(): Timestamp {
  return Timestamp.fromDate(new Date());
}

function addDaysTs(days: number): Timestamp {
  const ms = Math.max(0, days) * 24 * 60 * 60 * 1000;
  return Timestamp.fromDate(new Date(Date.now() + ms));
}

function parseIsoToDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return null;
  return d;
}




async function requireWorkspaceRoleBySiteId(
  req: any,
  siteId: string,
  allowedRoles: WorkspaceRole[] = ["owner", "admin"]
): Promise<{ uid: string; workspaceId: string }> {
  const uid = await requireAuthUid(req);
  const workspaceId = await requireWorkspaceIdFromSite(siteId);

  await assertWorkspaceRole({ workspaceId, uid, allowedRoles });
  return { uid, workspaceId };
}

async function requireWorkspaceRoleByWorkspaceId(
  req: any,
  workspaceId: string,
  allowedRoles: WorkspaceRole[] = ["owner", "admin"]
): Promise<{ uid: string; workspaceId: string }> {
  const uid = await requireAuthUid(req);
  await assertWorkspaceRole({ workspaceId, uid, allowedRoles });
  return { uid, workspaceId };
}

async function requireWorkspaceAccessByWorkspaceId(
  req: any,
  workspaceId: string,
  accessKey: AccessKey,
  allowedRoles: WorkspaceRole[] = ["owner", "admin", "member", "viewer"]
): Promise<{ uid: string; workspaceId: string; role: string }> {
  const uid = await requireAuthUid(req);
  await assertWorkspaceRole({ workspaceId, uid, allowedRoles });

  const db = adminDb();
  const wSnap = await db.collection("workspaces").doc(workspaceId).get();
  if (!wSnap.exists) throw new Error("workspace_not_found");

  const w = (wSnap.data() || {}) as any;
  const role = readMemberRole(w?.members?.[uid]);
  const access = normalizeAccessMatrix(w?.defaults?.access);

  if (!hasWorkspaceAccess(role, access, accessKey)) {
    throw new Error(`workspace_access_denied:${accessKey}`);
  }

  return { uid, workspaceId, role };
}

async function requireWorkspaceAccessBySiteId(
  req: any,
  siteId: string,
  accessKey: AccessKey,
  allowedRoles: WorkspaceRole[] = ["owner", "admin", "member", "viewer"]
): Promise<{ uid: string; workspaceId: string; role: string }> {
  const uid = await requireAuthUid(req);
  const workspaceId = await requireWorkspaceIdFromSite(siteId);
  await assertWorkspaceRole({ workspaceId, uid, allowedRoles });

  const db = adminDb();
  const wSnap = await db.collection("workspaces").doc(workspaceId).get();
  if (!wSnap.exists) throw new Error("workspace_not_found");

  const w = (wSnap.data() || {}) as any;
  const role = readMemberRole(w?.members?.[uid]);
  const access = normalizeAccessMatrix(w?.defaults?.access);

  if (!hasWorkspaceAccess(role, access, accessKey)) {
    throw new Error(`workspace_access_denied:${accessKey}`);
  }

  return { uid, workspaceId, role };
}

/* =========================================
   Admin allowlist helpers (for dashboard)
========================================= */

// Param-based config (replaces functions.config())
// Non-secret values are loaded from .env / .env.<projectAlias> etc.
// Secret values are stored in Secret Manager.
const ADMIN_ORIGINS = defineString("ADMIN_ORIGINS");
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

function parseOriginsEnv(s?: string): string[] {
  return (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeHost(input: string): string {
  const s = String(input || "").trim();
  if (!s) return "";

  // If it's already a host (no scheme), accept as-is.
  // e.g. "cx-platform-v1.web.app" or "localhost:5174"
  if (!/^https?:\/\//i.test(s)) {
    return s.replace(/\/$/, "");
  }

  // Otherwise parse as URL.
  try {
    return new URL(s).host;
  } catch {
    return "";
  }
}

function normalizeOrigin(input: string): string {
  const s = String(input || "").trim();
  if (!s) return "";
  try {
    // Keep scheme + host (+ port). Drop trailing slash.
    const u = new URL(s);
    return `${u.protocol}//${u.host}`;
  } catch {
    // If it's not a URL, treat it as host and assume https? is unknown.
    return s.replace(/\/$/, "");
  }
}

function assertAllowedAdminOrigin(origin: string) {
  const allowed = parseOriginsEnv(ADMIN_ORIGINS.value());

  // Allow either exact origin match (scheme+host) OR host match.
  // This makes env values flexible: you can set `http://localhost:5173` or `localhost:5173`.
  const allowedHosts = allowed.map(normalizeHost).filter(Boolean);
  const allowedOrigins = allowed.map(normalizeOrigin).filter(Boolean);

  const originHost = normalizeHost(origin);
  const originNorm = normalizeOrigin(origin);

  if ((originNorm && allowedOrigins.includes(originNorm)) || (originHost && allowedHosts.includes(originHost))) {
    return;
  }

  // Include a tiny hint to debug env mismatch.
  throw new Error(
    `admin origin not allowed (originHost=${originHost}, origin=${originNorm})`
  );
}

/* =========================================
   Small utils
========================================= */

function genId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}${rand}`;
}

function genToken(bytes = 24): string {
  // url-safe-ish token
  const buf = Array.from({ length: bytes }, () => Math.floor(Math.random() * 256));
  const b64 = Buffer.from(buf).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function yyyyMmDdJST(d: Date): string {
  // stats_daily の day はJST基準で切る
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find((p) => p.type === "year")?.value || "1970";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  const dd = parts.find((p) => p.type === "day")?.value || "01";
  return `${y}-${m}-${dd}`;
}

// ---- stats helpers (z-test for A/B) ----
function erfApprox(x: number): number {
  // Abramowitz and Stegun 7.1.26
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax);
  return sign * y;
}

function normalCdf(z: number): number {
  // Φ(z) = 0.5 * (1 + erf(z / sqrt(2)))
  return 0.5 * (1 + erfApprox(z / Math.SQRT2));
}

function twoPropZTest(aClicks: number, aImps: number, bClicks: number, bImps: number) {
  const aN = Math.max(0, aImps | 0);
  const bN = Math.max(0, bImps | 0);
  const aX = Math.max(0, aClicks | 0);
  const bX = Math.max(0, bClicks | 0);

  if (aN <= 0 || bN <= 0) {
    return { ok: false as const, reason: "insufficient_impressions" };
  }

  const p1 = aX / aN;
  const p2 = bX / bN;
  const pPool = (aX + bX) / (aN + bN);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / aN + 1 / bN));

  if (!isFinite(se) || se === 0) {
    return { ok: false as const, reason: "degenerate" };
  }

  const z = (p2 - p1) / se;
  const pTwoTail = 2 * (1 - normalCdf(Math.abs(z)));

  return {
    ok: true as const,
    z,
    p_value: pTwoTail,
    a: { clicks: aX, impressions: aN, ctr: aN > 0 ? aX / aN : 0 },
    b: { clicks: bX, impressions: bN, ctr: bN > 0 ? bX / bN : 0 },
  };
}


function ruleMark(metrics: { impressions: number; clicks: number; conversions?: number }) {
  const imp = metrics.impressions || 0;
  const clk = metrics.clicks || 0;
  const ctr = imp > 0 ? clk / imp : 0;

  // Phase2: 100 -> 30
  if (imp < 30) {
    return { grade: "need_data" as const, ctr, reasons: ["表示回数が少なく判断材料が不足"] };
  }
  if (ctr < 0.01) {
    return { grade: "bad" as const, ctr, reasons: ["CTRが低い（<1%）", "訴求/配置/クリエイティブ見直し候補"] };
  }
  if (ctr < 0.03) {
    return { grade: "ok" as const, ctr, reasons: ["CTRは平均帯（1〜3%）", "改善余地あり"] };
  }
  return { grade: "good" as const, ctr, reasons: ["CTRが高い（>3%）", "勝ちパターンの可能性"] };
}

function buildMetricsFromCounts(counts: {
  impressions: number;
  clicks: number;
  click_links: number;
  closes: number;
  conversions: number;
}) {
  const impressions = counts.impressions || 0;
  const clicks = counts.clicks || 0;
  const click_links = counts.click_links || 0;
  const closes = counts.closes || 0;
  const conversions = counts.conversions || 0;

  const ctr = impressions > 0 ? clicks / impressions : 0;
  const link_ctr = impressions > 0 ? click_links / impressions : 0;
  const cvr = impressions > 0 ? conversions / impressions : 0;

  return {
    impressions,
    clicks,
    click_links,
    closes,
    conversions,
    ctr,
    link_ctr,
    cvr,
  };
}

/* =========================================
   Route registration
========================================= */

export function registerV1Routes(app: Express) {
  /* -----------------------------
     OPTIONS helpers
  ------------------------------ */

  // 共通CORS（site/workspace domains判定用）
  async function corsBySiteDomains(req: any, res: any, siteId: string) {
    const origin = req.header("Origin") || "";
    if (!origin) return;

    const site = await pickSiteById(siteId);
    if (!site) throw new Error("site not found");
    const ws = await pickWorkspaceById(site.workspaceId);
    if (!ws) throw new Error("workspace not found");

    const allowed = (site.domains && site.domains.length ? site.domains : ws.domains) || [];
    const url = String((req.body?.url ?? req.body?.context?.url_hint ?? req.query?.url ?? "") || "");

    // レスポンス側のCORS
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");

    // allow判定
    assertAllowedOrigin({ allowed, origin, url });
  }

  // 管理画面CORS（ADMIN_ORIGINS判定用）
  function corsByAdminOrigins(req: any, res: any) {
    const origin = req.header("Origin") || "";
    if (!origin) return;

    // allow判定
    assertAllowedAdminOrigin(origin);

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  /* -----------------------------
     /v1/workspaces/create  ★管理画面専用（ADMIN_ORIGINS）
     - workspace を作成し、作成者を owner として member 登録
  ------------------------------ */
  app.post("/v1/workspaces/create", async (req, res) => {
    try {
      // admin CORS + allowlist
      corsByAdminOrigins(req, res);

      const uid = await requireAuthUid(req);
      const body = WorkspaceCreateReqSchema.parse(req.body);

      const db = adminDb();
      const workspaceId = genId("ws");

      const now = FieldValue.serverTimestamp();

      await db.collection("workspaces").doc(workspaceId).set(
        {
          id: workspaceId,
          name: body.name,
          createdAt: now,
          updatedAt: now,
          createdBy: uid,
          // 最小構成: ドメインは空（あとでUIで追加）
          domains: [],
          // members は map で保持（ロール判定を簡単に）
          members: {
            [uid]: "owner",
          },
        },
        { merge: true }
      );

      // bootstrap users/{uid}
      const authUser = await getAuth().getUser(uid);
      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();
      const existingUser = (userSnap.data() || {}) as any;

      await userRef.set(
        {
          uid,
          email: String(authUser.email || existingUser.email || "").toLowerCase(),
          displayName: authUser.displayName || existingUser.displayName || "",
          photoURL: authUser.photoURL || existingUser.photoURL || "",
          primaryWorkspaceId: existingUser.primaryWorkspaceId || workspaceId,
          createdAt: existingUser.createdAt || now,
          updatedAt: now,
        },
        { merge: true }
      );

      return res.json({ ok: true, workspace_id: workspaceId });
    } catch (e: any) {
      console.error("[/v1/workspaces/create] error:", e);
      return res
        .status(e?.message === "missing_authorization" || e?.message === "invalid_token" ? 401 : 400)
        .json({ ok: false, error: "workspace_create_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/workspaces/create", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/workspaces/list  ★管理画面専用（ADMIN_ORIGINS）
     - 自分がメンバーの workspaces を返す
  ------------------------------ */
  app.post("/v1/workspaces/list", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const uid = await requireAuthUid(req);
      WorkspaceListReqSchema.parse(req.body || {});

      const db = adminDb();

      // members は map: members.<uid> が存在する workspace を探す
      // Firestore では dynamic field path を where できる
      const fieldPath = `members.${uid}`;
      const snap = await db.collection("workspaces").where(fieldPath, "in", ["owner", "admin", "member", "viewer"]).get();

      const items = snap.docs.map((d) => {
        const w = (d.data() || {}) as any;
        return {
          workspace_id: d.id,
          name: w.name || "",
          role: w?.members?.[uid] || null,
          createdAt: w.createdAt || null,
          updatedAt: w.updatedAt || null,
        };
      });

      return res.json({ ok: true, items });
    } catch (e: any) {
      console.error("[/v1/workspaces/list] error:", e);
      return res
        .status(e?.message === "missing_authorization" || e?.message === "invalid_token" ? 401 : 400)
        .json({ ok: false, error: "workspace_list_failed", message: e?.message || String(e) });
    }
  });


  app.options("/v1/workspaces/list", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/workspaces/updateDomains  ★管理画面専用（ADMIN_ORIGINS）
     - workspace.domains を更新
  ------------------------------ */
  /* -----------------------------
     /v1/workspaces/members/list  ★管理画面専用（ADMIN_ORIGINS）
     - workspace の members を返す
  ------------------------------ */
  app.post("/v1/workspaces/members/list", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = WorkspaceMembersListReqSchema.parse(req.body);
      // viewer 以上なら閲覧OK
      await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "members", ["owner", "admin", "member", "viewer"]);

      const db = adminDb();
      const wSnap = await db.collection("workspaces").doc(body.workspace_id).get();
      if (!wSnap.exists) return res.status(404).json({ ok: false, error: "workspace_not_found" });

      const w = (wSnap.data() || {}) as any;
      const members = (w.members || {}) as Record<string, string>;

      const items = Object.entries(members)
        .map(([memberUid, role]) => ({ uid: memberUid, role: String(role || "member") }))
        .sort((a, b) => a.uid.localeCompare(b.uid));

      return res.json({ ok: true, workspace_id: body.workspace_id, items });
    } catch (e: any) {
      console.error("[/v1/workspaces/members/list] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "workspace_members_list_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/workspaces/members/list", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/workspaces/members/upsert  ★管理画面専用（ADMIN_ORIGINS）
     - members に uid/role を追加・更新
  ------------------------------ */
  app.post("/v1/workspaces/members/upsert", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = WorkspaceMemberUpsertReqSchema.parse(req.body);
      // 変更権限は owner/admin のみ
      const { uid: actorUid } = await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "members", ["owner", "admin"]);

      // owner を member が作る、とかは防ぐ（site.ts側の共通ルール）
      // ※ canManageMembers は roleRank ベースの簡易判定
      const db = adminDb();
      const wRef = db.collection("workspaces").doc(body.workspace_id);
      const wSnap = await wRef.get();
      if (!wSnap.exists) return res.status(404).json({ ok: false, error: "workspace_not_found" });

      const w = (wSnap.data() || {}) as any;
      const actorRole = String(w?.members?.[actorUid] || "");

      // Disallow assigning owner via this endpoint (avoid privilege escalation).
      if (!isRoleValidForMember(body.role)) {
        return res.status(400).json({ ok: false, error: "invalid_role", message: "role must be admin|member|viewer" });
      }

      // Actor must be able to manage members and the target role.
      if (!isOwnerOrAdmin(actorRole) || !canManageMembers(actorRole, body.role)) {
        return res.status(403).json({ ok: false, error: "forbidden", message: "insufficient_role" });
      }

      const now = FieldValue.serverTimestamp();
      await wRef.set({ updatedAt: now }, { merge: true });
      await wRef.update({ [`members.${body.uid}`]: body.role });

      return res.json({ ok: true, workspace_id: body.workspace_id, uid: body.uid, role: body.role });
    } catch (e: any) {
      console.error("[/v1/workspaces/members/upsert] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "workspace_member_upsert_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/workspaces/members/upsert", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/workspaces/members/remove  ★管理画面専用（ADMIN_ORIGINS）
  ------------------------------ */
  app.post("/v1/workspaces/members/remove", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = WorkspaceMemberRemoveReqSchema.parse(req.body);
      const { uid: actorUid } = await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "members", ["owner", "admin"]);

      const db = adminDb();
      const wRef = db.collection("workspaces").doc(body.workspace_id);
      const wSnap = await wRef.get();
      if (!wSnap.exists) return res.status(404).json({ ok: false, error: "workspace_not_found" });

      const w = (wSnap.data() || {}) as any;
      const actorRole = readMemberRole(w?.members?.[actorUid]);
      const targetRole = readMemberRole(w?.members?.[body.uid]);

      if (!targetRole) {
        return res.status(404).json({ ok: false, error: "member_not_found" });
      }

      // 自分自身をここから削除するのは禁止（leave は別APIに分ける）
      if (body.uid === actorUid) {
        return res.status(400).json({ ok: false, error: "cannot_remove_self" });
      }

      // owner は削除禁止
      if (isOwner(targetRole)) {
        return res.status(400).json({ ok: false, error: "cannot_remove_owner" });
      }

      // actor が targetRole を管理できるか厳密に判定
      if (!isOwnerOrAdmin(actorRole) || !canManageMembers(actorRole, targetRole)) {
        return res.status(403).json({ ok: false, error: "forbidden", message: "insufficient_role" });
      }

      const now = FieldValue.serverTimestamp();
      await wRef.update({ updatedAt: now, [`members.${body.uid}`]: FieldValue.delete() as any });

      // primaryWorkspaceId が今回の workspace だった場合は、残っている所属先へ付け替える
      const userRef = db.collection("users").doc(body.uid);
      const userSnap = await userRef.get();
      const userData = (userSnap.data() || {}) as any;
      const currentPrimaryWorkspaceId = String(userData.primaryWorkspaceId || "");

      if (currentPrimaryWorkspaceId === body.workspace_id) {
        const fieldPath = `members.${body.uid}`;
        const otherWsSnap = await db
          .collection("workspaces")
          .where(fieldPath, "in", ["owner", "admin", "member", "viewer"])
          .limit(1)
          .get();

        const nextWorkspaceId = otherWsSnap.empty ? "" : otherWsSnap.docs[0].id;
        await userRef.set(
          {
            primaryWorkspaceId: nextWorkspaceId || "",
            updatedAt: now,
          },
          { merge: true }
        );
      }

      return res.json({ ok: true, workspace_id: body.workspace_id, uid: body.uid });
    } catch (e: any) {
      console.error("[/v1/workspaces/members/remove] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "workspace_member_remove_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/workspaces/members/remove", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  async function handleWorkspaceInviteCreate(req: any, res: any) {
    try {
      corsByAdminOrigins(req, res);

      const body = WorkspaceInviteCreateReqSchema.parse(req.body);
      const { uid: actorUid } = await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "members", ["owner", "admin"]);

      const db = adminDb();
      const wRef = db.collection("workspaces").doc(body.workspace_id);
      const wSnap = await wRef.get();
      if (!wSnap.exists) return res.status(404).json({ ok: false, error: "workspace_not_found" });

      const w = (wSnap.data() || {}) as any;
      const actorRole = String(w?.members?.[actorUid] || "");
      if (!canManageMembers(actorRole, body.role)) {
        return res.status(403).json({ ok: false, error: "forbidden", message: "insufficient_role" });
      }

      const inviteId = genId("inv");
      const token = genToken(24);
      const now = FieldValue.serverTimestamp();

      await db.collection("workspace_invites").doc(inviteId).set(
        {
          id: inviteId,
          workspaceId: body.workspace_id,
          email: body.email.toLowerCase(),
          role: body.role,
          token,
          expiresAt: addDaysTs(7),
          status: "pending",
          createdBy: actorUid,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );

      return res.json({ ok: true, invite_id: inviteId, workspace_id: body.workspace_id, email: body.email, role: body.role, token });
    } catch (e: any) {
      console.error("[/v1/workspaces/invites/create] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "workspace_invite_create_failed", message: e?.message || String(e) });
    }
  }

  /* -----------------------------
     /v1/workspaces/invites/create  ★管理画面専用（ADMIN_ORIGINS）
  ------------------------------ */
  app.post("/v1/workspaces/invites/create", handleWorkspaceInviteCreate);
  app.post("/v1/workspaces/members/invite", handleWorkspaceInviteCreate);

  app.options("/v1/workspaces/invites/create", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });
  app.options("/v1/workspaces/members/invite", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/workspaces/invites/list  ★管理画面専用（ADMIN_ORIGINS）
  ------------------------------ */
  app.post("/v1/workspaces/invites/list", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = WorkspaceInviteListReqSchema.parse(req.body);
      await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "members", ["owner", "admin"]);

      const db = adminDb();
      const snap = await db
        .collection("workspace_invites")
        .where("workspaceId", "==", body.workspace_id)
        .orderBy("createdAt", "desc")
        .get();

      const items = snap.docs.map((d) => {
        const v = (d.data() || {}) as any;
        return {
          invite_id: d.id,
          email: v.email || "",
          role: v.role || "member",
          token: v.token || "",
          status: v.status || "pending",
          createdBy: v.createdBy || null,
          createdAt: v.createdAt || null,
          expiresAt: v.expiresAt || null,
          acceptedBy: v.acceptedBy || null,
          acceptedAt: v.acceptedAt || null,
          revokedAt: v.revokedAt || null,
        };
      });

      return res.json({ ok: true, workspace_id: body.workspace_id, items });
    } catch (e: any) {
      console.error("[/v1/workspaces/invites/list] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "workspace_invite_list_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/workspaces/invites/list", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/workspaces/invites/revoke  ★管理画面専用（ADMIN_ORIGINS）
  ------------------------------ */
  app.post("/v1/workspaces/invites/revoke", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const uid = await requireAuthUid(req);
      const body = WorkspaceInviteRevokeReqSchema.parse(req.body);

      const db = adminDb();
      const ref = db.collection("workspace_invites").doc(body.invite_id);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ ok: false, error: "invite_not_found" });

      const inv = (snap.data() || {}) as any;
      const workspaceId = String(inv.workspaceId || "");
      if (!workspaceId) return res.status(400).json({ ok: false, error: "invite_invalid" });

      if (String(inv.status || "pending") !== "pending") {
        return res.status(400).json({ ok: false, error: "invite_not_pending" });
      }

      await requireWorkspaceAccessByWorkspaceId(req, workspaceId, "members", ["owner", "admin"]);

      const now = FieldValue.serverTimestamp();
      await ref.set({ status: "revoked", updatedAt: now, revokedBy: uid, revokedAt: now }, { merge: true });

      return res.json({ ok: true, invite_id: body.invite_id });
    } catch (e: any) {
      console.error("[/v1/workspaces/invites/revoke] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "workspace_invite_revoke_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/workspaces/invites/revoke", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/workspaces/invites/accept  ★管理画面専用（ADMIN_ORIGINS）
     - token を使って invite を受諾し、workspace.members に追加
  ------------------------------ */
  app.post("/v1/workspaces/invites/accept", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const uid = await requireAuthUid(req);
      const body = WorkspaceInviteAcceptReqSchema.parse(req.body);

      const db = adminDb();

      // token で検索
      const q = await db.collection("workspace_invites").where("token", "==", body.token).limit(1).get();
      if (q.empty) return res.status(404).json({ ok: false, error: "invite_not_found" });

      const inviteDoc = q.docs[0];
      const inv = (inviteDoc.data() || {}) as any;

      if (String(inv.status || "pending") !== "pending") {
        return res.status(400).json({ ok: false, error: "invite_not_pending" });
      }

      const inviteEmail = String(inv.email || "").toLowerCase();
      if (body.email && String(body.email).toLowerCase() !== inviteEmail) {
        return res.status(400).json({ ok: false, error: "email_mismatch" });
      }

      const authUser = await getAuth().getUser(uid);
      const signedInEmail = String(authUser.email || "").toLowerCase();
      if (!signedInEmail || signedInEmail !== inviteEmail) {
        return res.status(400).json({ ok: false, error: "email_mismatch", message: "signed_in_email_mismatch" });
      }

      const exp: any = inv.expiresAt;
      if (exp) {
        const expDate = typeof exp.toDate === "function" ? exp.toDate() : new Date(exp);
        if (isFinite(expDate.getTime()) && expDate.getTime() < Date.now()) {
          return res.status(400).json({ ok: false, error: "invite_expired" });
        }
      }

      const workspaceId = String(inv.workspaceId || "");
      const role = String(inv.role || "member");
      if (!workspaceId) return res.status(400).json({ ok: false, error: "invite_invalid" });

      const wRef = db.collection("workspaces").doc(workspaceId);
      const wSnap = await wRef.get();
      if (!wSnap.exists) return res.status(404).json({ ok: false, error: "workspace_not_found" });

      const workspace = (wSnap.data() || {}) as any;
      const workspaceName = String(workspace.name || "");
      const now = FieldValue.serverTimestamp();

      // workspace に member 追加
      await wRef.set(
        {
          members: {
            ...(workspace.members || {}),
            [uid]: role,
          },
          updatedAt: now,
        },
        { merge: true }
      );

      // users/{uid} を補完（招待参加ユーザーの bootstrap）
      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();
      const existingUser = (userSnap.data() || {}) as any;
      await userRef.set(
        {
          uid,
          email: signedInEmail,
          displayName: authUser.displayName || existingUser.displayName || "",
          photoURL: authUser.photoURL || existingUser.photoURL || "",
          primaryWorkspaceId: existingUser.primaryWorkspaceId || workspaceId,
          updatedAt: now,
          createdAt: existingUser.createdAt || now,
        },
        { merge: true }
      );

      // invite を accepted に
      await inviteDoc.ref.set(
        {
          status: "accepted",
          acceptedBy: uid,
          acceptedAt: now,
          updatedAt: now,
        },
        { merge: true }
      );

      return res.json({
        ok: true,
        workspace_id: workspaceId,
        workspace_name: workspaceName,
        uid,
        role,
      });
    } catch (e: any) {
      console.error("[/v1/workspaces/invites/accept] error:", e);
      return res
        .status(e?.message === "missing_authorization" || e?.message === "invalid_token" ? 401 : 400)
        .json({ ok: false, error: "workspace_invite_accept_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/workspaces/invites/accept", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });
  app.post("/v1/workspaces/updateDomains", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = WorkspaceDomainsUpdateReqSchema.parse(req.body);
      await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "workspaces", ["owner", "admin"]);

      const db = adminDb();
      const now = FieldValue.serverTimestamp();

      await db.collection("workspaces").doc(body.workspace_id).set(
        {
          domains: body.domains,
          updatedAt: now,
        },
        { merge: true }
      );

      return res.json({ ok: true, workspace_id: body.workspace_id, domains: body.domains });
    } catch (e: any) {
      console.error("[/v1/workspaces/updateDomains] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "workspace_update_domains_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/workspaces/updateDomains", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/sites/create  ★管理画面専用（ADMIN_ORIGINS）
     - workspace 配下に site を作成
  ------------------------------ */
  app.post("/v1/sites/create", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = SiteCreateReqSchema.parse(req.body);
      const { uid } = await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "sites", ["owner", "admin"]);

      const db = adminDb();
      const siteId = genId("site");
      const publicKey = String(body.public_key || "").trim();
      const now = FieldValue.serverTimestamp();

      if (!publicKey) {
        return res.status(400).json({ ok: false, error: "public_key_required" });
      }

      const dupSnap = await db.collection("sites").where("publicKey", "==", publicKey).limit(1).get();
      if (!dupSnap.empty) {
        return res.status(400).json({ ok: false, error: "public_key_already_exists" });
      }

      await db.collection("sites").doc(siteId).set(
        {
          id: siteId,
          workspaceId: body.workspace_id,
          name: body.name,
          publicKey,
          domains: body.domains,
          createdAt: now,
          updatedAt: now,
          createdBy: uid,
        },
        { merge: true }
      );

      return res.json({ ok: true, site_id: siteId, public_key: publicKey });
    } catch (e: any) {
      console.error("[/v1/sites/create] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "site_create_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/sites/create", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/sites/list  ★管理画面専用（ADMIN_ORIGINS）
     - workspace 配下の sites を返す
  ------------------------------ */
  app.post("/v1/sites/list", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = SiteListReqSchema.parse(req.body);
      await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "sites", ["owner", "admin", "member", "viewer"]);

      const db = adminDb();
      const snap = await db.collection("sites").where("workspaceId", "==", body.workspace_id).get();

      const items = snap.docs.map((d) => {
        const s = (d.data() || {}) as any;
        return {
          site_id: d.id,
          name: s.name || "",
          publicKey: s.publicKey || null,
          domains: Array.isArray(s.domains) ? s.domains : [],
          createdAt: s.createdAt || null,
          updatedAt: s.updatedAt || null,
        };
      });

      return res.json({ ok: true, workspace_id: body.workspace_id, items });
    } catch (e: any) {
      console.error("[/v1/sites/list] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "site_list_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/sites/list", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/sites/updateDomains  ★管理画面専用（ADMIN_ORIGINS）
     - site.domains を更新（owner/adminのみ）
  ------------------------------ */
  app.post("/v1/sites/updateDomains", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = SiteDomainsUpdateReqSchema.parse(req.body);

      // siteId -> workspace role check
      await requireWorkspaceAccessBySiteId(req, body.site_id, "sites", ["owner", "admin"]);

      const db = adminDb();
      const now = FieldValue.serverTimestamp();

      await db.collection("sites").doc(body.site_id).set(
        {
          domains: body.domains,
          updatedAt: now,
        },
        { merge: true }
      );

      return res.json({ ok: true, site_id: body.site_id, domains: body.domains });
    } catch (e: any) {
      console.error("[/v1/sites/updateDomains] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "site_update_domains_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/sites/updateDomains", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/workspaces/billing/get  ★管理画面専用（ADMIN_ORIGINS）
     - workspace の課金状態/プラン情報を取得
  ------------------------------ */
  app.post("/v1/workspaces/billing/get", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = WorkspaceBillingGetReqSchema.parse(req.body);
      await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "billing", ["owner", "admin", "member", "viewer"]);

      const db = adminDb();
      const wSnap = await db.collection("workspaces").doc(body.workspace_id).get();
      if (!wSnap.exists) return res.status(404).json({ ok: false, error: "workspace_not_found" });

      const w = (wSnap.data() || {}) as any;
      const billing = (w.billing || {}) as any;

      return res.json({
        ok: true,
        workspace_id: body.workspace_id,
        billing: {
          plan: billing.plan || "free",
          status: billing.status || "inactive",
          billing_email: billing.billing_email || null,
          trial_ends_at: billing.trial_ends_at || null,
          current_period_ends_at: billing.current_period_ends_at || null,
          updatedAt: billing.updatedAt || w.updatedAt || null,
        },
      });
    } catch (e: any) {
      console.error("[/v1/workspaces/billing/get] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "workspace_billing_get_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/workspaces/billing/get", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/workspaces/billing/update  ★管理画面専用（ADMIN_ORIGINS）
     - workspace.billing を更新
     - Stripe連携前の“内部課金状態”の土台
  ------------------------------ */
  app.post("/v1/workspaces/billing/update", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = WorkspaceBillingUpdateReqSchema.parse(req.body);
      await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "billing", ["owner", "admin"]);

      const db = adminDb();
      const wRef = db.collection("workspaces").doc(body.workspace_id);
      const wSnap = await wRef.get();
      if (!wSnap.exists) return res.status(404).json({ ok: false, error: "workspace_not_found" });

      const patch: any = {};

      if (body.plan) patch.plan = body.plan;
      if (body.status) patch.status = body.status;
      if (body.billing_email) patch.billing_email = body.billing_email.toLowerCase();

      const explicitTrial = parseIsoToDate(body.trial_ends_at);
      if (explicitTrial) {
        patch.trial_ends_at = explicitTrial.toISOString();
      } else if (typeof body.trial_days === "number") {
        const d = new Date(Date.now() + Math.max(0, body.trial_days) * 24 * 60 * 60 * 1000);
        patch.trial_ends_at = d.toISOString();
      }

      const explicitPeriod = parseIsoToDate(body.current_period_ends_at);
      if (explicitPeriod) {
        patch.current_period_ends_at = explicitPeriod.toISOString();
      }

      const now = FieldValue.serverTimestamp();
      patch.updatedAt = now;

      const updateObj: any = { updatedAt: now };
      for (const [k, v] of Object.entries(patch)) {
        updateObj[`billing.${k}`] = v;
      }

      await wRef.set({ updatedAt: now }, { merge: true });
      await wRef.update(updateObj);

      const after = await wRef.get();
      const w2 = (after.data() || {}) as any;
      const billing = (w2.billing || {}) as any;

      return res.json({
        ok: true,
        workspace_id: body.workspace_id,
        billing: {
          plan: billing.plan || "free",
          status: billing.status || "inactive",
          billing_email: billing.billing_email || null,
          trial_ends_at: billing.trial_ends_at || null,
          current_period_ends_at: billing.current_period_ends_at || null,
          updatedAt: billing.updatedAt || w2.updatedAt || null,
        },
      });
    } catch (e: any) {
      console.error("[/v1/workspaces/billing/update] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "workspace_billing_update_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/workspaces/billing/update", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });


  /* -----------------------------
     /v1/sites/delete  ★管理画面専用（ADMIN_ORIGINS）
     - site を論理削除（status=deleted）
     - ついでに当該 site の active scenarios を inactive に落とす
  ------------------------------ */
  app.post("/v1/sites/delete", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = SiteDeleteReqSchema.parse(req.body);

      // siteId -> workspace role check (owner/admin only)
      const { uid } = await requireWorkspaceAccessBySiteId(req, body.site_id, "sites", ["owner", "admin"]);

      const db = adminDb();

      // site existence check
      const siteSnap = await db.collection("sites").doc(body.site_id).get();
      if (!siteSnap.exists) return res.status(404).json({ ok: false, error: "site_not_found" });

      const now = FieldValue.serverTimestamp();

      // 1) logical delete site
      await db
        .collection("sites")
        .doc(body.site_id)
        .set(
          {
            status: "deleted",
            deletedAt: now,
            deletedBy: uid,
            updatedAt: now,
          },
          { merge: true }
        );

      // 2) deactivate active scenarios under this site (best-effort)
      const scenSnap = await db
        .collection("scenarios")
        .where("siteId", "==", body.site_id)
        .where("status", "==", "active")
        .get();

      if (!scenSnap.empty) {
        // Firestore batch limit is 500 operations
        const docs = scenSnap.docs;
        for (let i = 0; i < docs.length; i += 450) {
          const chunk = docs.slice(i, i + 450);
          const batch = db.batch();
          for (const d of chunk) {
            batch.set(
              d.ref,
              {
                status: "inactive",
                updatedAt: now,
                disabledBy: uid,
                disabledReason: "site_deleted",
              },
              { merge: true }
            );
          }
          await batch.commit();
        }
      }

      return res.json({ ok: true, site_id: body.site_id, deactivated_scenarios: scenSnap.size });
    } catch (e: any) {
      console.error("[/v1/sites/delete] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "site_delete_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/sites/delete", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/serve
     - 埋め込みJSが設定を取りに来る想定
     - site/workspace domainsで制御
     ※ 既存実装に合わせて中身は必要なら拡張してね
  ------------------------------ */
  app.get("/v1/serve", async (req, res) => {
    try {
      const site_id = String(req.query.site_id || "");
      if (!site_id) return res.status(400).json({ error: "site_id required" });

      // CORS + allow
      await corsBySiteDomains(req, res, site_id);

      // Disable caching for SDK config (avoid 304 Not Modified)
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0"
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
      res.setHeader("ETag", "");

      const site = await pickSiteById(site_id);
      if (!site) return res.status(404).json({ error: "site not found" });

      const db = adminDb();

      // 1. active scenarios for this site
      const scenarioSnap = await db
        .collection("scenarios")
        .where("siteId", "==", site_id)
        .where("status", "==", "active")
        .get();

      const scenarios: any[] = [];

      for (const doc of scenarioSnap.docs) {
        const s = doc.data() as any;

        // 2. expand actionRefs -> actions
        const actionRefs = Array.isArray(s.actionRefs) ? s.actionRefs : [];
        const actions: any[] = [];

        for (const ref of actionRefs) {
          if (!ref?.enabled) continue;

          const aSnap = await db.collection("actions").doc(ref.actionId).get();
          if (!aSnap.exists) continue;

          const a = aSnap.data() as any;

          actions.push({
            action_id: a.id || ref.actionId,
            type: a.type,
            creative: a.creative || {},
            template: a.template || null,
            mount: a.mount || null,
          });
        }

        if (!actions.length) continue;

        scenarios.push({
          scenario_id: doc.id,
          status: s.status,
          priority: s.priority ?? 0,
          entry_rules: s.entry_rules || {},
          actions,
          experiment: s.experiment || null,
        });
      }

      return res.json({
        ok: true,
        site: {
          id: site.id,
          publicKey: site.publicKey,
          workspaceId: site.workspaceId,
        },
        scenarios,
      });
    } catch (e: any) {
      console.error("[/v1/serve] error:", e);
      return res.status(400).json({ error: "serve_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/serve", async (req, res) => {
    try {
      const site_id = String(req.query.site_id || req.header("X-Site-Id") || req.body?.site_id || "");
      if (site_id) await corsBySiteDomains(req, res, site_id);

      res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      // プリフライトは弾くなら弾く（ここで204返すと抜けるので注意）
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/log
     - 埋め込みJSがログを送る
     - site/workspace domainsで制御
  ------------------------------ */
  app.post("/v1/log", async (req, res) => {
    try {
      const body = LogReqSchema.parse(req.body);
      console.log("[/v1/log] event", {
        site_id: body.site_id,
        scenario_id: body.scenario_id ?? null,
        action_id: body.action_id ?? null,
        variant_id: body.variant_id ?? null,
        event: body.event,
        path: body.path ?? null,
      });

      // CORS + allow (public embed side)
      await corsBySiteDomains(req, res, body.site_id);

      const db = adminDb();
      const nowIso = new Date().toISOString();
      const day = yyyyMmDdJST(new Date());

      // Normalize ids (variantId は必ず入れる / nullはna)
      const siteId = String(body.site_id);
      const scenarioId = String(body.scenario_id ?? "all");
      const actionId = String(body.action_id ?? "all");
      const templateId = body.template_id ?? null;
      const variantId = String(body.variant_id ?? "na") || "na";
      const event = body.event;

      // ---- raw logs (詳細分析・検証用) ----
      const logPayload = {
        site_id: siteId,
        scenario_id: body.scenario_id ?? null,
        action_id: body.action_id ?? null,
        template_id: templateId,
        variant_id: body.variant_id ?? null,
        event,
        url: body.url ?? null,
        path: body.path ?? null,
        ref: body.ref ?? null,
        vid: body.vid ?? null,
        sid: body.sid ?? null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await db.collection("logs").add(logPayload);

      // ---- stats_daily (集計) ----
      // 重要: docId に variantId を含めないと A/B が上書きされる
      const statsDocId = `${siteId}__${day}__${scenarioId}__${actionId}__${variantId}__${event}`;
      const statsRef = db.collection("stats_daily").doc(statsDocId);

      await statsRef.set(
        {
          siteId,
          day,
          scenarioId: body.scenario_id ?? null,
          actionId: body.action_id ?? null,
          templateId,
          variantId, // always a string like "A"/"B"/"na"
          event,
          count: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[/v1/log] error:", e);
      return res.status(400).json({ error: "log_failed", message: e?.message || String(e) });
    }
  });
  /* -----------------------------
     /v1/stats/summary  ★管理画面専用（ADMIN_ORIGINS）
     - stats_daily を集計してダッシュボード用の数字を返す
  ------------------------------ */
  app.post("/v1/stats/summary", async (req, res) => {
    try {
      const body = StatsSummaryReqSchema.parse(req.body);

      // admin CORS + allowlist
      corsByAdminOrigins(req, res);
      await requireWorkspaceAccessBySiteId(req, body.site_id, "dashboard", ["owner", "admin", "member"]);
      // ---- debug logs (temporary) ----
      const origin = req.header("Origin") || "";
      console.log("[/v1/stats/summary] origin", origin);
      console.log("[/v1/stats/summary] req", {
        site_id: body.site_id,
        day: body.day,
        scope: body.scope,
        scope_id: body.scope_id,
        variant_id: body.variant_id ?? null,
      });

      // site existence check (optional but nice)
      const site = await pickSiteById(body.site_id);
      if (!site) return res.status(404).json({ error: "site not found" });

      const db = adminDb();

      // Normalize filters
      const variantFilter = body.variant_id; // null/undefined -> aggregate across all variants

      let q = db
        .collection("stats_daily")
        .where("siteId", "==", body.site_id)
        .where("day", "==", body.day);

      if (variantFilter != null) {
        const variantId = String(variantFilter || "na") || "na";
        q = q.where("variantId", "==", variantId);
      }

      if (body.scope === "scenario") {
        q = q.where("scenarioId", "==", body.scope_id);
      } else if (body.scope === "action") {
        q = q.where("actionId", "==", body.scope_id);
      } else {
        // site scope: scope_id should be "all" (kept for consistency)
      }

      const snap = await q.get();
      console.log("[/v1/stats/summary] matched docs", snap.size);
      if (snap.size > 0) {
        const first = snap.docs[0];
        console.log("[/v1/stats/summary] first doc id", first.id);
        console.log("[/v1/stats/summary] first doc data", first.data());
      }

      const countsByVariant: Record<
        string,
        { impressions: number; clicks: number; click_links: number; closes: number; conversions: number }
      > = {};

      function ensureVariant(v: string) {
        if (!countsByVariant[v]) {
          countsByVariant[v] = { impressions: 0, clicks: 0, click_links: 0, closes: 0, conversions: 0 };
        }
        return countsByVariant[v];
      }

      for (const doc of snap.docs) {
        const d = doc.data() as any;
        const ev = String(d.event || "");
        const c = Number(d.count || 0);
        if (!c) continue;

        const v = String(d.variantId || "na") || "na";
        const bucket = ensureVariant(v);

        if (ev === "impression") bucket.impressions += c;
        else if (ev === "click") bucket.clicks += c;
        else if (ev === "click_link") bucket.click_links += c;
        else if (ev === "close") bucket.closes += c;
        else if (ev === "conversion") bucket.conversions += c;
      }

      const variants = Object.keys(countsByVariant).sort();

      const totalCounts = variants.reduce(
        (acc, v) => {
          const c = countsByVariant[v];
          acc.impressions += c.impressions;
          acc.clicks += c.clicks;
          acc.click_links += c.click_links;
          acc.closes += c.closes;
          acc.conversions += c.conversions;
          return acc;
        },
        { impressions: 0, clicks: 0, click_links: 0, closes: 0, conversions: 0 }
      );

      const metricsByVariant: Record<string, ReturnType<typeof buildMetricsFromCounts>> = {};
      for (const v of variants) {
        metricsByVariant[v] = buildMetricsFromCounts(countsByVariant[v]);
      }

      // Pick two variants for z-test: top2 by impressions
      const top2 = variants
        .map((v) => ({ v, imp: countsByVariant[v].impressions }))
        .sort((a, b) => b.imp - a.imp)
        .slice(0, 2);

      let ztest: any = null;
      if (top2.length === 2) {
        const A = top2[0].v;
        const B = top2[1].v;
        const a = countsByVariant[A];
        const b = countsByVariant[B];
        const z = twoPropZTest(a.clicks, a.impressions, b.clicks, b.impressions);

        if (z.ok) {
          const winner = z.b.ctr > z.a.ctr ? B : A;
          ztest = {
            ok: true,
            variantA: A,
            variantB: B,
            z: z.z,
            p_value: z.p_value,
            significant_95: z.p_value < 0.05,
            winner,
            ctrA: z.a.ctr,
            ctrB: z.b.ctr,
          };
        } else {
          ztest = { ok: false, reason: z.reason, variantA: A, variantB: B };
        }
      }

      const metrics = buildMetricsFromCounts(totalCounts);
      const rule = ruleMark({ impressions: metrics.impressions, clicks: metrics.clicks, conversions: metrics.conversions });

      return res.json({
        ok: true,
        site_id: body.site_id,
        day: body.day,
        scope: body.scope,
        scope_id: body.scope_id,
        variant_id: body.variant_id ?? null,
        counts: totalCounts,
        metrics,
        rule,
        variants: variants.map((v) => ({
          variant_id: v,
          counts: countsByVariant[v],
          metrics: metricsByVariant[v],
        })),
        ztest,
      });
    } catch (e: any) {
      console.error("[/v1/stats/summary] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ error: "stats_summary_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/stats/summary", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization,X-Site-Id,X-Site-Key"
      );
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  app.options("/v1/log", async (req, res) => {
    try {
      // Preflight usually has no body. Try query/header fallbacks.
      const site_id = String(req.query.site_id || req.header("X-Site-Id") || req.body?.site_id || "");
      if (site_id) await corsBySiteDomains(req, res, site_id);

      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Site-Id,X-Site-Key,Authorization");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/ai/copy
     - 管理画面用（admin allowlist）
     ※ ここを site domains で守りたいなら corsBySiteDomains に変更してOK
  ------------------------------ */
  app.post("/v1/ai/copy", async (req, res) => {
    try {
      const body = CopyReqSchema.parse(req.body);

      // 管理画面CORS
      corsByAdminOrigins(req, res);
      await requireWorkspaceAccessBySiteId(req, body.site_id, "ai", ["owner", "admin", "member"]);

      // site存在確認だけしたいならここで
      const site = await pickSiteById(body.site_id);
      if (!site) return res.status(404).json({ error: "site not found" });

      // 既存ロジック（例）
      const apiKey = OPENAI_API_KEY.value();
      if (!apiKey) return res.status(500).json({ error: "missing_openai_api_key" });

      const out = await generateCopy3({
        apiKey,
        goal: body.goal,
        base_creative: body.base_creative,
        brand_tone: body.brand_tone,
      });

      return res.json({ ok: true, ...out });
    } catch (e: any) {
      console.error("[/v1/ai/copy] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ error: "ai_copy_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/ai/copy", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/ai/insight  ★管理画面専用（ADMIN_ORIGINS）
     - site/workspace domains を使わない
  ------------------------------ */
  app.post("/v1/ai/insight", async (req, res) => {
    try {
      const body = AiInsightReqSchema.parse(req.body);

      // ---- CORS + admin allowlist（ai/insight は管理画面専用） ----
      corsByAdminOrigins(req, res);
      await requireWorkspaceAccessBySiteId(req, body.site_id, "ai", ["owner", "admin", "member"]);

      // ---- site/workspace は「存在確認」だけ（domains判定には使わない） ----
      const site = await pickSiteById(body.site_id);
      if (!site) return res.status(404).json({ error: "site not found" });

      const ws = await pickWorkspaceById(site.workspaceId);
      if (!ws) return res.status(404).json({ error: "workspace not found" });

      // ---- debug log ----
      const origin = req.header("Origin") || "";
      const url = String((req.body?.url ?? req.body?.context?.url_hint ?? "") || "");
      console.log("[ai/insight] siteId", body.site_id);
      console.log("[ai/insight] origin", origin);
      console.log("[ai/insight] url", url);

      const rule = ruleMark(body.metrics);

      // データ不足はAI呼ばずに返す（課金保護）
      if (rule.grade === "need_data") {
        return res.json({ ok: true, cached: false, rule, ai: null });
      }

      const day = body.day;
      const variantId = body.variant_id ?? "na";
      const docId = `${body.site_id}__${day}__${body.scope}__${body.scope_id}__${variantId}`;

      const db = adminDb();
      const ref = db.collection("ai_insights_daily").doc(docId);
      const snap = await ref.get();
      if (snap.exists) {
        return res.json({ ok: true, cached: true, ...(snap.data() as any) });
      }

      const prompt = {
        goal: "接客施策の改善アドバイス（自動適用はしない）",
        scope: body.scope,
        scope_id: body.scope_id,
        variant_id: variantId,
        metrics: {
          impressions: body.metrics.impressions,
          clicks: body.metrics.clicks,
          ctr: rule.ctr,
          closes: body.metrics.closes ?? 0,
          conversions: body.metrics.conversions ?? 0,
        },
        rule,
        context: body.context || {},
        constraints: {
          tone: "短く・実務的・断定しすぎない",
          format: "summary 1行 + bullets 3行 + next 1行",
          avoid: ["自動変更の指示", "誇大表現"],
        },
      };

      const out = await callOpenAIJson({
        model: "gpt-4.1-mini",
        input: prompt,
        schema: z.object({
          summary: z.string(),
          bullets: z.array(z.string()).min(3).max(3),
          next: z.string(),
        }),
      });

      const payload = {
        siteId: body.site_id,
        day,
        scope: body.scope,
        scopeId: body.scope_id,
        variantId: body.variant_id ?? null,
        input: prompt,
        rule,
        ai: out,
        model: "gpt-4.1-mini",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await ref.set(payload, { merge: true });

      return res.json({ ok: true, cached: false, ...payload });
    } catch (e: any) {
      console.error("[/v1/ai/insight] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ error: "ai_insight_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/ai/insight", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/ai/review  ★管理画面専用（ADMIN_ORIGINS）
     - シナリオの actions + stats_daily を元に、AIが改善ポイント(最大3)を返す
  ------------------------------ */

  const AiReviewHighlightSchema = z.object({
    action_id: z.string().min(1),
    label: z.string().min(1),
    reason: z.string().min(1),
    severity: z.enum(["info", "warn", "bad"]),
  });

  app.post("/v1/ai/review", async (req, res) => {
    try {
      const body = AiReviewReqSchema.parse(req.body);

      // 管理画面CORS
      corsByAdminOrigins(req, res);
      await requireWorkspaceAccessBySiteId(req, body.site_id, "ai", ["owner", "admin", "member"]);

      const site = await pickSiteById(body.site_id);
      if (!site) return res.status(404).json({ error: "site not found" });

      const db = adminDb();

      const siteId = body.site_id;
      const day = body.day;
      const scenarioId = body.scenario_id;
      const variantId = String(body.variant_id ?? "na") || "na";

      // ===============================
      // 1) キャッシュ
      // ===============================
      const cacheId = `${siteId}__${scenarioId}__${variantId}__${day}`;
      const cacheRef = db.collection("ai_reviews_daily").doc(cacheId);
      const cacheSnap = await cacheRef.get();
      if (cacheSnap.exists) {
        return res.json({ ok: true, cached: true, ...(cacheSnap.data() as any) });
      }

      // ===============================
      // 2) scenario + actions
      // ===============================
      const sSnap = await db.collection("scenarios").doc(scenarioId).get();
      if (!sSnap.exists) return res.status(404).json({ error: "scenario not found" });
      const s = (sSnap.data() || {}) as any;

      // v1/serve と同じ: actionRefs[{actionId, enabled}]
      const actionRefs = Array.isArray(s.actionRefs) ? s.actionRefs : [];
      const enabledActionIds: string[] = actionRefs
        .filter((r: any) => r && r.enabled)
        .map((r: any) => String(r.actionId || ""))
        .filter((id: string) => Boolean(id));

      if (!enabledActionIds.length) {
        return res.status(400).json({ ok: false, error: "no_actions" });
      }

      const actionSnaps = await Promise.all(
        enabledActionIds.map((id: string) => db.collection("actions").doc(id).get())
      );
      const actions = actionSnaps
        .filter((snap) => snap.exists)
        .map((snap) => {
          const d = (snap.data() || {}) as any;
          return {
            action_id: snap.id,
            type: (d.type || "modal") as "modal" | "banner" | "toast",
            creative: d.creative || {},
          };
        });

      // ===============================
      // 3) stats_daily（actionごと）
      // ===============================
      const statsSnap = await db
        .collection("stats_daily")
        .where("siteId", "==", siteId)
        .where("day", "==", day)
        .where("scenarioId", "==", scenarioId)
        .where("variantId", "==", variantId)
        .get();

      const metricsMap: Record<
        string,
        {
          impressions: number;
          clicks: number;
          click_links: number;
          closes: number;
          conversions: number;
          ctr: number;
          link_ctr: number;
          close_rate: number;
        }
      > = {};

      for (const doc of statsSnap.docs) {
        const d = doc.data() as any;
        const actionId = String(d.actionId || "");
        if (!actionId) continue;

        if (!metricsMap[actionId]) {
          metricsMap[actionId] = {
            impressions: 0,
            clicks: 0,
            click_links: 0,
            closes: 0,
            conversions: 0,
            ctr: 0,
            link_ctr: 0,
            close_rate: 0,
          };
        }

        const ev = String(d.event || "");
        const c = Number(d.count || 0);
        if (!c) continue;

        if (ev === "impression") metricsMap[actionId].impressions += c;
        else if (ev === "click") metricsMap[actionId].clicks += c;
        else if (ev === "click_link") metricsMap[actionId].click_links += c;
        else if (ev === "close") metricsMap[actionId].closes += c;
        else if (ev === "conversion") metricsMap[actionId].conversions += c;
      }

      Object.keys(metricsMap).forEach((id) => {
        const m = metricsMap[id];
        const imp = m.impressions || 0;
        m.ctr = imp > 0 ? Number(((m.clicks / imp) * 100).toFixed(2)) : 0;
        m.link_ctr = imp > 0 ? Number(((m.click_links / imp) * 100).toFixed(2)) : 0;
        m.close_rate = imp > 0 ? Number(((m.closes / imp) * 100).toFixed(2)) : 0;
      });

      // ===============================
      // 3.5) データ不足ならAIを呼ばずに返す（課金保護）
      // ===============================
      const totalImpressionsPre = Object.values(metricsMap).reduce((sum, m) => sum + (m.impressions || 0), 0);
      const totalClicksPre = Object.values(metricsMap).reduce((sum, m) => sum + (m.clicks || 0), 0);
      const rule = ruleMark({ impressions: totalImpressionsPre, clicks: totalClicksPre, conversions: 0 });

      if (rule.grade === "need_data") {
        const pack = {
          variantId,
          actions,
          highlights: [],
          metrics: {
            impressions: totalImpressionsPre,
            clicks: totalClicksPre,
            ctr: totalImpressionsPre > 0 ? Number(((totalClicksPre / totalImpressionsPre) * 100).toFixed(2)) : 0,
          },
        };

        const response = {
          ok: true,
          site_id: siteId,
          scenario_id: scenarioId,
          day,
          rule,
          packs: [pack],
        };

        await cacheRef.set(
          {
            ...response,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return res.json({ ...response, cached: false });
      }

      // ===============================
      // 4) AI入力
      // ===============================
      const aiInput = actions.map((a) => ({
        action_id: a.action_id,
        type: a.type,
        title: String(a.creative?.title || ""),
        body: String(a.creative?.body || ""),
        cta_text: String(a.creative?.cta_text || ""),
        cta_url: String(a.creative?.cta_url || ""),
        metrics: metricsMap[a.action_id] || {
          impressions: 0,
          clicks: 0,
          click_links: 0,
          closes: 0,
          conversions: 0,
          ctr: 0,
          link_ctr: 0,
          close_rate: 0,
        },
      }));

      const prompt = {
        role: "ux_optimizer",
        task: "以下の actions から改善優先度が高いものを最大3つ選び、短い見出し(label)と理由(reason)を返してください。必ず action_id は入力のものをそのまま返す。",
        severity_guide: {
          bad: "明確な問題（例: CTR/リンクCTRが極端に低い、close_rateが高い、文言が弱い/誤解を招く、CTAが不明瞭）",
          warn: "改善余地あり（例: 数字は悪くないが伸ばせる、CTA/本文が長い、価値が伝わりにくい）",
          info: "軽微な改善",
        },
        output_rule: "JSON配列のみ。最大3件。",
        inputs: {
          site_id: siteId,
          day,
          scenario_id: scenarioId,
          variant_id: variantId,
          actions: aiInput,
        },
      };

      // NOTE: Model sometimes wraps the array in an object (e.g. { highlights: [...] }).
      // Accept both shapes and normalize to Highlight[].
      const highlightsRaw = await callOpenAIJson({
        model: "gpt-4.1-mini",
        input: {
          ...prompt,
          // Stronger instruction for strict JSON output
          output_rule:
            "Return ONLY a JSON array (no object wrapper). Example: [{\"action_id\":\"...\",\"label\":\"...\",\"reason\":\"...\",\"severity\":\"warn\"}] . Max 3 items.",
        },
        schema: z
          .union([
            z.array(AiReviewHighlightSchema).max(3),
            z.object({ highlights: z.array(AiReviewHighlightSchema).max(3) }),
            z.object({ items: z.array(AiReviewHighlightSchema).max(3) }),
            z.object({ result: z.array(AiReviewHighlightSchema).max(3) }),
          ])
          .transform((v) => {
            // normalize to array
            if (Array.isArray(v)) return v;
            const anyV: any = v as any;
            return (anyV.highlights || anyV.items || anyV.result || []) as any;
          }),
      });

      const highlights = Array.isArray(highlightsRaw) ? highlightsRaw : [];

      // ===============================
      // 5) packs
      // ===============================
      const totalImpressions = totalImpressionsPre;
      const totalClicks = totalClicksPre;
      const totalCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

      const pack = {
        variantId,
        actions,
        highlights: Array.isArray(highlights) ? highlights : [],
        metrics: {
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr: totalCtr,
        },
      };

      const response = {
        ok: true,
        site_id: siteId,
        scenario_id: scenarioId,
        day,
        rule,
        packs: [pack],
      };

      await cacheRef.set(
        {
          ...response,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.json({ ...response, cached: false });
    } catch (e: any) {
      console.error("[/v1/ai/review] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : 400
        )
        .json({ ok: false, error: "ai_review_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/ai/review", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* -----------------------------
     /v1/variant
     - ABテストのvariant解決
  ------------------------------ */
  app.get("/v1/variant", async (req, res) => {
    try {
      const site_id = String(req.query.site_id || "");
      if (!site_id) return res.status(400).json({ error: "site_id required" });

      // CORS + allow (public embed side)
      await corsBySiteDomains(req, res, site_id);

      const scenario_id = String(req.query.scenario_id || "");
      if (!scenario_id) return res.status(400).json({ error: "scenario_id required" });

      const url = String(req.query.url || "");

      // Stable key for bucketing (prefer vid/sid)
      const key = String(
        req.query.vid ||
          req.query.sid ||
          req.query.key ||
          req.header("X-Visitor-Id") ||
          req.header("X-Session-Id") ||
          req.ip ||
          "anonymous"
      );

      // Load scenario experiment definition
      const db = adminDb();
      const sSnap = await db.collection("scenarios").doc(scenario_id).get();
      if (!sSnap.exists) return res.status(404).json({ error: "scenario not found" });
      const s = (sSnap.data() || {}) as any;

      // Try common field names
      const exp = (s.experiment ?? s.ab ?? s.exp ?? s.variants ?? undefined) as any;

      // If no experiment config, return null (caller can fallback)
      if (!exp) {
        return res.json({ ok: true, variant: null, reason: "no_experiment_config" });
      }

      // services/experiment.ts expects (Experiment|undefined, key)
      const v = pickVariant(exp, key);

      return res.json({ ok: true, variant: v, key, scenario_id, site_id, url });
    } catch (e: any) {
      console.error("[/v1/variant] error:", e);
      return res.status(400).json({ error: "variant_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/variant", async (req, res) => {
    try {
      const site_id = String(req.query.site_id || "");
      if (site_id) await corsBySiteDomains(req, res, site_id);

      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });




}