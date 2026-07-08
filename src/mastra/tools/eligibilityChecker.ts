import type { CitizenProfile, EligibilityResult, Scheme } from "@/lib/schemeseva-types";
import { checkEligibility } from "@/lib/schemeseva-eligibility";

export interface EligibilityCheckerInput {
  scheme: Scheme;
  profile: CitizenProfile;
}

export const eligibilityCheckerTool = {
  name: "eligibilityChecker",
  description:
    "Deterministic hard-rule eligibility checker. Excludes hard-failed schemes and never guesses with an LLM.",
  async execute(input: EligibilityCheckerInput): Promise<EligibilityResult> {
    return checkEligibility(input.scheme, input.profile);
  },
};
