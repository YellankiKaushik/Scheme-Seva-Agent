import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/architecture")({
    head: () => ({
        meta: [
            { title: "Architecture — SchemeSeva" },
            { name: "description", content: "The five-agent SchemeSeva architecture: Profile, Discovery, Eligibility, Report, and Vigilance — orchestrated in TypeScript." },
            { property: "og:title", content: "SchemeSeva Architecture — Five-agent civic AI" },
            { property: "og:description", content: "Mastra-inspired orchestration, semantic scheme retrieval, deterministic eligibility, AI safety validation, and autonomous vigilance." },
        ],
    }),
    component: ArchitecturePage,
});

const layers = [
    { l: "Frontend", t: "TanStack Start (React 19) + Tailwind v4", p: "Landing, agent runner, results, browse, and alert banner." },
    { l: "Orchestration", t: "Mastra-style pipeline in TypeScript server functions", p: "Chains 5 agents. Each step is a typed server function, testable in isolation." },
    { l: "LLM reasoning", t: "OpenRouter", p: "Profile extraction and report generation, with local grounded fallback in demo mode." },
    { l: "Embeddings", t: "Google Gemini embeddings", p: "Semantic vectors for Qdrant retrieval when GEMINI_API_KEY is configured." },
    { l: "Retrieval", t: "Qdrant + local catalog fallback", p: "Verified schemes indexed with eligibility rules, keywords, and metadata." },
    { l: "Memory", t: "Qdrant citizen_sessions + local session fallback", p: "Citizen profile + found schemes persisted by browser-generated session key." },
    { l: "Safety", t: "Enkrypt AI + OpenRouter fallback", p: "Every citizen-facing report checked before display." },
    { l: "Autonomous", t: "Vigilance Agent · Simulate button", p: "Scans saved profile against new schemes without being asked." },
];

const agents = [
    { n: "1. Profile Agent", verb: "think", d: "Extracts state, age, gender, category, income, occupation, land, disability from free text. Sets missing fields to null. Asks one follow-up if a critical field is missing." },
    { n: "2. Discovery Agent", verb: "retrieve", d: "Multi-angle keyword + attribute scoring against 28 schemes. Boosts occupation and state matches. Returns top 20 unique candidates." },
    { n: "3. Eligibility Agent", verb: "evaluate", d: "Deterministic rule check: age, gender, category, income cap, occupation, state, Aadhaar, bank. Hard-fail excludes. Missing docs → medium confidence." },
    { n: "4. Report Agent", verb: "communicate", d: "8th-grade markdown report. Sorted by confidence. 'Likely eligible' throughout. Source URL and last-verified date on every scheme. One disclaimer at the end." },
    { n: "5. Vigilance Agent", verb: "act", d: "Autonomous. Fetches all citizen sessions, scans schemes the citizen hasn't seen, fires alerts for matches above the confidence threshold. Simulate button demos it in <5s." },
];

function ArchitecturePage() {
    return (
        <div className="min-h-screen bg-background">
            <SiteHeader />
            <main className="mx-auto max-w-5xl px-4 py-16">
                <h1 className="font-display text-4xl font-semibold text-primary sm:text-5xl">
                    Architecture
                </h1>
                <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
                    SchemeSeva is a TypeScript-native civic AI agent built on the final
                    hackathon stack: Mastra adapter orchestration, Qdrant semantic retrieval,
                    Google embeddings, OpenRouter reasoning, and Enkrypt AI safety validation.
                </p>

                <section className="mt-12">
                    <h2 className="font-display text-2xl font-semibold text-primary">Stack</h2>
                    <div className="mt-4 overflow-hidden rounded-xl border border-border">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-parchment/50">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-primary">Layer</th>
                                    <th className="px-4 py-3 font-semibold text-primary">Technology</th>
                                    <th className="px-4 py-3 font-semibold text-primary">Purpose</th>
                                </tr>
                            </thead>
                            <tbody>
                                {layers.map((l) => (
                                    <tr key={l.l} className="border-t border-border/60 bg-card">
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">{l.l}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{l.t}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{l.p}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="mt-12">
                    <h2 className="font-display text-2xl font-semibold text-primary">Pipeline</h2>
                    <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-card p-5 text-xs leading-relaxed text-primary">
                        {`   Citizen (free text)
         │
         ▼
   ┌─────────────────────────────────────────────────────┐
   │  ① Profile   →  ② Discovery  →  ③ Eligibility     │
   │                                        │            │
   │                                        ▼            │
   │                              ④ Report → ⑤ Safety  │
   └─────────────────────────────────────────────────────┘
         │                                        │
         ▼                                        ▼
    Session saved                          Personalised report
 (Qdrant/local memory)                  (markdown + confidence)

              ┌──────────────────────────────┐
              │  ⑥ Vigilance Agent (async)  │
              │  scans saved sessions vs.    │
              │  new schemes → fires alerts  │
              └──────────────────────────────┘`}
                    </pre>
                </section>

                <section className="mt-12">
                    <h2 className="font-display text-2xl font-semibold text-primary">The five agents</h2>
                    <ol className="mt-4 space-y-4">
                        {agents.map((a) => (
                            <li key={a.n} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-display text-lg font-semibold text-primary">{a.n}</h3>
                                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
                                        verb · {a.verb}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.d}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="mt-12 rounded-xl border border-border bg-parchment/40 p-6">
                    <h2 className="font-display text-2xl font-semibold text-primary">Trust guarantees</h2>
                    <ul className="mt-3 grid gap-2 text-sm text-primary sm:grid-cols-2">
                        <li>• 100% of reports safety-validated before display</li>
                        <li>• Source URL on every scheme</li>
                        <li>• "Last verified" date on every scheme</li>
                        <li>• "Likely eligible" language — never a legal guarantee</li>
                        <li>• Deterministic rule-based eligibility — not LLM-guessed</li>
                        <li>• No PII in logs; profile stays on the server</li>
                    </ul>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
