// Mastra-style Eligibility Agent. Deterministic rule-based checker.
import type { CitizenProfile, Scheme } from "@/lib/schemeseva-types";
import { checkEligibility } from "@/lib/schemeseva-eligibility";

export const eligibilityAgent = {
  name: "EligibilityAgent",
  description:
    "Deterministically evaluates hard/soft eligibility rules per scheme and returns high/medium/none confidence.",
  run(scheme: Scheme, profile: CitizenProfile) {
    return checkEligibility(scheme, profile);
  },
};
