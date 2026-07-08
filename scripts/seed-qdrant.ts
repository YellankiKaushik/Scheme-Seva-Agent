// scripts/seed-qdrant.ts
// Seed the Qdrant `schemes` collection from Supabase (or a local JSON) with
// embeddings via the Lovable AI Gateway (google/gemini-embedding-001) or
// Google Gemini directly when GEMINI_API_KEY is set.
//
// Run with:
//   bun run scripts/seed-qdrant.ts
//
// Env required:
//   QDRANT_URL, QDRANT_API_KEY
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   GEMINI_API_KEY  (or LOVABLE_API_KEY as gateway fallback)
//
// Optional:
//   QDRANT_COLLECTION   (default: schemeseva_schemes)
//   QDRANT_VECTOR_SIZE  (default: 768 for gemini-embedding-004)

import { createClient } from "@supabase/supabase-js";

const {
    QDRANT_URL,
    QDRANT_API_KEY,
    QDRANT_COLLECTION = "schemeseva_schemes",
    QDRANT_VECTOR_SIZE = "768",
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY,
    LOVABLE_API_KEY,
} = process.env;

function must(name: string, value: string | undefined): string {
    if (!value) {
        console.error(`Missing required env: ${name}`);
        process.exit(1);
    }
    return value;
}

async function embed(text: string): Promise<number[]> {
    if (GEMINI_API_KEY) {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
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
    if (LOVABLE_API_KEY) {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Lovable-API-Key": LOVABLE_API_KEY,
            },
            body: JSON.stringify({
                model: "google/gemini-embedding-001",
                input: text,
            }),
        });
        if (!res.ok) throw new Error(`Lovable embed ${res.status}: ${await res.text()}`);
        const j = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
        const v = j.data?.[0]?.embedding;
        if (!v) throw new Error("Lovable returned no embedding");
        return v;
    }
    throw new Error("Neither GEMINI_API_KEY nor LOVABLE_API_KEY is set");
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
        console.log(`✓ collection ${name} exists`);
    } catch {
        console.log(`… creating collection ${name} (size=${size}, distance=Cosine)`);
        await qdrant(`/collections/${name}`, {
            method: "PUT",
            body: JSON.stringify({
                vectors: { size, distance: "Cosine" },
            }),
        });
        console.log(`✓ created collection ${name}`);
    }
}

async function main() {
    const supabase = createClient(
        must("SUPABASE_URL", SUPABASE_URL),
        must("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY),
    );
    const { data: schemes, error } = await supabase.from("schemes").select("*");
    if (error) throw error;
    console.log(`Loaded ${schemes.length} schemes from Supabase`);

    const size = parseInt(QDRANT_VECTOR_SIZE, 10);
    await ensureCollection(QDRANT_COLLECTION, size);
    await ensureCollection(process.env.QDRANT_SESSIONS_COLLECTION ?? "citizen_sessions", size);
    await ensureCollection(process.env.QDRANT_ALERTS_COLLECTION ?? "pending_alerts", size);

    let n = 0;
    for (const s of schemes) {
        const text = [
            s.scheme_name,
            s.ministry,
            s.description,
            (s.keywords ?? []).join(" "),
            s.benefit_type,
            s.benefit_amount,
            s.state_scope,
        ]
            .filter(Boolean)
            .join(" · ");
        const vector = await embed(text);
        const idNum = Math.abs(
            Array.from(String(s.id)).reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0),
        );
        await qdrant(`/collections/${QDRANT_COLLECTION}/points?wait=true`, {
            method: "PUT",
            body: JSON.stringify({
                points: [
                    {
                        id: idNum,
                        vector,
                        payload: {
                            scheme_id: s.id,
                            scheme_name: s.scheme_name,
                            ministry: s.ministry,
                            benefit_type: s.benefit_type,
                            benefit_amount: s.benefit_amount,
                            description: s.description,
                            eligibility: s.eligibility,
                            documents_required: s.documents_required,
                            application_steps: s.application_steps,
                            application_url: s.application_url,
                            application_mode: s.application_mode,
                            source_url: s.source_url,
                            last_verified: s.last_verified,
                            keywords: (s.keywords ?? []).join(" "),
                            state_scope: s.state_scope,
                            last_updated: new Date().toISOString(),
                        },
                    },
                ],
            }),
        });
        n++;
        if (n % 5 === 0) console.log(`  upserted ${n}/${schemes.length}`);
    }
    console.log(`✓ Seeded ${n} schemes into ${QDRANT_COLLECTION}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
