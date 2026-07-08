// Enkrypt AI client adapter. Uses the Enkrypt Guardrails REST API when
// ENKRYPT_API_KEY is configured. Falls back gracefully otherwise.
// Docs: https://docs.enkryptai.com/

export interface EnkryptStatus {
  configured: boolean;
  baseUrl: string;
  reachable?: boolean;
  error?: string;
}

const DEFAULT_BASE = "https://api.enkryptai.com";

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
  raw?: unknown;
}

/**
 * Run Enkrypt guardrail detectors against a piece of text (typically the
 * citizen-facing report or alert). We enable the detectors most relevant to
 * SchemeSeva: hallucination, bias, toxicity, and policy_violation. Returns a
 * normalized result the safety validator can consume.
 */
export async function detectText(text: string, context?: string): Promise<EnkryptResult> {
  const cfg = enkryptConfig();
  if (!cfg.apiKey) throw new Error("Enkrypt not configured");
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/guardrails/detect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.apiKey,
    },
    body: JSON.stringify({
      text,
      context,
      detectors: {
        toxicity: { enabled: true },
        bias: { enabled: true },
        hallucination: { enabled: true },
        policy_violation: { enabled: true },
        pii: { enabled: false },
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Enkrypt ${res.status}: ${body.slice(0, 200)}`);
  }
  const raw = (await res.json()) as {
    summary?: { detected?: boolean };
    detections?: Record<string, { detected?: boolean; score?: number; detail?: string }>;
  };
  const detections: EnkryptDetection[] = Object.entries(raw.detections ?? {}).map(([k, v]) => ({
    detector: k,
    detected: Boolean(v?.detected),
    score: v?.score,
    detail: v?.detail,
  }));
  const safe = detections.every((d) => !d.detected) && !raw.summary?.detected;
  return { safe, detections, raw };
}

export async function enkryptStatus(): Promise<EnkryptStatus> {
  const cfg = enkryptConfig();
  if (!enkryptConfigured()) return { configured: false, baseUrl: cfg.baseUrl };
  try {
    // Minimal ping — issue a detect call on trivial text.
    await detectText("hello");
    return { configured: true, baseUrl: cfg.baseUrl, reachable: true };
  } catch (e) {
    return {
      configured: true,
      baseUrl: cfg.baseUrl,
      reachable: false,
      error: (e as Error).message,
    };
  }
}
