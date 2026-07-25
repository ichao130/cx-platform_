// functions/src/services/openaiJson.ts
import { z } from "zod";
import OpenAI from "openai";

/**
 * Vision対応版: base64画像 + テキストプロンプトでGPT-4oを呼び出し、JSONを返す
 */
export async function callOpenAIVisionJson<T extends z.ZodTypeAny>(params: {
  model: string;
  systemPrompt: string;
  userText: string;
  imageBase64: string; // base64部分のみ（data:image/png;base64, プレフィックス不要）
  schema: T;
}): Promise<z.infer<T>> {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) throw new Error("missing OPENAI_API_KEY");

  const client = new OpenAI({ apiKey });

  // Vision には Chat Completions API を使用（Responses API は画像未対応）
  const resp = await client.chat.completions.create({
    model: params.model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: params.systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${params.imageBase64}`,
              detail: "high",
            },
          },
          { type: "text", text: params.userText },
        ] as any,
      },
    ],
  });

  const text = resp.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(text);
  return params.schema.parse(parsed);
}

// このエラーはリトライで回復しうるか？（OpenAIの一時的な5xx/429/接続断/タイムアウト）
function isRetryableOpenAIError(e: any): boolean {
  const status = e?.status ?? e?.response?.status;
  if (typeof status === "number") {
    // 408 Request Timeout / 409 Conflict / 429 Rate limit / 5xx はOpenAI側の一時障害
    return status === 408 || status === 409 || status === 429 || (status >= 500 && status <= 599);
  }
  // ステータス無し = 接続断・タイムアウト（APIConnectionError / APIConnectionTimeoutError 等）
  const name = e?.name || "";
  return (
    name.includes("Connection") ||
    name.includes("Timeout") ||
    e?.code === "ETIMEDOUT" ||
    e?.code === "ECONNRESET"
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function callOpenAIJson<T extends z.ZodTypeAny>(params: {
  model: string;
  input: any;
  schema: T;
  systemPrompt?: string;
}): Promise<z.infer<T>> {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) throw new Error("missing OPENAI_API_KEY");

  // api関数のtimeoutSeconds(60s)より前にfail-fastさせる。
  // OpenAIが遅いとインフラ504(CORSヘッダ無し)→ブラウザ側"Failed to fetch"になるため、
  // 全体で50sを上限に打ち切り、残り時間でcatch側がCORS付きエラーを返せるようにする。
  const OVERALL_DEADLINE = Date.now() + 50_000; // 60s制限に対し10sの余裕
  const PER_ATTEMPT_TIMEOUT = 25_000; // 1回あたりの上限
  const MAX_ATTEMPTS = 5; // OpenAIの一時的5xx/429/接続断はここまで再試行
  const MIN_BUDGET = 3_000; // これ未満しか残ってなければ再試行しない

  const sys = params.systemPrompt ?? [
    "You are an analytics assistant for a website personalization tool.",
    "Do NOT suggest automatic changes. Provide assistive advice only.",
    "Return JSON that matches the required schema exactly.",
  ].join("\n");

  const user = JSON.stringify(params.input);

  let lastErr: any;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = OVERALL_DEADLINE - Date.now();
    if (remaining < MIN_BUDGET) break; // 予算切れ。lastErrをそのまま投げる

    // このリクエストの実タイムアウトは「残り予算」と「1回上限」の小さい方
    const attemptTimeout = Math.min(PER_ATTEMPT_TIMEOUT, remaining);
    // 自前でリトライ制御するのでSDK側の自動リトライは無効化
    const client = new OpenAI({ apiKey, timeout: attemptTimeout, maxRetries: 0 });

    try {
      const resp = await client.responses.create({
        model: params.model,
        input: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        // ★ “JSONで返せ” を強制（Responses API）
        text: { format: { type: "json_object" } },
      });

      const text = resp.output_text || "{}";
      const parsed = JSON.parse(text);
      return params.schema.parse(parsed);
    } catch (e: any) {
      lastErr = e;
      // リトライ不可（4xxの入力エラー等）またはこれが最終試行なら即throw
      if (attempt >= MAX_ATTEMPTS || !isRetryableOpenAIError(e)) throw e;

      // 指数バックオフ（0.5s→1s→2s→4s、上限4s）。残り予算も超えないよう抑える
      const backoff = Math.min(500 * 2 ** (attempt - 1), 4_000);
      const wait = Math.min(backoff, Math.max(0, OVERALL_DEADLINE - Date.now() - MIN_BUDGET));
      if (wait <= 0) break; // 待つと予算切れになるなら再試行せず終了
      console.warn(
        `[callOpenAIJson] retryable error (attempt ${attempt}/${MAX_ATTEMPTS}, status=${e?.status ?? "n/a"}), retrying in ${wait}ms`
      );
      await sleep(wait);
    }
  }

  throw lastErr;
}