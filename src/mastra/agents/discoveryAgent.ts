// Mastra-style Discovery Agent. Uses Qdrant when configured, else falls back
// to the deterministic keyword+attribute scorer.
import type { CitizenProfile, Scheme } from "@/lib/schemeseva-types";
import { searchSchemes } from "@/lib/qdrantSearch";

export const discoveryAgent = {
    name: "DiscoveryAgent",
    description:
        "Generates occupation, income, category, state, and gender/special-status semantic query angles; retrieves and deduplicates top 20 schemes from Qdrant or local fallback.",
    async run(allSchemes: Scheme[], profile: CitizenProfile, topN = 20) {
        return searchSchemes(allSchemes, profile, topN);
    },
};
