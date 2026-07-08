import { vigilanceAgent } from "../agents/vigilanceAgent";

export interface VigilanceInput {
    sessionKey: string;
}
export type VigilanceResult = Awaited<ReturnType<typeof vigilanceAgent.run>>;

export const vigilanceWorkflow = {
    name: "vigilanceWorkflow",
    mode: "adapter" as const,
    steps: ["vigilanceAgent", "qdrantSessionsAndSchemes", "eligibilityScan", "enkryptOrFallbackValidation", "alertOutput"],
    async run(input: VigilanceInput): Promise<VigilanceResult> {
        return vigilanceAgent.run(input.sessionKey);
    },
};
