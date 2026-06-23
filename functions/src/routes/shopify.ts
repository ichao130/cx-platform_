// functions/src/routes/shopify.ts
// Shopify OAuth + ScriptTag + Web Pixel 自動セットアップ

import type { Express, Request, Response } from "express";
import { adminDb } from "../services/admin";
import { FieldValue } from "firebase-admin/firestore";
import { defineString } from "firebase-functions/params";
import * as crypto from "crypto";

const SHOPIFY_API_KEY    = defineString("SHOPIFY_API_KEY");
const SHOPIFY_API_SECRET = defineString("SHOPIFY_API_SECRET");
const SHOPIFY_APP_URL    = defineString("SHOPIFY_APP_URL"); // Cloud Functions URL（OAuthコールバック用）
const SHOPIFY_SDK_URL    = "https://cx-platform-v1.web.app"; // SDK配信URL（Firebase Hosting）

// stats_daily の day と揃えるJST日付（YYYY-MM-DD）
function jstDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

const SHOPIFY_SCOPES = "write_script_tags,read_script_tags,write_pixels";
const ADMIN_APP_URL  = "https://cx-platform-v1.web.app";

// ---- helpers ----
function hmacValid(query: Record<string, string>, secret: string): boolean {
  const { hmac, ...rest } = query;
  if (!hmac) return false;
  const msg = Object.keys(rest).sort().map((k) => `${k}=${rest[k]}`).join("&");
  const digest = crypto.createHmac("sha256", secret).update(msg).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

async function shopifyFetch(shop: string, token: string, path: string, body?: any) {
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
async function injectScriptTag(shop: string, token: string, siteId: string, siteKey: string) {
  const src = `${SHOPIFY_SDK_URL}/sdk.js?site_id=${encodeURIComponent(siteId)}&site_key=${encodeURIComponent(siteKey)}`;

  // 既存タグを確認（重複防止）
  const existing = await shopifyFetch(shop, token, "script_tags.json");
  const tags: any[] = existing.script_tags || [];
  const already = tags.find((t: any) => t.src && t.src.includes("sdk.js") && t.src.includes(siteId));
  if (already) return already;

  return shopifyFetch(shop, token, "script_tags.json", {
    script_tag: { event: "onload", src },
  });
}

// ---- GraphQL ヘルパー ----
async function shopifyGraphQL(shop: string, token: string, query: string, variables?: any) {
  const res = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json() as any;
  if (!res.ok) throw new Error(`GraphQL HTTP error ${res.status}: ${JSON.stringify(json)}`);
  if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data;
}

// ---- Web Pixel 登録（GraphQL Admin API + write_pixels スコープ必須）----
// 初回: webPixelCreate → 既存あり: webPixelUpdate（settings に siteId/siteKey を注入）
// スクリプト本体は extensions/web-pixel/src/index.js（shopify app deploy で配備済み）
async function registerWebPixel(shop: string, token: string, siteId: string, siteKey: string): Promise<void> {
  const settings = JSON.stringify({ siteId, siteKey });

  // 既存ピクセル確認
  let existingId: string | null = null;
  try {
    const checkData = await shopifyGraphQL(shop, token, `{ webPixel { id settings } }`);
    existingId = checkData?.webPixel?.id || null;
  } catch (e: any) {
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

    const errors = data?.webPixelUpdate?.userErrors as any[];
    if (errors?.length > 0) throw new Error(`webPixelUpdate errors: ${JSON.stringify(errors)}`);
    console.log(`[shopify] webPixel updated: ${shop} id=${existingId}`);
  } else {
    // 新規登録
    const data = await shopifyGraphQL(shop, token, `
      mutation webPixelCreate($webPixel: WebPixelInput!) {
        webPixelCreate(webPixel: $webPixel) {
          userErrors { code field message }
          webPixel { id settings }
        }
      }
    `, { webPixel: { settings } });

    const errors = data?.webPixelCreate?.userErrors as any[];
    if (errors?.length > 0) throw new Error(`webPixelCreate errors: ${JSON.stringify(errors)}`);
    console.log(`[shopify] webPixel created: ${shop} id=${data?.webPixelCreate?.webPixel?.id}`);
  }
}

// ---- Session Token 検証（App Bridge 3.x / HS256）----
function decodeSessionToken(token: string, secret: string): { shop: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const sig = crypto
      .createHmac("sha256", secret)
      .update(parts[0] + "." + parts[1])
      .digest("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    if (sig !== parts[2]) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    const shop = String(payload.dest || "").replace(/^https?:\/\//, "");
    if (!shop) return null;
    return { shop };
  } catch { return null; }
}

// ---- ルート登録 ----
export function registerShopifyRoutes(app: Express) {

  // ① Session Token → Offline Token 交換（App Bridge連携）
  app.post("/shopify/token-exchange", async (req: Request, res: Response) => {
    const { session_token } = req.body || {};
    if (!session_token) { res.status(400).json({ error: "session_token required" }); return; }

    // セッショントークンを検証してshopを取得
    const decoded = decodeSessionToken(session_token, SHOPIFY_API_SECRET.value());
    if (!decoded) { res.status(401).json({ error: "Invalid session token" }); return; }
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
    const tokenJson = await tokenRes.json() as any;

    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error("[shopify] token-exchange failed:", JSON.stringify(tokenJson));
      res.status(400).json({ error: "Token exchange failed: " + JSON.stringify(tokenJson) });
      return;
    }

    const newToken: string = tokenJson.access_token;
    const expiresIn: number = tokenJson.expires_in || 86400;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    console.log(`[shopify] token-exchange success: ${shop}, expires_in=${expiresIn}s`);

    // Firestoreにトークンと期限を保存・更新
    const db = adminDb();
    const storeId = shop.replace(".myshopify.com", "");
    const storeRef = db.collection("shopify_stores").doc(storeId);
    await storeRef.set({
      shop, accessToken: newToken,
      tokenUpdatedAt: new Date().toISOString(),
      tokenExpiresAt,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // siteId があればScriptTagを注入
    const storeDoc = await storeRef.get();
    const siteId = storeDoc.exists ? (storeDoc.data() as any)?.siteId : null;

    let scriptTagOk = false;
    let scriptTagError = "";
    if (siteId) {
      const siteDoc = await db.collection("sites").doc(siteId).get();
      const siteKey = siteDoc.exists ? (siteDoc.data() as any)?.publicKey || "" : "";
      const src = `${SHOPIFY_SDK_URL}/sdk.js?site_id=${encodeURIComponent(siteId)}&site_key=${encodeURIComponent(siteKey)}`;

      // ① まずOffline Tokenで試みる
      try {
        await injectScriptTag(shop, newToken, siteId, siteKey);
        scriptTagOk = true;
        console.log(`[shopify] ScriptTag injected via offline token: ${shop}`);
      } catch (e: any) {
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
          const stJson = await stRes.json() as any;
          if (stRes.ok && stJson.script_tag) {
            scriptTagOk = true;
            scriptTagError = "";
            console.log(`[shopify] ScriptTag injected via session token: ${shop}`);
          } else {
            scriptTagError += " | session_token: " + JSON.stringify(stJson);
          }
        } catch (e2: any) {
          scriptTagError += " | session_token: " + e2.message;
        }
      }
    }

    // Web Pixel 登録 / 更新（write_pixels スコープが付与されている場合のみ成功）
    let pixelOk = false;
    let pixelError = "";
    if (siteId) {
      const siteDoc2 = await db.collection("sites").doc(siteId).get();
      const siteKey2 = siteDoc2.exists ? (siteDoc2.data() as any)?.publicKey || "" : "";
      try {
        await registerWebPixel(shop, newToken, siteId, siteKey2);
        pixelOk = true;
      } catch (e: any) {
        pixelError = e.message;
        console.warn(`[shopify] registerWebPixel failed (token-exchange): ${e.message}`);
      }
    }

    // siteドキュメントのtokenExpiresAtも更新
    if (siteId) {
      await db.collection("sites").doc(siteId).update({
        "shopify.tokenExpiresAt": tokenExpiresAt,
        "shopify.pixelOk": pixelOk,
      }).catch(() => {});
    }

    res.json({
      ok: true, shop, siteId: siteId || null,
      tokenExpiresAt,
      scriptTagOk, scriptTagError,
      pixelOk, pixelError,
    });
  });

  // ② インストール開始: ?shop=xxx.myshopify.com&site_id=yyy
  app.get("/shopify/install", (req: Request, res: Response) => {
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
    const db = adminDb();
    db.collection("shopify_oauth_states").doc(state).set({
      shop, siteId: siteId || null, createdAt: new Date().toISOString(),
    }).catch(console.error);

    res.redirect(authUrl);
  });

  // ② OAuth コールバック
  app.get("/shopify/callback", async (req: Request, res: Response) => {
    const { code, hmac, shop, state } = req.query as Record<string, string>;

    // HMAC 検証
    if (!hmacValid(req.query as Record<string, string>, SHOPIFY_API_SECRET.value())) {
      res.status(400).send("HMAC verification failed");
      return;
    }

    // state 検証
    const db = adminDb();
    const stateDoc = await db.collection("shopify_oauth_states").doc(state).get();
    if (!stateDoc.exists) {
      res.status(400).send("Invalid state");
      return;
    }
    const stateData = stateDoc.data() as any;
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
    const tokenJson = await tokenRes.json() as any;
    const accessToken: string = tokenJson.access_token;

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
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // siteId があれば ScriptTag と Web Pixel を自動セットアップ
    if (siteId) {
      // siteKey を取得
      const siteDoc = await db.collection("sites").doc(siteId).get();
      const siteKey = siteDoc.exists ? (siteDoc.data() as any)?.publicKey || "" : "";

      try {
        await injectScriptTag(shop, accessToken, siteId, siteKey);
        console.log(`[shopify] ScriptTag injected: ${shop} → siteId=${siteId}`);
      } catch (e) {
        console.error("[shopify] ScriptTag injection failed:", e);
      }

      // Web Pixel 登録
      let pixelOk = false;
      try {
        await registerWebPixel(shop, accessToken, siteId, siteKey);
        pixelOk = true;
        console.log(`[shopify] webPixel registered: ${shop} → siteId=${siteId}`);
      } catch (e: any) {
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
  app.get("/shopify/status", async (req: Request, res: Response) => {
    const siteId = String(req.query.site_id || "").trim();
    if (!siteId) { res.json({ connected: false }); return; }

    const db = adminDb();
    const siteDoc = await db.collection("sites").doc(siteId).get();
    const shopifyData = siteDoc.exists ? (siteDoc.data() as any)?.shopify : null;

    res.json({
      connected: !!(shopifyData?.connected),
      shop: shopifyData?.shop || null,
      connectedAt: shopifyData?.connectedAt || null,
    });
  });

  // ④ 診断エンドポイント（現在のScriptTag一覧を返す）
  app.get("/shopify/diagnose", async (req: Request, res: Response) => {
    const siteId = String(req.query.site_id || "").trim();
    if (!siteId) { res.status(400).json({ error: "site_id required" }); return; }

    const db = adminDb();
    const snap = await db.collection("shopify_stores").where("siteId", "==", siteId).limit(1).get();
    if (snap.empty) {
      // siteIdなしで保存されたドキュメントも確認
      const allSnap = await db.collection("shopify_stores").get();
      const docs = allSnap.docs.map(d => ({ id: d.id, siteId: d.data().siteId, shop: d.data().shop, hasToken: !!d.data().accessToken }));
      res.json({ error: "store not found for site_id", allStores: docs });
      return;
    }

    const storeData = snap.docs[0].data() as any;
    const { shop, accessToken } = storeData;

    // Shopify ScriptTag一覧を取得
    let scriptTagsRes: any = {};
    let createTestRes: any = {};
    let createError = "";

    try {
      scriptTagsRes = await shopifyFetch(shop, accessToken, "script_tags.json");
    } catch (e: any) { scriptTagsRes = { error: e.message }; }

    // ScriptTag作成テスト
    const src = `${SHOPIFY_SDK_URL}/sdk.js?site_id=${encodeURIComponent(siteId)}&site_key=test`;
    try {
      createTestRes = await shopifyFetch(shop, accessToken, "script_tags.json", {
        script_tag: { event: "onload", src },
      });
    } catch (e: any) { createError = e.message; }

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
  app.post("/shopify/reinject", async (req: Request, res: Response) => {
    const siteId = String(req.body?.site_id || "").trim();
    if (!siteId) { res.status(400).json({ error: "site_id required" }); return; }

    const db = adminDb();

    // shopify_stores から siteId で検索
    const snap = await db.collection("shopify_stores").where("siteId", "==", siteId).limit(1).get();
    if (snap.empty) { res.status(404).json({ error: "store not found for this site_id" }); return; }

    const storeData = snap.docs[0].data() as any;
    const { shop, accessToken } = storeData;
    if (!accessToken) { res.status(400).json({ error: "no access token" }); return; }

    // siteKey を取得
    const siteDoc = await db.collection("sites").doc(siteId).get();
    const siteKey = siteDoc.exists ? (siteDoc.data() as any)?.publicKey || "" : "";

    try {
      const result = await injectScriptTag(shop, accessToken, siteId, siteKey);
      console.log(`[shopify] reinject result:`, JSON.stringify(result));
      res.json({ ok: true, shop, siteId, result });
    } catch (e: any) {
      console.error("[shopify] reinject failed:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ⑤ アンインストール Webhook
  app.post("/shopify/webhook/uninstall", async (req: Request, res: Response) => {
    const shopHeader = req.headers["x-shopify-shop-domain"] as string;
    if (!shopHeader) { res.status(400).send("missing shop"); return; }

    const db = adminDb();
    const storeId = shopHeader.replace(".myshopify.com", "");
    await db.collection("shopify_stores").doc(storeId).update({
      uninstalledAt: new Date().toISOString(),
      accessToken: null,
    });

    // site の連携フラグを解除
    const storeDoc = await db.collection("shopify_stores").doc(storeId).get();
    const siteId = storeDoc.exists ? (storeDoc.data() as any)?.siteId : null;
    if (siteId) {
      await db.collection("sites").doc(siteId).update({ "shopify.connected": false });
    }

    res.status(200).send("ok");
  });

  // ⑤' ストータス・最近のログ取得（shopify-connect.html用）
  app.post("/shopify/status", async (req: Request, res: Response) => {
    const { session_token } = req.body || {};
    if (!session_token) { res.status(400).json({ error: "session_token required" }); return; }

    const decoded = decodeSessionToken(session_token, SHOPIFY_API_SECRET.value());
    if (!decoded) { res.status(401).json({ error: "Invalid session token" }); return; }
    const shop = decoded.shop;

    const db = adminDb();
    const storeId = shop.replace(".myshopify.com", "");
    const storeDoc = await db.collection("shopify_stores").doc(storeId).get();
    if (!storeDoc.exists) { res.json({ connected: false }); return; }

    const store = storeDoc.data() as any;
    const siteId = store?.siteId;
    if (!siteId) { res.json({ connected: true, siteId: null, logs: [] }); return; }

    // 直近24時間の集計
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const logsSnap = await db.collection("logs")
      .where("site_id", "==", siteId)
      .where("createdAt", ">=", since)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    let pageviews = 0, purchases = 0, lastSeenAt: string | null = null;
    logsSnap.forEach(doc => {
      const d = doc.data();
      if (d.event === "pageview") pageviews++;
      if (d.event === "purchase") purchases++;
      if (!lastSeenAt) lastSeenAt = d.createdAt;
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
  function verifyWebhookHmac(rawBody: Buffer, secret: string, hmacHeader: string): boolean {
    const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
    try {
      return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
    } catch { return false; }
  }

  // ⑥ customers/data_request — 顧客データ開示リクエスト
  app.post("/shopify/webhook/customers/data_request", async (req: Request, res: Response) => {
    const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string;
    const rawBody: Buffer = (req as any).rawBody;
    if (!hmacHeader || !rawBody || !verifyWebhookHmac(rawBody, SHOPIFY_API_SECRET.value(), hmacHeader)) {
      res.status(401).send("HMAC verification failed");
      return;
    }

    const body = req.body as any;
    const shop = req.headers["x-shopify-shop-domain"] as string;
    const customerId = body?.customer?.id;
    const email = body?.customer?.email;

    console.log(`[shopify/gdpr] data_request: shop=${shop}, customer=${customerId}, email=${email}`);

    // 当アプリは匿名vidベースの計測のみを行い、顧客個人情報（メール・氏名等）は
    // 保存していません。顧客IDと紐付くデータはありません。
    // 必要に応じて logs コレクションを調査してレポートを送付してください。

    res.status(200).send("ok");
  });

  // ⑦ customers/redact — 顧客データ削除リクエスト
  app.post("/shopify/webhook/customers/redact", async (req: Request, res: Response) => {
    const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string;
    const rawBody: Buffer = (req as any).rawBody;
    if (!hmacHeader || !rawBody || !verifyWebhookHmac(rawBody, SHOPIFY_API_SECRET.value(), hmacHeader)) {
      res.status(401).send("HMAC verification failed");
      return;
    }

    const body = req.body as any;
    const shop = req.headers["x-shopify-shop-domain"] as string;
    const customerId = body?.customer?.id;
    const ordersToRedact: string[] = body?.orders_to_redact || [];

    console.log(`[shopify/gdpr] customers/redact: shop=${shop}, customer=${customerId}, orders=${ordersToRedact.length}`);

    // order_idと一致するlogsを削除（購入ログに注文IDが含まれる場合）
    if (ordersToRedact.length > 0) {
      try {
        const db = adminDb();
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
              if (!logsSnap.empty) await batch.commit();
              console.log(`[shopify/gdpr] deleted ${logsSnap.size} logs for order ${orderId}`);
            }
          }
        }
      } catch (e) {
        console.error("[shopify/gdpr] customers/redact error:", e);
      }
    }

    res.status(200).send("ok");
  });

  // ⑧ shop/redact — ショップデータ削除リクエスト（アンインストール後48時間）
  app.post("/shopify/webhook/shop/redact", async (req: Request, res: Response) => {
    const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string;
    const rawBody: Buffer = (req as any).rawBody;
    if (!hmacHeader || !rawBody || !verifyWebhookHmac(rawBody, SHOPIFY_API_SECRET.value(), hmacHeader)) {
      res.status(401).send("HMAC verification failed");
      return;
    }

    const shop = req.headers["x-shopify-shop-domain"] as string;
    console.log(`[shopify/gdpr] shop/redact: shop=${shop}`);

    try {
      const db = adminDb();
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
    } catch (e) {
      console.error("[shopify/gdpr] shop/redact error:", e);
    }

    res.status(200).send("ok");
  });

  // ⑨ orders/paid — 入金された注文を購入として記録（Web Pixelの取りこぼし＝PayPay/外部遷移/タブ閉じを補完）
  //    ※ read_orders スコープ＋webhook登録が有効になってから発火する（それまでは呼ばれない）。
  //    ※ orders/paid を使うので「実際に入金された注文」のみ＝後払いの未払いキャンセルは計上しない。
  app.post("/shopify/webhook/orders/paid", async (req: Request, res: Response) => {
    const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string;
    const rawBody: Buffer = (req as any).rawBody;
    if (!hmacHeader || !rawBody || !verifyWebhookHmac(rawBody, SHOPIFY_API_SECRET.value(), hmacHeader)) {
      res.status(401).send("HMAC verification failed");
      return;
    }
    try {
      const order = req.body as any;
      const shop = req.headers["x-shopify-shop-domain"] as string;
      const db = adminDb();

      // shop → siteId
      const storeSnap = await db.collection("shopify_stores").where("shop", "==", shop).limit(1).get();
      const siteId = storeSnap.empty ? null : (storeSnap.docs[0].data() as any).siteId;
      if (!siteId) { res.status(200).send("no site mapping"); return; }

      // 重複チェック: Web Pixel が既に記録済みならスキップ（order.id は数値/GID両形式を候補に）
      const candidates = [
        String(order.id || ""),
        `gid://shopify/Order/${order.id}`,
        String(order.checkout_token || ""),
        String(order.token || ""),
      ].filter(Boolean).slice(0, 10);
      if (candidates.length) {
        const dupSnap = await db.collection("logs").where("order_id", "in", candidates).limit(1).get();
        if (!dupSnap.empty) { res.status(200).send("duplicate"); return; }
      }

      // note_attributes(カート属性)から vid/sid/scenario を復元
      const attrs = Array.isArray(order.note_attributes) ? order.note_attributes : [];
      const attr = (k: string) => { const a = attrs.find((x: any) => x && x.name === k); return a ? String(a.value || "") : ""; };
      const vid = attr("_cx_vid") || null;
      const sid = attr("_cx_sid") || null;
      const scenarioId = attr("_cx_scenario_id") || null;

      const revenue = Number(order.total_price || 0) || 0;
      const currency = String(order.currency || "JPY");
      const items = Array.isArray(order.line_items)
        ? order.line_items.map((li: any) => ({ title: String(li.title || ""), qty: Number(li.quantity) || 1, price: Number(li.price) || 0 }))
        : [];
      const discountCodes = Array.isArray(order.discount_codes)
        ? order.discount_codes.map((d: any) => String(d.code || "").toUpperCase()).filter(Boolean)
        : [];

      const nowIso = new Date().toISOString();
      const createdAt = order.created_at ? new Date(order.created_at).toISOString() : nowIso;
      const day = jstDay(new Date(createdAt));

      const logPayload: Record<string, any> = {
        site_id: siteId,
        scenario_id: scenarioId,
        action_id: null, template_id: null, variant_id: null,
        event: "purchase",
        url: null, path: null, ref: null,
        vid, sid,
        utm_source: null, utm_medium: null, utm_campaign: null, is_new: null,
        revenue, order_id: String(order.id || ""), currency, items, discount_codes: discountCodes,
        source: "shopify_webhook",
        createdAt, updatedAt: nowIso,
      };

      const scId = String(scenarioId ?? "all");
      const statsDocId = `${siteId}__${day}__${scId}__all__na__purchase`;
      const batch = db.batch();
      batch.set(db.collection("logs").doc(), logPayload);
      batch.set(db.collection("stats_daily").doc(statsDocId), {
        siteId, day, scenarioId: scenarioId ?? null, actionId: null, templateId: null, variantId: "na",
        event: "purchase", count: FieldValue.increment(1), revenue_total: FieldValue.increment(revenue),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      await batch.commit();

      console.log(`[shopify/orders_paid] recorded order=${order.id} site=${siteId} ¥${revenue} vid=${vid ? "y" : "n"} scenario=${scenarioId || "-"}`);
      res.status(200).send("ok");
    } catch (e) {
      console.error("[shopify/orders_paid] error:", e);
      res.status(200).send("ok"); // 200で返してShopifyのリトライ地獄を回避（エラーはログに残す）
    }
  });
}
