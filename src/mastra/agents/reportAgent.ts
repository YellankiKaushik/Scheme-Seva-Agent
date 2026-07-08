// Mastra-style Report Agent. Delegates to runDiscovery which handles the LLM
// call, safety validation, and Supabase persistence.
import { runDiscovery } from "@/lib/schemeseva.functions";
import type { CitizenProfile } from "@/lib/schemeseva-types";

export const reportAgent = {
    name: "ReportAgent",
    description:
        "Generates the citizen-facing markdown report using 'likely eligible' language, 8th-grade readability, sourceUrl/lastVerified citations, and safety validation.",
    async run(sessionKey: string, profile: CitizenProfile) {
        return runDiscovery({ data: { sessionKey, profile } });
    },
};
