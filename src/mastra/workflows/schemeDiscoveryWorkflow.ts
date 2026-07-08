// Mastra-style workflow that composes Profile → Discovery → Eligibility →
// Report → Safety. Implemented as an adapter around the existing server
// functions; step boundaries mirror Mastra's `.step()` API.

import { profileAgent } from "../agents/profileAgent";
import { reportAgent } from "../agents/reportAgent";
import type { CitizenProfile, DiscoveryReport } from "@/lib/schemeseva-types";
import { completed, fallback, type DiscoveryAgentSteps } from "../types";

export interface SchemeDiscoveryInput {
    sessionKey: string;
    text?: string;
    profile?: CitizenProfile;
}

export interface SchemeDiscoveryResult {
    profile: CitizenProfile;
    followUp: string | null;
    report: DiscoveryReport | null;
    agentSteps: Partial<DiscoveryAgentSteps>;
}

export const schemeDiscoveryWorkflow = {
    name: "schemeDiscoveryWorkflow",
    mode: "adapter" as const,
    steps: ["profileAgent", "discoveryAgent", "eligibilityAgent", "reportAgent", "safetyValidation"],
    async run(input: SchemeDiscoveryInput): Promise<SchemeDiscoveryResult> {
        let profile: CitizenProfile;
        let followUp: string | null = null;
        let profileStep = completed("mastra-adapter", "Structured profile supplied by caller.");

        if (input.profile) {
            profile = input.profile;
        } else if (input.text) {
            const step1 = await profileAgent.run(input.text);
            profile = step1.profile;
            followUp = step1.followUp;
            profileStep = followUp
                ? fallback("lovable-gemini", "One clarification question required for missing critical fields.")
                : completed("lovable-gemini", "Natural language profile extracted and Zod-validated.");
            if (followUp) return { profile, followUp, report: null, agentSteps: { profileAgent: profileStep } };
        } else {
            throw new Error("schemeDiscoveryWorkflow requires text or profile");
        }

        const report = await reportAgent.run(input.sessionKey, profile);
        const mergedSteps: DiscoveryAgentSteps = {
            profileAgent: profileStep,
            discoveryAgent: report.agentSteps?.discoveryAgent ?? fallback("unknown", "Discovery metadata unavailable."),
            eligibilityAgent: report.agentSteps?.eligibilityAgent ?? fallback("unknown", "Eligibility metadata unavailable."),
            reportAgent: report.agentSteps?.reportAgent ?? fallback("unknown", "Report metadata unavailable."),
            safetyValidation: report.agentSteps?.safetyValidation ?? fallback("unknown", "Safety metadata unavailable."),
        };
        report.agentSteps = mergedSteps;
        return { profile, followUp: null, report, agentSteps: mergedSteps };
    },
};
