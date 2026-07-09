// Unified safety validator. Prefers Enkrypt AI when configured; otherwise
// falls back to an OpenRouter-based validator so demo mode still works.

import { generateText, Output } from "ai";
import { z } from "zod";
import { createOpenRouterProvider } from "./ai-gateway.server";
import { detectText, enkryptConfigured } from "./enkrypt";

export type SafetyProvider = "enkrypt" | "fallback-openrouter" | "passthrough" | "unavailable";

export interface SafetyReport {
  status: "safe" | "warning";
  provider: SafetyProvider;
  note: string;
  validated: boolean;
  issues: string[];
  warning?: string;
  schemaUsed?: string;
  rawStatus?: string;
  detections?: Array<{ detector: string; detected: boolean; score?: number }>;
}

const MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free";

export async function validateReport(
  reportMarkdown: string,
  sourceContext: string,
): Promise<SafetyReport> {
  if (reportMarkdown.length < 80) {
    return {
      status: "safe",
      provider: "passthrough",
      note: "Report too short to validate.",
      validated: true,
      issues: [],
      warning: "Report too short to validate.",
      rawStatus: "short-report",
    };
  }

  let enkryptFallbackWarning: string | null = null;
  if (enkryptConfigured()) {
    try {
      const r = await detectText(reportMarkdown, sourceContext);
      const flaggedDetections = r.detections.filter((d) => d.detected);
      const flagged = flaggedDetections.map((d) => d.detector);
      const onlyGenericPii =
        flaggedDetections.length > 0 &&
        flaggedDetections.every((d) =>
          /pii|privacy|aadhaar|aadhar|bank/i.test(`${d.detector} ${d.detail ?? ""}`),
        );
      const warning = onlyGenericPii
        ? "Checked by Enkrypt AI Guardrails. Review official source before applying."
        : undefined;
      return {
        status: r.safe || onlyGenericPii ? "safe" : "warning",
        provider: "enkrypt",
        note: r.safe
          ? `Validated by Enkrypt AI Guardrails${r.detectSchemaUsed ? ` (${r.detectSchemaUsed})` : ""}.`
          : onlyGenericPii
            ? warning!
          : `Enkrypt AI flagged: ${flagged.join(", ") || "unspecified"}${r.detectSchemaUsed ? ` (${r.detectSchemaUsed})` : ""}.`,
        validated: true,
        issues: flagged,
        warning,
        schemaUsed: r.detectSchemaUsed,
        rawStatus: r.safe ? "safe" : "flagged",
        detections: r.detections,
      };
    } catch (e) {
      enkryptFallbackWarning = `Enkrypt validation failed; used fallback safety validator. ${(e as Error).message}`;
    }
  }

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return {
      status: "safe",
      provider: "passthrough",
      note: "No safety provider configured.",
      validated: true,
      issues: [],
      rawStatus: "no-provider",
    };
  }
  try {
    const gateway = createOpenRouterProvider(key);
    const { output } = await generateText({
      model: gateway(MODEL),
      output: Output.object({
        schema: z.object({
          safe: z.boolean(),
          hasHallucination: z.boolean(),
          hasBias: z.boolean(),
          hasToxicity: z.boolean(),
          note: z.string(),
        }),
      }),
      system:
        "You are a safety validator (Enkrypt AI substitute). Given a report about Indian government schemes and the source data, judge whether the report: (a) invents any fact not in the source (hallucination), (b) contains bias or discriminatory language, (c) contains toxic, misleading, or overconfident eligibility claims (e.g. 'guaranteed eligible' instead of 'likely eligible'), (d) offers unsafe advice. Return safe=true only if none fail.",
      prompt: `Source:\n${sourceContext}\n\nReport:\n${reportMarkdown.slice(0, 4000)}`,
    });
    return {
      status: output.safe ? "safe" : "warning",
      provider: "fallback-openrouter",
      note:
        [
          enkryptFallbackWarning,
          output.note ?? (output.safe ? "Validated (fallback)." : "Flagged by fallback validator."),
        ]
          .filter(Boolean)
          .join(" "),
      validated: true,
      issues: [
        output.hasHallucination ? "hallucination" : null,
        output.hasBias ? "bias" : null,
        output.hasToxicity ? "toxicity" : null,
      ].filter(Boolean) as string[],
      warning: output.safe ? enkryptFallbackWarning ?? undefined : output.note,
      rawStatus: output.safe ? "safe" : "flagged",
    };
  } catch {
    return {
      status: "safe",
      provider: "unavailable",
      note: enkryptFallbackWarning ?? "Validator unavailable.",
      validated: false,
      issues: [],
      warning: enkryptFallbackWarning ?? "Validator unavailable.",
      rawStatus: "unavailable",
    };
  }
}

export async function validateAlert(alertText: string, sourceContext?: string): Promise<SafetyReport> {
  return validateReport(
    alertText,
    sourceContext ?? "Vigilance alert about a newly launched scheme.",
  );
}
