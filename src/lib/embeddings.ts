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

function normalizeGeminiModelPath(model: string | undefined): string {
  const clean = model?.trim() || "gemini-embedding-001";
  return clean.startsWith("models/") ? clean : `models/${clean}`;
}

export async function embedText(text: string): Promise<number[] | null> {
  const provider = embeddingsProvider();
  const clean = text.slice(0, 4000);
  try {
    if (provider === "gemini-direct") {
      const modelPath = normalizeGeminiModelPath(process.env.GEMINI_EMBEDDING_MODEL);
      const outputDimensionality = parseInt(process.env.QDRANT_VECTOR_SIZE ?? "768", 10);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelPath}:embedContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: { parts: [{ text: clean }] },
            outputDimensionality,
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
