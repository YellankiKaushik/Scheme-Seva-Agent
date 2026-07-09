import "dotenv/config";

// Seed Qdrant from the local SchemeSeva catalog using Gemini embeddings.
//
// Required:
//   QDRANT_URL, QDRANT_API_KEY
//
// Optional:
//   QDRANT_COLLECTION            (default: schemeseva_schemes)
//   QDRANT_SESSIONS_COLLECTION   (default: citizen_sessions)
//   QDRANT_ALERTS_COLLECTION     (default: pending_alerts)
//   QDRANT_VECTOR_SIZE           (default: 768)
//   GEMINI_API_KEY               (needed for real vector embeddings)
//   GEMINI_EMBEDDING_MODEL       (default: gemini-embedding-001)

import { localSchemes } from "../src/lib/localSchemes";

const {
  QDRANT_URL,
  QDRANT_API_KEY,
  QDRANT_COLLECTION = "schemeseva_schemes",
  QDRANT_SESSIONS_COLLECTION = "citizen_sessions",
  QDRANT_ALERTS_COLLECTION = "pending_alerts",
  QDRANT_VECTOR_SIZE = "768",
  GEMINI_API_KEY,
  GEMINI_EMBEDDING_MODEL = "gemini-embedding-001",
} = process.env;

function requireEnv(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    console.error(`Missing required environment variable: ${name}`);
    console.error("Load values from your local .env file or shell environment, then rerun pnpm seed:qdrant.");
    process.exit(1);
  }
  return value;
}

function requireGeminiApiKey(): string {
  if (!GEMINI_API_KEY?.trim()) {
    console.error("Missing optional environment variable required for this seed path: GEMINI_API_KEY");
    console.error("This script uses Gemini to create real vector embeddings and no local embedding fallback is configured.");
    process.exit(1);
  }
  return GEMINI_API_KEY;
}

const qdrantUrl = requireEnv("QDRANT_URL", QDRANT_URL).replace(/\/$/, "");
const qdrantApiKey = requireEnv("QDRANT_API_KEY", QDRANT_API_KEY);

function normalizeGeminiModelPath(model: string): string {
  const clean = model.trim() || "gemini-embedding-001";
  return clean.startsWith("models/") ? clean : `models/${clean}`;
}

async function embed(text: string): Promise<number[]> {
  const size = parseInt(QDRANT_VECTOR_SIZE, 10);
  const modelPath = normalizeGeminiModelPath(GEMINI_EMBEDDING_MODEL);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${modelPath}:embedContent?key=${requireGeminiApiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: size,
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini embed ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { embedding?: { values?: number[] } };
  if (!j.embedding?.values) throw new Error("Gemini returned no embedding");
  return j.embedding.values;
}

async function qdrant(path: string, init?: RequestInit) {
  const res = await fetch(`${qdrantUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "api-key": qdrantApiKey,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Qdrant ${res.status} on ${path}: ${body}`);
  }
  return res.json().catch(() => ({}));
}

async function ensureCollection(name: string, size: number, recreate = false) {
  try {
    await qdrant(`/collections/${name}`);
    if (recreate) {
      await qdrant(`/collections/${name}`, { method: "DELETE" });
      throw new Error("recreate requested");
    }
    console.log(`Collection ${name} exists`);
  } catch {
    await qdrant(`/collections/${name}`, {
      method: "PUT",
      body: JSON.stringify({
        vectors: { size, distance: "Cosine" },
      }),
    });
    console.log(`Created collection ${name}`);
  }
}

async function main() {
  const size = parseInt(QDRANT_VECTOR_SIZE, 10);
  await ensureCollection(QDRANT_COLLECTION, size, true);
  await ensureCollection(QDRANT_SESSIONS_COLLECTION, size);
  await ensureCollection(QDRANT_ALERTS_COLLECTION, size);

  let n = 0;
  for (const scheme of localSchemes) {
    const text = [
      scheme.schemeName,
      scheme.ministry,
      scheme.description,
      scheme.keywords.join(" "),
      scheme.benefitType,
      scheme.benefitAmount,
      scheme.stateScope,
    ]
      .filter(Boolean)
      .join(" | ");
    const vector = await embed(text);
    const idNum = Math.abs(
      Array.from(String(scheme.id)).reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0),
    );
    await qdrant(`/collections/${QDRANT_COLLECTION}/points?wait=true`, {
      method: "PUT",
      body: JSON.stringify({
        points: [
          {
            id: idNum,
            vector,
            payload: {
              scheme_id: scheme.id,
              scheme_name: scheme.schemeName,
              ministry: scheme.ministry,
              benefit_type: scheme.benefitType,
              benefit_amount: scheme.benefitAmount,
              description: scheme.description,
              eligibility: scheme.eligibility,
              documents_required: scheme.documentsRequired,
              application_steps: scheme.applicationSteps,
              application_url: scheme.applicationUrl,
              application_mode: scheme.applicationMode,
              source_url: scheme.sourceUrl,
              last_verified: scheme.lastVerified,
              keywords: scheme.keywords,
              state_scope: scheme.stateScope,
              last_updated: scheme.lastUpdated ?? new Date().toISOString(),
            },
          },
        ],
      }),
    });
    n++;
    if (n % 5 === 0) console.log(`Upserted ${n}/${localSchemes.length}`);
  }
  console.log(`Seeded ${n} schemes into ${QDRANT_COLLECTION}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
