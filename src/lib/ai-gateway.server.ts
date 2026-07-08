import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createOpenRouterProvider(apiKey: string) {
    return createOpenAICompatible({
        name: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        supportsStructuredOutputs: false,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": process.env.SCHEMESEVA_SITE_URL ?? "http://localhost:3000",
            "X-Title": "SchemeSeva",
        },
    });
}
