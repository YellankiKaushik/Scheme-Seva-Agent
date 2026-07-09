// Langfuse observability adapter. Uses Langfuse REST ingestion directly so it
// stays compatible with the Cloudflare Worker/Nitro build target. Missing
// credentials become a no-op tracer; observability must never break app flows.

export interface TraceHandle {
  id: string;
  name: string;
  startedAt: number;
  metadata: SafeRecord;
  span(name: string, metadata?: SafeRecord): SpanHandle;
  generation(name: string, metadata?: SafeRecord): SpanHandle;
  end(output?: SafeRecord, error?: unknown): Promise<void>;
}

export interface SpanHandle {
  id: string;
  end(output?: SafeRecord, error?: unknown): void;
}

type SafeRecord = Record<string, unknown>;

let lastTraceStatus: {
  mode: "langfuse" | "noop";
  ok: boolean;
  at: string;
  traceName?: string;
  error?: string;
} = {
  mode: "noop",
  ok: true,
  at: new Date(0).toISOString(),
};

export const langfuseBaseUrl =
  process.env.LANGFUSE_BASE_URL ||
  process.env.LANGFUSE_HOST ||
  "https://cloud.langfuse.com";

export function isLangfuseConfigured(): boolean {
  return Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

export const langfuseConfigured = isLangfuseConfigured;

export function langfuseStatus() {
  const configured = isLangfuseConfigured();
  const status =
    lastTraceStatus.at === new Date(0).toISOString()
      ? { ...lastTraceStatus, mode: configured ? ("langfuse" as const) : ("noop" as const) }
      : lastTraceStatus;
  return {
    configured,
    baseUrl: langfuseBaseUrl,
    host: langfuseBaseUrl,
    tracingMode: configured ? "langfuse" : "noop",
    lastTraceStatus: status,
  };
}

function rid(prefix = "lf") {
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function safeSessionId(value: unknown) {
  if (typeof value !== "string") return undefined;
  return value.length <= 8 ? value : `${value.slice(0, 8)}...`;
}

function sanitizeValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length > 500) return `${value.slice(0, 500)}...`;
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => sanitizeValue(item));
  if (typeof value !== "object") return String(value);

  const out: SafeRecord = {};
  for (const [key, raw] of Object.entries(value as SafeRecord)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("key") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("authorization")
    ) {
      out[key] = "[redacted]";
      continue;
    }
    if (
      lower.includes("aadhaar") ||
      lower.includes("bankaccount") ||
      lower.includes("bank_account") ||
      lower.includes("address")
    ) {
      out[key] = typeof raw === "boolean" ? raw : "[omitted]";
      continue;
    }
    if (lower === "sessionkey" || lower === "sessionid") {
      out[key] = safeSessionId(raw);
      continue;
    }
    if (lower === "profile" || lower === "citizenprofile") {
      out[key] = summarizeProfile(raw);
      continue;
    }
    out[key] = sanitizeValue(raw);
  }
  return out;
}

function summarizeProfile(value: unknown): SafeRecord {
  if (typeof value !== "object" || value == null) return {};
  const profile = value as SafeRecord;
  return {
    state: profile.state,
    ageBand: typeof profile.age === "number" ? `${Math.floor(profile.age / 10) * 10}s` : undefined,
    gender: profile.gender,
    category: profile.category,
    occupation: profile.occupation,
    hasAadhaar: profile.hasAadhaar,
    hasBankAccount: profile.hasBankAccount,
    hasBPL: profile.hasBPL,
    isDisabled: profile.isDisabled,
    isWidow: profile.isWidow,
    isMinority: profile.isMinority,
  };
}

function sanitizeRecord(record?: SafeRecord): SafeRecord {
  return (sanitizeValue(record ?? {}) as SafeRecord) ?? {};
}

function errorMessage(error: unknown) {
  if (!error) return undefined;
  return sanitizeValue(error instanceof Error ? error.message : String(error)) as string;
}

function authHeader() {
  return "Basic " + btoa(`${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`);
}

async function ingest(events: unknown[], traceName?: string) {
  if (!isLangfuseConfigured()) {
    lastTraceStatus = { mode: "noop", ok: true, at: new Date().toISOString(), traceName };
    return;
  }

  try {
    const res = await fetch(`${langfuseBaseUrl.replace(/\/$/, "")}/api/public/ingestion`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader() },
      body: JSON.stringify({ batch: events }),
    });
    lastTraceStatus = {
      mode: "langfuse",
      ok: res.ok,
      at: new Date().toISOString(),
      traceName,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    lastTraceStatus = {
      mode: "langfuse",
      ok: false,
      at: new Date().toISOString(),
      traceName,
      error: errorMessage(e),
    };
  }
}

export function startTrace(name: string, metadata?: SafeRecord): TraceHandle {
  const traceId = rid("trace");
  const startedAt = Date.now();
  const pendingObservations: unknown[] = [];
  const safeMetadata = sanitizeRecord(metadata);

  function createObservation(type: "span-create" | "generation-create", spanName: string, input?: SafeRecord) {
    const spanId = rid(type === "generation-create" ? "gen" : "span");
    const spanStartMs = Date.now();
    const spanStart = new Date(spanStartMs).toISOString();
    return {
      id: spanId,
      end(output?: SafeRecord, error?: unknown) {
        pendingObservations.push({
          id: rid("event"),
          type,
          timestamp: new Date().toISOString(),
          body: {
            id: spanId,
            traceId,
            name: spanName,
            startTime: spanStart,
            endTime: new Date().toISOString(),
            input: sanitizeRecord(input),
            output: sanitizeRecord(output),
            metadata: {
              latencyMs: Date.now() - spanStartMs,
              success: !error,
              error: errorMessage(error),
              ...(sanitizeRecord(input).model ? { model: sanitizeRecord(input).model } : {}),
              ...(sanitizeRecord(input).provider ? { provider: sanitizeRecord(input).provider } : {}),
            },
            level: error ? "ERROR" : "DEFAULT",
            statusMessage: errorMessage(error),
            usage: sanitizeRecord(input).usage,
            model: sanitizeRecord(input).model,
          },
        });
      },
    };
  }

  return {
    id: traceId,
    name,
    startedAt,
    metadata: safeMetadata,
    span(spanName, spanMetadata) {
      return createObservation("span-create", spanName, spanMetadata);
    },
    generation(spanName, spanMetadata) {
      return createObservation("generation-create", spanName, spanMetadata);
    },
    async end(output, error) {
      if (!isLangfuseConfigured()) {
        lastTraceStatus = { mode: "noop", ok: true, at: new Date().toISOString(), traceName: name };
        return;
      }
      await ingest(
        [
          {
            id: rid("event"),
            type: "trace-create",
            timestamp: new Date().toISOString(),
            body: {
              id: traceId,
              name,
              input: safeMetadata,
              output: sanitizeRecord(output),
              metadata: {
                ...safeMetadata,
                latencyMs: Date.now() - startedAt,
                success: !error,
                error: errorMessage(error),
              },
              sessionId: safeMetadata.sessionKey ?? safeMetadata.sessionId,
            },
          },
          ...pendingObservations,
        ],
        name,
      );
    },
  };
}

export async function traceWorkflow<T>(
  name: string,
  metadata: SafeRecord,
  fn: (trace: TraceHandle) => Promise<T>,
): Promise<T> {
  const trace = startTrace(name, metadata);
  try {
    const result = await fn(trace);
    await trace.end({ success: true });
    await flushObservability();
    return result;
  } catch (e) {
    await trace.end({ success: false }, e);
    await flushObservability();
    throw e;
  }
}

export async function traceStep<T>(
  trace: TraceHandle,
  name: string,
  metadata: SafeRecord,
  fn: () => Promise<T> | T,
  output?: (result: T) => SafeRecord,
): Promise<T> {
  const span = trace.span(name, metadata);
  try {
    const result = await fn();
    span.end(output ? output(result) : { success: true });
    return result;
  } catch (e) {
    span.end({ success: false }, e);
    throw e;
  }
}

export async function flushObservability() {
  // REST ingestion is awaited in trace.end(). This hook is kept for SDK parity
  // and future batching, and must remain best-effort/no-op.
  return;
}
