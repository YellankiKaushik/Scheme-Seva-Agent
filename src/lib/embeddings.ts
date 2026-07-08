// Text embeddings adapter. Google Gemini is the primary embeddings provider.
// Returns null when GEMINI_API_KEY is missing so callers can fall back to
// deterministic keyword search without blocking the demo.

export type EmbeddingProvider = "gemini-direct" | "none";

export function embeddingsConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function embeddingsProvider(): EmbeddingProvider {
  if (process.env.GEMINI_API_KEY) return "gemini-direct";
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
    return null;
  } catch {
    return null;
  }
}
