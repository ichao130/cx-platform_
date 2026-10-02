// functions/src/services/emailTemplate.ts
//
// MOKKEDAから送るメールの共通レイアウト。
//
// 背景:
// - 招待メールはArial・黒ボタンの素朴な作りで、ロゴも無くブランドが伝わらなかった。
// - ウェルカムメールはロゴにSVGを指定していたが、GmailもOutlookもSVGを表示できない。
// - 週次レポートだけがブランド対応していて、3通がバラバラだった。
// → ここに土台をまとめ、どのメールも同じ世界観にする。
//
// 配色は admin/src/styles/global.scss の :root と、ロゴSVGの色に合わせている。

export const MAIL_BRAND = {
  teal: "#1f7a8c",     // --brand
  teal2: "#59b7c6",    // --brand-2
  mark: "#49b1b8",     // ロゴのドット
  ink: "#172b3f",      // --text
  inkSoft: "#5c6f82",  // --muted
  bg: "#f3f7fb",       // --bg
  panel: "#ffffff",
  panel2: "#f8fafd",
  border: "#e4ecf4",
};

/** メールで確実に表示されるロゴ（SVGは主要クライアントが表示できないためPNG） */
export const MAIL_LOGO_URL = "https://app.mokkeda.com/logo_mokkeda_email.png";

export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * 共通レイアウト。
 * - ロゴは白地に置く（ロゴが濃色文字のため、ブランド色に乗せると読みにくい）
 * - 画像がブロックされてもブランドが伝わるよう、altにスタイルを当てている
 * - preheader は受信箱の一覧に出る要約
 */
export function wrapEmail(args: {
  title: string;          // 見出し帯の文言
  preheader?: string;     // 受信箱プレビュー
  bodyHtml: string;       // 本文（この関数が外枠を付ける）
  footerNote?: string;    // フッターの追記
}): string {
  const B = MAIL_BRAND;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>${escapeHtml(args.title)}</title>
</head>
<body style="margin:0;padding:0;background:${B.bg};">
${args.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(args.preheader)}</div>` : ""}
<table role="presentation" width="100%" style="border-collapse:collapse;background:${B.bg};padding:26px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" style="width:600px;max-width:100%;border-collapse:collapse;background:${B.panel};border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Hiragino Sans','Noto Sans JP',sans-serif;box-shadow:0 2px 10px rgba(20,44,68,.06);">

    <tr><td style="padding:24px 24px 12px;" align="left">
      <img src="${MAIL_LOGO_URL}" width="168" height="41" alt="MOKKEDA"
           style="display:block;width:168px;max-width:168px;height:auto;border:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Hiragino Sans',sans-serif;font-size:21px;font-weight:700;color:${B.ink};letter-spacing:.04em;line-height:41px;" />
      <div style="font-size:10px;color:${B.mark};letter-spacing:.18em;margin-top:5px;">MAKE CX THANKABLE</div>
    </td></tr>

    <tr><td style="background:linear-gradient(90deg, ${B.teal}, ${B.teal2});background-color:${B.teal};padding:18px 24px;">
      <div style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:.02em;">${escapeHtml(args.title)}</div>
    </td></tr>

    <tr><td style="padding:24px;">${args.bodyHtml}</td></tr>

    <tr><td style="background:${B.panel2};padding:18px 24px;border-top:1px solid ${B.border};">
      <div style="font-size:11px;color:#9fb0c0;line-height:1.8;">
        <span style="color:${B.teal};font-weight:700;">MOKKEDA</span>　Make CX Thankable<br/>
        ${args.footerNote ? escapeHtml(args.footerNote) + "<br/>" : ""}このメールはMOKKEDAよりお送りしています。
      </div>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** ブランド色のボタン */
export function mailButton(href: string, label: string): string {
  return `<table role="presentation" style="border-collapse:collapse;margin:22px 0;"><tr><td style="border-radius:12px;background:${MAIL_BRAND.teal};">
    <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 30px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:12px;">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

/** 補足情報を並べる枠（権限・有効期限など） */
export function mailInfoBox(rows: Array<{ label: string; value: string }>): string {
  const B = MAIL_BRAND;
  return `<table role="presentation" width="100%" style="border-collapse:collapse;background:${B.panel2};border-radius:12px;margin:4px 0 2px;">
    ${rows.map((r) => `<tr>
      <td style="padding:10px 14px;font-size:12px;color:${B.inkSoft};width:110px;">${escapeHtml(r.label)}</td>
      <td style="padding:10px 14px;font-size:13px;color:${B.ink};font-weight:700;">${escapeHtml(r.value)}</td>
    </tr>`).join("")}
  </table>`;
}

/** 権限コードを日本語に（招待メールで owner / admin と出ていたのを直す） */
export function roleLabelJa(role: string): string {
  const m: Record<string, string> = {
    owner: "オーナー（すべての操作が可能）",
    admin: "管理者（ワークスペース削除以外が可能）",
    member: "メンバー（担当サイトの閲覧・編集）",
    viewer: "閲覧者（担当サイトの閲覧のみ）",
  };
  return m[String(role || "").toLowerCase()] || String(role || "");
}

/** ISO日時を「2026年10月9日 21:34」に（JST）。招待メールでISO生文字列が出ていたのを直す */
export function formatJstDateTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return "";
  // month:"long" は ja-JP だと「10月」を返すため、自前で「月」を足すと重複/欠落する。
  // 数値で取り出して組み立てる。
  const p = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value || "";
  const n = (v: string) => String(Number(v));
  return `${g("year")}年${n(g("month"))}月${n(g("day"))}日 ${g("hour")}:${g("minute")}`;
}
