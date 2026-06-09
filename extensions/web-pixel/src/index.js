// MOKKEDA Web Pixel — checkout_completed トラッキング
// settings.siteId / settings.siteKey は webPixelCreate 時に注入される

const API_URL = "https://asia-northeast1-cx-platform-v1.cloudfunctions.net/api/v1/log";

analytics.subscribe("checkout_completed", async (event) => {
  const checkout = event.data.checkout;
  const settings = analytics.getSettings();
  const siteId   = settings.siteId  || "";
  const siteKey  = settings.siteKey || "";
  if (!siteId) return;

  const revenue  = parseFloat(String(checkout.totalPrice?.amount || "0")) || 0;
  const orderId  = String(checkout.order?.id || checkout.token || "");
  const currency = String(checkout.totalPrice?.currencyCode || "JPY");

  // vid / sid をクッキーから取得（sdk.js が書き込む）
  const _vidRaw  = await browser.cookie.get("cx_vid");
  const vid      = _vidRaw && typeof _vidRaw === "object" ? String(_vidRaw.value || "") : String(_vidRaw || "");
  const _sidRaw  = await browser.cookie.get("cx_sid_" + siteId);
  const sid      = _sidRaw && typeof _sidRaw === "object" ? String(_sidRaw.value || "") : String(_sidRaw || "");

  // カート属性から scenario_id を取得（SDK が書き込む）
  const _attrs     = Array.isArray(checkout.attributes) ? checkout.attributes : [];
  const scenarioId = String((_attrs.find(function(a) { return a.key === "_cx_scenario_id"; }) || {}).value || "") || null;

  // 商品リスト
  let items = [];
  try {
    items = Array.from(checkout.lineItems || []).map(function(item) {
      var q = Number(item.quantity) || 1;
      var t = parseFloat(String(
        (item.discountedTotalPrice && item.discountedTotalPrice.amount)
        || (item.originalTotalPrice && item.originalTotalPrice.amount)
        || (item.variant && item.variant.price && item.variant.price.amount)
        || "0"
      ));
      return {
        title: String(item.title || (item.variant && item.variant.product && item.variant.product.title) || ""),
        qty:   q,
        price: t > 0 ? parseFloat((t / q).toFixed(2)) : 0,
      };
    });
  } catch (e) {}

  // 適用クーポンコード
  var discountCodes = (checkout.discountApplications || [])
    .filter(function(d) { return d.type === "DISCOUNT_CODE" && d.title; })
    .map(function(d)    { return String(d.title).toUpperCase(); });

  browser.sendBeacon(
    API_URL,
    JSON.stringify({
      site_id:        siteId,
      site_key:       siteKey,
      event:          "purchase",
      revenue:        revenue,
      order_id:       orderId,
      currency:       currency,
      vid:            vid,
      sid:            sid,
      scenario_id:    scenarioId,
      items:          items,
      discount_codes: discountCodes,
    })
  );
});
