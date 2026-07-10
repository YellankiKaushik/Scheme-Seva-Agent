import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { listSchemes } from "@/lib/schemeseva.functions";
import type { Scheme } from "@/lib/schemeseva-types";

export const Route = createFileRoute("/schemes")({
  head: () => ({
    meta: [
      { title: "Verified schemes catalog - SchemeSeva" },
      {
        name: "description",
        content:
          "Browse 28 verified central and Telangana government welfare schemes indexed by SchemeSeva, with eligibility rules and official source URLs.",
      },
      { property: "og:title", content: "Verified government schemes catalog - SchemeSeva" },
      {
        property: "og:description",
        content:
          "28 curated central + Telangana schemes with source URLs, verification dates, and eligibility rules.",
      },
    ],
  }),
  loader: async () => listSchemes(),
  component: SchemesPage,
  errorComponent: SchemesError,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

function SchemesError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8 text-center">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <p className="text-destructive">Could not load schemes: {error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-4 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function SchemesPage() {
  const { schemes, count } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"all" | "central" | "telangana">("all");
  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    return schemes.filter((s: Scheme) => {
      if (scope !== "all" && s.stateScope !== scope) return false;
      if (!query) return true;
      return (
        s.schemeName.toLowerCase().includes(query) ||
        s.ministry.toLowerCase().includes(query) ||
        s.keywords.some((k: string) => k.toLowerCase().includes(query))
      );
    });
  }, [q, scope, schemes]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                Verified scheme catalog
              </span>
              <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-primary sm:text-4xl">
                Browse {count} Central + Telangana schemes
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Search the focused catalog used by the agent. Coverage is intentionally scoped for
                the hackathon demo and includes official sources plus last verified dates.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, ministry, keyword..."
                  className="min-h-11 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-primary outline-none transition focus:ring-2 focus:ring-ring sm:w-72"
                />
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as typeof scope)}
                className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-primary outline-none transition focus:ring-2 focus:ring-ring"
              >
                <option value="all">All</option>
                <option value="central">Central</option>
                <option value="telangana">Telangana</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {filtered.map((s: Scheme) => (
            <article
              key={s.id}
              className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-semibold text-primary">
                    {s.schemeName}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.ministry}</p>
                </div>
                <span className="rounded-full bg-accent/15 px-2 py-1 text-[11px] font-semibold text-primary">
                  {s.stateScope === "central" ? "Central" : s.stateScope}
                </span>
              </div>
              <div className="mt-3 inline-flex rounded-md bg-success/15 px-2.5 py-1 text-sm font-semibold text-success">
                {s.benefitAmount}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {s.keywords.slice(0, 5).map((k: string) => (
                  <span
                    key={k}
                    className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-primary"
                  >
                    {k}
                  </span>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <a
                  href={s.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-start gap-1 break-all font-semibold text-primary underline hover:text-accent"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span>sourceUrl: {s.sourceUrl}</span>
                </a>
                <p>lastVerified: {s.lastVerified}</p>
              </div>
            </article>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="mt-10 rounded-lg border border-border bg-card p-6 text-center text-muted-foreground shadow-sm">
            No matches. Try a different keyword or scope.
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
