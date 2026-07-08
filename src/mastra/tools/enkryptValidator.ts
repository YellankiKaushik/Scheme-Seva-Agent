import { validateAlert, validateReport, type SafetyReport } from "@/lib/safetyValidator";

export interface EnkryptValidatorInput {
  text: string;
  sourceContext?: string;
  kind?: "report" | "alert";
}

export const enkryptValidatorTool = {
  name: "enkryptValidator",
  description:
    "Validate citizen-facing report or vigilance alert text through Enkrypt AI, falling back to the configured safety adapter.",
  async execute(input: EnkryptValidatorInput): Promise<SafetyReport> {
    if (input.kind === "alert") return validateAlert(input.text);
    return validateReport(input.text, input.sourceContext ?? "");
  },
};
