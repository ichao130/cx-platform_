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

const SHOPIFY_SCOPES = "write_script_tags,read_script_tags";
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
  return res.json();
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

// ---- Web Pixel 登録 ----
// Web Pixel は REST では登録できないため、GraphQL Admin API を使用
async function registerWebPixel(shop: string, token: string, siteId: string, siteKey: string) {
  const appUrl = SHOPIFY_APP_URL.value(); // APIエンドポイント用
  // すでに登録済みか確認
  const checkRes = await fetch(`https://${shop}/admin/api/2024-01/web_pixels.json`, {
    headers: { "X-Shopify-Access-Token": token },
  });
  const checkJson = await checkRes.json() as any;
  const pixels: any[] = checkJson.web_pixels || [];
  if (pixels.length > 0) return pixels[0];

  // Web Pixel のスクリプト（sandboxed context で動作）
  const pixelScript = `
analytics.subscribe("checkout_completed", (event) => {
  const order = event.data.checkout;
  const items = (order.lineItems || []).map(function(item) {
    return {
      product_id: String(item.variant && item.variant.product && item.variant.product.id || ""),
      variant_id: String(item.variant && item.variant.id || ""),
      title: item.title || "",
      quantity: item.quantity || 1,
      price: item.variant && item.variant.price && item.variant.price.amount ? Number(item.variant.price.amount) : 0
    };
  });
  const revenue = order.totalPrice && order.totalPrice.amount ? Number(order.totalPrice.amount) : 0;
  const orderId = String(order.order && order.order.id || order.token || "");
  const vid = getCookie("_cx_vid");
  fetch("${appUrl}/v1/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      site_id: "${siteId}",
      site_key: "${siteKey}",
      event: "purchase",
      revenue: revenue,
      order_id: orderId,
      currency: order.currencyCode || "JPY",
      items: items,
      vid: vid,
      url: window.location.href,
      path: window.location.pathname
    })
  }).catch(function(){});
});

function getCookie(name) {
  var m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}
`.trim();

  const res = await fetch(`https://${shop}/admin/api/2024-01/web_pixels.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ web_pixel: { settings: {}, runtime_context: "STRICT" } }),
  });
  // REST APIでは登録が制限されているため、ストア情報をDBに保存してフロント側で対応
  console.log("[shopify] web_pixel registration attempted:", res.status);
  return { pixelScript };
}

// ---- ルート登録 ----
export function registerShopifyRoutes(app: Express) {

  // ① インストール開始: ?shop=xxx.myshopify.com&site_id=yyy
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
      const siteKey = siteDoc.exists ? (siteDoc.data() as any)?.siteKey || "" : "";

      try {
        await injectScriptTag(shop, accessToken, siteId, siteKey);
        console.log(`[shopify] ScriptTag injected: ${shop} → siteId=${siteId}`);
      } catch (e) {
        console.error("[shopify] ScriptTag injection failed:", e);
      }

      // siteDoc に shopify 連携情報を保存
      if (siteDoc.exists) {
        await db.collection("sites").doc(siteId).update({
          "shopify.shop": shop,
          "shopify.connected": true,
          "shopify.connectedAt": new Date().toISOString(),
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
    const scriptTagsRes = await shopifyFetch(shop, accessToken, "script_tags.json");

    res.json({
      shop,
      siteId: storeData.siteId,
      hasToken: !!accessToken,
      scriptTags: scriptTagsRes.script_tags || [],
      expectedSrc: `${SHOPIFY_SDK_URL}/sdk.js?site_id=${siteId}`,
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
    const siteKey = siteDoc.exists ? (siteDoc.data() as any)?.siteKey || "" : "";

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
}
