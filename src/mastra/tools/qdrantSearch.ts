import type { CitizenProfile, Scheme } from "@/lib/schemeseva-types";
import { buildQueryAngles, searchSchemes, type RetrievalResult } from "@/lib/qdrantSearch";

export interface QdrantSearchInput {
    allSchemes: Scheme[];
    profile: CitizenProfile;
    limit?: number;
}

export const qdrantSearchTool = {
    name: "qdrantSearch",
    description:
        "Search schemes through Qdrant using 4-5 semantic query angles, with Supabase keyword fallback.",
    queryAngles: buildQueryAngles,
    async execute(input: QdrantSearchInput): Promise<RetrievalResult> {
        return searchSchemes(input.allSchemes, input.profile, input.limit ?? 20);
    },
};
