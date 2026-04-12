"use strict";
// functions/src/routes/mcp.ts
// MCP (Model Context Protocol) Streamable HTTP transport
// Claude Desktop / Cursor / 任意のMCPクライアントから接続できる
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMcpRoutes = registerMcpRoutes;
const admin_1 = require("../services/admin");
const auth_1 = require("firebase-admin/auth");
// ── ツール定義 ──────────────────────────────────────────────────────
const TOOLS = [
    // ── 参照系 ──
    {
        name: "list_sites",
        description: "アクセス可能なサイトの一覧を返します。",
        inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
        name: "list_scenarios",
        description: "指定サイトのシナリオ一覧を返します。",
        inputSchema: {
            type: "object",
            properties: { site_id: { type: "string", description: "サイトID" } },
            required: ["site_id"],
        },
    },
    {
        name: "list_actions",
        description: "指定サイトのアクション一覧を返します。シナリオに紐付けるアクションIDを確認するために使います。",
        inputSchema: {
            type: "object",
            properties: { site_id: { type: "string", description: "サイトID" } },
            required: ["site_id"],
        },
    },
    // ── レポート系 ──
    {
        name: "get_report",
        description: "指定したサイト・期間のレポートを取得します。PV数、CV数、CVR、売上、購入件数などのサマリーが得られます。",
        inputSchema: {
            type: "object",
            properties: {
                site_id: { type: "string", description: "サイトID" },
                day_from: { type: "string", description: "集計開始日 (YYYY-MM-DD)" },
                day_to: { type: "string", description: "集計終了日 (YYYY-MM-DD)" },
            },
            required: ["site_id", "day_from", "day_to"],
        },
    },
    {
        name: "get_scenario_stats",
        description: "シナリオ別のインプレッション数・クリック数・CTR・CV数・CVRを返します。どの施策が効いているか確認できます。",
        inputSchema: {
            type: "object",
            properties: {
                site_id: { type: "string", description: "サイトID" },
                day_from: { type: "string", description: "集計開始日 (YYYY-MM-DD)" },
                day_to: { type: "string", description: "集計終了日 (YYYY-MM-DD)" },
            },
            required: ["site_id", "day_from", "day_to"],
        },
    },
    {
        name: "get_top_pages",
        description: "PV数の多いページランキングを返します。",
        inputSchema: {
            type: "object",
            properties: {
                site_id: { type: "string", description: "サイトID" },
                day_from: { type: "string", description: "集計開始日 (YYYY-MM-DD)" },
                day_to: { type: "string", description: "集計終了日 (YYYY-MM-DD)" },
                limit: { type: "number", description: "取得件数（デフォルト10）" },
            },
            required: ["site_id", "day_from", "day_to"],
        },
    },
    // ── 作成・更新系 ──
    {
        name: "create_action",
        description: "新しいアクション（ポップアップ・バナー等）を作成します。作成後にシナリオに紐付けてください。",
        inputSchema: {
            type: "object",
            properties: {
                site_id: { type: "string", description: "サイトID" },
                name: { type: "string", description: "アクション名（管理用）" },
                type: { type: "string", description: "表示形式: modal / banner / toast / launcher", enum: ["modal", "banner", "toast", "launcher"] },
                title: { type: "string", description: "タイトルテキスト" },
                body: { type: "string", description: "本文テキスト" },
                cta_url: { type: "string", description: "ボタンのリンク先URL" },
                cta_url_text: { type: "string", description: "ボタンのラベル（例: 詳細を見る）" },
                image_url: { type: "string", description: "画像URL（任意）" },
            },
            required: ["site_id", "name", "type"],
        },
    },
    {
        name: "update_action",
        description: "既存のアクションを更新します。指定したフィールドだけ上書きします。",
        inputSchema: {
            type: "object",
            properties: {
                action_id: { type: "string", description: "アクションID" },
                name: { type: "string", description: "アクション名" },
                title: { type: "string", description: "タイトルテキスト" },
                body: { type: "string", description: "本文テキスト" },
                cta_url: { type: "string", description: "ボタンのリンク先URL" },
                cta_url_text: { type: "string", description: "ボタンのラベル" },
                image_url: { type: "string", description: "画像URL" },
                status: { type: "string", description: "ステータス: active / paused", enum: ["active", "paused"] },
            },
            required: ["action_id"],
        },
    },
    {
        name: "create_scenario",
        description: "新しいシナリオを作成してアクションと紐付けます。アクションIDは list_actions で確認してください。",
        inputSchema: {
            type: "object",
            properties: {
                site_id: { type: "string", description: "サイトID" },
                name: { type: "string", description: "シナリオ名" },
                action_ids: { type: "array", items: { type: "string" }, description: "紐付けるアクションIDの配列" },
                trigger_type: { type: "string", description: "トリガー種別: stay（滞在）/ scroll（スクロール）/ cart_add（カート追加）", enum: ["stay", "scroll", "cart_add"] },
                stay_sec: { type: "number", description: "滞在秒数（trigger_type=stay の場合。デフォルト3）" },
                status: { type: "string", description: "active（配信中）/ paused（停止）", enum: ["active", "paused"] },
                priority: { type: "number", description: "優先度（数値が大きいほど優先。デフォルト0）" },
                url_contains: { type: "string", description: "配信URLの条件（部分一致。未指定=全ページ）" },
            },
            required: ["site_id", "name", "action_ids"],
        },
    },
    {
        name: "update_scenario",
        description: "既存のシナリオを更新します。ステータス変更（配信ON/OFF）や設定変更に使います。",
        inputSchema: {
            type: "object",
            properties: {
                scenario_id: { type: "string", description: "シナリオID" },
                name: { type: "string", description: "シナリオ名" },
                status: { type: "string", description: "active（配信中）/ paused（停止）", enum: ["active", "paused"] },
                priority: { type: "number", description: "優先度" },
                action_ids: { type: "array", items: { type: "string" }, description: "紐付けるアクションIDの配列（上書き）" },
                url_contains: { type: "string", description: "配信URLの条件（部分一致）" },
                stay_sec: { type: "number", description: "滞在秒数" },
            },
            required: ["scenario_id"],
        },
    },
];
// ── 認証 ──────────────────────────────────────────────────────────
async function verifyAuth(req) {
    const db = (0, admin_1.adminDb)();
    // Authorization ヘッダーから値を取り出す（"Bearer " あり・なし両対応）
    const authHeader = (req.headers.authorization || "").trim();
    const headerValue = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : authHeader;
    // ① ヘッダー値が API キー（"mcp_" で始まる）
    if (headerValue.startsWith("mcp_")) {
        const keyDoc = await db.collection("mcp_api_keys").doc(headerValue).get();
        if (keyDoc.exists)
            return String(keyDoc.data().uid || "") || null;
    }
    // ② ヘッダー値が Firebase ID トークン
    if (headerValue) {
        try {
            const decoded = await (0, auth_1.getAuth)().verifyIdToken(headerValue);
            return decoded.uid;
        }
        catch { }
    }
    // ③ クエリパラメータ ?key=XXX（APIキー）
    const queryKey = String(req.query.key || "").trim();
    if (queryKey) {
        const keyDoc = await db.collection("mcp_api_keys").doc(queryKey).get();
        if (keyDoc.exists)
            return String(keyDoc.data().uid || "") || null;
    }
    return null;
}
// ── ツール実行 ────────────────────────────────────────────────────
async function executeTool(name, args, uid) {
    const db = (0, admin_1.adminDb)();
    // ── サイト一覧 ─────────────────────────────────────────────────────
    if (name === "list_sites") {
        const snap = await db.collection("sites").where("memberUids", "array-contains", uid).get();
        const sites = snap.docs.map((d) => {
            const data = d.data();
            return { id: d.id, name: data.name || d.id, domains: data.domains || [], workspaceId: data.workspaceId || "" };
        });
        if (!sites.length)
            return "アクセス可能なサイトはありません。";
        return sites
            .map((s) => `• ${s.name} (ID: ${s.id}) — ${s.domains.join(", ") || "ドメイン未設定"}`)
            .join("\n");
    }
    // ── アクセス権チェックヘルパー ─────────────────────────────────────
    async function getSiteAndWorkspace(siteId) {
        const siteDoc = await db.collection("sites").doc(siteId).get();
        if (!siteDoc.exists)
            return null;
        const data = siteDoc.data();
        const memberUids = Array.isArray(data.memberUids) ? data.memberUids : [];
        if (!memberUids.includes(uid))
            return null;
        return { workspaceId: String(data.workspaceId || "") };
    }
    // ── シナリオ一覧 ────────────────────────────────────────────────────
    if (name === "list_scenarios") {
        const { site_id } = args;
        const snap = await db.collection("scenarios").where("siteId", "==", site_id).get();
        const rows = snap.docs
            .filter((d) => d.data().status !== "deleted")
            .map((d) => {
            const data = d.data();
            const actionIds = (data.actionRefs || []).map((r) => r.actionId).filter(Boolean);
            return { id: d.id, name: data.name || d.id, status: data.status || "unknown", priority: data.priority ?? 0, actionIds };
        });
        if (!rows.length)
            return `サイト ${site_id} にシナリオはありません。`;
        return rows
            .map((r) => `• [${r.status}] ${r.name} (ID: ${r.id}, priority: ${r.priority}, actions: ${r.actionIds.join(", ") || "なし"})`)
            .join("\n");
    }
    // ── アクション一覧 ─────────────────────────────────────────────────
    if (name === "list_actions") {
        const { site_id } = args;
        const site = await getSiteAndWorkspace(site_id);
        if (!site)
            return `サイト ${site_id} へのアクセス権がありません。`;
        const snap = await db.collection("actions").where("siteId", "==", site_id).get();
        const rows = snap.docs
            .filter((d) => d.data().status !== "deleted")
            .map((d) => {
            const data = d.data();
            return { id: d.id, name: data.name || d.id, type: data.type || "modal", status: data.status || "active" };
        });
        if (!rows.length)
            return `サイト ${site_id} にアクションはありません。`;
        return rows
            .map((r) => `• [${r.type}] ${r.name} (ID: ${r.id}, status: ${r.status})`)
            .join("\n");
    }
    // ── アクション作成 ─────────────────────────────────────────────────
    if (name === "create_action") {
        const { site_id, name: actionName, type = "modal", title, body, cta_url, cta_url_text, image_url } = args;
        const site = await getSiteAndWorkspace(site_id);
        if (!site)
            return `サイト ${site_id} へのアクセス権がありません。`;
        const { randomBytes } = await Promise.resolve().then(() => __importStar(require("crypto")));
        const actionId = "act_" + randomBytes(8).toString("hex");
        const payload = {
            workspaceId: site.workspaceId,
            siteId: site_id,
            name: actionName,
            type,
            status: "active",
            creative: {
                title: title || "",
                body: body || "",
                cta_url: cta_url || "",
                cta_url_text: cta_url_text || "詳細を見る",
                ...(image_url ? { image_url } : {}),
            },
            mount: { selector: "body", placement: "append", mode: "shadow" },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await db.collection("actions").doc(actionId).set(payload);
        return `✅ アクションを作成しました。\nID: ${actionId}\n名前: ${actionName}\n種別: ${type}\n\nシナリオに紐付けるには create_scenario または update_scenario で action_ids に "${actionId}" を指定してください。`;
    }
    // ── アクション更新 ─────────────────────────────────────────────────
    if (name === "update_action") {
        const { action_id, name: actionName, title, body, cta_url, cta_url_text, image_url, status } = args;
        const actionDoc = await db.collection("actions").doc(action_id).get();
        if (!actionDoc.exists)
            return `アクション ${action_id} が見つかりません。`;
        // アクセス権チェック
        const data = actionDoc.data();
        const site = await getSiteAndWorkspace(data.siteId);
        if (!site)
            return `アクション ${action_id} へのアクセス権がありません。`;
        const update = { updatedAt: new Date().toISOString() };
        if (actionName !== undefined)
            update.name = actionName;
        if (status !== undefined)
            update.status = status;
        // creative フィールドはマージ更新
        const creativeUpdate = {};
        if (title !== undefined)
            creativeUpdate["creative.title"] = title;
        if (body !== undefined)
            creativeUpdate["creative.body"] = body;
        if (cta_url !== undefined)
            creativeUpdate["creative.cta_url"] = cta_url;
        if (cta_url_text !== undefined)
            creativeUpdate["creative.cta_url_text"] = cta_url_text;
        if (image_url !== undefined)
            creativeUpdate["creative.image_url"] = image_url;
        await db.collection("actions").doc(action_id).update({ ...update, ...creativeUpdate });
        return `✅ アクション "${data.name}" を更新しました。(ID: ${action_id})`;
    }
    // ── シナリオ作成 ───────────────────────────────────────────────────
    if (name === "create_scenario") {
        const { site_id, name: scenarioName, action_ids = [], trigger_type = "stay", stay_sec = 3, status = "active", priority = 0, url_contains } = args;
        const site = await getSiteAndWorkspace(site_id);
        if (!site)
            return `サイト ${site_id} へのアクセス権がありません。`;
        const { randomBytes } = await Promise.resolve().then(() => __importStar(require("crypto")));
        const scenarioId = "scn_" + randomBytes(8).toString("hex");
        const staySec = Number(stay_sec) || 3;
        const actionRefs = action_ids.map((aid, i) => ({ actionId: aid, enabled: true, order: i }));
        const urlRules = url_contains ? [{ op: "contains", value: url_contains }] : [];
        const payload = {
            workspaceId: site.workspaceId,
            siteId: site_id,
            name: scenarioName,
            status,
            priority: Number(priority),
            memo: "",
            actionRefs,
            entry_rules: {
                page: { urls: urlRules.length > 0 ? urlRules : undefined },
                behavior: { stay_gte_sec: trigger_type === "cart_add" ? 0 : staySec },
                trigger: trigger_type === "cart_add"
                    ? { type: "cart_add", ms: 0 }
                    : { type: trigger_type === "scroll" ? "scroll" : "stay", ms: staySec * 1000 },
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await db.collection("scenarios").doc(scenarioId).set(payload);
        return [
            `✅ シナリオを作成しました。`,
            `ID: ${scenarioId}`,
            `名前: ${scenarioName}`,
            `ステータス: ${status}`,
            `トリガー: ${trigger_type}（${staySec}秒）`,
            `アクション: ${action_ids.join(", ") || "なし"}`,
            url_contains ? `URL条件: 含む「${url_contains}」` : "URL条件: 全ページ",
        ].join("\n");
    }
    // ── シナリオ更新 ───────────────────────────────────────────────────
    if (name === "update_scenario") {
        const { scenario_id, name: scenarioName, status, priority, action_ids, url_contains, stay_sec } = args;
        const scenarioDoc = await db.collection("scenarios").doc(scenario_id).get();
        if (!scenarioDoc.exists)
            return `シナリオ ${scenario_id} が見つかりません。`;
        const data = scenarioDoc.data();
        const site = await getSiteAndWorkspace(data.siteId);
        if (!site)
            return `シナリオ ${scenario_id} へのアクセス権がありません。`;
        const update = { updatedAt: new Date().toISOString() };
        if (scenarioName !== undefined)
            update.name = scenarioName;
        if (status !== undefined)
            update.status = status;
        if (priority !== undefined)
            update.priority = Number(priority);
        if (action_ids !== undefined) {
            update.actionRefs = action_ids.map((aid, i) => ({ actionId: aid, enabled: true, order: i }));
        }
        if (url_contains !== undefined) {
            update["entry_rules.page.urls"] = url_contains ? [{ op: "contains", value: url_contains }] : [];
        }
        if (stay_sec !== undefined) {
            const ms = Number(stay_sec) * 1000;
            update["entry_rules.behavior.stay_gte_sec"] = Number(stay_sec);
            update["entry_rules.trigger.ms"] = ms;
        }
        await db.collection("scenarios").doc(scenario_id).update(update);
        const changedFields = Object.keys(update).filter((k) => k !== "updatedAt").join(", ");
        return `✅ シナリオ "${data.name}" を更新しました。\n変更フィールド: ${changedFields}`;
    }
    if (name === "get_report") {
        const { site_id, day_from, day_to } = args;
        const statsSnap = await db
            .collection("stats_daily")
            .where("siteId", "==", site_id)
            .where("day", ">=", day_from)
            .where("day", "<=", day_to)
            .get();
        const stats = {};
        for (const d of statsSnap.docs) {
            const data = d.data();
            const event = data.event || "unknown";
            stats[event] = (stats[event] || 0) + (Number(data.count) || 0);
        }
        const pv = stats["pageview"] || 0;
        const imp = stats["impression"] || 0;
        const click = stats["click"] || 0;
        const cv = stats["conversion"] || 0;
        const ctr = imp > 0 ? ((click / imp) * 100).toFixed(1) : "—";
        const cvr = imp > 0 ? ((cv / imp) * 100).toFixed(1) : "—";
        // 購入ログから売上集計
        const purchaseSnap = await db
            .collection("logs")
            .where("site_id", "==", site_id)
            .where("event", "==", "purchase")
            .where("createdAt", ">=", day_from)
            .where("createdAt", "<=", day_to + "T23:59:59Z")
            .get();
        const revenue = purchaseSnap.docs.reduce((s, d) => s + (Number(d.data().revenue) || 0), 0);
        const purchaseCount = purchaseSnap.size;
        return [
            `📊 レポート: ${site_id} (${day_from} 〜 ${day_to})`,
            ``,
            `【トラフィック】`,
            `  PV数: ${pv.toLocaleString()}`,
            `  シナリオ表示: ${imp.toLocaleString()}`,
            `  クリック: ${click.toLocaleString()}  CTR: ${ctr}%`,
            `  CV: ${cv.toLocaleString()}  CVR: ${cvr}%`,
            ``,
            `【売上】`,
            `  購入件数: ${purchaseCount.toLocaleString()}件`,
            `  売上合計: ¥${revenue.toLocaleString()}`,
            purchaseCount > 0
                ? `  客単価: ¥${Math.round(revenue / purchaseCount).toLocaleString()}`
                : "",
        ]
            .filter((l) => l !== undefined)
            .join("\n");
    }
    if (name === "get_scenario_stats") {
        const { site_id, day_from, day_to } = args;
        const statsSnap = await db
            .collection("stats_daily")
            .where("siteId", "==", site_id)
            .where("day", ">=", day_from)
            .where("day", "<=", day_to)
            .get();
        // scenario_id × event で集計
        const map = new Map();
        for (const d of statsSnap.docs) {
            const data = d.data();
            const sid = data.scenario_id || "(シナリオなし)";
            const event = data.event || "unknown";
            if (!map.has(sid))
                map.set(sid, {});
            const m = map.get(sid);
            m[event] = (m[event] || 0) + (Number(data.count) || 0);
        }
        if (!map.size)
            return `期間内のシナリオデータがありません（${day_from} 〜 ${day_to}）。`;
        // シナリオ名を取得
        const scenariosSnap = await db
            .collection("scenarios")
            .where("siteId", "==", site_id)
            .get();
        const nameMap = new Map();
        for (const d of scenariosSnap.docs) {
            nameMap.set(d.id, d.data().name || d.id);
        }
        const lines = [`📈 シナリオ別成果: ${site_id} (${day_from} 〜 ${day_to})`, ``];
        const rows = Array.from(map.entries()).sort((a, b) => (b[1]["impression"] || 0) - (a[1]["impression"] || 0));
        for (const [sid, m] of rows) {
            const imp = m["impression"] || 0;
            const click = m["click"] || 0;
            const cv = m["conversion"] || 0;
            const ctr = imp > 0 ? ((click / imp) * 100).toFixed(1) : "—";
            const cvr = imp > 0 ? ((cv / imp) * 100).toFixed(1) : "—";
            const name = nameMap.get(sid) || sid;
            lines.push(`■ ${name}`);
            lines.push(`  表示: ${imp}  クリック: ${click} (CTR ${ctr}%)  CV: ${cv} (CVR ${cvr}%)`);
        }
        return lines.join("\n");
    }
    if (name === "get_top_pages") {
        const { site_id, day_from, day_to, limit = 10 } = args;
        const statsSnap = await db
            .collection("stats_daily")
            .where("siteId", "==", site_id)
            .where("day", ">=", day_from)
            .where("day", "<=", day_to)
            .where("event", "==", "pageview")
            .get();
        const pageMap = new Map();
        for (const d of statsSnap.docs) {
            const data = d.data();
            const path = data.path || data.page || "(不明)";
            pageMap.set(path, (pageMap.get(path) || 0) + (Number(data.count) || 0));
        }
        if (!pageMap.size)
            return "期間内のページビューデータがありません。";
        const sorted = Array.from(pageMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
        const lines = [`🏆 人気ページ TOP${sorted.length}: ${site_id} (${day_from} 〜 ${day_to})`, ``];
        sorted.forEach(([path, count], i) => {
            lines.push(`${i + 1}. ${path}  — ${count.toLocaleString()} PV`);
        });
        return lines.join("\n");
    }
    return `ツール "${name}" は未実装です。`;
}
// ── MCPルート登録 ─────────────────────────────────────────────────
function registerMcpRoutes(app) {
    // CORS プリフライト
    app.options("/mcp", (_req, res) => {
        res.set({
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        });
        res.sendStatus(204);
    });
    // MCP エンドポイント (Streamable HTTP transport)
    app.post("/mcp", async (req, res) => {
        res.set({
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        });
        const body = req.body;
        const { jsonrpc, id, method, params } = body;
        if (jsonrpc !== "2.0") {
            return res.status(400).json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid JSON-RPC version" } });
        }
        // ── initialize ──
        if (method === "initialize") {
            return res.json({
                jsonrpc: "2.0",
                id,
                result: {
                    protocolVersion: "2024-11-05",
                    capabilities: { tools: {} },
                    serverInfo: { name: "mokkeda-mcp", version: "1.0.0" },
                },
            });
        }
        // ── notifications/initialized (レスポンス不要) ──
        if (method === "notifications/initialized") {
            return res.status(204).end();
        }
        // ── tools/list ──
        if (method === "tools/list") {
            return res.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
        }
        // ── tools/call ──
        if (method === "tools/call") {
            const uid = await verifyAuth(req);
            if (!uid) {
                return res.json({
                    jsonrpc: "2.0", id,
                    result: {
                        content: [{ type: "text", text: "認証エラー: Firebase IDトークンが必要です。Claude Desktopの設定でAuthorizationヘッダーを確認してください。" }],
                        isError: true,
                    },
                });
            }
            const toolName = params?.name || "";
            const toolArgs = params?.arguments || {};
            try {
                const result = await executeTool(toolName, toolArgs, uid);
                return res.json({
                    jsonrpc: "2.0", id,
                    result: { content: [{ type: "text", text: result }] },
                });
            }
            catch (e) {
                return res.json({
                    jsonrpc: "2.0", id,
                    result: {
                        content: [{ type: "text", text: `エラーが発生しました: ${e?.message || String(e)}` }],
                        isError: true,
                    },
                });
            }
        }
        return res.json({
            jsonrpc: "2.0", id,
            error: { code: -32601, message: `Method not found: ${method}` },
        });
    });
    // ヘルスチェック（MCPエンドポイントの疎通確認用）
    app.get("/mcp", (_req, res) => {
        res.json({
            ok: true,
            name: "mokkeda-mcp",
            version: "1.0.0",
            tools: TOOLS.map((t) => t.name),
        });
    });
}
