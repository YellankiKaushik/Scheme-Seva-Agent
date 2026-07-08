// Shared types for the SchemeSeva agent pipeline.

export type Gender = "male" | "female" | "other";
export type Category = "general" | "sc" | "st" | "obc" | "ebc" | "minority";

export interface CitizenProfile {
  name?: string | null;
  state?: string | null;
  age?: number | null;
  gender?: Gender | null;
  category?: Category | null;
  annualIncome?: number | null;
  occupation?: string | null;
  landAcres?: number | null;
  hasAadhaar?: boolean | null;
  hasBankAccount?: boolean | null;
  hasBPL?: boolean | null;
  isBPL?: boolean | null;
  isDisabled?: boolean | null;
  disability?: boolean | null;
  isWidow?: boolean | null;
  isMinority?: boolean | null;
  district?: string | null;
  familySize?: number | null;
  notes?: string | null;
}

export interface SchemeEligibilityRules {
  minAge?: number | null;
  maxAge?: number | null;
  genders?: Gender[];
  categories?: Category[];
  maxAnnualIncome?: number | null;
  occupations?: string[];
  states?: string[];
  requiresBPL?: boolean;
  requiresAadhaar?: boolean;
  requiresBankAccount?: boolean;
  disability?: boolean;
  maxLandAcres?: number | null;
}

export interface Scheme {
  id: string;
  schemeName: string;
  ministry: string;
  benefitType: string;
  benefitAmount: string;
  description: string;
  eligibility: SchemeEligibilityRules;
  keywords: string[];
  documentsRequired: string[];
  applicationSteps: string[];
  applicationUrl: string | null;
  applicationMode: string;
  sourceUrl: string;
  lastVerified: string;
  stateScope: string;
}

export interface EligibilityResult {
  schemeId: string;
  schemeName: string;
  confidence: "high" | "medium" | "none";
  reasons: string[];
  missingDocuments: string[];
  benefitAmount: string;
  sourceUrl: string;
  lastVerified: string;
}

export interface DiscoveryReport {
  sessionKey: string;
  profile: CitizenProfile;
  eligible: EligibilityResult[];
  schemes: Scheme[];
  reportMarkdown: string;
  safety: {
    status: "safe" | "warning";
    note: string;
    provider: string;
  };
  retrievalProvider: string;
  workflowMode?: "adapter" | "runtime" | "fallback";
  agentSteps?: import("@/mastra/types").DiscoveryAgentSteps;
}
