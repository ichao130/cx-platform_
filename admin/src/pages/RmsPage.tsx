import React, { useState, useEffect, useMemo } from "react";
import { getAuth } from "firebase/auth";

// ユーティリティ
function apiBase() {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5001/cx-platform-v1/asia-northeast1/api";
  }
  return "https://asia-northeast1-cx-platform-v1.cloudfunctions.net/api";
}

async function apiFetch(path: string, opts?: RequestInit) {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken() : "";
  const res = await fetch(`${apiBase()}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
  return res;
}

function formatDate(str: string) {
  if (!str) return "-";
  return str.slice(0, 10);
}

function formatMoney(n: number) {
  return `¥${Number(n || 0).toLocaleString()}`;
}

type Tab = "settings" | "sales" | "orders" | "items";

type Props = {
  workspaceId: string;
};

export default function RmsPage({ workspaceId }: Props) {
  const [tab, setTab] = useState<Tab>("settings");

  // ---- 設定 ----
  const [serviceSecret, setServiceSecret] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [shopUrl, setShopUrl] = useState("");
  const [credsSaving, setCredsSaving] = useState(false);
  const [credsMsg, setCredsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [credsExists, setCredsExists] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ---- データ ----
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // 認証情報 & ステータス取得
  useEffect(() => {
    if (!workspaceId) return;
    apiFetch(`/v1/rms/credentials?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => {
        setCredsExists(d.exists);
        if (d.shopUrl) setShopUrl(d.shopUrl);
      }).catch(() => {});
    apiFetch(`/v1/rms/sync/status?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => setSyncStatus(d.exists ? d : null))
      .catch(() => {});
  }, [workspaceId]);

  // タブ切り替え時にデータ取得
  useEffect(() => {
    if (!workspaceId || !credsExists) return;
    if (tab === "orders") loadOrders();
    if (tab === "items") loadItems();
    if (tab === "sales") loadSales();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, workspaceId, credsExists]);

  async function loadOrders() {
    setDataLoading(true);
    const r = await apiFetch(`/v1/rms/orders?workspaceId=${workspaceId}`);
    const d = await r.json();
    setOrders(d.orders || []);
    setDataLoading(false);
  }

  async function loadItems() {
    setDataLoading(true);
    const r = await apiFetch(`/v1/rms/items?workspaceId=${workspaceId}`);
    const d = await r.json();
    setItems(d.items || []);
    setDataLoading(false);
  }

  async function loadSales() {
    setDataLoading(true);
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const r = await apiFetch(`/v1/rms/sales?workspaceId=${workspaceId}&from=${from}&to=${to}`);
    const d = await r.json();
    setSales(d.sales || []);
    setDataLoading(false);
  }

  async function handleSaveCreds(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceSecret || !licenseKey) return;
    setCredsSaving(true);
    setCredsMsg(null);
    try {
      const r = await apiFetch("/v1/rms/credentials", {
        method: "POST",
        body: JSON.stringify({ workspaceId, serviceSecret, licenseKey, shopUrl }),
      });
      const d = await r.json();
      if (!r.ok) {
        setCredsMsg({ type: "error", text: d.message || "保存に失敗しました" });
      } else {
        setCredsMsg({ type: "success", text: `接続成功！${d.shopName ? `（${d.shopName}）` : ""}` });
        setCredsExists(true);
        setServiceSecret("");
        setLicenseKey("");
      }
    } catch {
      setCredsMsg({ type: "error", text: "通信エラーが発生しました" });
    }
    setCredsSaving(false);
  }

  async function handleDeleteCreds() {
    if (!confirm("RMS認証情報を削除しますか？")) return;
    await apiFetch(`/v1/rms/credentials?workspaceId=${workspaceId}`, { method: "DELETE" });
    setCredsExists(false);
    setSyncStatus(null);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await apiFetch("/v1/rms/sync", {
        method: "POST",
        body: JSON.stringify({ workspaceId, daysBack: 90 }),
      });
      const d = await r.json();
      if (!r.ok) {
        setSyncMsg({ type: "error", text: d.message || "同期に失敗しました" });
      } else {
        setSyncMsg({ type: "success", text: `同期完了！注文 ${d.orders}件 / 商品 ${d.items}件` });
        // ステータス再取得
        const sr = await apiFetch(`/v1/rms/sync/status?workspaceId=${workspaceId}`);
        const sd = await sr.json();
        setSyncStatus(sd.exists ? sd : null);
      }
    } catch {
      setSyncMsg({ type: "error", text: "通信エラーが発生しました" });
    }
    setSyncing(false);
  }

  // 売上集計のトップ商品
  const topItems = useMemo(() => {
    const map: Record<string, { itemName: string; quantity: number; revenue: number }> = {};
    for (const s of sales) {
      for (const [itemId, v] of Object.entries(s.itemSales || {})) {
        const val = v as any;
        if (!map[itemId]) map[itemId] = { itemName: val.itemName, quantity: 0, revenue: 0 };
        map[itemId].quantity += val.quantity;
        map[itemId].revenue += val.revenue;
      }
    }
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 20);
  }, [sales]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "settings", label: "設定" },
    { key: "sales", label: "売上集計" },
    { key: "orders", label: "注文データ" },
    { key: "items", label: "商品データ" },
  ];

  return (
    <div className="liquid-page">
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div>
          <div className="h1" style={{ margin: 0 }}>楽天RMS連携</div>
          <div className="small" style={{ opacity: 0.6 }}>注文・商品・売上データの取得と分析</div>
        </div>
        {credsExists && (
          <span className="badge" style={{ background: "#dcfce7", color: "#15803d", borderColor: "#86efac" }}>連携済み</span>
        )}
      </div>

      {/* タブ */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid rgba(15,23,42,.1)", paddingBottom: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 16px", border: "none", background: "transparent", cursor: "pointer",
              fontWeight: tab === t.key ? 700 : 400, fontSize: 13,
              borderBottom: tab === t.key ? "2px solid #6366f1" : "2px solid transparent",
              color: tab === t.key ? "#6366f1" : "inherit",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---- 設定タブ ---- */}
      {tab === "settings" && (
        <div style={{ maxWidth: 560 }}>
          <div className="card">
            <div className="h2">RMS認証情報</div>
            <div className="small" style={{ marginBottom: 12, opacity: 0.7 }}>
              楽天RMS管理画面 → API設定から取得できます。入力した認証情報はサーバーに安全に保管され、管理画面には表示されません。
            </div>

            {credsExists && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #86efac", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#15803d", fontSize: 13 }}>認証情報が登録されています</div>
                  {shopUrl && <div className="small" style={{ color: "#15803d" }}>{shopUrl}</div>}
                </div>
                <button className="btn" onClick={handleDeleteCreds} style={{ fontSize: 11, padding: "4px 10px" }}>削除</button>
              </div>
            )}

            <form onSubmit={handleSaveCreds}>
              <div style={{ marginBottom: 12 }}>
                <div className="h2">serviceSecret</div>
                <input className="input" type="password" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={serviceSecret} onChange={(e) => setServiceSecret(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div className="h2">licenseKey</div>
                <input className="input" type="password" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div className="h2">ショップURL（任意）</div>
                <input className="input" type="url" placeholder="https://www.rakuten.co.jp/yourshop/" value={shopUrl} onChange={(e) => setShopUrl(e.target.value)} />
              </div>
              {credsMsg && (
                <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 12, background: credsMsg.type === "success" ? "#f0fdf4" : "#fef2f2", color: credsMsg.type === "success" ? "#15803d" : "#dc2626", fontSize: 13 }}>
                  {credsMsg.text}
                </div>
              )}
              <button className="btn" type="submit" disabled={credsSaving} style={{ background: "#6366f1", color: "#fff" }}>
                {credsSaving ? "接続確認中..." : credsExists ? "認証情報を更新" : "認証情報を保存"}
              </button>
            </form>
          </div>

          {credsExists && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="h2">データ同期</div>
              {syncStatus && (
                <div className="small" style={{ marginBottom: 12, opacity: 0.7 }}>
                  最終同期: {syncStatus.lastSyncAt?.toDate?.()?.toLocaleString("ja-JP") || "-"}
                  {" "} / ステータス: <span style={{ color: syncStatus.lastSyncStatus === "success" ? "#15803d" : "#dc2626" }}>{syncStatus.lastSyncStatus}</span>
                  {syncStatus.lastSyncOrders != null && ` / 注文 ${syncStatus.lastSyncOrders}件 商品 ${syncStatus.lastSyncItems}件`}
                </div>
              )}
              <div className="small" style={{ marginBottom: 12, opacity: 0.7 }}>
                過去90日分の注文・商品・在庫データを取得します。毎日AM4時に自動同期されます。
              </div>
              {syncMsg && (
                <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 12, background: syncMsg.type === "success" ? "#f0fdf4" : "#fef2f2", color: syncMsg.type === "success" ? "#15803d" : "#dc2626", fontSize: 13 }}>
                  {syncMsg.text}
                </div>
              )}
              <button className="btn" onClick={handleSync} disabled={syncing} style={{ background: "#0f172a", color: "#fff" }}>
                {syncing ? "同期中..." : "今すぐ同期"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---- 売上集計タブ ---- */}
      {tab === "sales" && (
        <div>
          {!credsExists ? (
            <div className="card"><div className="small">先に設定タブでRMS認証情報を登録してください。</div></div>
          ) : dataLoading ? (
            <div className="small" style={{ opacity: 0.6 }}>読み込み中...</div>
          ) : (
            <>
              {/* 日次グラフ（簡易テキスト表） */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="h2">日次売上（直近30日）</div>
                {sales.length === 0 ? (
                  <div className="small" style={{ opacity: 0.6 }}>データがありません。同期を実行してください。</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(15,23,42,.1)" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px" }}>日付</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>売上</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>注文数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((s) => (
                        <tr key={s.id} style={{ borderBottom: "1px solid rgba(15,23,42,.06)" }}>
                          <td style={{ padding: "6px 8px" }}>{s.date}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{formatMoney(s.totalSales)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right" }}>{s.orderCount}件</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* 商品別売上TOP */}
              <div className="card">
                <div className="h2">商品別売上TOP（直近30日）</div>
                {topItems.length === 0 ? (
                  <div className="small" style={{ opacity: 0.6 }}>データがありません。</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(15,23,42,.1)" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px" }}>商品</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>売上</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>個数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topItems.map(([itemId, v]) => (
                        <tr key={itemId} style={{ borderBottom: "1px solid rgba(15,23,42,.06)" }}>
                          <td style={{ padding: "6px 8px" }}><div style={{ fontWeight: 600 }}>{v.itemName || itemId}</div><div className="small" style={{ opacity: 0.5 }}>{itemId}</div></td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{formatMoney(v.revenue)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right" }}>{v.quantity}個</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ---- 注文タブ ---- */}
      {tab === "orders" && (
        <div>
          {!credsExists ? (
            <div className="card"><div className="small">先に設定タブでRMS認証情報を登録してください。</div></div>
          ) : dataLoading ? (
            <div className="small" style={{ opacity: 0.6 }}>読み込み中...</div>
          ) : (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div className="h2" style={{ margin: 0 }}>注文データ（直近100件）</div>
                <button className="btn" onClick={loadOrders} style={{ fontSize: 11 }}>更新</button>
              </div>
              {orders.length === 0 ? (
                <div className="small" style={{ opacity: 0.6 }}>データがありません。同期を実行してください。</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(15,23,42,.1)" }}>
                      <th style={{ textAlign: "left", padding: "6px 8px" }}>注文番号</th>
                      <th style={{ textAlign: "left", padding: "6px 8px" }}>注文日</th>
                      <th style={{ textAlign: "left", padding: "6px 8px" }}>ステータス</th>
                      <th style={{ textAlign: "right", padding: "6px 8px" }}>金額</th>
                      <th style={{ textAlign: "right", padding: "6px 8px" }}>商品数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} style={{ borderBottom: "1px solid rgba(15,23,42,.06)" }}>
                        <td style={{ padding: "6px 8px" }}><code style={{ fontSize: 11 }}>{o.orderId}</code></td>
                        <td style={{ padding: "6px 8px" }}>{formatDate(o.orderDate)}</td>
                        <td style={{ padding: "6px 8px" }}>{o.status || "-"}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{formatMoney(o.totalPrice)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>{(o.items || []).length}点</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- 商品タブ ---- */}
      {tab === "items" && (
        <div>
          {!credsExists ? (
            <div className="card"><div className="small">先に設定タブでRMS認証情報を登録してください。</div></div>
          ) : dataLoading ? (
            <div className="small" style={{ opacity: 0.6 }}>読み込み中...</div>
          ) : (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div className="h2" style={{ margin: 0 }}>商品データ（最大200件）</div>
                <button className="btn" onClick={loadItems} style={{ fontSize: 11 }}>更新</button>
              </div>
              {items.length === 0 ? (
                <div className="small" style={{ opacity: 0.6 }}>データがありません。同期を実行してください。</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(15,23,42,.1)" }}>
                      <th style={{ textAlign: "left", padding: "6px 8px" }}>商品名</th>
                      <th style={{ textAlign: "right", padding: "6px 8px" }}>価格</th>
                      <th style={{ textAlign: "right", padding: "6px 8px" }}>在庫</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid rgba(15,23,42,.06)" }}>
                        <td style={{ padding: "6px 8px" }}>
                          <div style={{ fontWeight: 600 }}>{item.itemName}</div>
                          <div className="small" style={{ opacity: 0.5 }}>{item.itemUrl}</div>
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>{formatMoney(item.itemPrice)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>
                          {item.inventory === -1 ? "在庫管理なし" : `${item.inventory}点`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
