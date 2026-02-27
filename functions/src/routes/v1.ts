// functions/src/routes/v1.ts
import type { Express } from "express";
import { z } from "zod";
import { adminDb } from "../services/admin";
import { FieldValue } from "firebase-admin/firestore";
import { pickSiteById, pickWorkspaceById, assertAllowedOrigin } from "../services/site";
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
      const variantId = String(body.variant_id ?? "na") || "na";

      let q = db
        .collection("stats_daily")
        .where("siteId", "==", body.site_id)
        .where("day", "==", body.day)
        .where("variantId", "==", variantId);

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

      const counts = {
        impressions: 0,
        clicks: 0,
        click_links: 0,
        closes: 0,
        conversions: 0,
      };

      for (const doc of snap.docs) {
        const d = doc.data() as any;
        const ev = String(d.event || "");
        const c = Number(d.count || 0);
        if (!c) continue;

        if (ev === "impression") counts.impressions += c;
        else if (ev === "click") counts.clicks += c;
        else if (ev === "click_link") counts.click_links += c;
        else if (ev === "close") counts.closes += c;
        else if (ev === "conversion") counts.conversions += c;
      }

      const metrics = buildMetricsFromCounts(counts);
      const rule = ruleMark({ impressions: metrics.impressions, clicks: metrics.clicks, conversions: metrics.conversions });

      return res.json({
        ok: true,
        site_id: body.site_id,
        day: body.day,
        scope: body.scope,
        scope_id: body.scope_id,
        variant_id: variantId,
        counts,
        metrics,
        rule,
      });
    } catch (e: any) {
      console.error("[/v1/stats/summary] error:", e);
      return res.status(400).json({ error: "stats_summary_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/stats/summary", (req, res) => {
    try {
      corsByAdminOrigins(req, res);
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Site-Id,X-Site-Key");
      res.status(204).send("");
    } catch (e: any) {
      return res.status(403).send(e?.message || "forbidden");
    }
  });

  app.options("/v1/log", async (req, res) => {
    try {
      const site_id = String(req.body?.site_id || "");
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
      return res.status(400).json({ ok: false, error: "ai_review_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/ai/review", (req, res) => {
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