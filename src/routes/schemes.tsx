import { createFileRoute, useRouter } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { listSchemes } from "@/lib/schemeseva.functions";
import type { Scheme } from "@/lib/schemeseva-types";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/schemes")({
    head: () => ({
        meta: [
            { title: "Verified schemes catalog — SchemeSeva" },
            { name: "description", content: "Browse 28 verified central and Telangana government welfare schemes indexed by SchemeSeva, with eligibility rules and official source URLs." },
            { property: "og:title", content: "Verified government schemes catalog — SchemeSeva" },
            { property: "og:description", content: "28 curated central + Telangana schemes with source URLs, verification dates, and eligibility rules." },
        ],
    }),
    loader: async () => listSchemes(),
    component: SchemesPage,
    errorComponent: ({ error, reset }) => {
        const router = useRouter();
        return (
            <div className="p-8 text-center">
                <p className="text-destructive">Could not load schemes: {error.message}</p>
                <button
                    onClick={() => { router.invalidate(); reset(); }}
                    className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground"
                >
                    Retry
                </button>
            </div>
        );
    },
    notFoundComponent: () => <div className="p-8">Not found.</div>,
});

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
            <main className="mx-auto max-w-6xl px-4 py-12">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
                            Scheme catalog
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            {count} verified schemes indexed by SchemeSeva ·
                            Central + Telangana
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by name, ministry, keyword…"
                            className="w-64 rounded-md border border-input bg-card px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-ring"
                        />
                        <select
                            value={scope}
                            onChange={(e) => setScope(e.target.value as typeof scope)}
                            className="rounded-md border border-input bg-card px-3 py-2 text-sm text-primary"
                        >
                            <option value="all">All</option>
                            <option value="central">Central</option>
                            <option value="telangana">Telangana</option>
                        </select>
                    </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                    {filtered.map((s: Scheme) => (
                        <article
                            key={s.id}
                            className="rounded-xl border border-border bg-card p-5 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
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
                            <p className="mt-3 text-sm text-muted-foreground">{s.description}</p>
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
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">
                                    Official source ↗
                                </a>
                                <span>Last verified: {s.lastVerified}</span>
                            </div>
                        </article>
                    ))}
                </div>
                {filtered.length === 0 && (
                    <p className="mt-10 text-center text-muted-foreground">No matches. Try a different keyword.</p>
                )}
            </main>
            <SiteFooter />
        </div>
    );
}
