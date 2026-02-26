// functions/src/routes/v1.ts
import type { Express } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "../services/admin";
import { pickSiteById, pickWorkspaceById, assertAllowedOrigin } from "../services/site";
import { generateCopy3 } from "../services/openaiCopy";
import { pickVariant } from "../services/experiment";

function yyyyMmDdUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function normalizeCreative(creative: Record<string, any>): Record<string, any> {
  const cta_text = creative.cta_text ?? creative.buttonText ?? creative.button_text ?? creative.cta ?? "OK";
  const cta_url = creative.cta_url ?? creative.url ?? creative.href ?? "";
  const cta_url_text = creative.cta_url_text ?? creative.link_text ?? creative.linkText ?? "詳細を見る";
  return {
    title: creative.title ?? "",
    body: creative.body ?? "",
    cta_text,
    cta_url,
    cta_url_text,
    image_url: creative.image_url ?? creative.imageUrl ?? ""
  };
}

function normalizeActions(actions: any[]): any[] {
  if (!Array.isArray(actions)) return [];
  return actions
    .filter(Boolean)
    .map((a) => {
      const type = a.type ?? "modal";
      const creative = normalizeCreative(a.creative ?? a.content ?? {});
      const templateId = a.templateId ?? a.template_id ?? undefined;
      const template = a.template ?? undefined;

      // ★mountを維持（mountが無い古いデータは selector→mount に変換）
      const mount =
        a.mount ??
        (a.selector
          ? { selector: String(a.selector), placement: "append", mode: "shadow" }
          : undefined);

      // ★action_idも将来の集計のため残すの推奨
      const action_id = a.action_id ?? a.actionId ?? a.id ?? undefined;

      return { type, action_id, creative, templateId, template, mount };
    });
}



async function expandScenarioActions(params: { workspaceId: string; scenarioId: string; raw: any }) {
  const db = adminDb();
  const s = { ...params.raw };

  // Preferred: scenario.actions (already expanded)
  const rootActions = Array.isArray(s.actions) ? s.actions : [];
  if (rootActions.length) {
    s.actions = normalizeActions(rootActions);
    s._debug = { picked_actions_from: "scenario.actions", root_actions_len: rootActions.length };
    return s;
  }

  // Next: scenario.actionRefs -> join actions collection
  const refs = Array.isArray(s.actionRefs) ? s.actionRefs : [];
  if (refs.length) {
    const ids = refs.map((r: any) => r.actionId).filter(Boolean);
    const snaps = await Promise.all(ids.map((id: string) => db.collection("actions").doc(id).get()));
    const map: Record<string, any> = {};
    snaps.forEach((snap) => {
      if (snap.exists) map[snap.id] = snap.data();
    });

    const expanded = refs
      .filter((r: any) => r && r.actionId && (r.enabled ?? true))
      .sort((a: any, b: any) => Number(a.order ?? 0) - Number(b.order ?? 0))
      .map((r: any) => {
        const base = map[r.actionId] || {};
        const creative = normalizeCreative({ ...(base.creative || {}), ...(r.overrideCreative || {}) });

        // ★ mount を最優先（actionRef.mount → base.mount → selector変換）
        const mount =
          r.mount ??
          base.mount ??
          (r.selector || base.selector
            ? { selector: String(r.selector || base.selector), placement: "append", mode: "shadow" }
            : undefined);

        return {
          type: r.type || base.type || "modal",
          action_id: base.action_id || r.actionId, // ★ログ/集計用
          templateId: r.templateId || base.templateId || undefined,
          creative,
          mount
        };
      });

    // Attach templates (optional)
    const tplIds: string[] = Array.from(
      new Set(
        expanded
          .map((a: any) => a.templateId)
          .filter((x: any): x is string => typeof x === "string" && !!x)
      )
    );

    if (tplIds.length) {
      const tplSnaps = await Promise.all(tplIds.map((id) => db.collection("templates").doc(id).get()));
      const tplMap: Record<string, any> = {};
      tplSnaps.forEach((t) => {
        if (t.exists) tplMap[t.id] = { template_id: t.id, ...(t.data() || {}) };
      });
      expanded.forEach((a: any) => {
        if (a.templateId && tplMap[a.templateId]) a.template = tplMap[a.templateId];
      });
    }

    s.actions = expanded;
    s._debug = {
      picked_actions_from: "scenario.actionRefs",
      actionRefs_len: refs.length,
      expanded_len: expanded.length
    };
    return s;
  }

  // Legacy: nested entry_rules.actions
  const nestedActions = Array.isArray(s.entry_rules?.actions) ? s.entry_rules.actions : [];
  if (nestedActions.length) {
    s.actions = normalizeActions(nestedActions);
    s._debug = { picked_actions_from: "scenario.entry_rules.actions", nested_actions_len: nestedActions.length };
    return s;
  }

  s.actions = [];
  s._debug = { picked_actions_from: "none", root_actions_len: 0, nested_actions_len: 0, actionRefs_len: 0 };
  return s;
}

export function registerV1Routes(app: Express) {
  app.get("/v1/serve", async (req, res) => {
    try {
      const vid = String(req.query.vid || "");
      const sid = String(req.query.sid || "");

      const siteId = String(req.query.site_id || req.header("X-Site-Id") || "");
      if (!siteId) return res.status(400).json({ error: "site_id required" });

      const url = String(req.query.url || "");
      const origin = req.header("Origin") || "";

      const site = await pickSiteById(siteId);
      if (!site) return res.status(404).json({ error: "site not found" });

      const ws = await pickWorkspaceById(site.workspaceId);
      if (!ws) return res.status(404).json({ error: "workspace not found" });

      // Allowlist uses site.domains (fallback workspace.domains)
      const allowed = (site.domains && site.domains.length ? site.domains : ws.domains) || [];
      assertAllowedOrigin({ allowed, origin, url });

      // Optional public key check
      if (site.publicKey) {
        const key = req.header("X-Site-Key");
        if (!key || key !== site.publicKey) return res.status(403).json({ error: "invalid site key" });
      }

      const db = adminDb();
      const snap = await db
        .collection("scenarios")
        .where("siteId", "==", siteId)
        .where("status", "==", "active")
        .limit(50)
        .get();

      const rows = snap.docs.map((d) => ({ scenario_id: d.id, ...(d.data() as any) }));
      rows.sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0));

      // まず通常の actions 展開
      const expanded = await Promise.all(
        rows.map((r) => expandScenarioActions({ workspaceId: site.workspaceId, scenarioId: r.scenario_id, raw: r }))
      );

      // A/B: scenario単位
      const expandedWithVariant = await Promise.all(
        expanded.map(async (s: any) => {
          const exp = s.experiment;
          if (!exp) return { ...s, variant_id: null };

          const sticky =
            exp?.sticky === "vid"
              ? (vid || sid || siteId)
              : (sid || vid || siteId);

          const v = pickVariant(exp, `${siteId}__${s.scenario_id}__${sticky}`);
          if (!v) return { ...s, variant_id: null };

          // variant 側に actionRefs があるならそっちを優先して actions を作る
          if (Array.isArray(v.actionRefs) && v.actionRefs.length) {
            const tmp = { ...s, actionRefs: v.actionRefs, actions: [] };
            const reExpanded = await expandScenarioActions({
              workspaceId: site.workspaceId,
              scenarioId: s.scenario_id,
              raw: tmp
            });
            return {
              ...reExpanded,
              variant_id: v.id,
              variant_name: v.name || v.id,
              _debug: { ...(reExpanded._debug || {}), picked_variant_actionRefs: true }
            };
          }

          // variant.actions（展開済み運用）
          if (Array.isArray(v.actions) && v.actions.length) {
            return {
              ...s,
              variant_id: v.id,
              variant_name: v.name || v.id,
              actions: normalizeActions(v.actions),
              _debug: { ...(s._debug || {}), picked_variant_actions: true }
            };
          }

          return { ...s, variant_id: v.id, variant_name: v.name || v.id };
        })
      );

      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
      }

      return res.json({
        site_id: siteId,
        server_time: new Date().toISOString(),
        cache_ttl_sec: 300,
        defaults:
          site.defaults ||
          ws.defaults || {
            ai: { decision: false, copy: "approve", discovery: "suggest" },
            log_sample_rate: 1.0
          },
        scenarios: expandedWithVariant
      });
    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: "serve_failed", message: e?.message || String(e) });
    }
  });

  app.options("/v1/serve", (req, res) => {
    const origin = req.header("Origin") || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Site-Id,X-Site-Key");
    res.setHeader("Vary", "Origin");
    res.status(204).send("");
  });

  app.post("/v1/ai/copy", async (req, res) => {
    try {
      const body = CopyReqSchema.parse(req.body);

      const site = await pickSiteById(body.site_id);
      if (!site) return res.status(404).json({ error: "site not found" });

      const apiKey = process.env.OPENAI_API_KEY || "";
      if (!apiKey) return res.status(500).json({ error: "missing_openai_api_key" });

      const out = await generateCopy3({
        apiKey,
        goal: body.goal,
        base_creative: body.base_creative,
        brand_tone: body.brand_tone
      });

      return res.json(out);
    } catch (e: any) {
      console.error(e);
      const msg = e?.issues ? e.issues : e?.message || String(e);
      return res.status(400).json({ error: "copy_failed", message: msg });
    }
  });

  // -------------------- Logging (beta) --------------------
  app.post("/v1/log", async (req, res) => {
    try {
      const body = LogReqSchema.parse(req.body);

      const site = await pickSiteById(body.site_id);
      if (!site) return res.status(404).json({ error: "site not found" });

      const ws = await pickWorkspaceById(site.workspaceId);
      if (!ws) return res.status(404).json({ error: "workspace not found" });

      const origin = req.header("Origin") || "";
      const allowed = (site.domains && site.domains.length ? site.domains : ws.domains) || [];
      assertAllowedOrigin({ allowed, origin, url: body.url || "" });

      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
      }

      const db = adminDb();
      const now = new Date();
      const day = yyyyMmDdUTC(now);

      const sampleRate = Number(site.defaults?.log_sample_rate ?? 1);
      const shouldStoreRaw = !(sampleRate >= 0 && sampleRate < 1) || Math.random() < sampleRate;

      if (shouldStoreRaw) {
        await db.collection("events").add({
          siteId: body.site_id,
          workspaceId: site.workspaceId,
          scenarioId: body.scenario_id || null,
          actionId: body.action_id || null,
          templateId: body.template_id || null,
          variantId: body.variant_id || null,
          event: body.event,
          url: body.url || null,
          path: body.path || null,
          ref: body.ref || null,
          vid: body.vid || null,
          sid: body.sid || null,
          createdAt: FieldValue.serverTimestamp()
        });
      }

      // Aggregate counters (always)
      const statId = `${body.site_id}__${day}__${body.scenario_id || "na"}__${body.action_id || "na"}__${body.event}__${body.variant_id || "na"}`;
      await db
        .collection("stats_daily")
        .doc(statId)
        .set(
          {
            siteId: body.site_id,
            day,
            scenarioId: body.scenario_id || null,
            actionId: body.action_id || null,
            variantId: body.variant_id || null,
            event: body.event,
            count: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );

      return res.json({ ok: true });
    } catch (e: any) {
      console.error(e);
      const msg = e?.issues ? e.issues : e?.message || String(e);
      return res.status(400).json({ error: "log_failed", message: msg });
    }
  });

  app.options("/v1/log", (req, res) => {
    const origin = req.header("Origin") || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Site-Id,X-Site-Key");
    res.setHeader("Vary", "Origin");
    res.status(204).send("");
  });
}

const CopyReqSchema = z.object({
  site_id: z.string().min(1),
  goal: z.string().optional(),
  base_creative: z.object({
    title: z.string(),
    body: z.string(),
    cta: z.string(),
    url: z.string().optional()
  }),
  brand_tone: z
    .object({
      style: z.string().optional(),
      ng_words: z.array(z.string()).optional(),
      max_chars: z
        .object({
          title: z.number().optional(),
          body: z.number().optional(),
          cta: z.number().optional()
        })
        .optional()
    })
    .optional()
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