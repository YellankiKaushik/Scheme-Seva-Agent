import { createServerFn } from "@tanstack/react-start";
import { qdrantStatus, qdrantConfigured } from "./qdrant";
import { enkryptStatus, enkryptConfigured } from "./enkrypt";
import { mastraStatus } from "@/mastra";
import { langfuseStatus } from "./observability";
import { upstashStatus } from "./ratelimit";
import { embeddingsConfigured, embeddingsProvider } from "./embeddings";
import { latestLocalDiscoveryRun, latestLocalVigilanceRun } from "./localSessionStore";

export const getIntegrationsStatus = createServerFn({ method: "GET" }).handler(async () => {
  const [qd, en] = await Promise.all([qdrantStatus(), enkryptStatus()]);

  let supabase: { configured: boolean; reachable: boolean; error?: string } = {
    configured: Boolean(process.env.SUPABASE_URL),
    reachable: false,
  };
  let lastDiscoveryRun: string | null = null;
  let lastVigilanceRun: string | null = null;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("schemes").select("id").limit(1);
      supabase.reachable = !error;
      if (error) supabase.error = error.message;
      const { data: latestSession } = await supabaseAdmin
        .from("sessions")
        .select("updated_at,last_scan_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      lastDiscoveryRun = (latestSession?.updated_at as string | undefined) ?? null;
      const { data: latestAlert } = await supabaseAdmin
        .from("alerts")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      lastVigilanceRun =
        (latestAlert?.created_at as string | undefined) ??
        (latestSession?.last_scan_at as string | undefined) ??
        null;
    } catch (e) {
      supabase.error = (e as Error).message;
    }
  lastDiscoveryRun = lastDiscoveryRun ?? latestLocalDiscoveryRun();
  lastVigilanceRun = lastVigilanceRun ?? latestLocalVigilanceRun();

  const qdrantPrimary = qdrantConfigured() && qd.reachable === true;
  const enkryptPrimary = enkryptConfigured() && en.detectPayloadValid === true;
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
    langfuse: langfuseStatus(),
    upstash: upstashStatus(),
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.VITE_DEMO_MODE === "true",
    currentRetrievalProvider: qdrantPrimary
      ? embeddingsConfigured()
        ? "qdrant-vector"
        : "qdrant-keyword"
      : "fallback-local-keyword",
    currentSafetyProvider: enkryptPrimary
      ? "enkrypt"
      : Boolean(process.env.OPENROUTER_API_KEY)
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
      langfuse: langfuseStatus().configured ? "configured-by-env" : "not-configured",
      upstash: upstashStatus().configured ? "configured-by-env" : "not-configured",
    },
    lastCheckedAt: new Date().toISOString(),
  };
});
