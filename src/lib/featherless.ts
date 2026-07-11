import type { CitizenProfile, EligibilityResult, Scheme } from "./schemeseva-types";

const DEFAULT_BASE_URL = "https://api.featherless.ai/v1";
const HEALTH_TIMEOUT_MS = 8000;
const REPORT_TIMEOUT_MS = 20000;
const VIGILANCE_TIMEOUT_MS = 12000;

export type FeatherlessErrorCategory =
  | "not_configured"
  | "disabled"
  | "timeout"
  | "http_401"
  | "http_403"
  | "http_404"
  | "http_429"
  | "http_500"
  | "http_503"
  | "empty_response"
  | "parse_error"
  | "incomplete_output"
  | "success";

export type FeatherlessConfiguredStatus = {
  configured: boolean;
  enabled: boolean;
  credentialsSet: boolean;
  modelConfigured: boolean;
  baseUrl: string;
  model: string | null;
  reason?: string;
};

export type FeatherlessHealthStatus = FeatherlessConfiguredStatus & {
  connected: boolean;
  reachable: boolean;
  status: "connected" | "unreachable" | "timeout" | "not-configured";
  error?: string;
};

export type FeatherlessGenerationResult = {
  ok: boolean;
  text: string;
  provider: "featherless";
  model: string | null;
  configured: boolean;
  error?: string;
  errorCategory: FeatherlessErrorCategory;
};

function envEnabled() {
  return (process.env.FEATHERLESS_ENABLED ?? "true").toLowerCase() === "true";
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "Featherless failed.");
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/FEATHERLESS_API_KEY[=:]\s*[A-Za-z0-9._~+/=-]+/gi, "FEATHERLESS_API_KEY=[redacted]")
    .replace(/api[_-]?key["':=\s]+[A-Za-z0-9._~+/=-]+/gi, "api key [redacted]")
    .slice(0, 240);
}

function normalizeBaseUrl(value?: string | null) {
  return (value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function timeoutMessage(timeoutMs: number) {
  return `Featherless request timed out after ${timeoutMs}ms.`;
}

function categoryFromConfig(cfg: FeatherlessConfiguredStatus): FeatherlessErrorCategory {
  if (!cfg.enabled) return "disabled";
  return "not_configured";
}

function categoryFromError(error: unknown): FeatherlessErrorCategory {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/timed out|abort/i.test(message)) return "timeout";
  if (/HTTP 401/i.test(message)) return "http_401";
  if (/HTTP 403/i.test(message)) return "http_403";
  if (/HTTP 404/i.test(message)) return "http_404";
  if (/HTTP 429/i.test(message)) return "http_429";
  if (/HTTP 500/i.test(message)) return "http_500";
  if (/HTTP 503/i.test(message)) return "http_503";
  if (/empty response/i.test(message)) return "empty_response";
  if (/parse|json/i.test(message)) return "parse_error";
  return "parse_error";
}

export function getFeatherlessConfig(): FeatherlessConfiguredStatus {
  const enabled = envEnabled();
  const credentialsSet = Boolean(process.env.FEATHERLESS_API_KEY);
  const model = process.env.FEATHERLESS_MODEL?.trim() || null;
  const modelConfigured = Boolean(model);
  const configured = enabled && credentialsSet && modelConfigured;
  return {
    configured,
    enabled,
    credentialsSet,
    modelConfigured,
    baseUrl: normalizeBaseUrl(process.env.FEATHERLESS_BASE_URL),
    model,
    reason: configured
      ? undefined
      : !enabled
        ? "FEATHERLESS_ENABLED is not true."
        : !credentialsSet
          ? "FEATHERLESS_API_KEY is missing."
          : "FEATHERLESS_MODEL is missing.",
  };
}

export function isFeatherlessConfigured() {
  return getFeatherlessConfig().configured;
}

async function withTimeout<T>(timeoutMs: number, task: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(timeoutMessage(timeoutMs)), timeoutMs);
  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function generateFeatherlessChatCompletion({
  system,
  user,
  temperature = 0.2,
  timeoutMs = REPORT_TIMEOUT_MS,
}: {
  system: string;
  user: string;
  temperature?: number;
  timeoutMs?: number;
}): Promise<FeatherlessGenerationResult> {
  const cfg = getFeatherlessConfig();
  if (!cfg.configured) {
    return {
      ok: false,
      text: "",
      provider: "featherless",
      model: cfg.model,
      configured: false,
      error: cfg.reason,
      errorCategory: categoryFromConfig(cfg),
    };
  }

  try {
    const json = await withTimeout(timeoutMs, async (signal) => {
      const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.FEATHERLESS_API_KEY}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature,
        }),
      });
      if (!response.ok) {
        throw new Error(`Featherless returned HTTP ${response.status}.`);
      }
      return (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
    });
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) throw new Error("Featherless returned an empty response.");
    return {
      ok: true,
      text,
      provider: "featherless",
      model: cfg.model,
      configured: true,
      errorCategory: "success",
    };
  } catch (error) {
    return {
      ok: false,
      text: "",
      provider: "featherless",
      model: cfg.model,
      configured: true,
      error: sanitizeError(error),
      errorCategory: categoryFromError(error),
    };
  }
}

export async function checkFeatherlessHealth(): Promise<FeatherlessHealthStatus> {
  const cfg = getFeatherlessConfig();
  if (!cfg.configured) {
    return {
      ...cfg,
      connected: false,
      reachable: false,
      status: "not-configured",
      error: cfg.reason,
    };
  }

  const result = await generateFeatherlessChatCompletion({
    system: "Return exactly OK.",
    user: "Health check.",
    timeoutMs: HEALTH_TIMEOUT_MS,
  });
  if (result.ok) {
    return {
      ...cfg,
      connected: true,
      reachable: true,
      status: "connected",
    };
  }
  const timedOut = /timed out|abort/i.test(result.error ?? "");
  return {
    ...cfg,
    connected: false,
    reachable: false,
    status: timedOut ? "timeout" : "unreachable",
    error: result.error,
  };
}

export function buildReportGenerationInput(
  profile: CitizenProfile,
  schemes: Scheme[],
  eligibleResults: EligibilityResult[],
) {
  const schemeContext = schemes
    .map((scheme, index) => {
      const result = eligibleResults[index];
      return `#${index + 1} ${scheme.schemeName} [${result.confidence}]
Ministry: ${scheme.ministry}
Benefit: ${scheme.benefitAmount}
Why likely eligible: ${result.reasons.join(" ")}
Missing docs: ${result.missingDocuments.length ? result.missingDocuments.join(", ") : "None"}
Application: ${scheme.applicationUrl ?? scheme.sourceUrl}
Source: ${scheme.sourceUrl}
Last verified: ${scheme.lastVerified}
Steps: ${scheme.applicationSteps.join(" | ")}
Documents needed: ${scheme.documentsRequired.join(", ")}`;
    })
    .join("\n\n---\n\n");
  return `Citizen profile: ${JSON.stringify(profile)}\n\nSchemes to include, in order:\n\n${schemeContext}\n\nGenerate the report now.`;
}

export async function generateReportWithFeatherless(
  profile: CitizenProfile,
  schemes: Scheme[],
  eligibleResults: EligibilityResult[],
) {
  return generateFeatherlessChatCompletion({
    system:
      "You are the Reasoning Agent for SchemeSeva. Write concise source-grounded explanation notes only. " +
      "Use the phrase 'likely eligible' or 'may likely qualify'. Never say guaranteed, approved, or final eligibility. " +
      "Do not invent schemes, benefits, documents, source URLs, dates, or application steps. Do not ask for Aadhaar number or bank account number. " +
      "Return plain text, not JSON. For each scheme, write 1-2 friendly sentences explaining why the citizen may likely match. Keep it under 220 words total.",
    user:
      buildReportGenerationInput(profile, schemes, eligibleResults) +
      "\n\nReturn only explanation notes. The application will add scheme names, benefits, documents, next steps, sourceUrl, lastVerified, and the guidance disclaimer from verified local data.",
    timeoutMs: REPORT_TIMEOUT_MS,
  });
}

export async function generateVigilanceReasonWithFeatherless({
  profile,
  scheme,
  eligibility,
}: {
  profile: CitizenProfile;
  scheme: Scheme;
  eligibility: EligibilityResult;
}) {
  return generateFeatherlessChatCompletion({
    system:
      "You write short SchemeSeva Vigilance alert reasons. Use only the provided profile, scheme, and eligibility facts. " +
      "Use likely-match language, never guarantee eligibility, do not invent benefits, and do not ask for Aadhaar number or bank account number. Return one sentence under 35 words.",
    user: `Citizen profile: ${JSON.stringify(profile)}
Scheme: ${scheme.schemeName}
Benefit: ${scheme.benefitAmount}
Eligibility reasons: ${eligibility.reasons.join(" ")}
Source: ${scheme.sourceUrl}
Last verified: ${scheme.lastVerified}

Write the alert reason.`,
    timeoutMs: VIGILANCE_TIMEOUT_MS,
  });
}
