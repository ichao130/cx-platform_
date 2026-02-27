"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerV1Routes = registerV1Routes;
const zod_1 = require("zod");
const admin_1 = require("../services/admin");
const site_1 = require("../services/site");
const openaiCopy_1 = require("../services/openaiCopy");
const experiment_1 = require("../services/experiment");
const openaiJson_1 = require("../services/openaiJson");
const params_1 = require("firebase-functions/params");
/* =========================================
   Schemas
========================================= */
const CopyReqSchema = zod_1.z.object({
    site_id: zod_1.z.string().min(1),
    goal: zod_1.z.string().optional(),
    base_creative: zod_1.z.object({
        title: zod_1.z.string(),
        body: zod_1.z.string(),
        cta: zod_1.z.string(),
        url: zod_1.z.string().optional(),
    }),
    brand_tone: zod_1.z
        .object({
        style: zod_1.z.string().optional(),
        ng_words: zod_1.z.array(zod_1.z.string()).optional(),
        max_chars: zod_1.z
            .object({
            title: zod_1.z.number().optional(),
            body: zod_1.z.number().optional(),
            cta: zod_1.z.number().optional(),
        })
            .optional(),
    })
        .optional(),
});
const LogReqSchema = zod_1.z.object({
    site_id: zod_1.z.string().min(1),
    scenario_id: zod_1.z.string().nullable().optional(),
    action_id: zod_1.z.string().nullable().optional(),
    template_id: zod_1.z.string().nullable().optional(),
    variant_id: zod_1.z.string().nullable().optional(),
    event: zod_1.z.enum(["impression", "click", "click_link", "close", "conversion"]),
    url: zod_1.z.string().nullable().optional(),
    path: zod_1.z.string().nullable().optional(),
    ref: zod_1.z.string().nullable().optional(),
    vid: zod_1.z.string().nullable().optional(),
    sid: zod_1.z.string().nullable().optional(),
});
const AiInsightReqSchema = zod_1.z.object({
    site_id: zod_1.z.string().min(1),
    day: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // "2026-02-26"
    scope: zod_1.z.enum(["site", "scenario", "action"]),
    scope_id: zod_1.z.string().min(1), // siteなら "all" でもOK
    variant_id: zod_1.z.string().nullable().optional(), // null or "v1"
    metrics: zod_1.z.object({
        impressions: zod_1.z.number().nonnegative(),
        clicks: zod_1.z.number().nonnegative(),
        closes: zod_1.z.number().nonnegative().optional().default(0),
        conversions: zod_1.z.number().nonnegative().optional().default(0),
    }),
    context: zod_1.z
        .object({
        scenario_name: zod_1.z.string().optional(),
        action_title: zod_1.z.string().optional(),
        url_hint: zod_1.z.string().optional(),
    })
        .optional(),
});
/* =========================================
   Admin allowlist helpers (for dashboard)
========================================= */
// Param-based config (replaces functions.config())
// Non-secret values are loaded from .env / .env.<projectAlias> etc.
// Secret values are stored in Secret Manager.
const ADMIN_ORIGINS = (0, params_1.defineString)("ADMIN_ORIGINS");
const OPENAI_API_KEY = (0, params_1.defineSecret)("OPENAI_API_KEY");
function parseOriginsEnv(s) {
    return (s || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
}
function hostOf(u) {
    return new URL(u).host;
}
function assertAllowedAdminOrigin(origin) {
    const allowed = parseOriginsEnv(ADMIN_ORIGINS.value());
    const allowedHosts = allowed.map(hostOf);
    const originHost = origin ? hostOf(origin) : "";
    if (originHost && allowedHosts.includes(originHost))
        return;
    throw new Error(`admin origin not allowed (originHost=${originHost})`);
}
/* =========================================
   Small utils
========================================= */
function ruleMark(metrics) {
    const imp = metrics.impressions || 0;
    const clk = metrics.clicks || 0;
    const ctr = imp > 0 ? clk / imp : 0;
    // Phase2: 100 -> 30
    if (imp < 30) {
        return { grade: "need_data", ctr, reasons: ["表示回数が少なく判断材料が不足"] };
    }
    if (ctr < 0.01) {
        return { grade: "bad", ctr, reasons: ["CTRが低い（<1%）", "訴求/配置/クリエイティブ見直し候補"] };
    }
    if (ctr < 0.03) {
        return { grade: "ok", ctr, reasons: ["CTRは平均帯（1〜3%）", "改善余地あり"] };
    }
    return { grade: "good", ctr, reasons: ["CTRが高い（>3%）", "勝ちパターンの可能性"] };
}
/* =========================================
   Route registration
========================================= */
function registerV1Routes(app) {
    /* -----------------------------
       OPTIONS helpers
    ------------------------------ */
    // 共通CORS（site/workspace domains判定用）
    async function corsBySiteDomains(req, res, siteId) {
        const origin = req.header("Origin") || "";
        if (!origin)
            return;
        const site = await (0, site_1.pickSiteById)(siteId);
        if (!site)
            throw new Error("site not found");
        const ws = await (0, site_1.pickWorkspaceById)(site.workspaceId);
        if (!ws)
            throw new Error("workspace not found");
        const allowed = (site.domains && site.domains.length ? site.domains : ws.domains) || [];
        const url = String((req.body?.url ?? req.body?.context?.url_hint ?? req.query?.url ?? "") || "");
        // レスポンス側のCORS
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        // allow判定
        (0, site_1.assertAllowedOrigin)({ allowed, origin, url });
    }
    // 管理画面CORS（ADMIN_ORIGINS判定用）
    function corsByAdminOrigins(req, res) {
        const origin = req.header("Origin") || "";
        if (!origin)
            return;
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
            if (!site_id)
                return res.status(400).json({ error: "site_id required" });
            // CORS + allow
            await corsBySiteDomains(req, res, site_id);
            const site = await (0, site_1.pickSiteById)(site_id);
            if (!site)
                return res.status(404).json({ error: "site not found" });
            // ここはプロジェクト既存の「配信データ組み立て」に合わせて調整
            // とりあえず最低限 site を返す（既存があるなら差し替え）
            return res.json({ ok: true, site });
        }
        catch (e) {
            console.error("[/v1/serve] error:", e);
            return res.status(400).json({ error: "serve_failed", message: e?.message || String(e) });
        }
    });
    app.options("/v1/serve", async (req, res) => {
        try {
            const site_id = String(req.query.site_id || req.body?.site_id || "");
            if (site_id)
                await corsBySiteDomains(req, res, site_id);
            res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Site-Id,X-Site-Key");
            res.status(204).send("");
        }
        catch (e) {
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
            const db = (0, admin_1.adminDb)();
            const now = new Date().toISOString();
            // 例：logs に保存（既存構造があるなら合わせる）
            const payload = {
                ...body,
                createdAt: now,
                updatedAt: now,
            };
            await db.collection("logs").add(payload);
            return res.json({ ok: true });
        }
        catch (e) {
            console.error("[/v1/log] error:", e);
            return res.status(400).json({ error: "log_failed", message: e?.message || String(e) });
        }
    });
    app.options("/v1/log", async (req, res) => {
        try {
            const site_id = String(req.body?.site_id || "");
            if (site_id)
                await corsBySiteDomains(req, res, site_id);
            res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Site-Id,X-Site-Key");
            res.status(204).send("");
        }
        catch (e) {
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
            const site = await (0, site_1.pickSiteById)(body.site_id);
            if (!site)
                return res.status(404).json({ error: "site not found" });
            // 既存ロジック（例）
            const apiKey = OPENAI_API_KEY.value();
            if (!apiKey)
                return res.status(500).json({ error: "missing_openai_api_key" });
            const out = await (0, openaiCopy_1.generateCopy3)({
                apiKey,
                goal: body.goal,
                base_creative: body.base_creative,
                brand_tone: body.brand_tone,
            });
            return res.json({ ok: true, ...out });
        }
        catch (e) {
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
        }
        catch (e) {
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
            const site = await (0, site_1.pickSiteById)(body.site_id);
            if (!site)
                return res.status(404).json({ error: "site not found" });
            const ws = await (0, site_1.pickWorkspaceById)(site.workspaceId);
            if (!ws)
                return res.status(404).json({ error: "workspace not found" });
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
            const db = (0, admin_1.adminDb)();
            const ref = db.collection("ai_insights_daily").doc(docId);
            const snap = await ref.get();
            if (snap.exists) {
                return res.json({ ok: true, cached: true, ...snap.data() });
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
            const out = await (0, openaiJson_1.callOpenAIJson)({
                model: "gpt-4.1-mini",
                input: prompt,
                schema: zod_1.z.object({
                    summary: zod_1.z.string(),
                    bullets: zod_1.z.array(zod_1.z.string()).min(3).max(3),
                    next: zod_1.z.string(),
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
        }
        catch (e) {
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
        }
        catch (e) {
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
            if (!site_id)
                return res.status(400).json({ error: "site_id required" });
            // CORS + allow (public embed side)
            await corsBySiteDomains(req, res, site_id);
            const scenario_id = String(req.query.scenario_id || "");
            if (!scenario_id)
                return res.status(400).json({ error: "scenario_id required" });
            const url = String(req.query.url || "");
            // Stable key for bucketing (prefer vid/sid)
            const key = String(req.query.vid ||
                req.query.sid ||
                req.query.key ||
                req.header("X-Visitor-Id") ||
                req.header("X-Session-Id") ||
                req.ip ||
                "anonymous");
            // Load scenario experiment definition
            const db = (0, admin_1.adminDb)();
            const sSnap = await db.collection("scenarios").doc(scenario_id).get();
            if (!sSnap.exists)
                return res.status(404).json({ error: "scenario not found" });
            const s = (sSnap.data() || {});
            // Try common field names
            const exp = (s.experiment ?? s.ab ?? s.exp ?? s.variants ?? undefined);
            // If no experiment config, return null (caller can fallback)
            if (!exp) {
                return res.json({ ok: true, variant: null, reason: "no_experiment_config" });
            }
            // services/experiment.ts expects (Experiment|undefined, key)
            const v = (0, experiment_1.pickVariant)(exp, key);
            return res.json({ ok: true, variant: v, key, scenario_id, site_id, url });
        }
        catch (e) {
            console.error("[/v1/variant] error:", e);
            return res.status(400).json({ error: "variant_failed", message: e?.message || String(e) });
        }
    });
    app.options("/v1/variant", async (req, res) => {
        try {
            const site_id = String(req.query.site_id || "");
            if (site_id)
                await corsBySiteDomains(req, res, site_id);
            res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Site-Id,X-Site-Key");
            res.status(204).send("");
        }
        catch (e) {
            return res.status(403).send(e?.message || "forbidden");
        }
    });
}
