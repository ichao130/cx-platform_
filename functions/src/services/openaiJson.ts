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

export async function callOpenAIJson<T extends z.ZodTypeAny>(params: {
  model: string;
  input: any;
  schema: T;
  systemPrompt?: string;
}): Promise<z.infer<T>> {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) throw new Error("missing OPENAI_API_KEY");

  const client = new OpenAI({ apiKey });

  const sys = params.systemPrompt ?? [
    "You are an analytics assistant for a website personalization tool.",
    "Do NOT suggest automatic changes. Provide assistive advice only.",
    "Return JSON that matches the required schema exactly.",
  ].join("\n");

  const user = JSON.stringify(params.input);

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
}