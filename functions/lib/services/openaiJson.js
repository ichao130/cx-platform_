"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callOpenAIJson = callOpenAIJson;
const openai_1 = __importDefault(require("openai"));
async function callOpenAIJson(params) {
    const apiKey = process.env.OPENAI_API_KEY || "";
    if (!apiKey)
        throw new Error("missing OPENAI_API_KEY");
    const client = new openai_1.default({ apiKey });
    const sys = [
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
