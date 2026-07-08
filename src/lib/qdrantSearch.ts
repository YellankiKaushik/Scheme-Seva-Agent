// Qdrant-powered scheme retrieval. Order of preference:
//   1. Qdrant vector search when both Qdrant + an embedding provider are configured.
//   2. Qdrant payload scroll (keyword text match) when Qdrant is reachable but embeddings aren't available.
//   3. Local static catalog + keyword scorer fallback (demo-safe).

import type { CitizenProfile, Scheme } from "./schemeseva-types";
import { discoverCandidates } from "./schemeseva-eligibility";
import { qdrantConfigured, qdrantConfig } from "./qdrant";
import { embedText, embeddingsConfigured } from "./embeddings";

export type RetrievalSource =
    | "qdrant-vector"
    | "qdrant-keyword"
    | "fallback-local-keyword";

export interface RetrievalResult {
    source: RetrievalSource;
    schemes: Scheme[];
}

export function buildQueryAngles(profile: CitizenProfile): string[] {
    const base = [
        profile.occupation,
        profile.state,
        profile.category,
        profile.gender,
        profile.notes,
        (profile.isDisabled ?? profile.disability) ? "disability" : "",
        profile.isWidow ? "widow" : "",
        profile.landAcres ? "farmer land" : "",
        profile.isMinority ? "minority" : "",
        (profile.hasBPL ?? profile.isBPL) ? "below poverty line" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return [
        `${profile.occupation ?? ""} welfare schemes ${profile.state ?? ""}`,
        `income ${profile.annualIncome ?? ""} ${profile.category ?? ""} subsidy support`,
        `${profile.category ?? ""} category government benefits ${profile.state ?? ""}`,
        `${profile.state ?? ""} central state schemes ${profile.occupation ?? ""}`,
        `${profile.gender ?? ""} ${profile.isWidow ? "widow" : ""} ${(profile.isDisabled ?? profile.disability) ? "disabled" : ""} ${profile.isMinority ? "minority" : ""} benefits`,
        base,
    ]
        .map((q) => q.replace(/\s+/g, " ").trim())
        .filter((q, index, arr) => q.length > 0 && arr.indexOf(q) === index)
        .slice(0, 5);
}

function buildProfileText(profile: CitizenProfile): string {
    return buildQueryAngles(profile).join(" ");
}

function stateFilter(profile: CitizenProfile) {
    if (!profile.state) return undefined;
    return {
        should: [
            { key: "state_scope", match: { value: "central" } },
            { key: "state_scope", match: { value: profile.state.toLowerCase() } },
        ],
    };
}

async function tryVectorSearch(
    profileText: string,
    profile: CitizenProfile,
    topN: number,
): Promise<string[] | null> {
    const vector = await embedText(profileText);
    if (!vector) return null;
    const cfg = qdrantConfig();
    const filter = stateFilter(profile);
    try {
        const res = await fetch(
            `${cfg.url!.replace(/\/$/, "")}/collections/${cfg.collection}/points/search`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json", "api-key": cfg.apiKey! },
                body: JSON.stringify({
                    vector,
                    limit: topN,
                    with_payload: true,
                    ...(filter ? { filter } : {}),
                }),
            },
        );
        if (!res.ok) return null;
        const json = (await res.json()) as {
            result?: Array<{ id: string | number; payload?: { scheme_id?: string } }>;
        };
        return (json.result ?? [])
            .map((p) => p.payload?.scheme_id ?? String(p.id))
            .filter(Boolean);
    } catch {
        return null;
    }
}

async function tryKeywordScroll(
    profileText: string,
    profile: CitizenProfile,
): Promise<string[] | null> {
    const cfg = qdrantConfig();
    const filter = stateFilter(profile);
    try {
        const res = await fetch(
            `${cfg.url!.replace(/\/$/, "")}/collections/${cfg.collection}/points/scroll`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json", "api-key": cfg.apiKey! },
                body: JSON.stringify({
                    limit: 100,
                    with_payload: true,
                    filter: {
                        ...(filter ?? {}),
                        must: [
                            { key: "keywords", match: { text: profileText.slice(0, 200) } },
                        ],
                    },
                }),
            },
        );
        if (!res.ok) return null;
        const json = (await res.json()) as {
            result: { points: Array<{ id: string | number; payload?: { scheme_id?: string } }> };
        };
        return (json.result?.points ?? [])
            .map((p) => p.payload?.scheme_id ?? String(p.id))
            .filter(Boolean);
    } catch {
        return null;
    }
}

export async function searchSchemes(
    allSchemes: Scheme[],
    profile: CitizenProfile,
    topN = 20,
): Promise<RetrievalResult> {
    if (!qdrantConfigured()) {
        return {
            source: "fallback-local-keyword",
            schemes: discoverCandidates(allSchemes, profile, topN),
        };
    }

    const profileText = buildProfileText(profile);
    const queryAngles = buildQueryAngles(profile);

    // 1. Vector search when embeddings are configured.
    if (embeddingsConfigured()) {
        const mergedIds: string[] = [];
        for (const query of queryAngles) {
            const ids = await tryVectorSearch(query, profile, Math.max(5, Math.ceil(topN / 2)));
            for (const id of ids ?? []) {
                if (!mergedIds.includes(id)) mergedIds.push(id);
            }
            if (mergedIds.length >= topN) break;
        }
        if (mergedIds.length) {
            const wanted = new Set(mergedIds);
            const hits = allSchemes.filter((s) => wanted.has(s.id));
            if (hits.length) return { source: "qdrant-vector", schemes: hits.slice(0, topN) };
        }
    }

    // 2. Payload keyword scroll fallback.
    const ids = await tryKeywordScroll(profileText, profile);
    if (ids && ids.length) {
        const wanted = new Set(ids);
        const hits = allSchemes.filter((s) => wanted.has(s.id));
        if (hits.length) return { source: "qdrant-keyword", schemes: hits.slice(0, topN) };
    }

    // 3. Local fallback so the demo always returns something.
    return {
        source: "fallback-local-keyword",
        schemes: discoverCandidates(allSchemes, profile, topN),
    };
}
