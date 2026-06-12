"use strict";
// functions/src/routes/shopify.ts
// Shopify OAuth + ScriptTag + Web Pixel 自動セットアップ
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
exports.registerShopifyRoutes = registerShopifyRoutes;
const admin_1 = require("../services/admin");
const firestore_1 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
const crypto = __importStar(require("crypto"));
const SHOPIFY_API_KEY = (0, params_1.defineString)("SHOPIFY_API_KEY");
const SHOPIFY_API_SECRET = (0, params_1.defineString)("SHOPIFY_API_SECRET");
const SHOPIFY_APP_URL = (0, params_1.defineString)("SHOPIFY_APP_URL"); // Cloud Functions URL（OAuthコールバック用）
const SHOPIFY_SDK_URL = "https://cx-platform-v1.web.app"; // SDK配信URL（Firebase Hosting）
const SHOPIFY_SCOPES = "write_script_tags,read_script_tags,write_pixels";
const ADMIN_APP_URL = "https://cx-platform-v1.web.app";
// ---- helpers ----
function hmacValid(query, secret) {
    const { hmac, ...rest } = query;
    if (!hmac)
        return false;
    const msg = Object.keys(rest).sort().map((k) => `${k}=${rest[k]}`).join("&");
    const digest = crypto.createHmac("sha256", secret).update(msg).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}
async function shopifyFetch(shop, token, path, body) {
    const res = await fetch(`https://${shop}/admin/api/2024-01/${path}`, {
        method: body ? "POST" : "GET",
        headers: {
            "X-Shopify-Access-Token": token,
            "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json();
    if (!res.ok) {
        console.error(`[shopifyFetch] ${res.status} ${path}`, JSON.stringify(json));
        throw new Error(`Shopify API error ${res.status}: ${JSON.stringify(json)}`);
    }
    return json;
}
// ---- ScriptTag 注入 ----
async function injectScriptTag(shop, token, siteId, siteKey) {
    const src = `${SHOPIFY_SDK_URL}/sdk.js?site_id=${encodeURIComponent(siteId)}&site_key=${encodeURIComponent(siteKey)}`;
    // 既存タグを確認（重複防止）
    const existing = await shopifyFetch(shop, token, "script_tags.json");
    const tags = existing.script_tags || [];
    const already = tags.find((t) => t.src && t.src.includes("sdk.js") && t.src.includes(siteId));
    if (already)
        return already;
    return shopifyFetch(shop, token, "script_tags.json", {
        script_tag: { event: "onload", src },
    });
}
// ---- GraphQL ヘルパー ----
async function shopifyGraphQL(shop, token, query, variables) {
    const res = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
        method: "POST",
        headers: {
            "X-Shopify-Access-Token": token,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (!res.ok)
        throw new Error(`GraphQL HTTP error ${res.status}: ${JSON.stringify(json)}`);
    if (json.errors)
        throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
    return json.data;
}
// ---- Web Pixel 登録（GraphQL Admin API + write_pixels スコープ必須）----
// 初回: webPixelCreate → 既存あり: webPixelUpdate（settings に siteId/siteKey を注入）
// スクリプト本体は extensions/web-pixel/src/index.js（shopify app deploy で配備済み）
async function registerWebPixel(shop, token, siteId, siteKey) {
    const settings = JSON.stringify({ siteId, siteKey });
    // 既存ピクセル確認
    let existingId = null;
    try {
        const checkData = await shopifyGraphQL(shop, token, `{ webPixel { id settings } }`);
        existingId = checkData?.webPixel?.id || null;
    }
    catch (e) {
        console.warn(`[shopify] webPixel check failed: ${e.message}`);
    }
    if (existingId) {
        // settings を最新に更新
        const data = await shopifyGraphQL(shop, token, `
      mutation webPixelUpdate($webPixel: WebPixelInput!) {
        webPixelUpdate(webPixel: $webPixel) {
          userErrors { code field message }
          webPixel { id settings }
        }
      }
    `, { webPixel: { settings } });
        const errors = data?.webPixelUpdate?.userErrors;
        if (errors?.length > 0)
            throw new Error(`webPixelUpdate errors: ${JSON.stringify(errors)}`);
        console.log(`[shopify] webPixel updated: ${shop} id=${existingId}`);
    }
    else {
        // 新規登録
        const data = await shopifyGraphQL(shop, token, `
      mutation webPixelCreate($webPixel: WebPixelInput!) {
        webPixelCreate(webPixel: $webPixel) {
          userErrors { code field message }
          webPixel { id settings }
        }
      }
    `, { webPixel: { settings } });
        const errors = data?.webPixelCreate?.userErrors;
        if (errors?.length > 0)
            throw new Error(`webPixelCreate errors: ${JSON.stringify(errors)}`);
        console.log(`[shopify] webPixel created: ${shop} id=${data?.webPixelCreate?.webPixel?.id}`);
    }
}
// ---- Session Token 検証（App Bridge 3.x / HS256）----
function decodeSessionToken(token, secret) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3)
            return null;
        const sig = crypto
            .createHmac("sha256", secret)
            .update(parts[0] + "." + parts[1])
            .digest("base64")
            .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        if (sig !== parts[2])
            return null;
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
        const shop = String(payload.dest || "").replace(/^https?:\/\//, "");
        if (!shop)
            return null;
        return { shop };
    }
    catch {
        return null;
    }
}
// ---- ルート登録 ----
function registerShopifyRoutes(app) {
    // ① Session Token → Offline Token 交換（App Bridge連携）
    app.post("/shopify/token-exchange", async (req, res) => {
        const { session_token } = req.body || {};
        if (!session_token) {
            res.status(400).json({ error: "session_token required" });
            return;
        }
        // セッショントークンを検証してshopを取得
        const decoded = decodeSessionToken(session_token, SHOPIFY_API_SECRET.value());
        if (!decoded) {
            res.status(401).json({ error: "Invalid session token" });
            return;
        }
        const shop = decoded.shop;
        // Session Token → 期限付きOffline Token に交換
        const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: SHOPIFY_API_KEY.value(),
                client_secret: SHOPIFY_API_SECRET.value(),
                grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
                subject_token: session_token,
                subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
                requested_token_type: "urn:shopify:params:oauth:token-type:online-access-token",
            }),
        });
        const tokenJson = await tokenRes.json();
        if (!tokenRes.ok || !tokenJson.access_token) {
            console.error("[shopify] token-exchange failed:", JSON.stringify(tokenJson));
            res.status(400).json({ error: "Token exchange failed: " + JSON.stringify(tokenJson) });
            return;
        }
        const newToken = tokenJson.access_token;
        const expiresIn = tokenJson.expires_in || 86400;
        const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
        console.log(`[shopify] token-exchange success: ${shop}, expires_in=${expiresIn}s`);
        // Firestoreにトークンと期限を保存・更新
        const db = (0, admin_1.adminDb)();
        const storeId = shop.replace(".myshopify.com", "");
        const storeRef = db.collection("shopify_stores").doc(storeId);
        await storeRef.set({
            shop, accessToken: newToken,
            tokenUpdatedAt: new Date().toISOString(),
            tokenExpiresAt,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        // siteId があればScriptTagを注入
        const storeDoc = await storeRef.get();
        const siteId = storeDoc.exists ? storeDoc.data()?.siteId : null;
        let scriptTagOk = false;
        let scriptTagError = "";
        if (siteId) {
            const siteDoc = await db.collection("sites").doc(siteId).get();
            const siteKey = siteDoc.exists ? siteDoc.data()?.publicKey || "" : "";
            const src = `${SHOPIFY_SDK_URL}/sdk.js?site_id=${encodeURIComponent(siteId)}&site_key=${encodeURIComponent(siteKey)}`;
            // ① まずOffline Tokenで試みる
            try {
                await injectScriptTag(shop, newToken, siteId, siteKey);
                scriptTagOk = true;
                console.log(`[shopify] ScriptTag injected via offline token: ${shop}`);
            }
            catch (e) {
                scriptTagError = "offline_token: " + e.message;
                console.warn(`[shopify] offline token failed, trying session token: ${e.message}`);
                // ② 失敗したらSession Tokenで直接試みる（session tokenはexpiringなのでAdmin APIが受け付ける可能性あり）
                try {
                    const stRes = await fetch(`https://${shop}/admin/api/2024-01/script_tags.json`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${session_token}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ script_tag: { event: "onload", src } }),
                    });
                    const stJson = await stRes.json();
                    if (stRes.ok && stJson.script_tag) {
                        scriptTagOk = true;
                        scriptTagError = "";
                        console.log(`[shopify] ScriptTag injected via session token: ${shop}`);
                    }
                    else {
                        scriptTagError += " | session_token: " + JSON.stringify(stJson);
                    }
                }
                catch (e2) {
                    scriptTagError += " | session_token: " + e2.message;
                }
            }
        }
        // Web Pixel 登録 / 更新（write_pixels スコープが付与されている場合のみ成功）
        let pixelOk = false;
        let pixelError = "";
        if (siteId) {
            const siteDoc2 = await db.collection("sites").doc(siteId).get();
            const siteKey2 = siteDoc2.exists ? siteDoc2.data()?.publicKey || "" : "";
            try {
                await registerWebPixel(shop, newToken, siteId, siteKey2);
                pixelOk = true;
            }
            catch (e) {
                pixelError = e.message;
                console.warn(`[shopify] registerWebPixel failed (token-exchange): ${e.message}`);
            }
        }
        // siteドキュメントのtokenExpiresAtも更新
        if (siteId) {
            await db.collection("sites").doc(siteId).update({
                "shopify.tokenExpiresAt": tokenExpiresAt,
                "shopify.pixelOk": pixelOk,
            }).catch(() => { });
        }
        res.json({
            ok: true, shop, siteId: siteId || null,
            tokenExpiresAt,
            scriptTagOk, scriptTagError,
            pixelOk, pixelError,
        });
    });
    // ② インストール開始: ?shop=xxx.myshopify.com&site_id=yyy
    app.get("/shopify/install", (req, res) => {
        // https:// などのプロトコルを除去して正規化
        let shop = String(req.query.shop || "").trim()
            .replace(/^https?:\/\//i, "")
            .replace(/\/+$/, "");
        const siteId = String(req.query.site_id || "").trim();
        if (!shop || !shop.endsWith(".myshopify.com")) {
            res.status(400).send("shop パラメータが不正です（例: yourstore.myshopify.com）");
            return;
        }
        const state = crypto.randomBytes(16).toString("hex");
        const redirectUri = `${SHOPIFY_APP_URL.value()}/shopify/callback`;
        const authUrl = `https://${shop}/admin/oauth/authorize`
            + `?client_id=${SHOPIFY_API_KEY.value()}`
            + `&scope=${encodeURIComponent(SHOPIFY_SCOPES)}`
            + `&redirect_uri=${encodeURIComponent(redirectUri)}`
            + `&state=${state}`;
        // state と siteId を一時保存（10分）
        const db = (0, admin_1.adminDb)();
        db.collection("shopify_oauth_states").doc(state).set({
            shop, siteId: siteId || null, createdAt: new Date().toISOString(),
        }).catch(console.error);
        res.redirect(authUrl);
    });
    // ② OAuth コールバック
    app.get("/shopify/callback", async (req, res) => {
        const { code, hmac, shop, state } = req.query;
        // HMAC 検証
        if (!hmacValid(req.query, SHOPIFY_API_SECRET.value())) {
            res.status(400).send("HMAC verification failed");
            return;
        }
        // state 検証
        const db = (0, admin_1.adminDb)();
        const stateDoc = await db.collection("shopify_oauth_states").doc(state).get();
        if (!stateDoc.exists) {
            res.status(400).send("Invalid state");
            return;
        }
        const stateData = stateDoc.data();
        await db.collection("shopify_oauth_states").doc(state).delete();
        // アクセストークン取得
        const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: SHOPIFY_API_KEY.value(),
                client_secret: SHOPIFY_API_SECRET.value(),
                code,
            }),
        });
        const tokenJson = await tokenRes.json();
        const accessToken = tokenJson.access_token;
        if (!accessToken) {
            res.status(400).send("アクセストークンの取得に失敗しました");
            return;
        }
        // ストア情報を Firestore に保存
        const siteId = stateData.siteId || null;
        const storeRef = db.collection("shopify_stores").doc(shop.replace(".myshopify.com", ""));
        await storeRef.set({
            shop,
            accessToken,
            siteId,
            installedAt: new Date().toISOString(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        // siteId があれば ScriptTag と Web Pixel を自動セットアップ
        if (siteId) {
            // siteKey を取得
            const siteDoc = await db.collection("sites").doc(siteId).get();
            const siteKey = siteDoc.exists ? siteDoc.data()?.publicKey || "" : "";
            try {
                await injectScriptTag(shop, accessToken, siteId, siteKey);
                console.log(`[shopify] ScriptTag injected: ${shop} → siteId=${siteId}`);
            }
            catch (e) {
                console.error("[shopify] ScriptTag injection failed:", e);
            }
            // Web Pixel 登録
            let pixelOk = false;
            try {
                await registerWebPixel(shop, accessToken, siteId, siteKey);
                pixelOk = true;
                console.log(`[shopify] webPixel registered: ${shop} → siteId=${siteId}`);
            }
            catch (e) {
                console.warn(`[shopify] webPixel registration failed (callback): ${e.message}`);
            }
            // siteDoc に shopify 連携情報を保存
            if (siteDoc.exists) {
                await db.collection("sites").doc(siteId).update({
                    "shopify.shop": shop,
                    "shopify.connected": true,
                    "shopify.connectedAt": new Date().toISOString(),
                    "shopify.pixelOk": pixelOk,
                });
            }
        }
        // 管理画面にリダイレクト（連携完了）
        const redirectTo = siteId
            ? `${ADMIN_APP_URL}/#/sites?shopify_connected=${shop}`
            : `${ADMIN_APP_URL}/#/sites?shopify_shop=${shop}&needs_site`;
        res.redirect(redirectTo);
    });
    // ③ 連携状態確認 API（管理画面から呼ぶ）
    app.get("/shopify/status", async (req, res) => {
        const siteId = String(req.query.site_id || "").trim();
        if (!siteId) {
            res.json({ connected: false });
            return;
        }
        const db = (0, admin_1.adminDb)();
        const siteDoc = await db.collection("sites").doc(siteId).get();
        const shopifyData = siteDoc.exists ? siteDoc.data()?.shopify : null;
        res.json({
            connected: !!(shopifyData?.connected),
            shop: shopifyData?.shop || null,
            connectedAt: shopifyData?.connectedAt || null,
        });
    });
    // ④ 診断エンドポイント（現在のScriptTag一覧を返す）
    app.get("/shopify/diagnose", async (req, res) => {
        const siteId = String(req.query.site_id || "").trim();
        if (!siteId) {
            res.status(400).json({ error: "site_id required" });
            return;
        }
        const db = (0, admin_1.adminDb)();
        const snap = await db.collection("shopify_stores").where("siteId", "==", siteId).limit(1).get();
        if (snap.empty) {
            // siteIdなしで保存されたドキュメントも確認
            const allSnap = await db.collection("shopify_stores").get();
            const docs = allSnap.docs.map(d => ({ id: d.id, siteId: d.data().siteId, shop: d.data().shop, hasToken: !!d.data().accessToken }));
            res.json({ error: "store not found for site_id", allStores: docs });
            return;
        }
        const storeData = snap.docs[0].data();
        const { shop, accessToken } = storeData;
        // Shopify ScriptTag一覧を取得
        let scriptTagsRes = {};
        let createTestRes = {};
        let createError = "";
        try {
            scriptTagsRes = await shopifyFetch(shop, accessToken, "script_tags.json");
        }
        catch (e) {
            scriptTagsRes = { error: e.message };
        }
        // ScriptTag作成テスト
        const src = `${SHOPIFY_SDK_URL}/sdk.js?site_id=${encodeURIComponent(siteId)}&site_key=test`;
        try {
            createTestRes = await shopifyFetch(shop, accessToken, "script_tags.json", {
                script_tag: { event: "onload", src },
            });
        }
        catch (e) {
            createError = e.message;
        }
        res.json({
            shop,
            siteId: storeData.siteId,
            hasToken: !!accessToken,
            tokenPrefix: accessToken ? accessToken.substring(0, 12) + "..." : null,
            tokenUpdatedAt: storeData.tokenUpdatedAt || null,
            scriptTags: scriptTagsRes.script_tags || [],
            expectedSrc: src,
            createTestResult: createTestRes,
            createError,
        });
    });
    // ⑤ ScriptTag確認 & 再注入（管理画面から呼ぶ）
    app.post("/shopify/reinject", async (req, res) => {
        const siteId = String(req.body?.site_id || "").trim();
        if (!siteId) {
            res.status(400).json({ error: "site_id required" });
            return;
        }
        const db = (0, admin_1.adminDb)();
        // shopify_stores から siteId で検索
        const snap = await db.collection("shopify_stores").where("siteId", "==", siteId).limit(1).get();
        if (snap.empty) {
            res.status(404).json({ error: "store not found for this site_id" });
            return;
        }
        const storeData = snap.docs[0].data();
        const { shop, accessToken } = storeData;
        if (!accessToken) {
            res.status(400).json({ error: "no access token" });
            return;
        }
        // siteKey を取得
        const siteDoc = await db.collection("sites").doc(siteId).get();
        const siteKey = siteDoc.exists ? siteDoc.data()?.publicKey || "" : "";
        try {
            const result = await injectScriptTag(shop, accessToken, siteId, siteKey);
            console.log(`[shopify] reinject result:`, JSON.stringify(result));
            res.json({ ok: true, shop, siteId, result });
        }
        catch (e) {
            console.error("[shopify] reinject failed:", e);
            res.status(500).json({ error: e.message });
        }
    });
    // ⑤ アンインストール Webhook
    app.post("/shopify/webhook/uninstall", async (req, res) => {
        const shopHeader = req.headers["x-shopify-shop-domain"];
        if (!shopHeader) {
            res.status(400).send("missing shop");
            return;
        }
        const db = (0, admin_1.adminDb)();
        const storeId = shopHeader.replace(".myshopify.com", "");
        await db.collection("shopify_stores").doc(storeId).update({
            uninstalledAt: new Date().toISOString(),
            accessToken: null,
        });
        // site の連携フラグを解除
        const storeDoc = await db.collection("shopify_stores").doc(storeId).get();
        const siteId = storeDoc.exists ? storeDoc.data()?.siteId : null;
        if (siteId) {
            await db.collection("sites").doc(siteId).update({ "shopify.connected": false });
        }
        res.status(200).send("ok");
    });
    // ⑤' ストータス・最近のログ取得（shopify-connect.html用）
    app.post("/shopify/status", async (req, res) => {
        const { session_token } = req.body || {};
        if (!session_token) {
            res.status(400).json({ error: "session_token required" });
            return;
        }
        const decoded = decodeSessionToken(session_token, SHOPIFY_API_SECRET.value());
        if (!decoded) {
            res.status(401).json({ error: "Invalid session token" });
            return;
        }
        const shop = decoded.shop;
        const db = (0, admin_1.adminDb)();
        const storeId = shop.replace(".myshopify.com", "");
        const storeDoc = await db.collection("shopify_stores").doc(storeId).get();
        if (!storeDoc.exists) {
            res.json({ connected: false });
            return;
        }
        const store = storeDoc.data();
        const siteId = store?.siteId;
        if (!siteId) {
            res.json({ connected: true, siteId: null, logs: [] });
            return;
        }
        // 直近24時間の集計
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const logsSnap = await db.collection("logs")
            .where("site_id", "==", siteId)
            .where("createdAt", ">=", since)
            .orderBy("createdAt", "desc")
            .limit(100)
            .get();
        let pageviews = 0, purchases = 0, lastSeenAt = null;
        logsSnap.forEach(doc => {
            const d = doc.data();
            if (d.event === "pageview")
                pageviews++;
            if (d.event === "purchase")
                purchases++;
            if (!lastSeenAt)
                lastSeenAt = d.createdAt;
        });
        res.json({
            connected: true,
            shop,
            siteId,
            tokenExpiresAt: store.tokenExpiresAt || null,
            stats24h: { pageviews, purchases, lastSeenAt },
        });
    });
    // ---- GDPR Compliance Webhooks ----
    // Webhook HMAC検証ヘルパー（bodyはBuffer）
    function verifyWebhookHmac(rawBody, secret, hmacHeader) {
        const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
        try {
            return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
        }
        catch {
            return false;
        }
    }
    // ⑥ customers/data_request — 顧客データ開示リクエスト
    app.post("/shopify/webhook/customers/data_request", async (req, res) => {
        const hmacHeader = req.headers["x-shopify-hmac-sha256"];
        const rawBody = req.rawBody;
        if (!hmacHeader || !rawBody || !verifyWebhookHmac(rawBody, SHOPIFY_API_SECRET.value(), hmacHeader)) {
            res.status(401).send("HMAC verification failed");
            return;
        }
        const body = req.body;
        const shop = req.headers["x-shopify-shop-domain"];
        const customerId = body?.customer?.id;
        const email = body?.customer?.email;
        console.log(`[shopify/gdpr] data_request: shop=${shop}, customer=${customerId}, email=${email}`);
        // 当アプリは匿名vidベースの計測のみを行い、顧客個人情報（メール・氏名等）は
        // 保存していません。顧客IDと紐付くデータはありません。
        // 必要に応じて logs コレクションを調査してレポートを送付してください。
        res.status(200).send("ok");
    });
    // ⑦ customers/redact — 顧客データ削除リクエスト
    app.post("/shopify/webhook/customers/redact", async (req, res) => {
        const hmacHeader = req.headers["x-shopify-hmac-sha256"];
        const rawBody = req.rawBody;
        if (!hmacHeader || !rawBody || !verifyWebhookHmac(rawBody, SHOPIFY_API_SECRET.value(), hmacHeader)) {
            res.status(401).send("HMAC verification failed");
            return;
        }
        const body = req.body;
        const shop = req.headers["x-shopify-shop-domain"];
        const customerId = body?.customer?.id;
        const ordersToRedact = body?.orders_to_redact || [];
        console.log(`[shopify/gdpr] customers/redact: shop=${shop}, customer=${customerId}, orders=${ordersToRedact.length}`);
        // order_idと一致するlogsを削除（購入ログに注文IDが含まれる場合）
        if (ordersToRedact.length > 0) {
            try {
                const db = (0, admin_1.adminDb)();
                const storeDoc = await db.collection("shopify_stores")
                    .where("shop", "==", shop).limit(1).get();
                if (!storeDoc.empty) {
                    const siteId = storeDoc.docs[0].data().siteId;
                    if (siteId) {
                        for (const orderId of ordersToRedact) {
                            const logsSnap = await db.collection("logs")
                                .where("siteId", "==", siteId)
                                .where("order_id", "==", String(orderId))
                                .get();
                            const batch = db.batch();
                            logsSnap.docs.forEach((d) => batch.delete(d.ref));
                            if (!logsSnap.empty)
                                await batch.commit();
                            console.log(`[shopify/gdpr] deleted ${logsSnap.size} logs for order ${orderId}`);
                        }
                    }
                }
            }
            catch (e) {
                console.error("[shopify/gdpr] customers/redact error:", e);
            }
        }
        res.status(200).send("ok");
    });
    // ⑧ shop/redact — ショップデータ削除リクエスト（アンインストール後48時間）
    app.post("/shopify/webhook/shop/redact", async (req, res) => {
        const hmacHeader = req.headers["x-shopify-hmac-sha256"];
        const rawBody = req.rawBody;
        if (!hmacHeader || !rawBody || !verifyWebhookHmac(rawBody, SHOPIFY_API_SECRET.value(), hmacHeader)) {
            res.status(401).send("HMAC verification failed");
            return;
        }
        const shop = req.headers["x-shopify-shop-domain"];
        console.log(`[shopify/gdpr] shop/redact: shop=${shop}`);
        try {
            const db = (0, admin_1.adminDb)();
            const storeSnap = await db.collection("shopify_stores")
                .where("shop", "==", shop).limit(1).get();
            if (!storeSnap.empty) {
                const storeData = storeSnap.docs[0].data();
                const siteId = storeData.siteId;
                // logs コレクションからそのサイトのデータを削除
                if (siteId) {
                    const logsSnap = await db.collection("logs").where("siteId", "==", siteId).get();
                    const chunkSize = 500;
                    for (let i = 0; i < logsSnap.docs.length; i += chunkSize) {
                        const batch = db.batch();
                        logsSnap.docs.slice(i, i + chunkSize).forEach((d) => batch.delete(d.ref));
                        await batch.commit();
                    }
                    console.log(`[shopify/gdpr] shop/redact: deleted ${logsSnap.size} logs for siteId=${siteId}`);
                }
                // shopify_stores ドキュメントを削除
                await storeSnap.docs[0].ref.delete();
                console.log(`[shopify/gdpr] shop/redact: deleted store document for ${shop}`);
            }
        }
        catch (e) {
            console.error("[shopify/gdpr] shop/redact error:", e);
        }
        res.status(200).send("ok");
    });
}
