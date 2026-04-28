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
    // 接続テスト用: ショップ情報取得
    async testConnection() {
        try {
            const res = await fetch(`${this.baseUrl}/shop/get`, {
                headers: { Authorization: this.authHeader, "Content-Type": "application/json" },
            });
            if (!res.ok)
                return { ok: false, error: `HTTP ${res.status}` };
            const data = await res.json();
            return { ok: true, shopName: data?.shopGetResult?.shopName || "" };
        }
        catch (e) {
            return { ok: false, error: e.message };
        }
    }
    // 注文検索（dateFrom〜dateTo の期間）
    // RMS Order API 2.0: POST /order/searchOrder
    async searchOrders(dateFrom, dateTo) {
        const body = {
            dateType: 1, // 注文日
            startDatetime: `${dateFrom} 00:00:00`,
            endDatetime: `${dateTo} 23:59:59`,
            PaginationRequestModel: { requestRecordsAmount: 1000, requestPage: 1 },
        };
        const res = await fetch(`${this.baseUrl}/order/searchOrder`, {
            method: "POST",
            headers: { Authorization: this.authHeader, "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!res.ok)
            throw new Error(`searchOrder HTTP ${res.status}`);
        const data = await res.json();
        return data?.orderNumberList || [];
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
    // 商品検索: GET /item/search
    async searchItems(offset = 0, limit = 100) {
        const res = await fetch(`${this.baseUrl}/item/search?hits=${limit}&offset=${offset}`, { headers: { Authorization: this.authHeader, "Content-Type": "application/json" } });
        if (!res.ok)
            throw new Error(`item/search HTTP ${res.status}`);
        return await res.json();
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
    try {
        // 注文同期
        const orderNumbers = await client.searchOrders(dateFrom, dateTo);
        // 100件ずつ取得
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
        // 商品同期
        let offset = 0;
        while (true) {
            const result = await client.searchItems(offset, 100);
            const itemList = result?.itemSearchResult?.itemList || result?.Items || [];
            if (!itemList.length)
                break;
            const batch = db.batch();
            for (const item of itemList) {
                const itemUrl = String(item.itemUrl || item.manageNumber || "");
                if (!itemUrl)
                    continue;
                const docId = `${siteId}_${itemUrl}`;
                batch.set(db.collection("rms_items").doc(docId), {
                    siteId,
                    itemUrl,
                    itemName: String(item.itemName || ""),
                    itemPrice: Number(item.itemPrice || 0),
                    inventory: Number(item.inventoryRelatedFlag === 1 ? (item.normalInventoryNum || 0) : -1),
                    syncedAt: firestore_1.FieldValue.serverTimestamp(),
                }, { merge: true });
                itemCount++;
            }
            await batch.commit();
            if (itemList.length < 100)
                break;
            offset += 100;
        }
        // 日次売上集計
        await aggregateDailySales(siteId, dateFrom, dateTo);
        // sync log 更新
        await db.collection("rms_sync_logs").doc(siteId).set({
            siteId,
            lastSyncAt: firestore_1.FieldValue.serverTimestamp(),
            lastSyncStatus: "success",
            lastSyncOrders: orderCount,
            lastSyncItems: itemCount,
        }, { merge: true });
        return { orders: orderCount, items: itemCount };
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
