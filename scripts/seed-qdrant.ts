// Seed Qdrant from the local SchemeSeva catalog using Gemini embeddings.
//
// Required:
//   QDRANT_URL, QDRANT_API_KEY, GEMINI_API_KEY
//
// Optional:
//   QDRANT_COLLECTION   (default: schemeseva_schemes)
//   QDRANT_VECTOR_SIZE  (default: 768)

import { localSchemes } from "../src/lib/localSchemes";

const {
    QDRANT_URL,
    QDRANT_API_KEY,
    QDRANT_COLLECTION = "schemeseva_schemes",
    QDRANT_VECTOR_SIZE = "768",
    GEMINI_API_KEY,
} = process.env;

function must(name: string, value: string | undefined): string {
    if (!value) {
        console.error(`Missing required env: ${name}`);
        process.exit(1);
    }
    return value;
}

async function embed(text: string): Promise<number[]> {
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${must("GEMINI_API_KEY", GEMINI_API_KEY)}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: { parts: [{ text }] } }),
        },
    );
    if (!res.ok) throw new Error(`Gemini embed ${res.status}: ${await res.text()}`);
    const j = (await res.json()) as { embedding?: { values?: number[] } };
    if (!j.embedding?.values) throw new Error("Gemini returned no embedding");
    return j.embedding.values;
}

async function qdrant(path: string, init?: RequestInit) {
    const res = await fetch(`${must("QDRANT_URL", QDRANT_URL).replace(/\/$/, "")}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            "api-key": must("QDRANT_API_KEY", QDRANT_API_KEY),
            ...(init?.headers ?? {}),
        },
    });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Qdrant ${res.status} on ${path}: ${body}`);
    }
    return res.json().catch(() => ({}));
}

async function ensureCollection(name: string, size: number) {
    try {
        await qdrant(`/collections/${name}`);
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
    await ensureCollection(QDRANT_COLLECTION, size);
    await ensureCollection(process.env.QDRANT_SESSIONS_COLLECTION ?? "citizen_sessions", size);
    await ensureCollection(process.env.QDRANT_ALERTS_COLLECTION ?? "pending_alerts", size);

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
                            last_updated: new Date().toISOString(),
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
