import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { getIntegrationsStatus } from "@/lib/integrations-status.functions";

export const Route = createFileRoute("/debug/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations status — SchemeSeva" },
      {
        name: "description",
        content:
          "Live status of the SchemeSeva stack: Mastra adapter, OpenRouter, Gemini embeddings, Qdrant, Enkrypt AI, Langfuse, Upstash, and optional Supabase fallback.",
      },
    ],
  }),
  component: IntegrationsPage,
});

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {ok ? "● " : "○ "}
      {label}
    </span>
  );
}

function clientTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    task,
    new Promise<T>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Integration status request timed out after ${timeoutMs}ms.`)),
        timeoutMs,
      );
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Integration status request failed.";
}

function IntegrationsPage() {
  const fetchStatus = useServerFn(getIntegrationsStatus);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["integrations-status"],
    queryFn: () => clientTimeout(fetchStatus(), 9000),
    retry: false,
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold text-primary">
              Integrations status
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Live check of the independent SchemeSeva stack and demo fallbacks.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-parchment"
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {isLoading && !data ? (
          <p className="mt-8 text-muted-foreground">Loading status…</p>
        ) : isError || !data ? (
          <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-amber-900">
              Unable to load integration status
            </h2>
            <p className="mt-2 text-sm text-amber-800">{errorMessage(error)}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              Retry
            </button>
          </section>
        ) : (
          <div className="mt-8 space-y-4">
            <Card
              title="Workflow runtime"
              primary={data.mastra.configured}
              badges={[
                <Pill
                  key="w"
                  ok={Boolean(data.currentWorkflowMode)}
                  label={`mode: ${data.currentWorkflowMode}`}
                />,
                <Pill
                  key="v"
                  ok={data.vigilanceAvailable}
                  label={data.vigilanceAvailable ? "vigilance yes" : "vigilance no"}
                />,
              ]}
            >
              <p className="text-sm text-muted-foreground">
                Retrieval provider: <code>{data.currentRetrievalProvider}</code> · Safety provider:{" "}
                <code>{data.currentSafetyProvider}</code> · Memory provider:{" "}
                <code>{data.memoryProvider}</code>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Last discovery: {data.lastSuccessfulDiscoveryRun ?? "none yet"} · Last vigilance:{" "}
                {data.lastSuccessfulVigilanceRun ?? "none yet"}
              </p>
            </Card>

            <Card
              title="Mastra"
              primary={data.mastra.configured}
              badges={[
                <Pill
                  key="m"
                  ok={data.mastra.configured}
                  label={data.mastra.mode === "adapter" ? "adapter" : "runtime"}
                />,
              ]}
            >
              <p className="text-sm text-muted-foreground">{data.mastra.reason}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Agents: {data.mastra.agents.join(", ")} · Workflows:{" "}
                {data.mastra.workflows.join(", ")}
              </p>
            </Card>

            <Card
              title="Qdrant (scheme retrieval + optional memory)"
              primary={data.qdrant.primary}
              badges={[
                <Pill
                  key="c"
                  ok={data.qdrant.configured}
                  label={data.qdrant.configured ? "credentials set" : "no credentials"}
                />,
                <Pill
                  key="r"
                  ok={data.qdrant.reachable === true}
                  label={
                    data.qdrant.reachable === true
                      ? "collection reachable"
                      : data.qdrant.configured
                        ? "unreachable"
                        : "fallback active"
                  }
                />,
              ]}
            >
              <p className="text-sm text-muted-foreground">
                Collection: <code>{data.qdrant.collection}</code>
                {data.qdrant.url ? ` @ ${data.qdrant.url}` : ""}
              </p>
              {data.qdrant.error ? (
                <p className="mt-1 text-xs text-amber-700">Error: {data.qdrant.error}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">Fallback: {data.qdrant.fallback}</p>
            </Card>

            <Card
              title="Enkrypt AI (safety validator)"
              primary={data.enkrypt.primary}
              badges={[
                <Pill
                  key="c"
                  ok={data.enkrypt.configured}
                  label={data.enkrypt.configured ? "credentials set" : "no credentials"}
                />,
                <Pill
                  key="h"
                  ok={data.enkrypt.healthConnected === true || data.enkrypt.reachable === true}
                  label={
                    data.enkrypt.healthConnected === true || data.enkrypt.reachable === true
                      ? "health connected"
                      : data.enkrypt.configured
                        ? "unreachable"
                        : "fallback active"
                  }
                />,
                <Pill
                  key="d"
                  ok={data.enkrypt.detectPayloadValid === true}
                  label={
                    data.enkrypt.detectPayloadValid === true
                      ? "detect connected"
                      : data.enkrypt.healthConnected === true
                        ? "detect payload invalid"
                        : "detect fallback"
                  }
                />,
              ]}
            >
              <p className="text-sm text-muted-foreground">Base URL: {data.enkrypt.baseUrl}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Health:{" "}
                <code>{data.enkrypt.healthConnected === true ? "connected" : "failed"}</code> ·
                Detect:{" "}
                <code>
                  {data.enkrypt.detectPayloadValid === true
                    ? "connected"
                    : data.enkrypt.healthConnected === true
                      ? "payload invalid"
                      : "failed"}
                </code>
                {data.enkrypt.detectSchemaUsed ? (
                  <>
                    {" "}
                    · Schema: <code>{data.enkrypt.detectSchemaUsed}</code>
                  </>
                ) : null}
              </p>
              {data.enkrypt.lastDetectError ? (
                <p className="mt-1 text-xs text-amber-700">
                  Last detect error: {data.enkrypt.lastDetectError}
                </p>
              ) : null}
              {data.enkrypt.error ? (
                <p className="mt-1 text-xs text-amber-700">Error: {data.enkrypt.error}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                Fallback: {data.enkrypt.fallback}
              </p>
            </Card>

            <Card
              title="Supabase (optional fallback)"
              primary={data.supabase.reachable}
              badges={[
                <Pill
                  key="c"
                  ok={data.supabase.configured}
                  label={data.supabase.configured ? "configured" : "missing"}
                />,
                <Pill
                  key="r"
                  ok={data.supabase.reachable}
                  label={data.supabase.reachable ? "connected" : "unreachable"}
                />,
              ]}
            >
              <p className="text-sm text-muted-foreground">
                Optional fallback for catalog and session persistence. SchemeSeva can run with
                Qdrant or local demo data when Supabase is missing.
              </p>
              {data.supabase.error ? (
                <p className="mt-1 text-xs text-amber-700">Error: {data.supabase.error}</p>
              ) : null}
            </Card>

            <Card
              title="OpenRouter reasoning"
              primary={data.openrouter.configured}
              badges={[
                <Pill
                  key="k"
                  ok={data.openrouter.configured}
                  label={data.openrouter.configured ? "configured" : "local demo fallback"}
                />,
                <Pill
                  key="d"
                  ok={data.demoMode}
                  label={data.demoMode ? "demo mode ON" : "demo mode off"}
                />,
              ]}
            >
              <p className="text-sm text-muted-foreground">
                Reasoning model: <code>{data.openrouter.model ?? "not set"}</code>. Profile and
                report agents use local grounded fallbacks when OpenRouter is missing.
              </p>
            </Card>

            <Card
              title="Gemini embeddings"
              primary={data.gemini.embeddingsConfigured}
              badges={[
                <Pill
                  key="g"
                  ok={data.gemini.embeddingsConfigured}
                  label={data.gemini.embeddingsConfigured ? "configured" : "keyword fallback"}
                />,
              ]}
            >
              <p className="text-sm text-muted-foreground">
                Provider: <code>{data.gemini.embeddingsProvider}</code>
              </p>
            </Card>

            <Card
              title="Langfuse observability"
              primary={data.langfuse.configured}
              badges={[
                <Pill
                  key="c"
                  ok={data.langfuse.configured}
                  label={data.langfuse.configured ? "credentials set" : "missing"}
                />,
                <Pill
                  key="m"
                  ok={data.langfuse.tracingMode === "langfuse"}
                  label={`mode: ${data.langfuse.tracingMode}`}
                />,
                <Pill
                  key="l"
                  ok={data.langfuse.lastTraceStatus.ok}
                  label={data.langfuse.lastTraceStatus.ok ? "last trace ok" : "last trace failed"}
                />,
              ]}
            >
              <p className="text-sm text-muted-foreground">
                Base URL: <code>{data.langfuse.baseUrl}</code>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Last trace: {data.langfuse.lastTraceStatus.traceName ?? "none yet"} ·{" "}
                {data.langfuse.lastTraceStatus.at}
              </p>
              {data.langfuse.lastTraceStatus.error ? (
                <p className="mt-1 text-xs text-amber-700">
                  Error: {data.langfuse.lastTraceStatus.error}
                </p>
              ) : null}
            </Card>

            <Card
              title="Upstash Redis rate limiting"
              primary={data.upstash.rateLimiting === "active"}
              badges={[
                <Pill
                  key="c"
                  ok={data.upstash.credentialsSet}
                  label={data.upstash.credentialsSet ? "credentials set" : "credentials missing"}
                />,
                <Pill
                  key="r"
                  ok={data.upstash.connected === true}
                  label={
                    data.upstash.connected === true
                      ? "connected"
                      : data.upstash.configured
                        ? "unreachable"
                        : "noop fallback"
                  }
                />,
                <Pill
                  key="m"
                  ok={data.upstash.rateLimiting === "active"}
                  label={`rate limiting: ${data.upstash.rateLimiting}`}
                />,
              ]}
            >
              <p className="text-sm text-muted-foreground">
                Discovery limit: <code>{data.upstash.discoveryLimit}</code> | Vigilance limit:{" "}
                <code>{data.upstash.vigilanceLimit}</code>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Store: <code>{data.upstash.host ?? "not configured"}</code>
              </p>
              {data.upstash.error ? (
                <p className="mt-1 text-xs text-amber-700">Status: {data.upstash.error}</p>
              ) : null}
            </Card>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Card({
  title,
  primary,
  badges,
  children,
}: {
  title: string;
  primary: boolean;
  badges: React.ReactNode[];
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-primary">{title}</h2>
        <div className="flex flex-wrap gap-1.5">
          <Pill ok={primary} label={primary ? "primary active" : "fallback / adapter"} />
          {badges}
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
