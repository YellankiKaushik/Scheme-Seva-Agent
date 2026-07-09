// Qdrant-powered scheme retrieval. Order of preference:
//   1. Qdrant vector search when both Qdrant + an embedding provider are configured.
//   2. Qdrant payload scroll (keyword text match) when Qdrant is reachable but embeddings aren't available.
//   3. Local static catalog + keyword scorer fallback (demo-safe).

import type { CitizenProfile, Scheme } from "./schemeseva-types";
import { discoverCandidates } from "./schemeseva-eligibility";
import { qdrantConfigured, qdrantConfig } from "./qdrant";
import { embedText, embeddingsConfigured } from "./embeddings";

export type RetrievalSource = "qdrant-vector" | "qdrant-keyword" | "fallback-local-keyword";

export interface RetrievalResult {
  source: RetrievalSource;
  schemes: Scheme[];
  diagnostics: RetrievalDiagnostics;
}

export interface RetrievalDiagnostics {
  qdrantConfigured: boolean;
  qdrantVectorAttempted: boolean;
  qdrantVectorHits: number;
  qdrantKeywordAttempted: boolean;
  qdrantKeywordHits: number;
  fallbackUsed: boolean;
  fallbackReason: string | null;
}

interface QdrantPoint {
  id: string | number;
  payload?: Record<string, unknown>;
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

function mapQdrantPayloadToScheme(point: QdrantPoint): Scheme | null {
  const payload = point.payload;
  if (!payload) return null;
  const id = (payload.scheme_id ?? payload.id ?? point.id) as string | number | undefined;
  const schemeName = payload.scheme_name ?? payload.schemeName ?? payload.title;
  if (!id || !schemeName) return null;
  return {
    id: String(id),
    schemeName: String(schemeName),
    ministry: String(payload.ministry ?? ""),
    benefitType: String(payload.benefit_type ?? payload.benefitType ?? ""),
    benefitAmount: String(payload.benefit_amount ?? payload.benefitAmount ?? ""),
    description: String(payload.description ?? ""),
    eligibility: (payload.eligibility as Scheme["eligibility"]) ?? {},
    keywords: (payload.keywords as string[]) ?? [],
    documentsRequired: ((payload.documents_required ?? payload.documentsRequired) as string[]) ?? [],
    applicationSteps: ((payload.application_steps ?? payload.applicationSteps) as string[]) ?? [],
    applicationUrl: ((payload.application_url ?? payload.applicationUrl) as string | null) ?? null,
    applicationMode: String(payload.application_mode ?? payload.applicationMode ?? "both"),
    sourceUrl: String(payload.source_url ?? payload.sourceUrl ?? ""),
    lastVerified: String(payload.last_verified ?? payload.lastVerified ?? ""),
    lastUpdated: String(
      payload.last_updated ?? payload.lastUpdated ?? payload.last_verified ?? payload.lastVerified ?? "",
    ),
    stateScope: String(payload.state_scope ?? payload.stateScope ?? "central"),
  };
}

function devLog(message: string, data: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[SchemeSeva retrieval] ${message}`, data);
  }
}

function mergeQdrantHits(
  points: QdrantPoint[],
  allSchemes: Scheme[],
  existing: Scheme[] = [],
): Scheme[] {
  const byId = new Map(allSchemes.map((scheme) => [scheme.id, scheme]));
  const merged = [...existing];
  for (const point of points) {
    const payloadId = point.payload?.scheme_id ?? point.payload?.id;
    const id = String(payloadId ?? point.id);
    const scheme = byId.get(id) ?? mapQdrantPayloadToScheme(point);
    if (scheme && !merged.some((item) => item.id === scheme.id)) merged.push(scheme);
  }
  return merged;
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
  allSchemes: Scheme[],
  topN: number,
): Promise<{ hits: Scheme[]; error: string | null }> {
  const vector = await embedText(profileText);
  if (!vector) return { hits: [], error: "embedding-unavailable" };
  const cfg = qdrantConfig();
  const filter = stateFilter(profile);

  async function requestVector(useFilter: boolean) {
    const activeFilter = useFilter ? filter : undefined;
    const res = await fetch(
      `${cfg.url!.replace(/\/$/, "")}/collections/${cfg.collection}/points/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": cfg.apiKey! },
        body: JSON.stringify({
          vector,
          limit: topN,
          with_payload: true,
          ...(activeFilter ? { filter: activeFilter } : {}),
        }),
      },
    );
    if (!res.ok) {
      const queryRes = await fetch(
        `${cfg.url!.replace(/\/$/, "")}/collections/${cfg.collection}/points/query`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "api-key": cfg.apiKey! },
          body: JSON.stringify({
            query: vector,
            limit: topN,
            with_payload: true,
            ...(activeFilter ? { filter: activeFilter } : {}),
          }),
        },
      );
      if (!queryRes.ok) return { hits: [], error: `qdrant-vector-http-${queryRes.status}` };
      const queryJson = (await queryRes.json()) as { result?: { points?: QdrantPoint[] } };
      const queryHits = mergeQdrantHits(queryJson.result?.points ?? [], allSchemes);
      return { hits: queryHits, error: null };
    }
    const json = (await res.json()) as {
      result?: QdrantPoint[];
    };
    const hits = mergeQdrantHits(json.result ?? [], allSchemes);
    return { hits, error: null };
  }

  try {
    const filtered = await requestVector(Boolean(filter));
    if (filtered.hits.length || !filter) return filtered;
    const unfiltered = await requestVector(false);
    return unfiltered.hits.length ? unfiltered : filtered;
  } catch (e) {
    return { hits: [], error: (e as Error).message || "qdrant-vector-request-failed" };
  }
}

async function tryKeywordScroll(
  profileText: string,
  profile: CitizenProfile,
  allSchemes: Scheme[],
  topN: number,
): Promise<{ hits: Scheme[]; error: string | null; usableSchemes: number }> {
  const cfg = qdrantConfig();
  const filter = stateFilter(profile);
  try {
    async function scroll(useFilter: boolean) {
      const activeFilter = useFilter ? filter : undefined;
      const res = await fetch(
        `${cfg.url!.replace(/\/$/, "")}/collections/${cfg.collection}/points/scroll`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "api-key": cfg.apiKey! },
          body: JSON.stringify({
            limit: 100,
            with_payload: true,
            ...(activeFilter ? { filter: activeFilter } : {}),
          }),
        },
      );
      if (!res.ok) return { points: [], error: `qdrant-keyword-http-${res.status}` };
      const json = (await res.json()) as {
        result: { points: QdrantPoint[] };
      };
      return { points: json.result?.points ?? [], error: null };
    }

    const filtered = await scroll(Boolean(filter));
    const points = filtered.points.length || !filter ? filtered : await scroll(false);
    if (points.error && !points.points.length) {
      return { hits: [], error: points.error, usableSchemes: 0 };
    }
    const qdrantSchemes = mergeQdrantHits(points.points, allSchemes);
    const hits = discoverCandidates(qdrantSchemes, { ...profile, notes: profileText }, topN);
    return { hits, error: null, usableSchemes: qdrantSchemes.length };
  } catch (e) {
    return {
      hits: [],
      error: (e as Error).message || "qdrant-keyword-request-failed",
      usableSchemes: 0,
    };
  }
}

export async function searchSchemes(
  allSchemes: Scheme[],
  profile: CitizenProfile,
  topN = 20,
): Promise<RetrievalResult> {
  const diagnostics: RetrievalDiagnostics = {
    qdrantConfigured: qdrantConfigured(),
    qdrantVectorAttempted: false,
    qdrantVectorHits: 0,
    qdrantKeywordAttempted: false,
    qdrantKeywordHits: 0,
    fallbackUsed: false,
    fallbackReason: null,
  };

  if (!qdrantConfigured()) {
    diagnostics.fallbackUsed = true;
    diagnostics.fallbackReason = "Qdrant credentials are missing.";
    devLog("fallback", { reason: diagnostics.fallbackReason });
    return {
      source: "fallback-local-keyword",
      schemes: discoverCandidates(allSchemes, profile, topN),
      diagnostics,
    };
  }

  const profileText = buildProfileText(profile);
  const queryAngles = buildQueryAngles(profile);
  let fallbackReason: string | null = null;

  // 1. Vector search when embeddings are configured.
  if (embeddingsConfigured()) {
    diagnostics.qdrantVectorAttempted = true;
    let mergedHits: Scheme[] = [];
    for (const query of queryAngles) {
      const result = await tryVectorSearch(
        query,
        profile,
        allSchemes,
        Math.max(5, Math.ceil(topN / 2)),
      );
      const hits = result.hits;
      if (hits?.length) {
        mergedHits = mergeQdrantHits(
          hits.map((scheme) => ({ id: scheme.id, payload: { id: scheme.id } })),
          hits,
          mergedHits,
        );
      }
      if (mergedHits.length >= topN) break;
      if (result.error) fallbackReason = result.error;
    }
    diagnostics.qdrantVectorHits = mergedHits.length;
    devLog("qdrant vector hits", { count: diagnostics.qdrantVectorHits });
    if (mergedHits.length) {
      return { source: "qdrant-vector", schemes: mergedHits.slice(0, topN), diagnostics };
    }
  } else {
    fallbackReason = "Gemini embeddings are not configured.";
  }

  // 2. Payload keyword scroll fallback.
  diagnostics.qdrantKeywordAttempted = true;
  const keyword = await tryKeywordScroll(profileText, profile, allSchemes, topN);
  diagnostics.qdrantKeywordHits = keyword.hits.length;
  devLog("qdrant keyword hits", { count: diagnostics.qdrantKeywordHits });
  if (keyword.hits.length) {
    return { source: "qdrant-keyword", schemes: keyword.hits.slice(0, topN), diagnostics };
  }

  // 3. Local fallback so the demo always returns something.
  diagnostics.fallbackUsed = true;
  diagnostics.fallbackReason =
    keyword.error ??
    fallbackReason ??
    (keyword.usableSchemes === 0
      ? "Qdrant returned zero usable scheme payloads."
      : "Qdrant returned no matching schemes.");
  devLog("fallback", { reason: diagnostics.fallbackReason });
  return {
    source: "fallback-local-keyword",
    schemes: discoverCandidates(allSchemes, profile, topN),
    diagnostics,
  };
}
