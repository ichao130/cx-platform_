"use strict";
// functions/src/services/misoca.ts
// MISOCA API v3 ヘルパー：トークン管理・請求書発行・メール送信
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMisocaAccessToken = getMisocaAccessToken;
exports.getMisocaStatus = getMisocaStatus;
exports.sendMisocaInvoicesJob = sendMisocaInvoicesJob;
const admin_1 = require("./admin");
const firestore_1 = require("firebase-admin/firestore");
const MISOCA_API_BASE = "https://app.misoca.jp";
const MISOCA_TOKEN_URL = "https://app.misoca.jp/oauth2/token";
const SYSTEM_CONFIG_DOC = "system_config";
const MISOCA_DOC = "misoca";
/** Firestore からMISOCAトークン情報を取得 */
async function getMisocaTokenData() {
    const db = (0, admin_1.adminDb)();
    const snap = await db.collection(SYSTEM_CONFIG_DOC).doc(MISOCA_DOC).get();
    if (!snap.exists)
        return null;
    const data = snap.data();
    if (!data?.access_token || !data?.refresh_token)
        return null;
    return data;
}
/** アクセストークンを取得（期限切れなら自動リフレッシュ） */
async function getMisocaAccessToken(clientId, clientSecret) {
    const tokenData = await getMisocaTokenData();
    if (!tokenData)
        throw new Error("MISOCA が未連携です。バックヤードから連携してください。");
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at || 0);
    const bufferMs = 5 * 60 * 1000; // 5分前に更新
    if (now < new Date(expiresAt.getTime() - bufferMs)) {
        return tokenData.access_token;
    }
    // リフレッシュ
    const params = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenData.refresh_token,
    });
    const resp = await fetch(MISOCA_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
    });
    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`MISOCA token refresh failed (${resp.status}): ${errText}`);
    }
    const json = await resp.json();
    const newAccessToken = json.access_token;
    const newRefreshToken = (json.refresh_token || tokenData.refresh_token);
    const newExpiresAt = new Date(now.getTime() + (json.expires_in || 7200) * 1000).toISOString();
    await (0, admin_1.adminDb)().collection(SYSTEM_CONFIG_DOC).doc(MISOCA_DOC).set({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_at: newExpiresAt,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log("[MISOCA] トークンをリフレッシュしました");
    return newAccessToken;
}
/** MISOCA 接続状態を取得 */
async function getMisocaStatus() {
    const data = await getMisocaTokenData();
    if (!data)
        return { connected: false };
    return {
        connected: true,
        connectedAt: data.connected_at || null,
        expiresAt: data.expires_at || null,
    };
}
/** MISOCA に請求書を作成してメール送信 */
async function createAndSendInvoice(accessToken, opts) {
    // 住所を結合（設定されているものだけ）
    const addressParts = [
        opts.recipientZip ? `〒${opts.recipientZip}` : null,
        opts.recipientPrefecture,
        opts.recipientCity,
        opts.recipientAddress,
    ].filter(Boolean);
    const recipientAddress = addressParts.join(" ");
    // 請求書作成
    const invoicePayload = {
        invoice: {
            title: `${opts.yearMonth}分 MOKKEDA プラットフォーム利用料`,
            invoice_date: opts.invoiceDate,
            payment_due_on: opts.paymentDueOn,
            recipient_name: opts.recipientName,
            recipient_email: opts.recipientEmail,
            ...(recipientAddress ? { recipient_address: recipientAddress } : {}),
            invoice_items: [
                {
                    name: `MOKKEDA プラットフォーム${opts.planDisplayName}利用料`,
                    quantity: 1,
                    unit_price: opts.priceMonthly,
                    tax_type: 5, // 10%課税（MISOCA v3: 5=10%） ※要確認
                },
            ],
        },
    };
    const createResp = await fetch(`${MISOCA_API_BASE}/api/v3/invoices`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(invoicePayload),
    });
    if (!createResp.ok) {
        const errText = await createResp.text();
        throw new Error(`MISOCA 請求書作成失敗 (${createResp.status}): ${errText}`);
    }
    const created = await createResp.json();
    const invoiceId = String(created.id || created?.invoice?.id || "");
    if (!invoiceId)
        throw new Error("MISOCA から invoiceId が取得できませんでした");
    // メール送信
    const mailPayload = {
        to: opts.recipientEmail,
        subject: `【MOKKEDA】${opts.yearMonth}分 請求書のご送付`,
        body: [
            `${opts.recipientName} ご担当者様`,
            "",
            `いつもMOKKEDAをご利用いただきありがとうございます。`,
            `${opts.yearMonth}分の請求書をお送りいたします。`,
            `ご確認のほど、よろしくお願いいたします。`,
            "",
            `株式会社ブランベリー`,
            `MOKKEDAサポートチーム`,
        ].join("\n"),
    };
    const sendResp = await fetch(`${MISOCA_API_BASE}/api/v3/invoices/${invoiceId}/send_mail`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(mailPayload),
    });
    if (!sendResp.ok) {
        // 請求書自体は作成済みなのでエラーでもログを残す
        const errText = await sendResp.text();
        console.warn(`[MISOCA] invoiceId=${invoiceId} のメール送信失敗 (${sendResp.status}): ${errText}`);
    }
    return { invoiceId };
}
/** 請求書発行メイン処理（スケジューラー・手動トリガー共用） */
async function sendMisocaInvoicesJob(clientId, clientSecret) {
    const db = (0, admin_1.adminDb)();
    // JST で今月の年月を計算
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const year = jst.getUTCFullYear();
    const month = jst.getUTCMonth() + 1;
    const yearMonth = `${year}年${month}月`;
    const yearMonthKey = `${year}${String(month).padStart(2, "0")}`;
    const invoiceDate = `${year}-${String(month).padStart(2, "0")}-25`;
    // 翌月末日計算
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
    const paymentDueOn = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    console.log(`[MISOCA] 請求書発行開始: ${yearMonth} 発行日=${invoiceDate} 支払期限=${paymentDueOn}`);
    const accessToken = await getMisocaAccessToken(clientId, clientSecret);
    // 対象ワークスペース：manual / active / paid
    const [wsBillingSnap, plansSnap, allWsSnap] = await Promise.all([
        db.collection("workspace_billing")
            .where("status", "==", "active")
            .where("provider", "==", "manual")
            .get(),
        db.collection("plans").get(),
        db.collection("workspaces").get(),
    ]);
    // plans マップ（code → data）
    const plansMap = {};
    for (const d of plansSnap.docs) {
        const data = d.data();
        if (data.code)
            plansMap[data.code] = { id: d.id, ...data };
    }
    // workspaces マップ（id → billing contact data）
    const wsMap = {};
    for (const d of allWsSnap.docs) {
        wsMap[d.id] = d.data().billing || {};
    }
    let success = 0, skipped = 0, errors = 0;
    const details = [];
    for (const billingDoc of wsBillingSnap.docs) {
        const wsId = billingDoc.id;
        const wsBilling = billingDoc.data();
        const wsBillingLegacy = wsMap[wsId] || {};
        // freeプランはスキップ
        if (!wsBilling.plan || wsBilling.plan === "free") {
            skipped++;
            continue;
        }
        // 請求先メール（workspace_billing → workspaces.billing の順で探す）
        const recipientEmail = wsBilling.billing_email || wsBillingLegacy.billing_email || "";
        if (!recipientEmail) {
            console.warn(`[MISOCA] wsId=${wsId}: billing_email 未設定 → スキップ`);
            skipped++;
            details.push({ wsId, status: "skipped", reason: "billing_email_missing" });
            continue;
        }
        // 重複チェック（今月既に発行済み）
        const logRef = db.collection("invoice_logs").doc(`${wsId}_${yearMonthKey}`);
        const logSnap = await logRef.get();
        if (logSnap.exists) {
            skipped++;
            details.push({ wsId, status: "skipped", reason: "already_issued" });
            continue;
        }
        const plan = plansMap[wsBilling.plan];
        if (!plan || !plan.price_monthly) {
            console.warn(`[MISOCA] wsId=${wsId}: plan="${wsBilling.plan}" の price_monthly が未設定 → スキップ`);
            skipped++;
            details.push({ wsId, status: "skipped", reason: "plan_price_missing" });
            continue;
        }
        const recipientName = wsBilling.billing_company_name || wsBillingLegacy.billing_company_name || "ご担当者様";
        const recipientZip = wsBilling.billing_zip || wsBillingLegacy.billing_zip || null;
        const recipientPrefecture = wsBilling.billing_prefecture || wsBillingLegacy.billing_prefecture || null;
        const recipientCity = wsBilling.billing_city || wsBillingLegacy.billing_city || null;
        const recipientAddress = wsBilling.billing_address || wsBillingLegacy.billing_address || null;
        try {
            const { invoiceId } = await createAndSendInvoice(accessToken, {
                recipientName,
                recipientEmail,
                recipientZip,
                recipientPrefecture,
                recipientCity,
                recipientAddress,
                planDisplayName: `「${plan.name}」`,
                priceMonthly: plan.price_monthly,
                invoiceDate,
                paymentDueOn,
                yearMonth,
            });
            // 発行ログを保存
            await logRef.set({
                workspaceId: wsId,
                yearMonth: yearMonthKey,
                invoiceId,
                plan: wsBilling.plan,
                planName: plan.name,
                amount: plan.price_monthly,
                recipientEmail,
                recipientName,
                invoiceDate,
                paymentDueOn,
                sentAt: firestore_1.FieldValue.serverTimestamp(),
                status: "sent",
            });
            success++;
            details.push({ wsId, status: "sent", invoiceId, recipientEmail });
            console.log(`[MISOCA] wsId=${wsId}: invoiceId=${invoiceId} 送信完了 → ${recipientEmail}`);
        }
        catch (e) {
            errors++;
            details.push({ wsId, status: "error", error: e?.message || String(e) });
            console.error(`[MISOCA] wsId=${wsId}: エラー:`, e);
        }
    }
    console.log(`[MISOCA] 完了: success=${success} skipped=${skipped} errors=${errors}`);
    return { success, skipped, errors, details };
}
