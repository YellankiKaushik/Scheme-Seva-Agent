export type AgentStepStatus = "completed" | "fallback";

export interface AgentStepMetadata {
  status: AgentStepStatus;
  provider: string;
  note?: string;
}

export type DiscoveryAgentStepName =
  "profileAgent" | "discoveryAgent" | "eligibilityAgent" | "reportAgent" | "safetyValidation";

export type DiscoveryAgentSteps = Record<DiscoveryAgentStepName, AgentStepMetadata>;

export interface VigilanceAgentSteps {
  vigilanceAgent: AgentStepMetadata;
  discoveryAgent: AgentStepMetadata;
  eligibilityAgent: AgentStepMetadata;
  safetyValidation: AgentStepMetadata;
}

export function completed(provider: string, note?: string): AgentStepMetadata {
  return { status: "completed", provider, note };
}

export function fallback(provider: string, note?: string): AgentStepMetadata {
  return { status: "fallback", provider, note };
}
