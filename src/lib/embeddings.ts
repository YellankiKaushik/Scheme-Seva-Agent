// Text embeddings adapter. Prefers Google Gemini directly when GEMINI_API_KEY
// is set; otherwise routes through the Lovable AI Gateway using
// `google/gemini-embedding-001` when LOVABLE_API_KEY is set. Returns null
// when no embedding provider is configured so callers can fall back cleanly.

export type EmbeddingProvider = "gemini-direct" | "lovable-gateway" | "none";

export function embeddingsConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY);
}

export function embeddingsProvider(): EmbeddingProvider {
    if (process.env.GEMINI_API_KEY) return "gemini-direct";
    if (process.env.LOVABLE_API_KEY) return "lovable-gateway";
    return "none";
}

export async function embedText(text: string): Promise<number[] | null> {
    const provider = embeddingsProvider();
    const clean = text.slice(0, 4000);
    try {
        if (provider === "gemini-direct") {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        content: { parts: [{ text: clean }] },
                    }),
                },
            );
            if (!res.ok) return null;
            const j = (await res.json()) as { embedding?: { values?: number[] } };
            return j.embedding?.values ?? null;
        }
        if (provider === "lovable-gateway") {
            const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Lovable-API-Key": process.env.LOVABLE_API_KEY!,
                },
                body: JSON.stringify({
                    model: "google/gemini-embedding-001",
                    input: clean,
                }),
            });
            if (!res.ok) return null;
            const j = (await res.json()) as {
                data?: Array<{ embedding?: number[] }>;
            };
            return j.data?.[0]?.embedding ?? null;
        }
        return null;
    } catch {
        return null;
    }
}
