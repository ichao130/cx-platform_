import { adminDb } from "./admin";
import { FieldValue } from "firebase-admin/firestore";

// =====================
// Types
// =====================
export type RmsCredentials = {
  workspaceId: string;
  serviceSecret: string;
  licenseKey: string;
  shopUrl?: string;
  enabled: boolean;
  createdAt?: any;
  updatedAt?: any;
};

export type RmsOrder = {
  workspaceId: string;
  orderId: string;
  orderDate: string; // ISO string
  status: string;
  totalPrice: number;
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
  }>;
  syncedAt?: any;
};

export type RmsItem = {
  workspaceId: string;
  itemUrl: string;
  itemName: string;
  itemPrice: number;
  inventory: number;
  syncedAt?: any;
};

export type RmsSalesDaily = {
  workspaceId: string;
  date: string; // YYYY-MM-DD
  totalSales: number;
  orderCount: number;
  itemSales: Record<string, { itemName: string; quantity: number; revenue: number }>;
  syncedAt?: any;
};

// =====================
// RMS API Client
// =====================
export class RmsClient {
  private authHeader: string;
  private baseUrl = "https://api.rms.rakuten.co.jp/es/2.0";

  constructor(serviceSecret: string, licenseKey: string) {
    const encoded = Buffer.from(`${serviceSecret}:${licenseKey}`).toString("base64");
    this.authHeader = `ESA ${encoded}`;
  }

  // 接続テスト用: ショップ情報取得
  async testConnection(): Promise<{ ok: boolean; shopName?: string; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/shop/get`, {
        headers: { Authorization: this.authHeader, "Content-Type": "application/json" },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const data = await res.json() as any;
      return { ok: true, shopName: data?.shopGetResult?.shopName || "" };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // 注文検索（dateFrom〜dateTo の期間）
  // RMS Order API 2.0: POST /order/searchOrder
  async searchOrders(dateFrom: string, dateTo: string): Promise<any[]> {
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
    if (!res.ok) throw new Error(`searchOrder HTTP ${res.status}`);
    const data = await res.json() as any;
    return data?.orderNumberList || [];
  }

  // 注文詳細取得: POST /order/getOrder
  async getOrders(orderNumbers: string[]): Promise<any[]> {
    if (!orderNumbers.length) return [];
    const res = await fetch(`${this.baseUrl}/order/getOrder`, {
      method: "POST",
      headers: { Authorization: this.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumberList: orderNumbers.slice(0, 100) }),
    });
    if (!res.ok) throw new Error(`getOrder HTTP ${res.status}`);
    const data = await res.json() as any;
    return data?.orderModelList || [];
  }

  // 商品検索: GET /item/search
  async searchItems(offset = 0, limit = 100): Promise<any> {
    const res = await fetch(
      `${this.baseUrl}/item/search?hits=${limit}&offset=${offset}`,
      { headers: { Authorization: this.authHeader, "Content-Type": "application/json" } }
    );
    if (!res.ok) throw new Error(`item/search HTTP ${res.status}`);
    return await res.json();
  }
}

// =====================
// Credentials CRUD
// =====================
const CREDS_COLLECTION = "rms_credentials";

export async function getRmsCredentials(workspaceId: string): Promise<RmsCredentials | null> {
  const db = adminDb();
  const snap = await db.collection(CREDS_COLLECTION).doc(workspaceId).get();
  if (!snap.exists) return null;
  return { workspaceId, ...snap.data() } as RmsCredentials;
}

export async function saveRmsCredentials(
  workspaceId: string,
  data: { serviceSecret: string; licenseKey: string; shopUrl?: string; enabled?: boolean }
): Promise<void> {
  const db = adminDb();
  await db.collection(CREDS_COLLECTION).doc(workspaceId).set({
    workspaceId,
    serviceSecret: data.serviceSecret,
    licenseKey: data.licenseKey,
    shopUrl: data.shopUrl || "",
    enabled: data.enabled ?? true,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function deleteRmsCredentials(workspaceId: string): Promise<void> {
  const db = adminDb();
  await db.collection(CREDS_COLLECTION).doc(workspaceId).delete();
}

// =====================
// Sync Logic
// =====================
export async function syncRmsData(workspaceId: string, daysBack = 90): Promise<{
  orders: number; items: number; message?: string;
}> {
  const creds = await getRmsCredentials(workspaceId);
  if (!creds || !creds.enabled) throw new Error("RMS credentials not found or disabled");

  const client = new RmsClient(creds.serviceSecret, creds.licenseKey);
  const db = adminDb();

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
        if (!orderId) continue;
        const docId = `${workspaceId}_${orderId}`;
        const items = (o.PackageModelList || o.packageList || []).flatMap((pkg: any) =>
          (pkg.ItemModelList || pkg.itemList || []).map((item: any) => ({
            itemId: String(item.itemId || item.manageNumber || ""),
            itemName: String(item.itemName || ""),
            quantity: Number(item.units || item.quantity || 1),
            price: Number(item.price || 0),
          }))
        );
        const totalPrice = items.reduce((s: number, it: any) => s + it.price * it.quantity, 0);
        batch.set(db.collection("rms_orders").doc(docId), {
          workspaceId,
          orderId,
          orderDate: String(o.orderDatetime || o.orderDate || "").slice(0, 10),
          status: String(o.orderProgress || o.status || ""),
          totalPrice: totalPrice || Number(o.goodsPrice || 0),
          items,
          syncedAt: FieldValue.serverTimestamp(),
        } as RmsOrder, { merge: true });
        orderCount++;
      }
      await batch.commit();
    }

    // 商品同期
    let offset = 0;
    while (true) {
      const result = await client.searchItems(offset, 100);
      const itemList: any[] = result?.itemSearchResult?.itemList || result?.Items || [];
      if (!itemList.length) break;
      const batch = db.batch();
      for (const item of itemList) {
        const itemUrl = String(item.itemUrl || item.manageNumber || "");
        if (!itemUrl) continue;
        const docId = `${workspaceId}_${itemUrl}`;
        batch.set(db.collection("rms_items").doc(docId), {
          workspaceId,
          itemUrl,
          itemName: String(item.itemName || ""),
          itemPrice: Number(item.itemPrice || 0),
          inventory: Number(item.inventoryRelatedFlag === 1 ? (item.normalInventoryNum || 0) : -1),
          syncedAt: FieldValue.serverTimestamp(),
        } as RmsItem, { merge: true });
        itemCount++;
      }
      await batch.commit();
      if (itemList.length < 100) break;
      offset += 100;
    }

    // 日次売上集計
    await aggregateDailySales(workspaceId, dateFrom, dateTo);

    // sync log 更新
    await db.collection("rms_sync_logs").doc(workspaceId).set({
      workspaceId,
      lastSyncAt: FieldValue.serverTimestamp(),
      lastSyncStatus: "success",
      lastSyncOrders: orderCount,
      lastSyncItems: itemCount,
    }, { merge: true });

    return { orders: orderCount, items: itemCount };
  } catch (e: any) {
    await db.collection("rms_sync_logs").doc(workspaceId).set({
      workspaceId,
      lastSyncAt: FieldValue.serverTimestamp(),
      lastSyncStatus: "error",
      lastSyncError: e.message || String(e),
    }, { merge: true });
    throw e;
  }
}

// 日次売上集計
export async function aggregateDailySales(workspaceId: string, dateFrom: string, dateTo: string): Promise<void> {
  const db = adminDb();
  const snap = await db.collection("rms_orders")
    .where("workspaceId", "==", workspaceId)
    .where("orderDate", ">=", dateFrom)
    .where("orderDate", "<=", dateTo)
    .get();

  // 日付ごとに集計
  const byDate: Record<string, { totalSales: number; orderCount: number; itemSales: Record<string, { itemName: string; quantity: number; revenue: number }> }> = {};
  for (const doc of snap.docs) {
    const o = doc.data() as RmsOrder;
    const date = o.orderDate?.slice(0, 10) || "";
    if (!date) continue;
    if (!byDate[date]) byDate[date] = { totalSales: 0, orderCount: 0, itemSales: {} };
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
    const docId = `${workspaceId}_${date}`;
    batch.set(db.collection("rms_sales_daily").doc(docId), {
      workspaceId,
      date,
      ...agg,
      syncedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  if (Object.keys(byDate).length > 0) await batch.commit();
}
