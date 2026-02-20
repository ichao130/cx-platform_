"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCopy3 = generateCopy3;
const openai_1 = __importDefault(require("openai"));
async function generateCopy3(params) {
    const client = new openai_1.default({ apiKey: params.apiKey });
    const sys = `You are a marketing copy assistant. Produce 3 variants in Japanese.`;
    const user = {
        goal: params.goal || "",
        base_creative: params.base_creative,
        brand_tone: params.brand_tone || {}
    };
    const res = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.8,
        messages: [
            { role: "system", content: sys },
            { role: "user", content: JSON.stringify(user) }
        ],
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "copy3",
                schema: {
                    type: "object",
                    properties: {
                        variants: {
                            type: "array",
                            minItems: 3,
                            maxItems: 3,
                            items: {
                                type: "object",
                                properties: {
                                    title: { type: "string" },
                                    body: { type: "string" },
                                    cta: { type: "string" }
                                },
                                required: ["title", "body", "cta"],
                                additionalProperties: false
                            }
                        }
                    },
                    required: ["variants"],
                    additionalProperties: false
                }
            }
        }
    });
    const content = res.choices?.[0]?.message?.content || "{}";
    return JSON.parse(content);
}
