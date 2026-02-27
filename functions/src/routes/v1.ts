// functions/src/routes/v1.ts
import type { Express } from "express";
import { z } from "zod";
import { adminDb } from "../services/admin";
import { pickSiteById, pickWorkspaceById, assertAllowedOrigin } from "../services/site";
import { generateCopy3 } from "../services/openaiCopy";
import { pickVariant } from "../services/experiment";
import { callOpenAIJson } from "../services/openaiJson";
import { defineString, defineSecret } from "firebase-functions/params";
/* =========================================
   Schemas
========================================= */

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

function hostOf(u: string): string {
  return new URL(u).host;
}

function assertAllowedAdminOrigin(origin: string) {
  const allowed = parseOriginsEnv(ADMIN_ORIGINS.value());
  const allowedHosts = allowed.map(hostOf);
  const originHost = origin ? hostOf(origin) : "";

  if (originHost && allowedHosts.includes(originHost)) return;

  throw new Error(`admin origin not allowed (originHost=${originHost})`);
}

/* =========================================
   Small utils
========================================= */


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

      const site = await pickSiteById(site_id);
      if (!site) return res.status(404).json({ error: "site not found" });

      // ここはプロジェクト既存の「配信データ組み立て」に合わせて調整
      // とりあえず最低限 site を返す（既存があるなら差し替え）
      return res.json({ ok: true, site });
    } catch (e: any) {
      console.error("[/v1/serve] error:", e);
      return res.status(400).json({ error: "serve_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/serve", async (req, res) => {
    try {
      const site_id = String(req.query.site_id || req.body?.site_id || "");
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

      // CORS + allow
      await corsBySiteDomains(req, res, body.site_id);

      const db = adminDb();
      const now = new Date().toISOString();

      // 例：logs に保存（既存構造があるなら合わせる）
      const payload = {
        ...body,
        createdAt: now,
        updatedAt: now,
      };

      await db.collection("logs").add(payload);
      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[/v1/log] error:", e);
      return res.status(400).json({ error: "log_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/log", async (req, res) => {
    try {
      const site_id = String(req.body?.site_id || "");
      if (site_id) await corsBySiteDomains(req, res, site_id);

      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Site-Id,X-Site-Key");
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
      return res.status(400).json({ error: "ai_copy_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/ai/copy", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Site-Id,X-Site-Key");
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
      return res.status(400).json({ error: "ai_insight_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/ai/insight", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Site-Id,X-Site-Key");
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