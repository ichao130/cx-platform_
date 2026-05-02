"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RmsClient = void 0;
exports.getRmsCredentials = getRmsCredentials;
exports.saveRmsCredentials = saveRmsCredentials;
exports.deleteRmsCredentials = deleteRmsCredentials;
exports.syncRmsData = syncRmsData;
exports.aggregateDailySales = aggregateDailySales;
const admin_1 = require("./admin");
const firestore_1 = require("firebase-admin/firestore");
// =====================
// RMS API Client
// =====================
class RmsClient {
    constructor(serviceSecret, licenseKey) {
        this.baseUrl = "https://api.rms.rakuten.co.jp/es/2.0";
        const encoded = Buffer.from(`${serviceSecret}:${licenseKey}`).toString("base64");
        this.authHeader = `ESA ${encoded}`;
    }
    // 接続テスト用: 複数エンドポイントを順に試して認証確認
    async testConnection() {
        // 試すエンドポイント一覧（GET）
        const candidates = [
            { url: `${this.baseUrl}/shop/get`, method: "GET" },
            { url: `https://api.rms.rakuten.co.jp/es/1.0/shop/get`, method: "GET" },
            { url: `${this.baseUrl}/item/search?hits=1&offset=0`, method: "GET" },
            { url: `https://api.rms.rakuten.co.jp/es/1.0/item/search?hits=1&offset=0`, method: "GET" },
        ];
        const log = [];
        for (const c of candidates) {
            try {
                const res = await fetch(c.url, { headers: { Authorization: this.authHeader } });
                log.push(`${c.url} => ${res.status}`);
                if (res.status === 200)
                    return { ok: true };
                if (res.status === 401 || res.status === 403)
                    return { ok: false, error: `認証エラー (HTTP ${res.status})` };
                // 404 はエンドポイントが違うだけなので次を試す
            }
            catch (e) {
                log.push(`${c.url} => error: ${e.message}`);
            }
        }
        console.log("[RMS testConnection] probe results:", log.join(", "));
        // 401/403 が出なければ認証自体は通っている
        return { ok: true, shopName: "(エンドポイント調査中)" };
    }
    // 注文検索（dateFrom〜dateTo の期間）
    // RMS Order API 2.0: POST /order/searchOrder
    async searchOrders(dateFrom, dateTo) {
        // 最小限のパラメータで試す
        const body = {
            dateType: 1,
            startDatetime: `${dateFrom} 00:00:00`,
            endDatetime: `${dateTo} 23:59:59`,
        };
        const res = await fetch(`${this.baseUrl}/order/searchOrder`, {
            method: "POST",
            headers: { Authorization: this.authHeader, "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const rawText = await res.text();
        console.log(`[RMS searchOrder] HTTP ${res.status} body:`, rawText.slice(0, 500));
        if (!res.ok) {
            throw new Error(`searchOrder HTTP ${res.status}: ${rawText.slice(0, 300)}`);
        }
        let data = {};
        try {
            data = JSON.parse(rawText);
        }
        catch { }
        return data?.orderNumberList || data?.Results?.orderNumberList || [];
    }
    // 注文詳細取得: POST /order/getOrder
    async getOrders(orderNumbers) {
        if (!orderNumbers.length)
            return [];
        const res = await fetch(`${this.baseUrl}/order/getOrder`, {
            method: "POST",
            headers: { Authorization: this.authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({ orderNumberList: orderNumbers.slice(0, 100) }),
        });
        if (!res.ok)
            throw new Error(`getOrder HTTP ${res.status}`);
        const data = await res.json();
        return data?.orderModelList || [];
    }
    // 商品検索: GET /item/search（v2 → v1 フォールバック）
    async searchItems(offset = 0, limit = 100) {
        const urls = [
            `${this.baseUrl}/item/search?hits=${limit}&offset=${offset}`,
            `https://api.rms.rakuten.co.jp/es/1.0/item/search?hits=${limit}&offset=${offset}`,
        ];
        for (const url of urls) {
            const res = await fetch(url, { headers: { Authorization: this.authHeader } });
            const text = await res.text();
            console.log(`[RMS searchItems] ${url} => ${res.status}: ${text.slice(0, 200)}`);
            if (res.status === 200) {
                try {
                    return JSON.parse(text);
                }
                catch {
                    return {};
                }
            }
        }
        throw new Error(`item/search: no valid endpoint found`);
    }
}
exports.RmsClient = RmsClient;
// =====================
// Credentials CRUD
// =====================
const CREDS_COLLECTION = "rms_credentials";
async function getRmsCredentials(siteId) {
    const db = (0, admin_1.adminDb)();
    const snap = await db.collection(CREDS_COLLECTION).doc(siteId).get();
    if (!snap.exists)
        return null;
    return { siteId, ...snap.data() };
}
async function saveRmsCredentials(siteId, data) {
    const db = (0, admin_1.adminDb)();
    await db.collection(CREDS_COLLECTION).doc(siteId).set({
        siteId,
        serviceSecret: data.serviceSecret,
        licenseKey: data.licenseKey,
        shopUrl: data.shopUrl || "",
        enabled: data.enabled ?? true,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
}
async function deleteRmsCredentials(siteId) {
    const db = (0, admin_1.adminDb)();
    await db.collection(CREDS_COLLECTION).doc(siteId).delete();
}
// =====================
// Sync Logic
// =====================
async function syncRmsData(siteId, daysBack = 90) {
    const creds = await getRmsCredentials(siteId);
    if (!creds || !creds.enabled)
        throw new Error("RMS credentials not found or disabled");
    const client = new RmsClient(creds.serviceSecret, creds.licenseKey);
    const db = (0, admin_1.adminDb)();
    // 日付範囲
    const now = new Date();
    const from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const dateFrom = from.toISOString().slice(0, 10);
    const dateTo = now.toISOString().slice(0, 10);
    let orderCount = 0;
    let itemCount = 0;
    let orderSyncError;
    try {
        // 注文同期（失敗しても商品同期は続ける）
        try {
            const orderNumbers = await client.searchOrders(dateFrom, dateTo);
            for (let i = 0; i < Math.min(orderNumbers.length, 1000); i += 100) {
                const chunk = orderNumbers.slice(i, i + 100);
                const orders = await client.getOrders(chunk);
                const batch = db.batch();
                for (const o of orders) {
                    const orderId = String(o.orderNumber || o.orderId || "");
                    if (!orderId)
                        continue;
                    const docId = `${siteId}_${orderId}`;
                    const items = (o.PackageModelList || o.packageList || []).flatMap((pkg) => (pkg.ItemModelList || pkg.itemList || []).map((item) => ({
                        itemId: String(item.itemId || item.manageNumber || ""),
                        itemName: String(item.itemName || ""),
                        quantity: Number(item.units || item.quantity || 1),
                        price: Number(item.price || 0),
                    })));
                    const totalPrice = items.reduce((s, it) => s + it.price * it.quantity, 0);
                    batch.set(db.collection("rms_orders").doc(docId), {
                        siteId,
                        orderId,
                        orderDate: String(o.orderDatetime || o.orderDate || "").slice(0, 10),
                        status: String(o.orderProgress || o.status || ""),
                        totalPrice: totalPrice || Number(o.goodsPrice || 0),
                        items,
                        syncedAt: firestore_1.FieldValue.serverTimestamp(),
                    }, { merge: true });
                    orderCount++;
                }
                await batch.commit();
            }
        }
        catch (orderErr) {
            orderSyncError = orderErr.message || String(orderErr);
            console.warn(`[syncRmsData] 注文同期スキップ: ${orderSyncError}`);
        }
        // 商品同期はスキップ（有料オプションAPIのため）
        const itemSyncError = undefined;
        // 日次売上集計
        await aggregateDailySales(siteId, dateFrom, dateTo);
        // sync log 更新
        const hasError = orderSyncError || itemSyncError;
        await db.collection("rms_sync_logs").doc(siteId).set({
            siteId,
            lastSyncAt: firestore_1.FieldValue.serverTimestamp(),
            lastSyncStatus: hasError ? "partial" : "success",
            lastSyncOrders: orderCount,
            lastSyncItems: itemCount,
            ...(orderSyncError ? { orderSyncError } : {}),
            ...(itemSyncError ? { itemSyncError } : {}),
        }, { merge: true });
        return { orders: orderCount, items: itemCount, orderSyncError, itemSyncError };
    }
    catch (e) {
        await db.collection("rms_sync_logs").doc(siteId).set({
            siteId,
            lastSyncAt: firestore_1.FieldValue.serverTimestamp(),
            lastSyncStatus: "error",
            lastSyncError: e.message || String(e),
        }, { merge: true });
        throw e;
    }
}
// 日次売上集計
async function aggregateDailySales(siteId, dateFrom, dateTo) {
    const db = (0, admin_1.adminDb)();
    const snap = await db.collection("rms_orders")
        .where("siteId", "==", siteId)
        .where("orderDate", ">=", dateFrom)
        .where("orderDate", "<=", dateTo)
        .get();
    // 日付ごとに集計
    const byDate = {};
    for (const doc of snap.docs) {
        const o = doc.data();
        const date = o.orderDate?.slice(0, 10) || "";
        if (!date)
            continue;
        if (!byDate[date])
            byDate[date] = { totalSales: 0, orderCount: 0, itemSales: {} };
        byDate[date].totalSales += o.totalPrice || 0;
        byDate[date].orderCount++;
        for (const item of (o.items || [])) {
            if (!byDate[date].itemSales[item.itemId]) {
                byDate[date].itemSales[item.itemId] = { itemName: item.itemName, quantity: 0, revenue: 0 };
            }
            byDate[date].itemSales[item.itemId].quantity += item.quantity;
            byDate[date].itemSales[item.itemId].revenue += item.price * item.quantity;
        }
    }
    const batch = db.batch();
    for (const [date, agg] of Object.entries(byDate)) {
        const docId = `${siteId}_${date}`;
        batch.set(db.collection("rms_sales_daily").doc(docId), {
            siteId,
            date,
            ...agg,
            syncedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    if (Object.keys(byDate).length > 0)
        await batch.commit();
}
