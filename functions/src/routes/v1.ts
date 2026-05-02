// functions/src/routes/v1.ts
import type { Express } from "express";
import { z } from "zod";
import { adminDb, requireAuthUid } from "../services/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
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
import Stripe from "stripe";
import { getMisocaAccessToken, getMisocaStatus, sendMisocaInvoicesJob } from "../services/misoca";
import {
  BACKUP_INCLUDED_COLLECTIONS,
  BACKUP_OMITTED_COLLECTIONS,
  createBackupDownloadUrl,
  enqueueBackupRun,
  getBackupSettings,
  listBackupRuns,
  upsertBackupSettings,
} from "../services/backup";
/* =========================================
   Schemas
========================================= */
const AiReviewReqSchema = z.object({
  site_id: z.string().min(1),
  day_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  day_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scenario_id: z.string().min(1),
  variant_id: z.string().optional().default("na"),
  force_refresh: z.boolean().optional().default(false), // キャッシュを無視して再生成
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
  event: z.enum(["impression", "click", "click_link", "close", "conversion", "pageview", "purchase"]),
  url: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  ref: z.string().nullable().optional(),
  vid: z.string().nullable().optional(),
  sid: z.string().nullable().optional(),
  utm_source: z.string().nullable().optional(),
  utm_medium: z.string().nullable().optional(),
  utm_campaign: z.string().nullable().optional(),
  // 新規/リピート判定（SDK側でlocalStorageの cx_vid 存在有無で判定）
  is_new: z.boolean().nullable().optional(),
  // 購入イベント用（Shopify Web Pixelから送信）
  revenue: z.number().nonnegative().nullable().optional(),
  order_id: z.string().nullable().optional(),
  currency: z.string().max(8).nullable().optional(),
  items: z.array(z.object({
    title: z.string().max(200),
    qty: z.number().nonnegative(),
    price: z.number().nonnegative(),
  })).max(100).nullable().optional(),
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
  // 単日指定 or 範囲指定のどちらも受け付ける
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // 単日（後方互換）
  day_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // 範囲開始
  day_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),   // 範囲終了
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
  statuses: z.array(z.string().min(1)).optional().default(["pending"]),
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

const PlanLimitValueSchema = z.number().int().min(0).nullable();

const PlanLimitsSchema = z.object({
  workspaces: PlanLimitValueSchema.optional(),
  sites: PlanLimitValueSchema.optional(),
  scenarios: PlanLimitValueSchema.optional(),
  actions: PlanLimitValueSchema.optional(),
  aiInsights: PlanLimitValueSchema.optional(),
  members: PlanLimitValueSchema.optional(),
  templates: PlanLimitValueSchema.optional(),
  media: PlanLimitValueSchema.optional(),
  log_sample_rate: z.number().min(0).max(1).optional(), // 0〜1 のログサンプリングレート
});

const WorkspaceBillingUpdateReqSchema = z.object({
  workspace_id: z.string().min(1),
  plan: z.enum(["free", "standard", "premium", "custom"]).optional(),
  status: z.enum(["inactive", "trialing", "active", "past_due", "canceled"]).optional(),
  provider: z.enum(["stripe", "manual"]).optional(),
  trial_days: z.number().int().min(0).max(365).optional(),
  trial_ends_at: z.string().datetime().optional(),
  current_period_ends_at: z.string().datetime().optional(),
  free_expires_at: z.string().datetime().nullable().optional(),
  billing_email: z.preprocess((v) => (v === "" ? undefined : v), z.string().email().optional().nullable()),
  billing_company_name: z.string().max(200).nullable().optional(),
  billing_contact_name: z.string().max(200).nullable().optional(),
  billing_contact_phone: z.string().max(100).nullable().optional(),
  billing_zip: z.string().max(20).nullable().optional(),
  billing_prefecture: z.string().max(20).nullable().optional(),
  billing_city: z.string().max(100).nullable().optional(),
  billing_address: z.string().max(200).nullable().optional(),
  stripe_customer_id: z.string().min(1).optional(),
  stripe_subscription_id: z.string().min(1).optional(),
  stripe_price_id: z.string().min(1).optional(),
  custom_limit_override_id: z.string().min(1).optional(),
  manual_billing_note: z.string().max(2000).optional(),
});

const PlansListReqSchema = z.object({
  workspace_id: z.string().min(1),
  include_inactive: z.boolean().optional().default(false),
});

const PlansUpsertReqSchema = z.object({
  workspace_id: z.string().min(1),
  plan_id: z.string().min(1),
  code: z.string().min(1).max(40).regex(/^[a-z0-9_-]+$/, "lowercase alphanumeric, hyphens, underscores only"),
  name: z.string().min(1).max(80),
  description: z.string().max(2000).optional().default(""),
  active: z.boolean().optional().default(true),
  billing_provider: z.enum(["stripe", "manual"]),
  currency: z.string().min(1).max(8).optional().default("JPY"),
  price_monthly: z.number().min(0),
  price_yearly: z.number().min(0).nullable().optional(),
  limits: PlanLimitsSchema,
  stripe_price_monthly_id: z.string().nullable().optional(),
  stripe_price_yearly_id: z.string().nullable().optional(),
});

const WorkspaceLimitOverrideGetReqSchema = z.object({
  workspace_id: z.string().min(1),
});

const WorkspaceLimitOverrideUpsertReqSchema = z.object({
  workspace_id: z.string().min(1),
  limits: PlanLimitsSchema,
  note: z.string().max(2000).optional().default(""),
});

const SiteDomainsUpdateReqSchema = z.object({
  site_id: z.string().min(1),
  domains: z.array(z.string().min(1)).optional().default([]),
});

const SiteDeleteReqSchema = z.object({
  site_id: z.string().min(1),
});

const BackupSettingsUpsertReqSchema = z.object({
  enabled: z.boolean(),
  hour_jst: z.number().int().min(0).max(23),
  retention_days: z.number().int().min(1).max(365),
});

const BackupRunReqSchema = z.object({
  scope: z.enum(["all", "workspace"]).optional().default("all"),
  workspace_id: z.string().min(1).optional(),
});

const BackupListReqSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(30),
});

const BackupDownloadReqSchema = z.object({
  run_id: z.string().min(1),
});

const ScenarioTargetingRuleSchema = z.object({
  op: z.enum(["contains", "equals", "startsWith"]),
  value: z.string().min(1).max(500),
});

const ScenarioTargetingSchema = z.object({
  enabled: z.boolean().optional().default(false),
  audience: z
    .object({
      visitorType: z.enum(["all", "new", "returning"]).optional().default("all"),
      device: z.enum(["all", "pc", "sp"]).optional().default("all"),
      loginStatus: z.enum(["all", "guest", "member"]).optional().default("all"),
      cartStatus: z.enum(["all", "empty", "hasItems"]).optional().default("all"),
      urlRules: z.array(ScenarioTargetingRuleSchema).optional().default([]),
      utmRules: z
        .object({
          source: z.array(z.string().min(1).max(200)).optional().default([]),
          medium: z.array(z.string().min(1).max(200)).optional().default([]),
          campaign: z.array(z.string().min(1).max(200)).optional().default([]),
        })
        .optional()
        .default({ source: [], medium: [], campaign: [] }),
    })
    .optional()
    .default({
      visitorType: "all",
      device: "all",
      loginStatus: "all",
      cartStatus: "all",
      urlRules: [],
      utmRules: { source: [], medium: [], campaign: [] },
    }),
  exclude: z
    .object({
      shownWithinDays: z.number().int().min(0).max(365).optional(),
      maxImpressionsPerUser: z.number().int().min(0).max(9999).optional(),
      converted: z.boolean().optional().default(false),
    })
    .optional()
    .default({
      converted: false,
    }),
});

const MediaDeleteReqSchema = z.object({
  workspace_id: z.string().min(1),
  media_id: z.string().min(1),
  storage_path: z.string().optional(),
  download_url: z.string().optional(),
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

function defaultScenarioTargeting() {
  return {
    enabled: false,
    audience: {
      visitorType: "all" as "all" | "new" | "returning",
      device: "all" as "all" | "pc" | "sp",
      loginStatus: "all" as "all" | "guest" | "member",
      cartStatus: "all" as "all" | "empty" | "hasItems",
      urlRules: [] as Array<{ op: "contains" | "equals" | "startsWith"; value: string }>,
      utmRules: {
        source: [] as string[],
        medium: [] as string[],
        campaign: [] as string[],
      },
    },
    exclude: {
      shownWithinDays: undefined as number | undefined,
      maxImpressionsPerUser: undefined as number | undefined,
      converted: false,
    },
  };
}

function normalizeStringList(input: any): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

function normalizeScenarioTargeting(input: any) {
  const base = defaultScenarioTargeting();
  const parsed = ScenarioTargetingSchema.safeParse(input || {});
  const src: any = parsed.success ? parsed.data : {};

  base.enabled = !!src?.enabled;
  base.audience.visitorType = (src as any)?.audience?.visitorType || "all";
  base.audience.device = (src as any)?.audience?.device || "all";
  base.audience.loginStatus = (src as any)?.audience?.loginStatus || "all";
  base.audience.cartStatus = (src as any)?.audience?.cartStatus || "all";
  base.audience.urlRules = Array.isArray((src as any)?.audience?.urlRules)
    ? (src as any).audience.urlRules
        .map((rule: any) => ({
          op: String(rule?.op || "contains") as "contains" | "equals" | "startsWith",
          value: String(rule?.value || "").trim(),
        }))
        .filter((rule: any) => !!rule.value)
    : [];
  base.audience.utmRules = {
    source: normalizeStringList((src as any)?.audience?.utmRules?.source),
    medium: normalizeStringList((src as any)?.audience?.utmRules?.medium),
    campaign: normalizeStringList((src as any)?.audience?.utmRules?.campaign),
  };
  if (typeof (src as any)?.exclude?.shownWithinDays === "number") {
    base.exclude.shownWithinDays = Math.max(0, Math.floor((src as any).exclude.shownWithinDays));
  }
  if (typeof (src as any)?.exclude?.maxImpressionsPerUser === "number") {
    base.exclude.maxImpressionsPerUser = Math.max(0, Math.floor((src as any).exclude.maxImpressionsPerUser));
  }
  base.exclude.converted = !!(src as any)?.exclude?.converted;

  return base;
}

function matchStringRule(value: string, rule: { op: "contains" | "equals" | "startsWith"; value: string }): boolean {
  const target = String(value || "");
  const needle = String(rule?.value || "");
  if (!needle) return true;
  if (rule.op === "equals") return target === needle;
  if (rule.op === "startsWith") return target.startsWith(needle);
  return target.includes(needle);
}

function matchScenarioTargeting(targeting: any, ctx: any): boolean {
  const t = normalizeScenarioTargeting(targeting);
  if (!t.enabled) return true;

  const visitorType = String(ctx?.visitorType || "all");
  const device = String(ctx?.device || "all");
  const loginStatus = String(ctx?.loginStatus || "all");
  const cartStatus = String(ctx?.cartStatus || "all");
  const url = String(ctx?.url || ctx?.path || "");
  const utm = ctx?.utm || {};

  if (t.audience.visitorType !== "all" && t.audience.visitorType !== visitorType) return false;
  if (t.audience.device !== "all" && t.audience.device !== device) return false;
  if (t.audience.loginStatus !== "all" && t.audience.loginStatus !== loginStatus) return false;
  if (t.audience.cartStatus !== "all" && t.audience.cartStatus !== cartStatus) return false;

  if (t.audience.urlRules.length > 0) {
    const ok = t.audience.urlRules.some((rule) => matchStringRule(url, rule));
    if (!ok) return false;
  }

  if (t.audience.utmRules.source.length > 0 && !t.audience.utmRules.source.includes(String(utm?.source || ""))) {
    return false;
  }
  if (t.audience.utmRules.medium.length > 0 && !t.audience.utmRules.medium.includes(String(utm?.medium || ""))) {
    return false;
  }
  if (t.audience.utmRules.campaign.length > 0 && !t.audience.utmRules.campaign.includes(String(utm?.campaign || ""))) {
    return false;
  }

  if (t.exclude.converted && !!ctx?.converted) return false;

  if (typeof t.exclude.maxImpressionsPerUser === "number") {
    const impressionCount = Number(ctx?.impressionCount || 0);
    if (impressionCount >= t.exclude.maxImpressionsPerUser) return false;
  }

  return true;
}

function defaultPlanLimits() {
  return {
    workspaces: null as number | null,
    sites: null as number | null,
    scenarios: null as number | null,
    actions: null as number | null,
    aiInsights: null as number | null,
    members: null as number | null,
    templates: null as number | null,
    media: null as number | null,
    log_sample_rate: 1 as number, // デフォルト100%
    mcp_enabled: false as boolean, // MCPサーバー接続（デフォルト無効）
  };
}

function normalizePlanLimits(input: any) {
  const base = defaultPlanLimits();
  // カウント制限（整数 or null）
  const countKeys = ["workspaces", "sites", "scenarios", "actions", "aiInsights", "members", "templates", "media"] as const;
  for (const key of countKeys) {
    const v = input?.[key];
    if (v === null) {
      base[key] = null;
    } else if (typeof v === "number" && isFinite(v) && v >= 0) {
      base[key] = Math.floor(v);
    }
  }
  // log_sample_rate は 0〜1 のfloat
  const rate = input?.log_sample_rate;
  if (typeof rate === "number" && isFinite(rate) && rate >= 0 && rate <= 1) {
    base.log_sample_rate = rate;
  }
  // mcp_enabled は boolean
  if (typeof input?.mcp_enabled === "boolean") {
    base.mcp_enabled = input.mcp_enabled;
  }
  return base;
}

/* =========================================
   Plan Limit Helpers
========================================= */
type LimitKey = "workspaces" | "sites" | "scenarios" | "actions" | "templates" | "media" | "members" | "aiInsights";

async function getEffectiveLimits(wsId: string) {
  const db = adminDb();
  const billingSnap = await db.collection("workspace_billing").doc(wsId).get();
  const billing = (billingSnap.data() || {}) as any;
  // 特別トライアル中は全制限解除
  if (billing.access_override_active && billing.access_override_until) {
    const until = new Date(billing.access_override_until);
    if (until > new Date()) return null; // null = 無制限
  }
  const plan = String(billing.plan || "free");
  const planSnap = await db.collection("plans").where("code", "==", plan).limit(1).get();
  if (planSnap.empty) return null;
  return normalizePlanLimits(planSnap.docs[0].data().limits || {});
}

/** ワークスペースの有効なログサンプリングレートを返す。特別トライアル中は常に1（100%）。 */
async function getEffectiveLogSampleRate(wsId: string): Promise<number> {
  const db = adminDb();
  const billingSnap = await db.collection("workspace_billing").doc(wsId).get();
  const billing = (billingSnap.data() || {}) as any;
  // 特別トライアル中は100%
  if (billing.access_override_active && billing.access_override_until) {
    const until = new Date(billing.access_override_until);
    if (until > new Date()) return 1;
  }
  const plan = String(billing.plan || "free");
  const planSnap = await db.collection("plans").where("code", "==", plan).limit(1).get();
  if (planSnap.empty) return 1;
  const rate = planSnap.docs[0].data()?.limits?.log_sample_rate;
  if (typeof rate === "number" && isFinite(rate) && rate >= 0 && rate <= 1) return rate;
  return 1; // デフォルト100%
}

async function countResource(wsId: string, resource: LimitKey, uid?: string) {
  const db = adminDb();
  if (resource === "workspaces") {
    // ユーザーが owner のワークスペース数
    if (!uid) return 0;
    const snap = await db.collection("workspaces").where(`members.${uid}`, "==", "owner").get();
    return snap.size;
  }
  const col = resource === "aiInsights" ? "ai_insights" : resource;
  const snap = await db.collection(col).where("workspaceId", "==", wsId).get();
  return snap.size;
}

async function assertWithinLimit(wsId: string, resource: LimitKey) {
  const limits = await getEffectiveLimits(wsId);
  if (limits === null) return; // 無制限
  const limit = limits[resource];
  if (limit === null) return; // このリソースは無制限
  const current = await countResource(wsId, resource);
  if (current >= limit) {
    throw Object.assign(new Error("plan_limit_exceeded"), { resource, current, limit });
  }
}

function normalizeBillingProvider(input: any, plan?: string) {
  const raw = String(input || "").trim().toLowerCase();
  if (raw === "stripe" || raw === "manual") return raw;
  return String(plan || "") === "custom" ? "manual" : "stripe";
}

function buildBillingResponse(billing: any, planDoc?: any, overrideDoc?: any, accessOverride?: any) {
  return {
    plan: billing?.plan || "free",
    status: billing?.status || "inactive",
    provider: normalizeBillingProvider(billing?.provider, billing?.plan),
    billing_email: billing?.billing_email || null,
    billing_company_name: billing?.billing_company_name || null,
    billing_contact_name: billing?.billing_contact_name || null,
    billing_contact_phone: billing?.billing_contact_phone || null,
    billing_zip: billing?.billing_zip || null,
    billing_prefecture: billing?.billing_prefecture || null,
    billing_city: billing?.billing_city || null,
    billing_address: billing?.billing_address || null,
    free_expires_at: billing?.free_expires_at || null,
    trial_ends_at: billing?.trial_ends_at || null,
    current_period_ends_at: billing?.current_period_ends_at || null,
    stripe_customer_id: billing?.stripe_customer_id || null,
    stripe_subscription_id: billing?.stripe_subscription_id || null,
    stripe_price_id: billing?.stripe_price_id || null,
    custom_limit_override_id: billing?.custom_limit_override_id || null,
    manual_billing_note: billing?.manual_billing_note || "",
    access_override_active: accessOverride?.access_override_active || false,
    access_override_until: accessOverride?.access_override_until || null,
    access_override_note: accessOverride?.access_override_note || "",
    plan_master: planDoc
      ? {
          id: planDoc.id || "",
          code: planDoc.code || billing?.plan || "",
          name: planDoc.name || "",
          description: planDoc.description || "",
          active: typeof planDoc.active === "boolean" ? planDoc.active : true,
          billing_provider: normalizeBillingProvider(planDoc.billing_provider, planDoc.code),
          currency: planDoc.currency || "JPY",
          price_monthly: Number(planDoc.price_monthly || 0),
          price_yearly: planDoc.price_yearly ?? null,
          limits: normalizePlanLimits(planDoc.limits),
          stripe_price_monthly_id: planDoc.stripe_price_monthly_id || null,
          stripe_price_yearly_id: planDoc.stripe_price_yearly_id || null,
          updatedAt: planDoc.updatedAt || null,
        }
      : null,
    override: overrideDoc
      ? {
          limits: normalizePlanLimits(overrideDoc.limits),
          note: overrideDoc.note || "",
          updatedAt: overrideDoc.updatedAt || null,
        }
      : null,
    updatedAt: billing?.updatedAt || null,
  };
}

function getRequestUserEmail(req: any): string {
  return String(req?.auth?.email || req?.user?.email || req?.token?.email || "").trim().toLowerCase();
}

async function requirePlatformAdmin(req: any): Promise<string> {
  // Bearer トークンを検証してメールを取得
  const { extractBearerToken, verifyIdToken } = await import("../services/admin");
  const token = extractBearerToken(req);
  const decoded = await verifyIdToken(token);
  const email = String(decoded?.email || "").trim().toLowerCase();
  if (email !== "iwatanabe@branberyheag.com") {
    throw new Error("platform_admin_only");
  }
  return email;
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
const POSTMARK_SERVER_TOKEN = defineSecret("POSTMARK_SERVER_TOKEN");
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const MISOCA_CLIENT_ID = defineSecret("MISOCA_CLIENT_ID");
const MISOCA_CLIENT_SECRET = defineSecret("MISOCA_CLIENT_SECRET");
const INVITE_FROM_EMAIL = defineString("INVITE_FROM_EMAIL");
const INVITE_BASE_URL = defineString("INVITE_BASE_URL");
const INVITE_TEMPLATE_ALIAS = defineString("INVITE_TEMPLATE_ALIAS");
const INVITE_MESSAGE_STREAM = defineString("INVITE_MESSAGE_STREAM");

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

function resolveStorageTarget(input: string, downloadURL?: string): { bucket?: string; path: string } {
  const raw = String(input || "").trim();
  if (raw) {
    // gs://bucket/path/to/file
    if (raw.startsWith("gs://")) {
      const withoutScheme = raw.replace(/^gs:\/\//, "");
      const firstSlash = withoutScheme.indexOf("/");
      const bucket = firstSlash >= 0 ? withoutScheme.slice(0, firstSlash) : "";
      const path = firstSlash >= 0 ? withoutScheme.slice(firstSlash + 1) : "";
      return { bucket: bucket || undefined, path };
    }

    // Firebase Storage download URL (firebasestorage.googleapis.com)
    if (/^https?:\/\//i.test(raw)) {
      try {
        const u = new URL(raw);
        const bucket = u.pathname.match(/\/b\/([^/]+)\/o\//)?.[1];
        const objectPath = u.pathname.match(/\/o\/(.+)$/)?.[1];
        return {
          bucket: bucket ? decodeURIComponent(bucket) : undefined,
          path: objectPath ? decodeURIComponent(objectPath) : "",
        };
      } catch {
        // fall through
      }
    }

    // Already a relative object path
    return { path: raw.replace(/^\/+/, "") };
  }

  const url = String(downloadURL || "").trim();
  if (url && /^https?:\/\//i.test(url)) {
    try {
      const u = new URL(url);
      const bucket = u.pathname.match(/\/b\/([^/]+)\/o\//)?.[1];
      const objectPath = u.pathname.match(/\/o\/(.+)$/)?.[1];
      return {
        bucket: bucket ? decodeURIComponent(bucket) : undefined,
        path: objectPath ? decodeURIComponent(objectPath) : "",
      };
    } catch {
      return { path: "" };
    }
  }

  return { path: "" };
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

function toIsoStringOrEmpty(v: any): string {
  if (!v) return "";
  try {
    if (typeof v?.toDate === "function") return v.toDate().toISOString();
    if (typeof v?.toMillis === "function") return new Date(v.toMillis()).toISOString();
    const d = new Date(v);
    return isFinite(d.getTime()) ? d.toISOString() : "";
  } catch {
    return "";
  }
}

function getInviteBaseUrl(): string {
  const raw = String(INVITE_BASE_URL.value() || "").trim();
  return raw || "https://cx-platform-v1.web.app/invite";
}

function getInviteFromEmail(): string {
  const raw = String(INVITE_FROM_EMAIL.value() || "").trim();
  return raw || "no-reply@mokkeda.com";
}
function getInviteTemplateAlias(): string {
  return String(INVITE_TEMPLATE_ALIAS.value() || "").trim();
}

function getInviteMessageStream(): string {
  const raw = String(INVITE_MESSAGE_STREAM.value() || "").trim();
  return raw || "outbound";
}

async function sendWorkspaceInviteEmail(args: {
  to: string;
  workspaceName: string;
  role: string;
  token: string;
  expiresAt: any;
}) {
  const token = String(POSTMARK_SERVER_TOKEN.value() || "").trim();
  if (!token) {
    throw new Error("missing_postmark_server_token");
  }

  const inviteUrl = `${getInviteBaseUrl()}?token=${encodeURIComponent(args.token)}`;
  const expiresAtIso = toIsoStringOrEmpty(args.expiresAt);
  const from = getInviteFromEmail();
  const templateAlias = getInviteTemplateAlias();
  const messageStream = getInviteMessageStream();

  const subject = `MOKKEDAへの招待: ${args.workspaceName}`;
  const textBody = [
    `${args.workspaceName} に招待されました。`,
    "",
    `権限: ${args.role}`,
    `有効期限: ${expiresAtIso || "7日以内"}`,
    "",
    "参加する:",
    inviteUrl,
  ].join("\n");

  const htmlBody = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111827;">
      <p><strong>${args.workspaceName}</strong> に招待されました。</p>
      <p>権限: <strong>${args.role}</strong><br/>有効期限: <strong>${expiresAtIso || "7日以内"}</strong></p>
      <p><a href="${inviteUrl}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#111827;color:#ffffff;text-decoration:none;">参加する</a></p>
      <p style="word-break:break-all;">${inviteUrl}</p>
    </div>
  `.trim();

  const endpoint = templateAlias
    ? "https://api.postmarkapp.com/email/withTemplate"
    : "https://api.postmarkapp.com/email";

  const payload = templateAlias
    ? {
        From: from,
        To: args.to,
        TemplateAlias: templateAlias,
        TemplateModel: {
          workspaceName: args.workspaceName,
          role: args.role,
          inviteUrl,
          expiresAt: expiresAtIso || "7日以内",
        },
        MessageStream: messageStream,
      }
    : {
        From: from,
        To: args.to,
        Subject: subject,
        TextBody: textBody,
        HtmlBody: htmlBody,
        MessageStream: messageStream,
      };

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify(payload),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`postmark_send_failed:${resp.status}:${json?.Message || resp.statusText || "unknown"}`);
  }

  return {
    inviteUrl,
    messageId: String(json?.MessageID || ""),
    submittedAt: new Date().toISOString(),
    templateAlias,
    messageStream,
  };
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
    res.setHeader("Access-Control-Allow-Credentials", "true");
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

      // ワークスペース数上限チェック（オーナーとして所有する既存WSの最初のプランを参照）
      const ownedSnap = await db.collection("workspaces")
        .where(`members.${uid}`, "==", "owner").get();
      if (!ownedSnap.empty) {
        const firstWsId = ownedSnap.docs[0].id;
        const limits = await getEffectiveLimits(firstWsId);
        if (limits !== null && limits.workspaces !== null && ownedSnap.size >= limits.workspaces) {
          return res.status(403).json({ ok: false, error: "plan_limit_exceeded", resource: "workspaces", current: ownedSnap.size, limit: limits.workspaces });
        }
      }

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
      const members = (w.members || {}) as Record<string, any>;

      const memberEntries = Object.entries(members).map(([memberUid, rawRole]) => ({
        uid: memberUid,
        role: readMemberRole(rawRole) || String(rawRole || "member") || "member",
      }));

      const uniqueUids = Array.from(new Set(memberEntries.map((x) => x.uid).filter(Boolean)));
      const userDocs = await Promise.all(uniqueUids.map((memberUid) => db.collection("users").doc(memberUid).get()));
      const userMap = new Map<string, any>();
      userDocs.forEach((snap) => {
        if (!snap.exists) return;
        userMap.set(snap.id, snap.data() || {});
      });

      const items = memberEntries
        .map((entry) => {
          const u = userMap.get(entry.uid) || {};
          return {
            uid: entry.uid,
            role: entry.role,
            email: String(u.email || ""),
            displayName: String(u.displayName || u.name || ""),
            photoURL: String(u.photoURL || ""),
          };
        })
        .sort((a, b) => {
          const aName = String(a.displayName || a.email || a.uid);
          const bName = String(b.displayName || b.email || b.uid);
          return aName.localeCompare(bName);
        });

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
      const workspaceName = String(w?.name || "");
      const actorRole = String(w?.members?.[actorUid] || "");
      if (!canManageMembers(actorRole, body.role)) {
        return res.status(403).json({ ok: false, error: "forbidden", message: "insufficient_role" });
      }

      const inviteId = genId("inv");
      const token = genToken(24);
      const now = FieldValue.serverTimestamp();
      const expiresAt = addDaysTs(7);
      const normalizedEmail = body.email.toLowerCase();

      const inviteRef = db.collection("workspace_invites").doc(inviteId);
      await inviteRef.set(
        {
          id: inviteId,
          workspaceId: body.workspace_id,
          email: normalizedEmail,
          role: body.role,
          token,
          expiresAt,
          status: "pending",
          createdBy: actorUid,
          createdAt: now,
          updatedAt: now,
          emailStatus: "pending",
          emailError: "",
          emailMessageId: "",
          emailSentAt: null,
          emailTemplateAlias: getInviteTemplateAlias(),
          emailMessageStream: getInviteMessageStream(),
        },
        { merge: true }
      );

      let emailResult: any = null;
      let emailStatus = "pending";
      let emailError = "";

      try {
        emailResult = await sendWorkspaceInviteEmail({
          to: normalizedEmail,
          workspaceName,
          role: body.role,
          token,
          expiresAt,
        });
        emailStatus = "sent";
      } catch (mailErr: any) {
        emailStatus = "failed";
        emailError = mailErr?.message || String(mailErr);
        console.error("[/v1/workspaces/invites/create] postmark send error:", mailErr);
      }

      await inviteRef.set(
        {
          emailStatus,
          emailError,
          emailMessageId: String(emailResult?.messageId || ""),
          emailSentAt: emailResult?.submittedAt || null,
          emailTemplateAlias: String(emailResult?.templateAlias || getInviteTemplateAlias() || ""),
          emailMessageStream: String(emailResult?.messageStream || getInviteMessageStream()),
          inviteUrl: String(emailResult?.inviteUrl || `${getInviteBaseUrl()}?token=${encodeURIComponent(token)}`),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.json({
        ok: true,
        invite_id: inviteId,
        workspace_id: body.workspace_id,
        email: normalizedEmail,
        role: body.role,
        token,
        email_status: emailStatus,
        email_error: emailError,
        invite_url: String(emailResult?.inviteUrl || `${getInviteBaseUrl()}?token=${encodeURIComponent(token)}`),
      });
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
      const requestedStatuses = Array.from(new Set((body.statuses || ["pending"]).map((x) => String(x || "").trim()).filter(Boolean)));

      const snap = await db
        .collection("workspace_invites")
        .where("workspaceId", "==", body.workspace_id)
        .orderBy("createdAt", "desc")
        .get();

      const items = snap.docs
        .map((d) => {
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
            emailStatus: v.emailStatus || "pending",
            emailError: v.emailError || "",
            emailMessageId: v.emailMessageId || "",
            emailSentAt: v.emailSentAt || null,
            emailTemplateAlias: v.emailTemplateAlias || "",
            emailMessageStream: v.emailMessageStream || "outbound",
            inviteUrl: v.inviteUrl || "",
          };
        })
        .filter((item) => requestedStatuses.includes(String(item.status || "pending")));

      return res.json({ ok: true, workspace_id: body.workspace_id, items, statuses: requestedStatuses });
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

      // owner/admin のみ全サイトに自動追加。member/viewer はサイトごとに個別追加（/v1/sites/members/add 経由）
      if (role === "owner" || role === "admin") {
        const sitesSnap = await db.collection("sites")
          .where("workspaceId", "==", workspaceId)
          .get();

        if (!sitesSnap.empty) {
          const batch = db.batch();
          for (const siteDoc of sitesSnap.docs) {
            const siteData = siteDoc.data() as any;
            const currentMemberUids: string[] = siteData.memberUids || [];
            if (!currentMemberUids.includes(uid)) {
              batch.update(siteDoc.ref, {
                memberUids: [...currentMemberUids, uid],
                updatedAt: now,
              });
            }
          }
          await batch.commit();
        }
      }

      // invite を accepted に
      await inviteDoc.ref.set(
        {
          status: "accepted",
          acceptedBy: uid,
          acceptedEmail: signedInEmail,
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

      // サイト数上限チェック
      await assertWithinLimit(body.workspace_id, "sites");

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

      const wSnap = await db.collection("workspaces").doc(body.workspace_id).get();
      const wData = (wSnap.data() || {}) as any;
      const wMembers = (wData.members || {}) as Record<string, string>;
      const memberUids = Array.from(new Set([
        uid,
        ...Object.entries(wMembers)
          .filter(([, role]) => role === "owner" || role === "admin")
          .map(([memberId]) => memberId)
      ]));

      await db.collection("sites").doc(siteId).set(
        {
          id: siteId,
          workspaceId: body.workspace_id,
          name: body.name,
          publicKey,
          domains: body.domains,
          memberUids,
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
            : String(e?.message || "").startsWith("workspace_access_denied:") || e?.message === "plan_limit_exceeded"
            ? 403
            : 400
        )
        .json({ ok: false, error: e?.message === "plan_limit_exceeded" ? "plan_limit_exceeded" : "site_create_failed", message: e?.message || String(e) });
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
     /v1/check-can-create  ★管理画面専用
     - リソース作成前のプランリミット確認
  ------------------------------ */
  app.post("/v1/check-can-create", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      const uid = await requireAuthUid(req);
      const { workspace_id, resource } = req.body as { workspace_id: string; resource: LimitKey };
      if (!workspace_id || !resource) return res.status(400).json({ ok: false, error: "workspace_id and resource required" });

      const limits = await getEffectiveLimits(workspace_id);
      if (limits === null) return res.json({ ok: true, allowed: true, current: 0, limit: null });

      const limit = limits[resource] ?? null;
      if (limit === null) return res.json({ ok: true, allowed: true, current: 0, limit: null });

      const current = await countResource(workspace_id, resource, uid);
      return res.json({ ok: true, allowed: current < limit, current, limit });
    } catch (e: any) {
      return res.status(400).json({ ok: false, error: e?.message });
    }
  });
  app.options("/v1/check-can-create", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

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
     /v1/sites/migrate-member-uids  ★管理画面専用（ADMIN_ORIGINS）
     - ワークスペース内の全サイトに memberUids を付与（既存サイトの移行用）
     - 冪等: 何度呼んでも安全
  ------------------------------ */
  app.post("/v1/sites/migrate-member-uids", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      const body = z.object({ workspace_id: z.string().min(1) }).parse(req.body);
      await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "sites", ["owner", "admin", "member", "viewer"]);

      const db = adminDb();
      const wSnap = await db.collection("workspaces").doc(body.workspace_id).get();
      if (!wSnap.exists) return res.status(404).json({ ok: false, error: "workspace_not_found" });

      const wMembers = ((wSnap.data() as any)?.members || {}) as Record<string, string>;
      const allMemberUids = Object.keys(wMembers);

      const sitesSnap = await db.collection("sites")
        .where("workspaceId", "==", body.workspace_id)
        .get();

      let migrated = 0;
      const batchSize = 400;
      let ops: Array<{ ref: FirebaseFirestore.DocumentReference; uids: string[] }> = [];

      for (const siteDoc of sitesSnap.docs) {
        const siteData = siteDoc.data() as any;
        // memberUids が未設定のサイトのみ初期化（設定済みは手動管理を尊重して触らない）
        if (!Array.isArray(siteData.memberUids)) {
          ops.push({ ref: siteDoc.ref, uids: allMemberUids });
        }
      }

      // バッチ書き込み（500件制限対策）
      for (let i = 0; i < ops.length; i += batchSize) {
        const batch = db.batch();
        for (const op of ops.slice(i, i + batchSize)) {
          batch.update(op.ref, {
            memberUids: op.uids,
            updatedAt: FieldValue.serverTimestamp(),
          });
          migrated++;
        }
        await batch.commit();
      }

      return res.json({ ok: true, migrated, total: sitesSnap.size });
    } catch (e: any) {
      console.error("[/v1/sites/migrate-member-uids] error:", e);
      return res.status(500).json({ ok: false, error: "migration_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/sites/migrate-member-uids", (req, res) => {
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
     /v1/sites/members/add  ★管理画面専用（ADMIN_ORIGINS）
     - site の memberUids に uid を追加（owner/admin のみ）
  ------------------------------ */
  app.post("/v1/sites/members/add", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = z.object({ site_id: z.string().min(1), uid: z.string().min(1) }).parse(req.body);
      await requireWorkspaceAccessBySiteId(req, body.site_id, "sites", ["owner", "admin"]);

      const db = adminDb();
      const siteRef = db.collection("sites").doc(body.site_id);
      const siteSnap = await siteRef.get();
      if (!siteSnap.exists) {
        return res.status(404).json({ ok: false, error: "site_not_found" });
      }

      const siteData = (siteSnap.data() || {}) as any;
      const current: string[] = Array.isArray(siteData.memberUids) ? siteData.memberUids : [];

      if (current.includes(body.uid)) {
        return res.json({ ok: true, already_member: true });
      }

      await siteRef.update({
        memberUids: [...current, body.uid],
        updatedAt: FieldValue.serverTimestamp(),
      });

      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[/v1/sites/members/add] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "site_member_add_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/sites/members/add", (req, res) => {
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
     /v1/sites/members/remove  ★管理画面専用（ADMIN_ORIGINS）
     - site の memberUids から uid を削除（owner/admin のみ）
  ------------------------------ */
  app.post("/v1/sites/members/remove", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = z.object({ site_id: z.string().min(1), uid: z.string().min(1) }).parse(req.body);
      await requireWorkspaceAccessBySiteId(req, body.site_id, "sites", ["owner", "admin"]);

      const db = adminDb();
      const siteRef = db.collection("sites").doc(body.site_id);
      const siteSnap = await siteRef.get();
      if (!siteSnap.exists) {
        return res.status(404).json({ ok: false, error: "site_not_found" });
      }

      const siteData = (siteSnap.data() || {}) as any;
      const current: string[] = Array.isArray(siteData.memberUids) ? siteData.memberUids : [];
      const updated = current.filter((u) => u !== body.uid);

      if (updated.length === current.length) {
        return res.json({ ok: true, not_member: true });
      }

      await siteRef.update({
        memberUids: updated,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[/v1/sites/members/remove] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "site_member_remove_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/sites/members/remove", (req, res) => {
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
     /v1/plans/list  ★管理画面専用（ADMIN_ORIGINS）
     - plan master 一覧を返す
  ------------------------------ */
  app.post("/v1/plans/list", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = PlansListReqSchema.parse(req.body);
      await requirePlatformAdmin(req);
      await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "billing", ["owner", "admin"]);

      const db = adminDb();
      const snap = await db.collection("plans").orderBy("code", "asc").get();

      const items = snap.docs
        .map((d) => {
          const p = (d.data() || {}) as any;
          return {
            plan_id: d.id,
            code: p.code || d.id,
            name: p.name || "",
            description: p.description || "",
            active: typeof p.active === "boolean" ? p.active : true,
            billing_provider: normalizeBillingProvider(p.billing_provider, p.code),
            currency: p.currency || "JPY",
            price_monthly: Number(p.price_monthly || 0),
            price_yearly: p.price_yearly ?? null,
            limits: normalizePlanLimits(p.limits),
            stripe_price_monthly_id: p.stripe_price_monthly_id || null,
            stripe_price_yearly_id: p.stripe_price_yearly_id || null,
            updatedAt: p.updatedAt || null,
          };
        })
        .filter((item) => body.include_inactive || item.active);

      return res.json({ ok: true, items });
    } catch (e: any) {
      console.error("[/v1/plans/list] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : e?.message === "platform_admin_only"
            ? 403
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "plans_list_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/plans/list", (req, res) => {
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
     /v1/plans/upsert  ★管理画面専用（ADMIN_ORIGINS）
     - plan master を追加・更新
  ------------------------------ */
  app.post("/v1/plans/upsert", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = PlansUpsertReqSchema.parse(req.body);
      await requirePlatformAdmin(req);
      await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "billing", ["owner", "admin"]);

      const db = adminDb();
      const ref = db.collection("plans").doc(body.plan_id);
      const now = FieldValue.serverTimestamp();

      await ref.set(
        {
          id: body.plan_id,
          code: body.code,
          name: body.name,
          description: body.description || "",
          active: body.active,
          billing_provider: normalizeBillingProvider(body.billing_provider, body.code),
          currency: body.currency || "JPY",
          price_monthly: Number(body.price_monthly || 0),
          price_yearly: body.price_yearly ?? null,
          limits: normalizePlanLimits(body.limits),
          stripe_price_monthly_id: body.stripe_price_monthly_id || null,
          stripe_price_yearly_id: body.stripe_price_yearly_id || null,
          updatedAt: now,
        },
        { merge: true }
      );

      return res.json({ ok: true, plan_id: body.plan_id });
    } catch (e: any) {
      console.error("[/v1/plans/upsert] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : e?.message === "platform_admin_only"
            ? 403
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "plans_upsert_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/plans/upsert", (req, res) => {
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
     /v1/workspaces/limits/get  ★管理画面専用（ADMIN_ORIGINS）
     - workspace の個別 limit override を取得
  ------------------------------ */
  app.post("/v1/workspaces/limits/get", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = WorkspaceLimitOverrideGetReqSchema.parse(req.body);
      await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "billing", ["owner", "admin"]);

      const db = adminDb();
      const snap = await db.collection("workspace_limit_overrides").doc(body.workspace_id).get();
      const v = (snap.data() || {}) as any;

      return res.json({
        ok: true,
        workspace_id: body.workspace_id,
        override: snap.exists
          ? {
              limits: normalizePlanLimits(v.limits),
              note: v.note || "",
              updatedAt: v.updatedAt || null,
            }
          : null,
      });
    } catch (e: any) {
      console.error("[/v1/workspaces/limits/get] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "workspace_limits_get_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/workspaces/limits/get", (req, res) => {
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
     /v1/workspaces/limits/upsert  ★管理画面専用（ADMIN_ORIGINS）
     - workspace の個別 limit override を追加・更新
  ------------------------------ */
  app.post("/v1/workspaces/limits/upsert", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = WorkspaceLimitOverrideUpsertReqSchema.parse(req.body);
      await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "billing", ["owner", "admin"]);

      const db = adminDb();
      await db.collection("workspace_limit_overrides").doc(body.workspace_id).set(
        {
          workspaceId: body.workspace_id,
          limits: normalizePlanLimits(body.limits),
          note: body.note || "",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.json({ ok: true, workspace_id: body.workspace_id });
    } catch (e: any) {
      console.error("[/v1/workspaces/limits/upsert] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "workspace_limits_upsert_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/workspaces/limits/upsert", (req, res) => {
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

      const overrideId = String(billing.custom_limit_override_id || body.workspace_id);
      const [overrideSnap, wsBillingSnap] = await Promise.all([
        db.collection("workspace_limit_overrides").doc(overrideId).get(),
        db.collection("workspace_billing").doc(body.workspace_id).get(),
      ]);
      const overrideDoc = overrideSnap.exists ? ((overrideSnap.data() || {}) as any) : null;
      const wsBilling = wsBillingSnap.exists ? ((wsBillingSnap.data() || {}) as any) : null;

      // workspace_billing を優先（Stripe webhook はこちらを更新する）
      const mergedBilling = {
        ...billing,
        ...(wsBilling ? {
          plan: wsBilling.plan || billing.plan,
          status: wsBilling.status || billing.status,
          stripe_customer_id: wsBilling.stripe_customer_id || billing.stripe_customer_id,
          stripe_subscription_id: wsBilling.stripe_subscription_id || billing.stripe_subscription_id,
          current_period_ends_at: wsBilling.current_period_ends_at || billing.current_period_ends_at,
          provider: wsBilling.provider || billing.provider,
        } : {}),
        updatedAt: billing.updatedAt || w.updatedAt || null,
      };

      const effectivePlan = mergedBilling.plan;
      const planSnap = effectivePlan
        ? await db.collection("plans").where("code", "==", String(effectivePlan)).limit(1).get()
        : null;
      const planDoc = planSnap && !planSnap.empty ? ({ id: planSnap.docs[0].id, ...(planSnap.docs[0].data() || {}) } as any) : null;

      const responseBilling = buildBillingResponse(
        mergedBilling,
        planDoc,
        overrideDoc,
        wsBilling,
      );

      return res.json({
        ok: true,
        workspace_id: body.workspace_id,
        billing: responseBilling,
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
      if (body.provider) patch.provider = normalizeBillingProvider(body.provider, body.plan);
      if (body.billing_email) patch.billing_email = body.billing_email.toLowerCase();
      if (body.billing_company_name !== undefined) patch.billing_company_name = body.billing_company_name;
      if (body.billing_contact_name !== undefined) patch.billing_contact_name = body.billing_contact_name;
      if (body.billing_contact_phone !== undefined) patch.billing_contact_phone = body.billing_contact_phone;
      if (body.billing_zip !== undefined) patch.billing_zip = body.billing_zip;
      if (body.billing_prefecture !== undefined) patch.billing_prefecture = body.billing_prefecture;
      if (body.billing_city !== undefined) patch.billing_city = body.billing_city;
      if (body.billing_address !== undefined) patch.billing_address = body.billing_address;
      if (body.free_expires_at !== undefined) patch.free_expires_at = body.free_expires_at;
      if (body.stripe_customer_id) patch.stripe_customer_id = body.stripe_customer_id;
      if (body.stripe_subscription_id) patch.stripe_subscription_id = body.stripe_subscription_id;
      if (body.stripe_price_id) patch.stripe_price_id = body.stripe_price_id;
      if (body.custom_limit_override_id) patch.custom_limit_override_id = body.custom_limit_override_id;
      if (body.manual_billing_note !== undefined) patch.manual_billing_note = body.manual_billing_note;

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

      const planSnap = billing.plan
        ? await db.collection("plans").where("code", "==", String(billing.plan)).limit(1).get()
        : null;
      const planDoc = planSnap && !planSnap.empty ? ({ id: planSnap.docs[0].id, ...(planSnap.docs[0].data() || {}) } as any) : null;

      const overrideId = String(billing.custom_limit_override_id || body.workspace_id);
      const [overrideSnap2, accessOverrideSnap2] = await Promise.all([
        db.collection("workspace_limit_overrides").doc(overrideId).get(),
        db.collection("workspace_billing").doc(body.workspace_id).get(),
      ]);
      const overrideDoc = overrideSnap2.exists ? ((overrideSnap2.data() || {}) as any) : null;
      const accessOverride2 = accessOverrideSnap2.exists ? ((accessOverrideSnap2.data() || {}) as any) : null;

      const responseBilling = buildBillingResponse(
        {
          ...billing,
          updatedAt: billing.updatedAt || w2.updatedAt || null,
        },
        planDoc,
        overrideDoc,
        accessOverride2,
      );

      return res.json({
        ok: true,
        workspace_id: body.workspace_id,
        billing: responseBilling,
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

  /* =====================================================
     Stripe Billing Routes
     /v1/stripe/checkout  – Checkout Session 作成
     /v1/stripe/portal    – Customer Portal 作成
     /v1/stripe/webhook   – Stripe Webhook 受信
  ===================================================== */

  // Helper: plan code → plan name (表示用)
  function planCodeToName(code: string): string {
    if (code === "pro") return "プロプラン";
    if (code === "advanced") return "アドバンスプラン";
    return code;
  }

  // Helper: workspace_billing の stripe_customer_id を取得 or 新規作成
  async function getOrCreateStripeCustomer(
    stripe: Stripe,
    workspaceId: string,
    billingData: any
  ): Promise<string> {
    if (billingData?.stripe_customer_id) return billingData.stripe_customer_id;
    const customer = await stripe.customers.create({
      email: billingData?.billing_email || undefined,
      name: billingData?.billing_company_name || undefined,
      metadata: { workspace_id: workspaceId },
    });
    await adminDb().collection("workspace_billing").doc(workspaceId).set(
      { stripe_customer_id: customer.id, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return customer.id;
  }

  // Helper: Stripe subscription status → billing status
  function stripeStatusToBillingStatus(
    status: Stripe.Subscription.Status
  ): "active" | "trialing" | "past_due" | "canceled" | "inactive" {
    switch (status) {
      case "active": return "active";
      case "trialing": return "trialing";
      case "past_due": return "past_due";
      case "canceled": return "canceled";
      case "incomplete":
      case "incomplete_expired":
      case "unpaid":
      case "paused":
      default: return "inactive";
    }
  }

  /* ----------------------------
     POST /v1/stripe/checkout
     プランアップグレード用 Checkout Session 作成
  ----------------------------- */
  const StripeCheckoutReqSchema = z.object({
    workspace_id: z.string().min(1),
    plan: z.string().min(1).max(80), // プランの doc ID（"pro", "advance" など）
    success_url: z.string().url(),
    cancel_url: z.string().url(),
  });

  app.post("/v1/stripe/checkout", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      const body = StripeCheckoutReqSchema.parse(req.body);
      await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "billing", ["owner"]);

      const stripeKey = STRIPE_SECRET_KEY.value().trim();
      if (!stripeKey) return res.status(500).json({ error: "stripe_not_configured" });

      const db = adminDb();

      // plans コレクションから stripe_price_monthly_id を取得（doc ID で直接引く）
      const planDocSnap = await db.collection("plans").doc(body.plan).get();
      if (!planDocSnap.exists) {
        return res.status(400).json({ error: "plan_not_found", message: `plan doc "${body.plan}" が plans コレクションに見つかりません。バックヤードで登録してください。` });
      }
      const planData = planDocSnap.data() as any;
      const priceId = planData.stripe_price_monthly_id as string | null;
      if (!priceId) {
        return res.status(400).json({ error: "price_not_configured", message: `plan "${body.plan}" の stripe_price_monthly_id が未設定です。バックヤードのプラン管理で Price ID を設定してください。` });
      }

      // workspace_billing から顧客情報を取得
      const billingSnap = await db.collection("workspace_billing").doc(body.workspace_id).get();
      const billingData = billingSnap.data() || {};

      const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" as any });
      const customerId = await getOrCreateStripeCustomer(stripe, body.workspace_id, billingData);

      // Checkout Session 作成
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: body.success_url,
        cancel_url: body.cancel_url,
        subscription_data: {
          metadata: { workspace_id: body.workspace_id, plan: body.plan },
        },
        metadata: { workspace_id: body.workspace_id, plan: body.plan },
        locale: "ja",
      });

      return res.json({ ok: true, url: session.url });
    } catch (e: any) {
      console.error("[/v1/stripe/checkout] error:", e);
      return res.status(400).json({ ok: false, error: "checkout_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/stripe/checkout", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* ----------------------------
     POST /v1/stripe/portal
     Customer Portal (プラン変更・解約・請求書)
  ----------------------------- */
  const StripePortalReqSchema = z.object({
    workspace_id: z.string().min(1),
    return_url: z.string().url(),
  });

  app.post("/v1/stripe/portal", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      const body = StripePortalReqSchema.parse(req.body);
      await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "billing", ["owner"]);

      const stripeKey = STRIPE_SECRET_KEY.value().trim();
      if (!stripeKey) return res.status(500).json({ error: "stripe_not_configured" });

      const billingSnap = await adminDb().collection("workspace_billing").doc(body.workspace_id).get();
      const customerId = (billingSnap.data() || {} as any).stripe_customer_id as string | undefined;
      if (!customerId) {
        return res.status(400).json({ error: "no_stripe_customer", message: "Stripe 顧客IDが未設定です。先にプランをご購入ください。" });
      }

      const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" as any });
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: body.return_url,
      });

      return res.json({ ok: true, url: portalSession.url });
    } catch (e: any) {
      console.error("[/v1/stripe/portal] error:", e);
      return res.status(400).json({ ok: false, error: "portal_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/stripe/portal", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  /* ----------------------------
     POST /v1/stripe/webhook
     Stripe Webhook イベント受信
     ※ 認証なし、署名検証のみ
  ----------------------------- */
  app.post("/v1/stripe/webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    const webhookSecret = STRIPE_WEBHOOK_SECRET.value().trim();
    const stripeKey = STRIPE_SECRET_KEY.value().trim();

    if (!stripeKey || !webhookSecret) {
      console.error("[/v1/stripe/webhook] stripe keys not configured");
      return res.status(500).json({ error: "stripe_not_configured" });
    }

    let event: Stripe.Event;
    try {
      const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" as any });
      const rawBody = (req as any).rawBody as Buffer | undefined;
      if (!rawBody) {
        return res.status(400).json({ error: "raw_body_missing" });
      }
      event = stripe.webhooks.constructEvent(rawBody, sig || "", webhookSecret);
    } catch (e: any) {
      console.error("[/v1/stripe/webhook] signature verification failed:", e?.message);
      return res.status(400).json({ error: "invalid_signature", message: e?.message });
    }

    console.log("[/v1/stripe/webhook] event:", event.type);

    try {
      const db = adminDb();
      const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" as any });

      switch (event.type) {
        // ────────── Checkout 完了 ──────────
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const workspaceId = session.metadata?.workspace_id;
          const plan = session.metadata?.plan;
          if (!workspaceId || !plan) break;

          const subscriptionId = typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

          await db.collection("workspace_billing").doc(workspaceId).set({
            plan,
            status: "active",
            provider: "stripe",
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId || null,
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });

          console.log(`[stripe/webhook] checkout.session.completed: workspace=${workspaceId} plan=${plan}`);
          break;
        }

        // ────────── サブスクリプション更新 ──────────
        case "customer.subscription.updated":
        case "customer.subscription.created": {
          const sub = event.data.object as Stripe.Subscription;
          const workspaceId = sub.metadata?.workspace_id;
          if (!workspaceId) {
            // metadata にない場合は stripe_customer_id で逆引き
            const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
            const snap = await db.collection("workspace_billing")
              .where("stripe_customer_id", "==", customerId).limit(1).get();
            if (!snap.empty) {
              const wsId = snap.docs[0].id;
              const priceId = sub.items.data[0]?.price.id || null;
              // plans コレクションから plan code を逆引き
              const planSnap = await db.collection("plans")
                .where("stripe_price_monthly_id", "==", priceId).limit(1).get();
              const planCode = planSnap.empty ? null : (planSnap.docs[0].data() as any).code;

              await db.collection("workspace_billing").doc(wsId).set({
                ...(planCode ? { plan: planCode } : {}),
                status: stripeStatusToBillingStatus(sub.status),
                stripe_subscription_id: sub.id,
                stripe_price_id: priceId,
                current_period_ends_at: new Date((sub.items.data[0]?.current_period_end ?? 0) * 1000).toISOString(),
                updatedAt: FieldValue.serverTimestamp(),
              }, { merge: true });
            }
            break;
          }
          const priceId = sub.items.data[0]?.price.id || null;
          const planSnap = await db.collection("plans")
            .where("stripe_price_monthly_id", "==", priceId).limit(1).get();
          const planCode = planSnap.empty ? null : (planSnap.docs[0].data() as any).code;

          await db.collection("workspace_billing").doc(workspaceId).set({
            ...(planCode ? { plan: planCode } : {}),
            status: stripeStatusToBillingStatus(sub.status),
            provider: "stripe",
            stripe_subscription_id: sub.id,
            stripe_price_id: priceId,
            current_period_ends_at: new Date((sub.items.data[0]?.current_period_end ?? 0) * 1000).toISOString(),
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });

          console.log(`[stripe/webhook] subscription updated: workspace=${workspaceId} status=${sub.status} plan=${planCode}`);
          break;
        }

        // ────────── サブスクリプション解約 ──────────
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const workspaceId = sub.metadata?.workspace_id;
          const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

          const getWsId = async () => {
            if (workspaceId) return workspaceId;
            const snap = await db.collection("workspace_billing")
              .where("stripe_customer_id", "==", customerId).limit(1).get();
            return snap.empty ? null : snap.docs[0].id;
          };
          const wsId = await getWsId();
          if (!wsId) break;

          await db.collection("workspace_billing").doc(wsId).set({
            plan: "free",
            status: "canceled",
            stripe_subscription_id: null,
            stripe_price_id: null,
            current_period_ends_at: new Date((sub.items.data[0]?.current_period_end ?? 0) * 1000).toISOString(),
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });

          console.log(`[stripe/webhook] subscription deleted: workspace=${wsId}`);
          break;
        }

        // ────────── 支払い失敗 ──────────
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
          if (!customerId) break;
          const snap = await db.collection("workspace_billing")
            .where("stripe_customer_id", "==", customerId).limit(1).get();
          if (snap.empty) break;
          await db.collection("workspace_billing").doc(snap.docs[0].id).set({
            status: "past_due",
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
          console.log(`[stripe/webhook] payment failed: customer=${customerId}`);
          break;
        }

        default:
          console.log(`[stripe/webhook] unhandled event type: ${event.type}`);
      }

      return res.json({ received: true });
    } catch (e: any) {
      console.error("[/v1/stripe/webhook] processing error:", e);
      return res.status(500).json({ error: "webhook_processing_failed", message: e?.message });
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
     /v1/media/delete  ★管理画面専用（ADMIN_ORIGINS）
     - media doc と storage file を削除
     - 使用中メディアは削除させない
  ------------------------------ */
  app.post("/v1/media/delete", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);

      const body = MediaDeleteReqSchema.parse(req.body);
      await requireWorkspaceAccessByWorkspaceId(req, body.workspace_id, "media", ["owner", "admin"]);

      const db = adminDb();
      const mediaRef = db.collection("media").doc(body.media_id);
      const mediaSnap = await mediaRef.get();

      const media = mediaSnap.exists ? ((mediaSnap.data() || {}) as any) : {};
      const rawStoragePath = String(media.storagePath || body.storage_path || "");
      const rawDownloadURL = String(media.downloadURL || body.download_url || "");

      if (mediaSnap.exists && String(media.workspaceId || "") !== String(body.workspace_id)) {
        return res.status(400).json({ ok: false, error: "workspace_mismatch" });
      }

      if (mediaSnap.exists) {
        const actionsSnap = await db.collection("actions").where("workspaceId", "==", body.workspace_id).get();
        const usedIn: Array<{ actionId: string; title?: string }> = [];

        actionsSnap.forEach((doc) => {
          const a = (doc.data() || {}) as any;
          const ids = new Set<string>(Array.isArray(a.mediaIds) ? a.mediaIds.map((x: any) => String(x)) : []);
          if (a?.creative?.image_media_id) ids.add(String(a.creative.image_media_id));
          if (ids.has(String(body.media_id))) {
            usedIn.push({
              actionId: doc.id,
              title: String(a?.creative?.title || ""),
            });
          }
        });

        if (usedIn.length) {
          return res.status(409).json({ ok: false, error: "media_in_use", usedIn });
        }
      }

      const target = resolveStorageTarget(rawStoragePath, rawDownloadURL);
      if (target.path) {
        const bucket = target.bucket ? getStorage().bucket(target.bucket) : getStorage().bucket();
        const primaryPath = String(target.path || "");
        const fallbackPath = encodeURIComponent(primaryPath).replace(/%2F/g, "/");

        const primaryFile = bucket.file(primaryPath);
        const [primaryExists] = await primaryFile.exists();

        console.error(
          `[/v1/media/delete] delete target ${JSON.stringify({
            workspace_id: body.workspace_id,
            media_id: body.media_id,
            bucket: bucket.name,
            primaryPath,
            primaryExists,
            fallbackPath: fallbackPath !== primaryPath ? fallbackPath : null,
            rawStoragePath,
            rawDownloadURL,
          })}`
        );

        if (primaryExists) {
          await primaryFile.delete({ ignoreNotFound: true } as any);
        } else if (fallbackPath && fallbackPath !== primaryPath) {
          const fallbackFile = bucket.file(fallbackPath);
          const [fallbackExists] = await fallbackFile.exists();

          console.error(
            `[/v1/media/delete] fallback target ${JSON.stringify({
              workspace_id: body.workspace_id,
              media_id: body.media_id,
              bucket: bucket.name,
              fallbackPath,
              fallbackExists,
            })}`
          );

          if (fallbackExists) {
            await fallbackFile.delete({ ignoreNotFound: true } as any);
          }
        }
      } else {
        console.error(
          `[/v1/media/delete] storage target not resolved ${JSON.stringify({
            workspace_id: body.workspace_id,
            media_id: body.media_id,
            rawStoragePath,
            rawDownloadURL,
          })}`
        );
      }

      if (mediaSnap.exists) {
        await mediaRef.delete();
      }

      return res.json({ ok: true, media_id: body.media_id, media_existed: mediaSnap.exists });
    } catch (e: any) {
      console.error("[/v1/media/delete] error:", e);
      return res
        .status(
          e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : String(e?.message || "").startsWith("workspace_access_denied:")
            ? 403
            : 400
        )
        .json({ ok: false, error: "media_delete_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/media/delete", (req, res) => {
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

      // 0. プラットフォームデフォルトテンプレートを一度だけ取得
      const platformTplSnap = await db.collection("system_config").doc("platform_templates").get();
      const platformTpls = platformTplSnap.exists ? (platformTplSnap.data() || {}) as Record<string, { html: string; css: string }> : {};

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

          // siteId が異なるアクションは配信しない（他サイトのアクションの誤配信を防ぐ）
          if (a.siteId && a.siteId !== site_id) continue;

          // templateId があれば templates コレクションからデータを取得して埋め込む
          let template = a.template || null;
          if (!template && a.templateId) {
            const tSnap = await db.collection("templates").doc(a.templateId).get();
            if (tSnap.exists) {
              const t = tSnap.data() as any;
              template = { template_id: a.templateId, html: t.html || "", css: t.css || "" };
            }
          }

          // ワークスペース固有テンプレートがない場合、プラットフォームデフォルトにフォールバック
          if (!template) {
            const actionType = String(a.type || "modal");
            const ptpl = platformTpls[actionType];
            if (ptpl && (ptpl.html || ptpl.css)) {
              template = { template_id: `platform_${actionType}`, html: ptpl.html || "", css: ptpl.css || "" };
            }
          }

          // launcher用: modalTemplateId があればモーダルテンプレートも埋め込む
          let modalTemplate = null;
          if (a.type === "launcher" && a.modalTemplateId) {
            const mtSnap = await db.collection("templates").doc(a.modalTemplateId).get();
            if (mtSnap.exists) {
              const mt = mtSnap.data() as any;
              modalTemplate = { template_id: a.modalTemplateId, html: mt.html || "", css: mt.css || "" };
            }
          }
          // launcher用: modalTemplateIdもない場合、プラットフォームのmodalデフォルトにフォールバック
          if (a.type === "launcher" && !modalTemplate) {
            const ptpl = platformTpls["modal"];
            if (ptpl && (ptpl.html || ptpl.css)) {
              modalTemplate = { template_id: "platform_modal", html: ptpl.html || "", css: ptpl.css || "" };
            }
          }

          actions.push({
            action_id: a.id || ref.actionId,
            type: a.type,
            creative: a.creative || {},
            template,
            modal_template: modalTemplate,
            mount: a.mount || null,
          });
        }

        if (!actions.length) continue;

        scenarios.push({
          scenario_id: doc.id,
          status: s.status,
          priority: s.priority ?? 0,
          entry_rules: s.entry_rules || {},
          schedule: s.schedule || null,
          goal: s.goal || null,
          actions,
          experiment: s.experiment || null,
        });
      }

      const logSampleRate = await getEffectiveLogSampleRate(site.workspaceId);

      return res.json({
        ok: true,
        site: {
          id: site.id,
          publicKey: site.publicKey,
          workspaceId: site.workspaceId,
        },
        log_sample_rate: logSampleRate,
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
      res.setHeader("Access-Control-Allow-Credentials", "true");
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

      // ログはcredentials不要なのでワイルドカードCORSで返す（埋め込みJSからcredentials: "omit"で呼ばれる）
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Vary", "Origin");

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
      const logPayload: Record<string, any> = {
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
        utm_source: body.utm_source ?? null,
        utm_medium: body.utm_medium ?? null,
        utm_campaign: body.utm_campaign ?? null,
        is_new: body.is_new ?? null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      // 購入イベントの追加フィールド
      if (event === "purchase") {
        logPayload.revenue = body.revenue ?? null;
        logPayload.order_id = body.order_id ?? null;
        logPayload.currency = body.currency ?? "JPY";
        logPayload.items = body.items ?? null;
      }

      // ---- stats_daily (集計) ----
      // 重要: docId に variantId を含めないと A/B が上書きされる
      const statsDocId = `${siteId}__${day}__${scenarioId}__${actionId}__${variantId}__${event}`;
      const statsRef = db.collection("stats_daily").doc(statsDocId);

      const statsPayload: Record<string, any> = {
        siteId,
        day,
        scenarioId: body.scenario_id ?? null,
        actionId: body.action_id ?? null,
        templateId,
        variantId,
        event,
        count: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      };
      // 購入イベントは売上合計も加算
      if (event === "purchase" && typeof body.revenue === "number" && body.revenue >= 0) {
        statsPayload.revenue_total = FieldValue.increment(body.revenue);
      }

      // batch write: logs と stats_daily を atomic に書く
      // → どちらか片方だけ書けてもう片方が失敗する状態（UV > PV）を防ぐ
      const batch = db.batch();
      const newLogRef = db.collection("logs").doc(); // auto-ID
      batch.set(newLogRef, logPayload);
      batch.set(statsRef, statsPayload, { merge: true });

      // visitors_recent: 直近訪問者一覧のための訪問者単位 upsert
      if (body.vid) {
        const vrRef = db.collection("visitors_recent").doc(`${siteId}__${body.vid}`);
        const vrUpdate: Record<string, any> = {
          site_id: siteId,
          vid: body.vid,
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (event === "pageview") {
          vrUpdate.lastSeen = nowIso;
          vrUpdate.lastPath = body.path ?? null;
          vrUpdate.pv = FieldValue.increment(1);
        } else if (event === "conversion") {
          vrUpdate.cv = true;
        } else if (event === "purchase") {
          vrUpdate.purchase = true;
          if (typeof body.revenue === "number") {
            vrUpdate.revenue = FieldValue.increment(body.revenue);
          }
        }
        batch.set(vrRef, vrUpdate, { merge: true });
      }

      // UV / セッション / 新規・リピーター追跡: pageview イベントのみ vid/sid を arrayUnion で保存（自動デデュプ）
      // journeyLogs の limit 制限に依存せずサーバー側で正確に集計する
      if (event === "pageview" && body.vid) {
        // UV（全訪問者）
        const uvDocId = `${siteId}__${day}__all__all__na__uv`;
        const uvRef = db.collection("stats_daily").doc(uvDocId);
        batch.set(uvRef, {
          siteId, day,
          scenarioId: null, actionId: null, templateId: null, variantId: "na",
          event: "uv",
          vids: FieldValue.arrayUnion(body.vid),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        // セッション（sid 単位でデデュプ）
        if (body.sid) {
          const sessionDocId = `${siteId}__${day}__all__all__na__session`;
          const sessionRef = db.collection("stats_daily").doc(sessionDocId);
          batch.set(sessionRef, {
            siteId, day,
            scenarioId: null, actionId: null, templateId: null, variantId: "na",
            event: "session",
            sids: FieldValue.arrayUnion(body.sid),
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        }

        // 新規 / リピーター（is_new フラグが送られてきた場合のみ）
        if (typeof body.is_new === "boolean") {
          const nrEvent = body.is_new ? "new_vids" : "repeat_vids";
          const nrDocId = `${siteId}__${day}__all__all__na__${nrEvent}`;
          const nrRef = db.collection("stats_daily").doc(nrDocId);
          batch.set(nrRef, {
            siteId, day,
            scenarioId: null, actionId: null, templateId: null, variantId: "na",
            event: nrEvent,
            vids: FieldValue.arrayUnion(body.vid),
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      }

      await batch.commit();

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

      // 日付フィルタ: day_from/day_to が指定されていればレンジ、なければ単日(day)
      const useRange = body.day_from && body.day_to;
      let q = db
        .collection("stats_daily")
        .where("siteId", "==", body.site_id);
      if (useRange) {
        q = q.where("day", ">=", body.day_from!).where("day", "<=", body.day_to!);
      } else {
        q = q.where("day", "==", body.day!);
      }

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

  app.options("/v1/log", (req, res) => {
    // ログはcredentials不要 → ワイルドカードCORSで常にpreflightを通す
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Site-Id,X-Site-Key");
    res.status(204).send("");
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
      const dayFrom = body.day_from;
      const dayTo = body.day_to;
      const scenarioId = body.scenario_id;
      const variantId = String(body.variant_id ?? "na") || "na";

      // ===============================
      // 1) キャッシュ（期間単位）
      // ===============================
      const forceRefresh = body.force_refresh === true;
      const cacheId = `${siteId}__${scenarioId}__${variantId}__${dayFrom}__${dayTo}`;
      const cacheRef = db.collection("ai_reviews_daily").doc(cacheId);
      if (!forceRefresh) {
        const cacheSnap = await cacheRef.get();
        if (cacheSnap.exists) {
          return res.json({ ok: true, cached: true, ...(cacheSnap.data() as any) });
        }
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

      // テンプレートIDを収集して一括フェッチ
      const templateIds = actionSnaps
        .filter((snap) => snap.exists)
        .map((snap) => String((snap.data() as any)?.templateId || ""))
        .filter(Boolean);
      const uniqueTemplateIds = [...new Set(templateIds)];
      const templateSnaps = await Promise.all(
        uniqueTemplateIds.map((tid) => db.collection("templates").doc(tid).get())
      );
      const templateMap: Record<string, any> = {};
      for (const tSnap of templateSnaps) {
        if (tSnap.exists) templateMap[tSnap.id] = tSnap.data();
      }

      // HTML から表示テキストを抽出するヘルパー
      function extractTextFromHtml(html: string): string {
        return html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 600); // AIに渡すテキストは最大600文字
      }

      const actions = actionSnaps
        .filter((snap) => snap.exists)
        .map((snap) => {
          const d = (snap.data() || {}) as any;
          const templateId = String(d.templateId || "");
          const tplData = templateId ? templateMap[templateId] : null;
          const templateText = tplData?.html ? extractTextFromHtml(String(tplData.html)) : "";
          return {
            action_id: snap.id,
            type: (d.type || "modal") as "modal" | "banner" | "toast",
            creative: d.creative || {},
            templateId: templateId || null,
            templateText: templateText || null,
          };
        });

      // ===============================
      // 3) stats_daily（actionごと）
      // ===============================
      const statsSnap = await db
        .collection("stats_daily")
        .where("siteId", "==", siteId)
        .where("day", ">=", dayFrom)
        .where("day", "<=", dayTo)
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
      const totalConversionsPre = Object.values(metricsMap).reduce((sum, m) => sum + (m.conversions || 0), 0);
      const rule = ruleMark({ impressions: totalImpressionsPre, clicks: totalClicksPre, conversions: totalConversionsPre });

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
          day_from: dayFrom,
          day_to: dayTo,
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
      const aiInput = actions.map((a) => {
        const hasTemplate = Boolean(a.templateId && a.templateText);
        return {
          action_id: a.action_id,
          type: a.type,
          // creative fields は常に渡す（テンプレートがある場合は参考程度）
          title: String(a.creative?.title || ""),
          body: String(a.creative?.body || ""),
          cta_text: String(a.creative?.cta_text || ""),
          cta_url: String(a.creative?.cta_url || ""),
          // カスタムテンプレートがある場合はそのテキストも渡す（こちらが実際に表示される内容）
          ...(hasTemplate ? { custom_template_text: a.templateText } : {}),
          uses_custom_template: hasTemplate,
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
        };
      });

      const prompt = {
        role: "ux_optimizer",
        task: [
          "以下の actions から改善優先度が高いものを最大3つ選び、短い見出し(label)と理由(reason)を返してください。",
          "必ず action_id は入力のものをそのまま返す。",
          "uses_custom_template=true の action は、custom_template_text が実際にユーザーに表示されるコンテンツです。title/bodyフィールドより custom_template_text を優先して評価してください。",
          "custom_template_text が空でも title/body/cta_text を元に評価してください。",
        ].join(" "),
        severity_guide: {
          bad: "明確な問題（例: CTR/リンクCTRが極端に低い、close_rateが高い、文言が弱い/誤解を招く、CTAが不明瞭）",
          warn: "改善余地あり（例: 数字は悪くないが伸ばせる、CTA/本文が長い、価値が伝わりにくい）",
          info: "軽微な改善",
        },
        output_rule: "JSON配列のみ。最大3件。",
        inputs: {
          site_id: siteId,
          day_from: dayFrom,
          day_to: dayTo,
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
          output_rule:
            "Return a JSON object with a single key 'highlights' containing an array. Example: {\"highlights\":[{\"action_id\":\"...\",\"label\":\"...\",\"reason\":\"...\",\"severity\":\"warn\"}]}. Max 3 items.",
        },
        // json_object format always returns an object, never a bare array.
        // Accept any object shape and extract the first array value found.
        schema: z.record(z.unknown()).transform((v) => {
          // Try well-known keys first, then fall back to first array value
          const raw: any = v;
          const arr: unknown =
            raw.highlights ?? raw.items ?? raw.result ?? raw.data ?? raw.reviews ??
            Object.values(raw).find((x) => Array.isArray(x)) ?? [];
          return (Array.isArray(arr) ? arr : [])
            .slice(0, 3)
            .map((item: any) => ({
              action_id: String(item?.action_id || ""),
              label: String(item?.label || ""),
              reason: String(item?.reason || ""),
              severity: (["bad", "warn", "info"].includes(item?.severity) ? item.severity : "info") as "bad" | "warn" | "info",
            }))
            .filter((h) => h.action_id && h.label);
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
        day_from: dayFrom,
        day_to: dayTo,
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

  /* -----------------------------
     /v1/workspaces/access-override/set  ★プラットフォーム管理者専用
     - 指定ワークスペースにフルアクセス権限を付与（日数指定）
  ------------------------------ */
  app.post("/v1/workspaces/access-override/set", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);

      const workspace_id = String(req.body?.workspace_id || "").trim();
      if (!workspace_id) return res.status(400).json({ error: "workspace_id required" });

      const override_until = req.body?.override_until
        ? String(req.body.override_until)
        : null;
      const note = String(req.body?.note || "").trim();

      const db = adminDb();
      const ref = db.collection("workspace_billing").doc(workspace_id);

      if (override_until) {
        const until = new Date(override_until);
        const now = new Date();
        await ref.set(
          {
            access_override_until: until.toISOString(),
            access_override_active: until > now,
            access_override_note: note,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } else {
        // クリア
        await ref.set(
          {
            access_override_until: null,
            access_override_active: false,
            access_override_note: "",
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      return res.json({ ok: true, workspace_id, override_until, note });
    } catch (e: any) {
      console.error("[/v1/workspaces/access-override/set] error:", e);
      return res
        .status(
          e?.message === "platform_admin_only"
            ? 403
            : e?.message === "missing_authorization" || e?.message === "invalid_token"
            ? 401
            : 400
        )
        .json({ error: e?.message || "access_override_set_failed" });
    }
  });

  /* ============================================================
     OPS endpoints（バックヤード専用 / platform admin only）
     ============================================================ */

  const opsErrStatus = (e: any) =>
    e?.message === "platform_admin_only" ? 403
    : e?.message === "missing_authorization" || e?.message === "invalid_token" ? 401
    : 500;

  /* --- /v1/ops/workspaces --- 全ワークスペース一覧 */
  app.post("/v1/ops/workspaces", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);
      const db = adminDb();
      const [wsSnap, billingSnap] = await Promise.all([
        db.collection("workspaces").orderBy("createdAt", "desc").get(),
        db.collection("workspace_billing").get(),
      ]);
      const billingMap: Record<string, any> = {};
      for (const d of billingSnap.docs) billingMap[d.id] = d.data();

      const workspaces = wsSnap.docs.map((d) => {
        const data = d.data() as any;
        const billing = data.billing || {};
        // workspace_billing を優先（Stripe webhook はこちらを更新する）
        const wsBilling = billingMap[d.id] || {};
        const members = data.members || {};
        const emails = data.memberEmails || {};
        const ownerUid = Object.entries(members).find(([, v]: any) => v?.role === "owner")?.[0] || "";
        return {
          id: d.id,
          name: data.name || "",
          ownerEmail: ownerUid ? (emails[ownerUid] || "") : "",
          plan: wsBilling.plan || billing.plan || "free",
          status: wsBilling.status || billing.status || "inactive",
          trialEndsAt: wsBilling.trial_ends_at || billing.trial_ends_at || null,
          currentPeriodEndsAt: wsBilling.current_period_ends_at || billing.current_period_ends_at || null,
          provider: wsBilling.provider || billing.provider || "manual",
          stripeCustomerId: wsBilling.stripe_customer_id || billing.stripe_customer_id || null,
          stripeSubscriptionId: wsBilling.stripe_subscription_id || billing.stripe_subscription_id || null,
          billingNote: wsBilling.manual_billing_note || billing.manual_billing_note || "",
          accessOverrideActive: wsBilling.access_override_active || false,
          accessOverrideUntil: wsBilling.access_override_until || null,
          accessOverrideNote: wsBilling.access_override_note || "",
          memberCount: Object.keys(members).length,
          createdAt: data.createdAt || null,
          rmsEnabled: data.rmsEnabled || false,
          rmsMonthlyPrice: data.rmsMonthlyPrice || 0,
        };
      });
      return res.json({ ok: true, workspaces });
    } catch (e: any) {
      console.error("[/v1/ops/workspaces] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/workspaces", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* --- /v1/ops/workspaces/billing/update --- プラン・ステータス更新 */
  app.post("/v1/ops/workspaces/billing/update", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);
      const { workspace_id, plan, status, trial_days, note } = req.body || {};
      if (!workspace_id) return res.status(400).json({ error: "workspace_id required" });

      const db = adminDb();
      const billing: Record<string, any> = { updatedAt: new Date().toISOString() };
      if (plan) billing.plan = plan;
      if (status) billing.status = status;
      if (note !== undefined) billing.manual_billing_note = note;
      if (typeof trial_days === "number" && trial_days > 0) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + trial_days);
        billing.trial_ends_at = trialEnd.toISOString();
        billing.status = "trialing";
      }
      await db.collection("workspaces").doc(workspace_id).set({ billing }, { merge: true });
      return res.json({ ok: true, workspace_id });
    } catch (e: any) {
      console.error("[/v1/ops/workspaces/billing/update] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/workspaces/billing/update", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* --- /v1/ops/workspaces/options/update --- オプション機能フラグ更新 */
  app.post("/v1/ops/workspaces/options/update", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);
      const { workspace_id, rms_enabled, rms_monthly_price } = req.body || {};
      if (!workspace_id) return res.status(400).json({ error: "workspace_id required" });

      const db = adminDb();
      const update: Record<string, any> = { updatedAt: new Date().toISOString() };
      if (typeof rms_enabled === "boolean") update.rmsEnabled = rms_enabled;
      if (typeof rms_monthly_price === "number") update.rmsMonthlyPrice = rms_monthly_price;

      await db.collection("workspaces").doc(workspace_id).set(update, { merge: true });
      return res.json({ ok: true, workspace_id });
    } catch (e: any) {
      console.error("[/v1/ops/workspaces/options/update] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/workspaces/options/update", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* --- /v1/ops/special-trials/list --- */
  app.post("/v1/ops/special-trials/list", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);
      const db = adminDb();
      const snap = await db.collection("special_trials").orderBy("granted_at", "desc").get();
      return res.json({ ok: true, trials: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
    } catch (e: any) {
      console.error("[/v1/ops/special-trials/list] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/special-trials/list", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* --- /v1/ops/special-trials/upsert --- 特別トライアル作成/更新 */
  app.post("/v1/ops/special-trials/upsert", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      const grantedBy = await requirePlatformAdmin(req);
      const { type, target_id, target_name, expires_at, note, trial_id } = req.body || {};
      if (!type || !target_id) return res.status(400).json({ error: "type and target_id required" });

      const db = adminDb();
      const id = trial_id || `trial_${Date.now()}`;
      const now = new Date().toISOString();
      const overrideUntil = expires_at || new Date(Date.now() + 1000 * 60 * 60 * 24 * 3650).toISOString();

      await db.collection("special_trials").doc(id).set({
        type, target_id,
        target_name: target_name || target_id,
        status: "active",
        expires_at: expires_at || null,
        note: note || "",
        granted_by: grantedBy,
        granted_at: now,
        updatedAt: now,
      }, { merge: true });

      const applyOverride = async (wsId: string) => {
        await db.collection("workspace_billing").doc(wsId).set({
          access_override_active: true,
          access_override_until: overrideUntil,
          access_override_note: `特別トライアル: ${note || id}`,
          updatedAt: now,
        }, { merge: true });
        await db.collection("workspace_limit_overrides").doc(wsId).set({
          limits: { sites: null, scenarios: null, actions: null, aiInsights: null, members: null },
          note: `特別トライアル: ${note || id}`,
          updatedAt: now,
        }, { merge: true });
      };

      if (type === "workspace") {
        await applyOverride(target_id);
      } else if (type === "account") {
        const wsSnap = await db.collection("workspaces").get();
        for (const d of wsSnap.docs) {
          const data = d.data() as any;
          const emails = data.memberEmails || {};
          const members = data.members || {};
          const isOwner = Object.entries(members).some(([uid, v]: any) =>
            v?.role === "owner" && emails[uid] === target_id
          );
          if (isOwner) await applyOverride(d.id);
        }
      }

      return res.json({ ok: true, trial_id: id });
    } catch (e: any) {
      console.error("[/v1/ops/special-trials/upsert] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/special-trials/upsert", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* --- /v1/ops/special-trials/revoke --- */
  app.post("/v1/ops/special-trials/revoke", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);
      const { trial_id } = req.body || {};
      if (!trial_id) return res.status(400).json({ error: "trial_id required" });

      const db = adminDb();
      const trialRef = db.collection("special_trials").doc(trial_id);
      const trialSnap = await trialRef.get();
      if (!trialSnap.exists) return res.status(404).json({ error: "trial not found" });
      const trial = trialSnap.data() as any;

      const now = new Date().toISOString();
      await trialRef.set({ status: "revoked", updatedAt: now }, { merge: true });

      const clearOverride = async (wsId: string) => {
        await db.collection("workspace_billing").doc(wsId).set({
          access_override_active: false,
          access_override_until: null,
          access_override_note: "",
          updatedAt: now,
        }, { merge: true });
        await db.collection("workspace_limit_overrides").doc(wsId).delete();
      };

      if (trial.type === "workspace") {
        await clearOverride(trial.target_id);
      } else if (trial.type === "account") {
        const wsSnap = await db.collection("workspaces").get();
        for (const d of wsSnap.docs) {
          const data = d.data() as any;
          const emails = data.memberEmails || {};
          const members = data.members || {};
          const isOwner = Object.entries(members).some(([uid, v]: any) =>
            v?.role === "owner" && emails[uid] === trial.target_id
          );
          if (isOwner) await clearOverride(d.id);
        }
      }

      return res.json({ ok: true, trial_id });
    } catch (e: any) {
      console.error("[/v1/ops/special-trials/revoke] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/special-trials/revoke", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* --- /v1/ops/workspaces/delete --- ワークスペース完全削除 */
  app.post("/v1/ops/workspaces/delete", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);
      const { workspace_id } = req.body as { workspace_id: string };
      if (!workspace_id) throw new Error("workspace_id required");

      const db = adminDb();
      const { getStorage } = await import("firebase-admin/storage");
      const storage = getStorage().bucket();

      async function batchDeleteRefs(refs: FirebaseFirestore.DocumentReference[]) {
        for (let i = 0; i < refs.length; i += 400) {
          const batch = db.batch();
          refs.slice(i, i + 400).forEach((r) => batch.delete(r));
          await batch.commit();
        }
      }

      const [sitesSnap, scenariosSnap, actionsSnap, templatesSnap, mediaSnap, invitesSnap] = await Promise.all([
        db.collection("sites").where("workspaceId", "==", workspace_id).get(),
        db.collection("scenarios").where("workspaceId", "==", workspace_id).get(),
        db.collection("actions").where("workspaceId", "==", workspace_id).get(),
        db.collection("templates").where("workspaceId", "==", workspace_id).get(),
        db.collection("media").where("workspaceId", "==", workspace_id).get(),
        db.collection("workspace_invites").where("workspaceId", "==", workspace_id).get(),
      ]);

      // logs・stats_daily をサイトID経由で削除
      const siteIds = sitesSnap.docs.map((d) => d.id);
      async function deleteQueryAll(q: FirebaseFirestore.Query) {
        let n = 0;
        while (true) {
          const s = await q.limit(400).get();
          if (s.empty) break;
          const b = db.batch(); s.docs.forEach((d) => b.delete(d.ref)); await b.commit();
          n += s.size; if (s.size < 400) break;
        }
        return n;
      }
      let logsDeleted = 0, statsDeleted = 0;
      for (let i = 0; i < siteIds.length; i += 30) {
        const chunk = siteIds.slice(i, i + 30);
        logsDeleted += await deleteQueryAll(db.collection("logs").where("site_id", "in", chunk));
        statsDeleted += await deleteQueryAll(db.collection("stats_daily").where("siteId", "in", chunk));
      }

      // Storageファイルを削除
      await Promise.allSettled(
        mediaSnap.docs.map(async (d) => {
          const sp = (d.data() as any).storagePath;
          if (sp) { try { await storage.file(sp).delete({ ignoreNotFound: true } as any); } catch {} }
        })
      );

      // Firestoreドキュメントを削除
      await batchDeleteRefs([
        ...sitesSnap.docs.map((d) => d.ref),
        ...scenariosSnap.docs.map((d) => d.ref),
        ...actionsSnap.docs.map((d) => d.ref),
        ...templatesSnap.docs.map((d) => d.ref),
        ...mediaSnap.docs.map((d) => d.ref),
        ...invitesSnap.docs.map((d) => d.ref),
        db.collection("workspace_billing").doc(workspace_id),
        db.collection("workspace_limit_overrides").doc(workspace_id),
        db.collection("workspaces").doc(workspace_id),
      ]);

      return res.json({ ok: true, workspace_id, deleted: { sites: sitesSnap.size, scenarios: scenariosSnap.size, actions: actionsSnap.size, templates: templatesSnap.size, media: mediaSnap.size, logs: logsDeleted, stats: statsDeleted } });
    } catch (e: any) {
      console.error("[/v1/ops/workspaces/delete] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/workspaces/delete", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* --- /v1/ops/plans/list --- 全プラン一覧 */
  app.post("/v1/ops/plans/list", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);
      const db = adminDb();
      const snap = await db.collection("plans").orderBy("code", "asc").get();
      const plans = snap.docs.map((d) => ({ id: d.id, ...d.data(), limits: normalizePlanLimits(d.data().limits) }));
      return res.json({ ok: true, plans });
    } catch (e: any) {
      console.error("[/v1/ops/plans/list] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/plans/list", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* --- /v1/ops/plans/upsert --- プラン作成/更新 */
  const OpsPlanUpsertSchema = z.object({
    plan_id: z.string().min(1).max(80),
    code: z.enum(["free", "standard", "premium", "custom"]),
    name: z.string().min(1).max(80),
    description: z.string().max(2000).optional().default(""),
    active: z.boolean().optional().default(true),
    price_monthly: z.number().min(0).optional().default(0),
    limits: PlanLimitsSchema,
    stripe_price_monthly_id: z.string().max(200).nullable().optional(),
    stripe_price_yearly_id: z.string().max(200).nullable().optional(),
  });

  app.post("/v1/ops/plans/upsert", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);
      const body = OpsPlanUpsertSchema.parse(req.body);
      const db = adminDb();
      const ref = db.collection("plans").doc(body.plan_id);
      const existing = await ref.get();
      const now = FieldValue.serverTimestamp();
      await ref.set({
        code: body.code,
        name: body.name,
        description: body.description,
        active: body.active,
        price_monthly: body.price_monthly,
        limits: normalizePlanLimits(body.limits),
        stripe_price_monthly_id: body.stripe_price_monthly_id ?? null,
        stripe_price_yearly_id: body.stripe_price_yearly_id ?? null,
        updated_at: now,
        ...(existing.exists ? {} : { created_at: now }),
      }, { merge: true });
      return res.json({ ok: true, plan_id: body.plan_id });
    } catch (e: any) {
      console.error("[/v1/ops/plans/upsert] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/plans/upsert", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* --- /v1/ops/users --- 全ユーザー一覧（BOページ用） */
  app.post("/v1/ops/users", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);
      const db = adminDb();
      const { getAuth: getAdminAuth } = await import("firebase-admin/auth");

      // Firestoreのusersコレクションを取得
      const usersSnap = await db.collection("users").orderBy("createdAt", "desc").get();

      // Firebase Auth の全ユーザーをページネーションで取得してuidでインデックス化
      const authMap: Record<string, { email?: string; displayName?: string; disabled?: boolean; lastSignInTime?: string; creationTime?: string }> = {};
      let nextPageToken: string | undefined;
      do {
        const result = await getAdminAuth().listUsers(1000, nextPageToken);
        for (const u of result.users) {
          authMap[u.uid] = {
            email: u.email,
            displayName: u.displayName,
            disabled: u.disabled,
            lastSignInTime: u.metadata.lastSignInTime,
            creationTime: u.metadata.creationTime,
          };
        }
        nextPageToken = result.pageToken;
      } while (nextPageToken);

      // ワークスペース一覧でownerUidを取得してユーザーのワークスペース名を付与
      const wsSnap = await db.collection("workspaces").get();
      const userWorkspaceMap: Record<string, { id: string; name: string }[]> = {};
      for (const ws of wsSnap.docs) {
        const data = ws.data() as any;
        const members = data.members || {};
        for (const uid of Object.keys(members)) {
          if (!userWorkspaceMap[uid]) userWorkspaceMap[uid] = [];
          userWorkspaceMap[uid].push({ id: ws.id, name: data.name || ws.id });
        }
      }

      const users = usersSnap.docs.map((d) => {
        const data = d.data() as any;
        const auth = authMap[d.id] || {};
        return {
          uid: d.id,
          email: data.email || auth.email || "",
          displayName: data.displayName || auth.displayName || "",
          photoURL: data.photoURL || "",
          primaryWorkspaceId: data.primaryWorkspaceId || null,
          workspaces: userWorkspaceMap[d.id] || [],
          disabled: auth.disabled || false,
          lastSignInTime: auth.lastSignInTime || null,
          creationTime: auth.creationTime || null,
          createdAt: data.createdAt || null,
        };
      });

      return res.json({ ok: true, users });
    } catch (e: any) {
      console.error("[/v1/ops/users] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/users", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* --- /v1/ops/users/delete --- ユーザー削除（Firebase Auth + Firestore users doc） */
  app.post("/v1/ops/users/delete", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);
      const { uid } = req.body as { uid: string };
      if (!uid) return res.status(400).json({ error: "uid required" });

      const db = adminDb();
      const { getAuth: getAdminAuth } = await import("firebase-admin/auth");

      // Firebase Auth からユーザーを削除
      try { await getAdminAuth().deleteUser(uid); } catch (e: any) {
        if (e?.code !== "auth/user-not-found") throw e;
      }

      // Firestore users ドキュメントを削除
      await db.collection("users").doc(uid).delete();

      console.log(`[/v1/ops/users/delete] deleted uid=${uid}`);
      return res.json({ ok: true, uid });
    } catch (e: any) {
      console.error("[/v1/ops/users/delete] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/users/delete", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* --- /v1/ops/backups/settings/get --- バックアップ設定取得 --- */
  app.post("/v1/ops/backups/settings/get", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);
      const settings = await getBackupSettings();
      return res.json({
        ok: true,
        settings: {
          enabled: settings.enabled,
          hour_jst: settings.hourJst,
          retention_days: settings.retentionDays,
          updated_at: settings.updatedAt,
          updated_by: settings.updatedBy,
        },
        scope: {
          included_collections: BACKUP_INCLUDED_COLLECTIONS,
          omitted_collections: BACKUP_OMITTED_COLLECTIONS,
        },
      });
    } catch (e: any) {
      console.error("[/v1/ops/backups/settings/get] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/backups/settings/get", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* --- /v1/ops/backups/settings/upsert --- バックアップ設定更新 --- */
  app.post("/v1/ops/backups/settings/upsert", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      const updatedBy = await requirePlatformAdmin(req);
      const body = BackupSettingsUpsertReqSchema.parse(req.body || {});
      const settings = await upsertBackupSettings(
        {
          enabled: body.enabled,
          hourJst: body.hour_jst,
          retentionDays: body.retention_days,
        },
        updatedBy
      );
      return res.json({
        ok: true,
        settings: {
          enabled: settings.enabled,
          hour_jst: settings.hourJst,
          retention_days: settings.retentionDays,
          updated_at: settings.updatedAt,
          updated_by: settings.updatedBy,
        },
      });
    } catch (e: any) {
      console.error("[/v1/ops/backups/settings/upsert] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/backups/settings/upsert", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* --- /v1/ops/backups/list --- バックアップ実行履歴一覧 --- */
  app.post("/v1/ops/backups/list", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);
      const body = BackupListReqSchema.parse(req.body || {});
      const runs = await listBackupRuns(body.limit);
      return res.json({ ok: true, runs });
    } catch (e: any) {
      console.error("[/v1/ops/backups/list] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/backups/list", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* --- /v1/ops/backups/run --- 手動バックアップをキューに積む --- */
  app.post("/v1/ops/backups/run", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      const createdBy = await requirePlatformAdmin(req);
      const body = BackupRunReqSchema.parse(req.body || {});
      if (body.scope === "workspace") {
        if (!body.workspace_id) {
          return res.status(400).json({ error: "workspace_id required" });
        }
        const ws = await pickWorkspaceById(body.workspace_id);
        if (!ws) {
          return res.status(404).json({ error: "workspace_not_found" });
        }
      }

      const { runId } = await enqueueBackupRun({
        mode: "manual",
        scope: body.scope,
        workspaceId: body.scope === "workspace" ? String(body.workspace_id || "") : null,
        createdBy,
      });
      return res.json({ ok: true, run_id: runId });
    } catch (e: any) {
      console.error("[/v1/ops/backups/run] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/backups/run", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* --- /v1/ops/backups/download-url --- バックアップの一時URL取得 --- */
  app.post("/v1/ops/backups/download-url", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);
      const body = BackupDownloadReqSchema.parse(req.body || {});
      const result = await createBackupDownloadUrl(body.run_id);
      return res.json({ ok: true, ...result });
    } catch (e: any) {
      console.error("[/v1/ops/backups/download-url] error:", e);
      const status =
        e?.message === "backup_run_not_found" ? 404
        : e?.message === "backup_artifact_not_ready" || e?.message === "backup_artifact_expired" ? 409
        : opsErrStatus(e);
      return res.status(status).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/backups/download-url", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* ============================================================
     /v1/ops/platform-templates — プラットフォームデフォルトテンプレート管理
     ============================================================ */

  /** POST /v1/ops/platform-templates/get — 現在のデフォルトテンプレートを取得 */
  app.post("/v1/ops/platform-templates/get", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      if (req.method === "OPTIONS") return res.status(204).send("");
      await requireAuthUid(req);
      const db = adminDb();
      const snap = await db.collection("system_config").doc("platform_templates").get();
      const data = snap.exists ? snap.data() || {} : {};
      return res.json({ ok: true, platform_templates: data });
    } catch (e: any) {
      console.error("[/v1/ops/platform-templates/get] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/platform-templates/get", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /** POST /v1/ops/platform-templates/upsert — デフォルトテンプレートを保存 */
  app.post("/v1/ops/platform-templates/upsert", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      if (req.method === "OPTIONS") return res.status(204).send("");
      await requireAuthUid(req);
      const body = req.body as any;
      // body: { type: "modal"|"banner"|"toast"|"launcher", html: string, css: string }
      const type = String(body.type || "");
      if (!["modal", "banner", "toast", "launcher"].includes(type)) {
        return res.status(400).json({ error: "invalid_type" });
      }
      const html = String(body.html || "");
      const css = String(body.css || "");
      const db = adminDb();
      await db.collection("system_config").doc("platform_templates").set(
        { [type]: { html, css }, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[/v1/ops/platform-templates/upsert] error:", e);
      return res.status(opsErrStatus(e)).json({ error: e?.message });
    }
  });
  app.options("/v1/ops/platform-templates/upsert", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* ============================================================
     ウェルカムメール送信（認証済みユーザーが初回登録完了時に呼ぶ）
     ============================================================ */
  app.post("/v1/welcome-email", async (req, res) => {
    try {
      const token = String(POSTMARK_SERVER_TOKEN.value() || "").trim();
      if (!token) return res.json({ ok: true, skipped: true }); // トークン未設定なら何もしない

      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!idToken) return res.status(401).json({ error: "missing_authorization" });

      const { getAuth: getAdminAuth } = await import("firebase-admin/auth");
      const decoded = await getAdminAuth().verifyIdToken(idToken).catch(() => null);
      if (!decoded) return res.status(401).json({ error: "invalid_token" });

      const { to, workspaceName, contactName } = req.body as {
        to?: string;
        workspaceName?: string;
        contactName?: string;
      };

      const toEmail = String(to || decoded.email || "").trim();
      if (!toEmail) return res.status(400).json({ error: "to_email_required" });

      const name = String(contactName || decoded.name || "").trim() || "ご担当者";
      const wsName = String(workspaceName || "").trim() || "ワークスペース";
      const from = getInviteFromEmail();
      const messageStream = getInviteMessageStream();
      const loginUrl = "https://app.mokkeda.com";

      const subject = "MOKKEDAへようこそ！🎉";
      const htmlBody = `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.7;color:#111827;max-width:560px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#d1f0ee,#b2e4e1);padding:32px;text-align:center;border-radius:12px 12px 0 0;">
            <img src="https://cx-platform-v1.web.app/logo_mokkeda_v1.svg" alt="MOKKEDA" style="width:180px;" />
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p style="font-size:18px;font-weight:700;margin:0 0 16px;">${name} さん、ようこそ！🎉</p>
            <p>MOKKEDAへご登録いただきありがとうございます。<br/>
            <strong>${wsName}</strong> のワークスペースが作成されました。</p>
            <p>まずはサイトを登録して、シナリオを設定してみましょう。</p>
            <p style="margin:24px 0;">
              <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;background:#49b1b8;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">
                管理画面を開く →
              </a>
            </p>
            <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />
            <p style="font-size:12px;color:#9ca3af;">
              ご不明な点はサポートまでお気軽にご連絡ください。<br/>
              このメールはMOKKEDAよりお送りしています。
            </p>
          </div>
        </div>
      `.trim();

      const textBody = [
        `${name} さん、ようこそ！`,
        "",
        `MOKKEDAへご登録いただきありがとうございます。`,
        `「${wsName}」のワークスペースが作成されました。`,
        "",
        `管理画面: ${loginUrl}`,
      ].join("\n");

      const resp = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": token,
        },
        body: JSON.stringify({
          From: from,
          To: toEmail,
          Subject: subject,
          HtmlBody: htmlBody,
          TextBody: textBody,
          MessageStream: messageStream,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        console.warn("[/v1/welcome-email] postmark error:", json?.Message);
        return res.json({ ok: true, skipped: true }); // メール失敗でもユーザー体験は壊さない
      }

      console.log("[/v1/welcome-email] sent to:", toEmail);
      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[/v1/welcome-email] error:", e);
      return res.status(500).json({ error: e?.message });
    }
  });
  app.options("/v1/welcome-email", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.status(204).send("");
  });

  /* ============================================================
     /v1/ai/optimize  ★管理画面専用
     - サイトの全シナリオ・パフォーマンス・ページトラフィックを分析し
       URL配信条件の変更提案（add_url / remove_url / create_scenario）を返す
     ============================================================ */
  const AiOptimizeSuggestionSchema = z.object({
    id: z.string(),
    type: z.enum(["add_url", "remove_url", "create_scenario"]),
    scenario_id: z.string().optional(),
    scenario_name: z.string().optional(),
    action_id: z.string().optional(),
    action_name: z.string().optional(),
    url_mode: z.enum(["prefix", "contains", "equals"]),
    url_value: z.string(),
    reason: z.string(),
    confidence: z.enum(["high", "medium", "low"]),
  });

  app.post("/v1/ai/optimize", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      const { site_id, day_from, day_to } = req.body as {
        site_id: string; day_from: string; day_to: string;
      };
      if (!site_id) return res.status(400).json({ error: "site_id required" });

      await requireWorkspaceAccessBySiteId(req, site_id, "ai", ["owner", "admin", "member"]);
      const site = await pickSiteById(site_id);
      if (!site) return res.status(404).json({ error: "site not found" });

      const db = adminDb();
      const dayF = day_from || (() => { const d = new Date(); d.setDate(d.getDate() - 13); return d.toISOString().slice(0, 10); })();
      const dayT = day_to || new Date().toISOString().slice(0, 10);

      // ① サイトの全シナリオ取得
      const scenariosSnap = await db.collection("scenarios")
        .where("siteId", "==", site_id).get();
      const allScenarios = scenariosSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

      // ② アクション（クリエイティブ）一覧取得
      const actionsSnap = await db.collection("actions")
        .where("siteId", "==", site_id).get();
      const allActions = actionsSnap.docs.map((d) => {
        const a = d.data() as any;
        return { id: d.id, type: a.type || "modal", name: a.name || a.creative?.title || d.id };
      });

      // ③ stats_daily でシナリオ別パフォーマンス集計
      const statsSnap = await db.collection("stats_daily")
        .where("siteId", "==", site_id)
        .where("day", ">=", dayF)
        .where("day", "<=", dayT)
        .get();

      const perfMap: Record<string, { impressions: number; clicks: number; conversions: number }> = {};
      for (const d of statsSnap.docs) {
        const row = d.data() as any;
        const sid = row.scenarioId;
        if (!sid) continue;
        if (!perfMap[sid]) perfMap[sid] = { impressions: 0, clicks: 0, conversions: 0 };
        const c = Number(row.count || 0);
        if (row.event === "impression") perfMap[sid].impressions += c;
        else if (row.event === "click" || row.event === "click_link") perfMap[sid].clicks += c;
        else if (row.event === "conversion") perfMap[sid].conversions += c;
      }

      // ④ pageviewログ集計（直近300件 → pathごとにカウント）
      const pvSnap = await db.collection("logs")
        .where("site_id", "==", site_id)
        .where("event", "==", "pageview")
        .orderBy("createdAt", "desc")
        .limit(300)
        .get();

      const pvMap: Record<string, number> = {};
      for (const d of pvSnap.docs) {
        const path = String((d.data() as any).path || "");
        if (path) pvMap[path] = (pvMap[path] || 0) + 1;
      }
      const topPages = Object.entries(pvMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([path, count]) => ({ path, pageviews: count }));

      // ⑤ シナリオのURL条件を整形してAIに渡すデータ構築
      const scenarioData = allScenarios
        .filter((s) => s.status === "active" || s.status === "inactive")
        .map((s) => {
          const perf = perfMap[s.id] || { impressions: 0, clicks: 0, conversions: 0 };
          const ctr = perf.impressions > 0 ? Math.round((perf.clicks / perf.impressions) * 1000) / 10 : 0;
          const cvr = perf.impressions > 0 ? Math.round((perf.conversions / perf.impressions) * 1000) / 10 : 0;

          const urls = (s.entry_rules?.page?.urls || []).map((u: any) => ({
            mode: u.mode || "prefix", value: u.value || "", target: u.target || "path",
          }));
          // 旧フォーマット互換
          if (!urls.length && s.entry_rules?.page?.url) {
            const u = s.entry_rules.page.url;
            urls.push({ mode: u.mode || "prefix", value: u.value || "", target: u.target || "path" });
          }

          return {
            id: s.id,
            name: s.name || s.id,
            status: s.status || "inactive",
            current_urls: urls,
            metrics: { impressions: perf.impressions, clicks: perf.clicks, conversions: perf.conversions, ctr, cvr },
          };
        });

      // ⑥ カバレッジギャップ検出（高PVページにシナリオが当たっていないもの）
      const coveredPaths = new Set<string>();
      for (const s of scenarioData) {
        for (const u of s.current_urls) {
          coveredPaths.add(u.value);
        }
      }
      const gaps = topPages
        .filter(({ path }) => !Array.from(coveredPaths).some((c) => path.startsWith(c) || path === c))
        .slice(0, 10);

      // ⑦ AI呼び出し
      const systemPrompt = [
        "You are a CX (customer experience) optimization expert for e-commerce and marketing sites.",
        "Analyze scenario deployment data and suggest specific URL condition changes to maximize conversions.",
        "Return JSON that matches the required schema exactly.",
        "Rules:",
        "- Suggest 4-8 specific, data-driven changes only",
        "- add_url: for high-traffic pages (top 20 by pageview) with no scenario coverage, or expanding well-performing scenarios",
        "- remove_url: for URLs where CTR < 0.5% AND impressions >= 50",
        "- create_scenario: only when a coverage gap exists AND an appropriate action is available",
        "- Assign a unique sequential id like 'opt_1', 'opt_2', ...",
        "- Write reasons in Japanese, concise and data-driven (mention actual numbers)",
        "- Do not suggest changes without data evidence",
      ].join("\n");

      const prompt = {
        site_id,
        date_range: { from: dayF, to: dayT },
        scenarios: scenarioData,
        top_pages: topPages,
        coverage_gaps: gaps,
        available_actions: allActions,
      };

      // AIレスポンスをJSONで取得（スキーマ検証はあとで柔軟に）
      const rawOut = await callOpenAIJson({
        model: "gpt-4.1-mini",
        systemPrompt,
        input: prompt,
        schema: z.record(z.unknown()), // まず任意JSONとして受け取る
      });

      // suggestions キーがなければ、配列そのものか別キー名の可能性を試みる
      let suggestionsList: any[] = [];
      if (Array.isArray((rawOut as any).suggestions)) {
        suggestionsList = (rawOut as any).suggestions;
      } else if (Array.isArray(rawOut)) {
        suggestionsList = rawOut as any[];
      } else {
        // 最初のarray値を探す
        const firstArray = Object.values(rawOut as any).find((v) => Array.isArray(v));
        if (firstArray) suggestionsList = firstArray as any[];
      }

      // 各要素を個別にパースして不正な提案を除外（全体失敗を防ぐ）
      const suggestions = suggestionsList.flatMap((item: any, idx: number) => {
        // idがなければ自動付与
        if (!item.id) item.id = `opt_${idx + 1}`;
        try { return [AiOptimizeSuggestionSchema.parse(item)]; } catch { return []; }
      });

      return res.json({ ok: true, suggestions, meta: { scenarios: scenarioData.length, topPages: topPages.length, gaps: gaps.length } });
    } catch (e: any) {
      console.error("[/v1/ai/optimize] error:", e);
      return res.status(
        e?.message === "missing_authorization" || e?.message === "invalid_token" ? 401
        : String(e?.message || "").startsWith("workspace_access_denied:") ? 403 : 500
      ).json({ error: e?.message || String(e) });
    }
  });
  app.options("/v1/ai/optimize", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* ============================================================
     /v1/ai/optimize/apply  ★管理画面専用
     - 単一の提案を適用する（URL追加・削除・新規シナリオ作成）
     ============================================================ */
  app.post("/v1/ai/optimize/apply", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      const { site_id, suggestion } = req.body as { site_id: string; suggestion: any };
      if (!site_id || !suggestion) return res.status(400).json({ error: "site_id and suggestion required" });

      await requireWorkspaceAccessBySiteId(req, site_id, "ai", ["owner", "admin"]);
      const site = await pickSiteById(site_id);
      if (!site) return res.status(404).json({ error: "site not found" });

      const db = adminDb();
      const now = new Date().toISOString();

      if (suggestion.type === "add_url") {
        // 既存シナリオのentry_rules.page.urlsに追加
        const sRef = db.collection("scenarios").doc(suggestion.scenario_id);
        const sSnap = await sRef.get();
        if (!sSnap.exists) return res.status(404).json({ error: "scenario not found" });
        const s = sSnap.data() as any;
        const currentUrls: any[] = s.entry_rules?.page?.urls || [];
        // 重複チェック
        const already = currentUrls.some((u: any) => u.value === suggestion.url_value && u.mode === suggestion.url_mode);
        if (!already) {
          currentUrls.push({ mode: suggestion.url_mode, value: suggestion.url_value, target: "path" });
          await sRef.set({
            entry_rules: { ...s.entry_rules, page: { ...(s.entry_rules?.page || {}), urls: currentUrls } },
            updatedAt: now,
          }, { merge: true });
        }
        return res.json({ ok: true, type: "add_url", scenario_id: suggestion.scenario_id });

      } else if (suggestion.type === "remove_url") {
        // 既存シナリオのentry_rules.page.urlsから削除
        const sRef = db.collection("scenarios").doc(suggestion.scenario_id);
        const sSnap = await sRef.get();
        if (!sSnap.exists) return res.status(404).json({ error: "scenario not found" });
        const s = sSnap.data() as any;
        const currentUrls: any[] = s.entry_rules?.page?.urls || [];
        const filtered = currentUrls.filter((u: any) => !(u.value === suggestion.url_value && u.mode === suggestion.url_mode));
        await sRef.set({
          entry_rules: { ...s.entry_rules, page: { ...(s.entry_rules?.page || {}), urls: filtered } },
          updatedAt: now,
        }, { merge: true });
        return res.json({ ok: true, type: "remove_url", scenario_id: suggestion.scenario_id });

      } else if (suggestion.type === "create_scenario") {
        // 新規シナリオを作成してアクションを紐付け
        const actionSnap = await db.collection("actions").doc(suggestion.action_id).get();
        if (!actionSnap.exists) return res.status(404).json({ error: "action not found" });

        const ws = await pickWorkspaceById(site.workspaceId);
        if (!ws) return res.status(404).json({ error: "workspace not found" });

        const scenarioId = `scn_${Math.random().toString(36).slice(2, 12)}`;
        await db.collection("scenarios").doc(scenarioId).set({
          id: scenarioId,
          workspaceId: site.workspaceId,
          siteId: site_id,
          name: suggestion.action_name
            ? `${suggestion.action_name} - ${suggestion.url_value}`
            : `AI提案: ${suggestion.url_value}`,
          status: "inactive", // 人が確認してからactiveに
          priority: 0,
          entry_rules: {
            page: { urls: [{ mode: suggestion.url_mode, value: suggestion.url_value, target: "path" }] },
          },
          actionRefs: [{ actionId: suggestion.action_id, enabled: true }],
          goal: null,
          memo: `AIが自動生成したシナリオ。理由: ${suggestion.reason}`,
          createdAt: now,
          updatedAt: now,
          createdBy: "ai_optimize",
        });
        return res.json({ ok: true, type: "create_scenario", scenario_id: scenarioId });

      } else {
        return res.status(400).json({ error: "unknown suggestion type" });
      }
    } catch (e: any) {
      console.error("[/v1/ai/optimize/apply] error:", e);
      return res.status(
        e?.message === "missing_authorization" || e?.message === "invalid_token" ? 401
        : String(e?.message || "").startsWith("workspace_access_denied:") ? 403 : 500
      ).json({ error: e?.message || String(e) });
    }
  });
  app.options("/v1/ai/optimize/apply", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  // ── MCP APIキー管理 ───────────────────────────────────────────────

  // GET /v1/mcp-key — 現在のAPIキーを取得
  app.get("/v1/mcp-key", async (req, res) => {
    corsByAdminOrigins(req, res);
    try {
      const uid = await requireAuthUid(req);
      const db = adminDb();
      const snap = await db.collection("user_settings").doc(uid).get();
      const key = snap.exists ? String((snap.data() as any)?.mcp_api_key || "") : "";
      return res.json({ key: key || null });
    } catch (e: any) {
      return res.status(e?.message === "missing_authorization" || e?.message === "invalid_token" ? 401 : 500).json({ error: e?.message });
    }
  });
  app.options("/v1/mcp-key", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  // POST /v1/mcp-key/generate — APIキーを新規発行（既存は失効）
  app.post("/v1/mcp-key/generate", async (req, res) => {
    corsByAdminOrigins(req, res);
    try {
      const uid = await requireAuthUid(req);
      const db = adminDb();

      // プランチェック: uidが所属するワークスペースでmcp_enabledが有効か確認
      const userSitesSnap = await db.collection("sites").where("memberUids", "array-contains", uid).limit(1).get();
      if (!userSitesSnap.empty) {
        const wsId = String((userSitesSnap.docs[0].data() as any).workspaceId || "");
        if (wsId) {
          const limits = await getEffectiveLimits(wsId);
          // limits が null = access_override_active（無制限） → MCP も許可
          if (limits !== null && !limits.mcp_enabled) {
            return res.status(403).json({ ok: false, error: "plan_limit_exceeded", resource: "mcp", message: "現在のプランではMCPサーバー接続は利用できません。プランをアップグレードしてください。" });
          }
        }
      }

      const { randomBytes } = await import("crypto");

      // 旧キーを削除
      const settingsSnap = await db.collection("user_settings").doc(uid).get();
      const oldKey = settingsSnap.exists ? String((settingsSnap.data() as any)?.mcp_api_key || "") : "";
      if (oldKey) {
        await db.collection("mcp_api_keys").doc(oldKey).delete();
      }

      // 新キーを生成・保存
      const key = "mcp_" + randomBytes(24).toString("base64url");
      await db.collection("mcp_api_keys").doc(key).set({ uid, createdAt: new Date().toISOString() });
      await db.collection("user_settings").doc(uid).set({ mcp_api_key: key }, { merge: true });

      return res.json({ key });
    } catch (e: any) {
      return res.status(e?.message === "missing_authorization" || e?.message === "invalid_token" ? 401 : 500).json({ error: e?.message });
    }
  });
  app.options("/v1/mcp-key/generate", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /* =====================================================
     MISOCA Billing Routes（Platform Admin 専用）
     /v1/ops/misoca/authorize  – OAuth2 認可URL取得
     /v1/ops/misoca/callback   – OAuth2 コールバック（GET）
     /v1/ops/misoca/status     – 接続状態確認
     /v1/ops/misoca/disconnect – 接続解除
     /v1/ops/misoca/trigger    – 手動で請求書発行
  ===================================================== */

  const MISOCA_BACKYARD_RETURN_URL = "https://app.mokkeda.com/ops/";

  /** POST /v1/ops/misoca/authorize — OAuth2 認可URL を返す */
  app.post("/v1/ops/misoca/authorize", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);

      const clientId = MISOCA_CLIENT_ID.value().trim();
      if (!clientId) return res.status(500).json({ error: "MISOCA_CLIENT_ID が未設定です" });

      const redirectUri = encodeURIComponent(`https://app.mokkeda.com/api/v1/ops/misoca/callback`);
      const state = Buffer.from(JSON.stringify({ ts: Date.now() })).toString("base64url");

      // state を一時保存（10分有効）
      await adminDb().collection("system_config").doc("misoca_oauth_state").set({
        state,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      const authUrl = `https://app.misoca.jp/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=${state}`;
      return res.json({ ok: true, url: authUrl });
    } catch (e: any) {
      return res.status(e?.message === "platform_admin_only" ? 403 : 500).json({ ok: false, error: e?.message });
    }
  });
  app.options("/v1/ops/misoca/authorize", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /** GET /v1/ops/misoca/callback — MISOCA OAuth2 コールバック */
  app.get("/v1/ops/misoca/callback", async (req, res) => {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    const errorParam = String(req.query.error || "");

    const redirectBase = MISOCA_BACKYARD_RETURN_URL;

    if (errorParam) {
      return res.redirect(`${redirectBase}?misoca=error&reason=${encodeURIComponent(errorParam)}`);
    }

    if (!code) {
      return res.redirect(`${redirectBase}?misoca=error&reason=no_code`);
    }

    try {
      // state 検証
      const db = adminDb();
      const stateSnap = await db.collection("system_config").doc("misoca_oauth_state").get();
      const storedState = stateSnap.exists ? (stateSnap.data() as any)?.state : null;
      const stateExpiresAt = stateSnap.exists ? new Date((stateSnap.data() as any)?.expiresAt || 0) : new Date(0);

      if (!storedState || storedState !== state || stateExpiresAt < new Date()) {
        return res.redirect(`${redirectBase}?misoca=error&reason=invalid_state`);
      }

      // state を削除
      await db.collection("system_config").doc("misoca_oauth_state").delete();

      // code → token 交換
      const clientId = MISOCA_CLIENT_ID.value().trim();
      const clientSecret = MISOCA_CLIENT_SECRET.value().trim();
      const redirectUri = `https://app.mokkeda.com/api/v1/ops/misoca/callback`;

      const params = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      });

      const tokenResp = await fetch("https://app.misoca.jp/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!tokenResp.ok) {
        const errText = await tokenResp.text();
        console.error("[MISOCA callback] token exchange failed:", errText);
        return res.redirect(`${redirectBase}?misoca=error&reason=token_exchange_failed`);
      }

      const json = await tokenResp.json() as any;
      const expiresAt = new Date(Date.now() + (json.expires_in || 7200) * 1000).toISOString();

      await db.collection("system_config").doc("misoca").set({
        access_token: json.access_token,
        refresh_token: json.refresh_token,
        expires_at: expiresAt,
        connected: true,
        connected_at: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log("[MISOCA] OAuth2 連携完了");
      return res.redirect(`${redirectBase}?misoca=connected`);
    } catch (e: any) {
      console.error("[MISOCA callback] error:", e);
      return res.redirect(`${redirectBase}?misoca=error&reason=${encodeURIComponent(e?.message || "unknown")}`);
    }
  });

  /** POST /v1/ops/misoca/status — 接続状態確認 */
  app.post("/v1/ops/misoca/status", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);
      const status = await getMisocaStatus();

      // 最新の発行ログ5件も返す
      const logsSnap = await adminDb().collection("invoice_logs")
        .orderBy("sentAt", "desc").limit(10).get();
      const recentLogs = logsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      return res.json({ ok: true, ...status, recentLogs });
    } catch (e: any) {
      return res.status(e?.message === "platform_admin_only" ? 403 : 500).json({ ok: false, error: e?.message });
    }
  });
  app.options("/v1/ops/misoca/status", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /** POST /v1/ops/misoca/disconnect — 連携解除 */
  app.post("/v1/ops/misoca/disconnect", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);
      await adminDb().collection("system_config").doc("misoca").delete();
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(e?.message === "platform_admin_only" ? 403 : 500).json({ ok: false, error: e?.message });
    }
  });
  app.options("/v1/ops/misoca/disconnect", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

  /** POST /v1/ops/misoca/trigger — 手動で請求書発行（テスト・再送用） */
  app.post("/v1/ops/misoca/trigger", async (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      await requirePlatformAdmin(req);

      const clientId = MISOCA_CLIENT_ID.value().trim();
      const clientSecret = MISOCA_CLIENT_SECRET.value().trim();
      if (!clientId || !clientSecret) return res.status(500).json({ error: "MISOCA シークレットが未設定です" });

      const result = await sendMisocaInvoicesJob(clientId, clientSecret);
      return res.json({ ok: true, ...result });
    } catch (e: any) {
      console.error("[/v1/ops/misoca/trigger] error:", e);
      return res.status(e?.message === "platform_admin_only" ? 403 : 500).json({ ok: false, error: e?.message });
    }
  });
  app.options("/v1/ops/misoca/trigger", (req, res) => { corsByAdminOrigins(req, res); res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization"); res.status(204).send(""); });

}
