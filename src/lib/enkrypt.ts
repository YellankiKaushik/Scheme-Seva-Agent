// Enkrypt AI client adapter. Uses the Enkrypt Guardrails REST API when
// ENKRYPT_API_KEY is configured. Falls back gracefully otherwise.
// Docs: https://docs.enkryptai.com/

export interface EnkryptStatus {
  configured: boolean;
  baseUrl: string;
  reachable?: boolean;
  healthConnected?: boolean;
  detectPayloadValid?: boolean;
  detectSchemaUsed?: string;
  lastDetectError?: string;
  error?: string;
}

const DEFAULT_BASE = "https://api.enkryptai.com";
const SCHEMESEVA_POLICY_TEXT =
  "Citizen-facing SchemeSeva outputs must be respectful, non-discriminatory, grounded in provided scheme source data, avoid guaranteed eligibility claims, avoid unsafe legal or financial advice, and direct citizens to official government sources for final verification.";

export const DEFAULT_PII_ENTITIES = [
  "PERSON",
  "EMAIL",
  "PHONE",
  "ADDRESS",
  "AADHAAR",
  "PAN",
  "BANK_ACCOUNT",
  "CREDIT_CARD",
  "IP_ADDRESS",
] as const;

export function enkryptConfigured(): boolean {
  return Boolean(process.env.ENKRYPT_API_KEY);
}

export function enkryptConfig() {
  return {
    apiKey: process.env.ENKRYPT_API_KEY ?? null,
    baseUrl: process.env.ENKRYPT_BASE_URL ?? DEFAULT_BASE,
  };
}

export interface EnkryptDetection {
  detector: string;
  detected: boolean;
  score?: number;
  detail?: string;
}

export interface EnkryptResult {
  safe: boolean;
  detections: EnkryptDetection[];
  detectSchemaUsed?: string;
  raw?: unknown;
}

interface DetectPayloadVariant {
  name: string;
  body: Record<string, unknown>;
  includesTopLevelPiiEntities: boolean;
}

function devLog(message: string, meta: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[enkrypt] ${message}`, meta);
  }
}

function enkryptHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
  };
}

function baseDetectors() {
  return {
    toxicity: { enabled: true },
    bias: { enabled: true },
    hallucination: { enabled: true },
    factuality: { enabled: true },
    factual_accuracy: { enabled: true },
    policy_violation: { enabled: true, policy_text: SCHEMESEVA_POLICY_TEXT },
    pii: { enabled: true },
  };
}

export function buildEnkryptDetectPayloadVariants(
  text: string,
  context?: string,
): DetectPayloadVariant[] {
  const input = context ? { text, context } : { text };
  const detectors = baseDetectors();
  return [
    {
      name: "detectors",
      body: {
        ...input,
        detectors,
      },
      includesTopLevelPiiEntities: false,
    },
    {
      name: "nested-pii-dot-entities",
      body: {
        ...input,
        detectors: {
          ...detectors,
          pii: {
            enabled: true,
            entities: [...DEFAULT_PII_ENTITIES],
          },
        },
      },
      includesTopLevelPiiEntities: false,
    },
    {
      name: "minimal",
      body: input,
      includesTopLevelPiiEntities: false,
    },
    {
      name: "nested-pii-entities",
      body: {
        ...input,
        detectors: {
          ...detectors,
          pii: {
            enabled: true,
            pii_entities: [...DEFAULT_PII_ENTITIES],
          },
        },
      },
      includesTopLevelPiiEntities: false,
    },
    {
      name: "top-level-pii-entities",
      body: {
        ...input,
        detectors,
        pii_entities: [...DEFAULT_PII_ENTITIES],
      },
      includesTopLevelPiiEntities: true,
    },
  ];
}

function missingPiiEntities(message: string) {
  return /missing .*pii(?:_entities|\.entities)|missing pii_entities|missing pii\.entities/i.test(
    message,
  );
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/apikey["':=\s]+[A-Za-z0-9._~+/=-]+/gi, "apikey [redacted]")
    .slice(0, 300);
}

function shouldTryVariant(
  variant: DetectPayloadVariant,
  failedMessages: string[],
  previousAttemptCount: number,
) {
  if (previousAttemptCount >= 4) return false;
  if (
    variant.name === "minimal" &&
    failedMessages.some((message) => missingPiiEntities(message))
  ) {
    return false;
  }
  if (!variant.includesTopLevelPiiEntities) return true;
  return !failedMessages.some((message) => /unexpected key:\s*pii_entities/i.test(message));
}

function shouldContinueAfterFailure(variant: DetectPayloadVariant, status: number, error: string) {
  if (status !== 400) return false;
  if (missingPiiEntities(error)) return true;
  if (/unexpected key:\s*pii_entities/i.test(error)) return false;
  return variant.name !== "top-level-pii-entities";
}

function getTruthyFlag(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

function getNumericFlag(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") return value;
  }
  return undefined;
}

function getNestedRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value != null ? (value as Record<string, unknown>) : {};
}

function issueDetected(issue: Record<string, unknown>) {
  const explicit = getTruthyFlag(issue, [
    "detected",
    "flagged",
    "blocked",
    "unsafe",
    "violation",
    "has_pii",
    "failed",
  ]);
  if (explicit !== undefined) return explicit;
  const verdict = issue.verdict;
  if (typeof verdict === "string") return /block|fail|unsafe|violation|flag/i.test(verdict);
  const riskScore = getNumericFlag(issue, ["risk_score", "riskScore", "score"]);
  return typeof riskScore === "number" ? riskScore >= 0.5 : false;
}

function issueDetail(issue: Record<string, unknown>) {
  const fields = ["detail", "message", "reason", "description", "verdict"];
  for (const field of fields) {
    const value = issue[field];
    if (typeof value === "string") return value;
  }
  return undefined;
}

function issueScore(issue: Record<string, unknown>) {
  return getNumericFlag(issue, ["score", "risk_score", "riskScore"]);
}

function normalizeIssue(detector: string, value: unknown): EnkryptDetection | EnkryptDetection[] {
  if (typeof value === "boolean") return { detector, detected: value };
  if (typeof value !== "object" || value == null) return { detector, detected: false };
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      const normalized = normalizeIssue(`${detector}.${index}`, item);
      return Array.isArray(normalized) ? normalized : [normalized];
    });
  }

  const issue = value as Record<string, unknown>;
  return {
    detector:
      typeof issue.detector === "string"
        ? issue.detector
        : typeof issue.type === "string"
          ? issue.type
          : detector,
    detected: issueDetected(issue),
    score: issueScore(issue),
    detail: issueDetail(issue),
  };
}

function collectFromCandidate(candidate: unknown, fallbackDetector: string) {
  const detections: EnkryptDetection[] = [];
  if (!candidate) return detections;
  if (Array.isArray(candidate)) {
    candidate.forEach((item, index) => {
      const detector =
        typeof item === "object" && item != null
          ? String(
              (item as Record<string, unknown>).detector ??
                (item as Record<string, unknown>).type ??
                `${fallbackDetector}.${index}`,
            )
          : `${fallbackDetector}.${index}`;
      const normalized = normalizeIssue(detector, item);
      detections.push(...(Array.isArray(normalized) ? normalized : [normalized]));
    });
    return detections;
  }
  if (typeof candidate === "object") {
    Object.entries(candidate as Record<string, unknown>).forEach(([key, value]) => {
      const normalized = normalizeIssue(key, value);
      detections.push(...(Array.isArray(normalized) ? normalized : [normalized]));
    });
  }
  return detections;
}

function responseRecord(raw: unknown) {
  if (typeof raw !== "object" || raw == null) return {};
  const record = raw as Record<string, unknown>;
  return getNestedRecord(record.data) && Object.keys(getNestedRecord(record.data)).length
    ? { ...record, ...getNestedRecord(record.data) }
    : record;
}

function collectDetections(raw: unknown): EnkryptDetection[] {
  const record = responseRecord(raw);
  const candidates: Array<[string, unknown]> = [
    ["detections", record.detections],
    ["detectors", record.detectors],
    ["issues", record.issues],
    ["results", record.results],
    ["result", record.result],
    ["guardrails", record.guardrails],
    ["violations", record.violations],
    ["verdict", record.verdict],
  ];

  return candidates.flatMap(([fallbackDetector, candidate]) =>
    collectFromCandidate(candidate, fallbackDetector),
  );
}

function inferSafe(raw: unknown, detections: EnkryptDetection[]): boolean {
  const record = responseRecord(raw);
  const summary = getNestedRecord(record.summary);
  const verdict = record.verdict ?? summary.verdict;
  if (typeof verdict === "string" && /block|fail|unsafe|violation|flag/i.test(verdict)) {
    return false;
  }
  if (typeof verdict === "string" && /allow|pass|safe|clean/i.test(verdict)) {
    return detections.every((d) => !d.detected);
  }

  const explicitSafe =
    record.safe ?? record.is_safe ?? record.isSafe ?? record.validated ?? summary.safe;
  if (typeof explicitSafe === "boolean") {
    return explicitSafe && detections.every((d) => !d.detected);
  }

  const explicitBlocked =
    record.blocked ??
    record.is_blocked ??
    record.isBlocked ??
    record.flagged ??
    record.unsafe ??
    summary.detected ??
    summary.blocked;
  if (typeof explicitBlocked === "boolean") {
    return !explicitBlocked && detections.every((d) => !d.detected);
  }

  const riskScore = getNumericFlag(record, ["risk_score", "riskScore"]);
  if (typeof riskScore === "number" && riskScore >= 0.5) return false;

  return detections.every((d) => !d.detected);
}

function detectError(status: number, body: string) {
  return `Enkrypt ${status}: ${sanitizeErrorMessage(body || "Detect request failed")}`;
}

async function parseJsonOrEmpty(res: Response) {
  return res.json().catch(() => ({}));
}

async function readErrorBody(res: Response) {
  return sanitizeErrorMessage(await res.text().catch(() => ""));
}

export async function probeEnkryptDetect(): Promise<EnkryptResult> {
  return detectText("This is a safe SchemeSeva validation test.");
}

export async function checkEnkryptHealth(): Promise<{
  ok: boolean;
  status?: number;
  error?: string;
}> {
  const cfg = enkryptConfig();
  if (!cfg.apiKey) return { ok: false, error: "Enkrypt not configured" };

  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/guardrails/health`, {
      method: "GET",
      headers: enkryptHeaders(cfg.apiKey),
    });
    devLog("health", { status: res.status });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: body.slice(0, 200) };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    devLog("health", { status: "network-error" });
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Run Enkrypt guardrail detectors against a citizen-facing report or alert.
 * Tries a small set of known Guardrails payload shapes because Enkrypt has
 * returned different schema errors for different body layouts.
 */
export async function detectText(text: string, context?: string): Promise<EnkryptResult> {
  const cfg = enkryptConfig();
  if (!cfg.apiKey) throw new Error("Enkrypt not configured");

  const errors: string[] = [];
  const variants = buildEnkryptDetectPayloadVariants(text, context);
  let attempts = 0;

  for (const variant of variants) {
    if (!shouldTryVariant(variant, errors, attempts)) continue;
    attempts += 1;
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/guardrails/detect`, {
      method: "POST",
      headers: enkryptHeaders(cfg.apiKey),
      body: JSON.stringify(variant.body),
    });
    devLog("detect", { status: res.status, variant: variant.name });

    if (res.ok) {
      const raw = await parseJsonOrEmpty(res);
      const detections = collectDetections(raw);
      const safe = inferSafe(raw, detections);
      devLog("detect schema selected", { detectSchemaUsed: variant.name });
      return { safe, detections, detectSchemaUsed: variant.name, raw };
    }

    const body = await readErrorBody(res);
    const error = detectError(res.status, body);
    errors.push(error);
    devLog("detect failed", { status: res.status, variant: variant.name, error });
    if (!shouldContinueAfterFailure(variant, res.status, error)) break;
  }

  throw new Error(errors.at(-1) ?? "Enkrypt detect request failed.");
}

export async function enkryptStatus(): Promise<EnkryptStatus> {
  const cfg = enkryptConfig();
  if (!enkryptConfigured()) return { configured: false, baseUrl: cfg.baseUrl };

  const health = await checkEnkryptHealth();
  if (!health.ok) {
    return {
      configured: true,
      baseUrl: cfg.baseUrl,
      reachable: false,
      healthConnected: false,
      detectPayloadValid: false,
      error: health.error ?? `Health ${health.status ?? "failed"}`,
    };
  }

  try {
    const detect = await probeEnkryptDetect();
    return {
      configured: true,
      baseUrl: cfg.baseUrl,
      reachable: true,
      healthConnected: true,
      detectPayloadValid: true,
      detectSchemaUsed: detect.detectSchemaUsed,
    };
  } catch (e) {
    const lastDetectError = sanitizeErrorMessage((e as Error).message);
    return {
      configured: true,
      baseUrl: cfg.baseUrl,
      reachable: true,
      healthConnected: true,
      detectPayloadValid: false,
      lastDetectError,
      error: lastDetectError,
    };
  }
}
