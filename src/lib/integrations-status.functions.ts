import { createServerFn } from "@tanstack/react-start";
import { qdrantStatus, qdrantConfigured, qdrantConfig, type QdrantStatus } from "./qdrant";
import { enkryptStatus, enkryptConfigured, enkryptConfig, type EnkryptStatus } from "./enkrypt";
import { mastraStatus } from "@/mastra";
import { langfuseStatus } from "./observability";
import { upstashStatus, type RateLimitStatus } from "./ratelimit";
import { embeddingsConfigured, embeddingsProvider } from "./embeddings";
import { latestLocalDiscoveryRun, latestLocalVigilanceRun } from "./localSessionStore";

const STATUS_TIMEOUTS = {
  qdrant: 3000,
  enkrypt: 3000,
  upstash: 3000,
  supabase: 1500,
} as const;

function sanitizeMessage(message: string) {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/apikey["':=\s]+[A-Za-z0-9._~+/=-]+/gi, "apikey [redacted]")
    .replace(/api-key["':=\s]+[A-Za-z0-9._~+/=-]+/gi, "api-key [redacted]")
    .replace(/token["':=\s]+[A-Za-z0-9._~+/=-]+/gi, "token [redacted]")
    .slice(0, 240);
}

function hostOnly(value?: string | null) {
  if (!value) return value ?? null;
  try {
    return new URL(value).host;
  } catch {
    return "configured-url-invalid";
  }
}

function upstashHostOnly(value?: string | null) {
  if (!value) return value ?? null;
  if (value === "configured-url-invalid") return value;
  const normalized = value.trim().replace(/^(['"])(.*)\1$/, "$2").trim();
  try {
    return new URL(normalized).hostname;
  } catch {
    return normalized.includes(".") && !normalized.includes("/") ? normalized : "configured-url-invalid";
  }
}

function timeoutError(provider: string, timeoutMs: number) {
  return `${provider} status timed out after ${timeoutMs}ms.`;
}

async function withTimeout<T>(
  provider: string,
  timeoutMs: number,
  task: Promise<T>,
  fallback: (error: string) => T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback(timeoutError(provider, timeoutMs))), timeoutMs);
      }),
    ]);
  } catch (e) {
    return fallback(sanitizeMessage((e as Error).message || `${provider} status failed.`));
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function qdrantFallback(error: string): QdrantStatus {
  const cfg = qdrantConfig();
  return {
    configured: qdrantConfigured(),
    url: hostOnly(cfg.url),
    collection: cfg.collection,
    reachable: false,
    error,
  };
}

function normalizeQdrant(status: QdrantStatus): QdrantStatus {
  return {
    ...status,
    url: hostOnly(status.url),
    error: status.error ? sanitizeMessage(status.error) : undefined,
  };
}

function enkryptFallback(error: string): EnkryptStatus {
  const cfg = enkryptConfig();
  return {
    configured: enkryptConfigured(),
    baseUrl: hostOnly(cfg.baseUrl) ?? "api.enkryptai.com",
    reachable: false,
    healthConnected: false,
    detectPayloadValid: false,
    error,
  };
}

function normalizeEnkrypt(status: EnkryptStatus): EnkryptStatus {
  return {
    ...status,
    baseUrl: hostOnly(status.baseUrl) ?? status.baseUrl,
    error: status.error ? sanitizeMessage(status.error) : undefined,
    lastDetectError: status.lastDetectError ? sanitizeMessage(status.lastDetectError) : undefined,
  };
}

function upstashFallback(error: string): RateLimitStatus {
  const configured = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
  return {
    configured,
    credentialsSet: configured,
    connected: false,
    reachable: false,
    provider: configured ? "upstash" : "noop",
    mode: "noop",
    rateLimiting: "noop",
    discoveryLimit: "10/min",
    vigilanceLimit: "3/min",
    host: upstashHostOnly(process.env.UPSTASH_REDIS_REST_URL) ?? undefined,
    error,
  };
}

function normalizeUpstash(status: RateLimitStatus): RateLimitStatus {
  const host = upstashHostOnly(status.host);
  return {
    ...status,
    host:
      host === "configured-url-invalid" && status.connected === true
        ? "configured"
        : (host ?? undefined),
    error: status.error ? sanitizeMessage(status.error) : undefined,
  };
}

export const getIntegrationsStatus = createServerFn({ method: "GET" }).handler(async () => {
  const [qd, en, upstash] = await Promise.all([
    withTimeout("Qdrant", STATUS_TIMEOUTS.qdrant, qdrantStatus(), qdrantFallback).then(
      normalizeQdrant,
    ),
    withTimeout("Enkrypt", STATUS_TIMEOUTS.enkrypt, enkryptStatus(), enkryptFallback).then(
      normalizeEnkrypt,
    ),
    withTimeout("Upstash", STATUS_TIMEOUTS.upstash, upstashStatus(), upstashFallback).then(
      normalizeUpstash,
    ),
  ]);

  let supabase: { configured: boolean; reachable: boolean; error?: string } = {
    configured: Boolean(process.env.SUPABASE_URL),
    reachable: false,
  };
  let lastDiscoveryRun: string | null = null;
  let lastVigilanceRun: string | null = null;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabaseResult = await withTimeout(
      "Supabase",
      STATUS_TIMEOUTS.supabase,
      (async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("schemes").select("id").limit(1);
        const { data: latestSession } = await supabaseAdmin
          .from("sessions")
          .select("updated_at,last_scan_at")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const { data: latestAlert } = await supabaseAdmin
          .from("alerts")
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return {
          supabase: {
            configured: true,
            reachable: !error,
            error: error ? sanitizeMessage(error.message) : undefined,
          },
          lastDiscoveryRun: (latestSession?.updated_at as string | undefined) ?? null,
          lastVigilanceRun:
            (latestAlert?.created_at as string | undefined) ??
            (latestSession?.last_scan_at as string | undefined) ??
            null,
        };
      })(),
      (error) => ({
        supabase: { configured: true, reachable: false, error },
        lastDiscoveryRun: null,
        lastVigilanceRun: null,
      }),
    );
    supabase = supabaseResult.supabase;
    lastDiscoveryRun = supabaseResult.lastDiscoveryRun;
    lastVigilanceRun = supabaseResult.lastVigilanceRun;
  }
  lastDiscoveryRun = lastDiscoveryRun ?? latestLocalDiscoveryRun();
  lastVigilanceRun = lastVigilanceRun ?? latestLocalVigilanceRun();

  const qdrantPrimary = qdrantConfigured() && qd.reachable === true;
  const enkryptPrimary = enkryptConfigured() && en.detectPayloadValid === true;
  const langfuse = langfuseStatus();
  const localMemoryAvailable = true;
  const memoryProvider = qdrantPrimary
    ? "qdrant"
    : localMemoryAvailable
      ? "local"
      : supabase.reachable
        ? "optional-supabase"
        : "unavailable";

  return {
    mastra: mastraStatus(),
    qdrant: {
      ...qd,
      primary: qdrantPrimary,
      fallback: "Local static catalog + keyword/attribute scoring",
    },
    enkrypt: {
      ...en,
      primary: enkryptPrimary,
      fallback: "OpenRouter-based safety validator or local passthrough",
    },
    supabase,
    openrouter: {
      configured: Boolean(process.env.OPENROUTER_API_KEY),
      model: process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-exp:free",
    },
    gemini: {
      configured: Boolean(process.env.GEMINI_API_KEY),
      embeddingsProvider: embeddingsProvider(),
      embeddingsConfigured: embeddingsConfigured(),
    },
    langfuse: {
      ...langfuse,
      baseUrl: hostOnly(langfuse.baseUrl) ?? langfuse.baseUrl,
      host: hostOnly(langfuse.host) ?? langfuse.host,
      lastTraceStatus: {
        ...langfuse.lastTraceStatus,
        error: langfuse.lastTraceStatus.error
          ? sanitizeMessage(langfuse.lastTraceStatus.error)
          : undefined,
      },
    },
    upstash,
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.VITE_DEMO_MODE === "true",
    currentRetrievalProvider: qdrantPrimary
      ? embeddingsConfigured()
        ? "qdrant-vector"
        : "qdrant-keyword"
      : "fallback-local-keyword",
    currentSafetyProvider: enkryptPrimary
      ? "enkrypt"
      : process.env.OPENROUTER_API_KEY
        ? "fallback-openrouter"
        : "passthrough",
    currentWorkflowMode: mastraStatus().mode,
    memoryProvider,
    vigilanceAvailable: memoryProvider !== "unavailable",
    lastSuccessfulDiscoveryRun: lastDiscoveryRun,
    lastSuccessfulVigilanceRun: lastVigilanceRun,
    liveChecks: {
      qdrant:
        qd.reachable === true
          ? "live-connected"
          : qdrantConfigured()
            ? "configured-unreachable"
            : "not-configured",
      enkrypt:
        en.detectPayloadValid === true
          ? "live-connected"
          : en.healthConnected === true
            ? "health-connected-detect-invalid"
            : enkryptConfigured()
              ? "configured-unreachable"
              : "not-configured",
      supabase: supabase.reachable
        ? "live-connected"
        : supabase.configured
          ? "configured-unreachable"
          : "not-configured",
      gemini: embeddingsConfigured() ? "configured-by-env" : "not-configured",
      langfuse: langfuse.configured ? "configured-by-env" : "not-configured",
      upstash:
        upstash.rateLimiting === "active"
          ? "live-connected"
          : upstash.configured
            ? "configured-unreachable"
            : "not-configured",
    },
    lastCheckedAt: new Date().toISOString(),
  };
});
