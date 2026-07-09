import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { ArrowRight, Cpu, Database, Eye, ShieldCheck } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture - SchemeSeva" },
      {
        name: "description",
        content:
          "The five-agent SchemeSeva architecture: Profile, Discovery, Eligibility, Report, and Vigilance, orchestrated in TypeScript.",
      },
      { property: "og:title", content: "SchemeSeva Architecture - Five-agent civic AI" },
      {
        property: "og:description",
        content:
          "Mastra-inspired orchestration, semantic scheme retrieval, deterministic eligibility, AI safety validation, and autonomous vigilance.",
      },
    ],
  }),
  component: ArchitecturePage,
});

const layers = [
  {
    layer: "Frontend",
    technology: "TanStack Start (React 19) + Tailwind v4",
    purpose: "Landing page, agent runner, report view, scheme catalog, and alert banner.",
  },
  {
    layer: "Orchestration",
    technology: "Mastra-style TypeScript workflow",
    purpose: "Chains five agents through typed server functions that are testable in isolation.",
  },
  {
    layer: "Reasoning",
    technology: "OpenRouter",
    purpose: "Profile extraction and report generation, with local grounded fallback in demo mode.",
  },
  {
    layer: "Embeddings",
    technology: "Google Gemini embeddings",
    purpose: "Semantic vectors for Qdrant retrieval when GEMINI_API_KEY is configured.",
  },
  {
    layer: "Retrieval",
    technology: "Qdrant + local catalog fallback",
    purpose: "Verified schemes indexed with eligibility rules, keywords, and metadata.",
  },
  {
    layer: "Memory",
    technology: "Qdrant citizen_sessions + local fallback",
    purpose: "Citizen profile and found schemes persisted by browser-generated session key.",
  },
  {
    layer: "Safety",
    technology: "Enkrypt AI + fallback validator",
    purpose: "Citizen-facing reports and Vigilance alerts checked before display.",
  },
  {
    layer: "Operations",
    technology: "Langfuse + Upstash + Vercel",
    purpose: "Tracing, rate limiting, and deployed hackathon runtime.",
  },
];

const agents = [
  {
    name: "Profile Agent",
    verb: "structure",
    description:
      "Extracts state, age, gender, category, income, occupation, land, disability, and other profile facts from guided or plain-language input.",
  },
  {
    name: "Discovery Agent",
    verb: "retrieve",
    description:
      "Searches the 28-scheme Central + Telangana catalog through Qdrant retrieval or local fallback.",
  },
  {
    name: "Eligibility Agent",
    verb: "evaluate",
    description:
      "Checks deterministic rules such as age, gender, category, income cap, occupation, state, Aadhaar status, and bank account status.",
  },
  {
    name: "Report Agent",
    verb: "explain",
    description:
      "Creates a simple source-grounded report that uses likely eligible language and includes documents, steps, sourceUrl, and lastVerified.",
  },
  {
    name: "Vigilance Agent",
    verb: "watch",
    description:
      "Scans saved profiles against unseen schemes and creates proactive alerts when a new likely match appears.",
  },
];

const pipeline = [
  ["1", "Profile", "Structure citizen details"],
  ["2", "Discovery", "Retrieve candidate schemes"],
  ["3", "Eligibility", "Check rules"],
  ["4", "Report", "Explain likely matches"],
  ["5", "Safety", "Validate output"],
  ["6", "Vigilance", "Watch for new matches"],
];

const judgeChecks = [
  ["Mastra", "Look for workflow mode adapter and the five typed agents in this page."],
  ["Qdrant retrieval", "Run the Farmer demo and confirm Retrieval: qdrant-vector."],
  ["Qdrant memory", "Confirm Memory: qdrant and Memory write: success after a report."],
  ["Enkrypt AI", "Confirm Safety: enkrypt on reports and Vigilance alerts."],
  ["Collections", "schemeseva_schemes, citizen_sessions, and pending_alerts."],
  ["Debug proof", "Open /debug/integrations for live provider status without secrets."],
];

function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            Architecture
          </span>
          <h1 className="mt-4 font-display text-4xl font-semibold text-primary sm:text-5xl">
            Five agents, one source-grounded workflow.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
            SchemeSeva is a TypeScript-native civic AI app built on Mastra-style orchestration,
            Qdrant retrieval and memory, Gemini embeddings, OpenRouter reasoning, Enkrypt
            validation, Langfuse tracing, and Upstash rate limiting.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/app" className="ss-btn-primary">
              Run agent <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/debug/integrations" className="ss-btn-secondary">
              Check integrations
            </Link>
          </div>
        </section>

        <section className="mt-12 rounded-lg border border-accent/35 bg-accent/5 p-6 shadow-sm">
          <SectionHeader eyebrow="Judge verification" title="How to verify the mandatory stack" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {judgeChecks.map(([title, body]) => (
              <article key={title} className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-display text-base font-semibold text-primary">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeader eyebrow="Pipeline" title="How a request moves through the system" />
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {pipeline.map(([number, title, body]) => (
              <article
                key={title}
                className="rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {number}
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold text-primary">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeader eyebrow="Stack" title="The production proof points" />
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-parchment/60">
                <tr>
                  <th className="px-4 py-3 font-semibold text-primary">Layer</th>
                  <th className="px-4 py-3 font-semibold text-primary">Technology</th>
                  <th className="px-4 py-3 font-semibold text-primary">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {layers.map((layer) => (
                  <tr key={layer.layer} className="border-t border-border/60">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-primary">
                      {layer.layer}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{layer.technology}</td>
                    <td className="px-4 py-3 text-muted-foreground">{layer.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <SectionHeader eyebrow="Agents" title="What each agent contributes" />
          <ol className="grid gap-4 md:grid-cols-2">
            {agents.map((agent, index) => (
              <li
                key={agent.name}
                className="rounded-lg border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold text-primary">
                    {index + 1}. {agent.name}
                  </h3>
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    {agent.verb}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {agent.description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12 rounded-lg border border-border bg-parchment/45 p-6">
          <SectionHeader eyebrow="Guardrails" title="Honest fallback behavior" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Guardrail
              icon={<Database />}
              title="Retrieval"
              body="Qdrant is primary; local catalog fallback keeps the demo runnable."
            />
            <Guardrail
              icon={<Eye />}
              title="Memory"
              body="Qdrant memory is primary; local session fallback is visible in badges."
            />
            <Guardrail
              icon={<ShieldCheck />}
              title="Safety"
              body="Enkrypt validates outputs; fallback status stays honest when needed."
            />
            <Guardrail
              icon={<Cpu />}
              title="Operations"
              body="Langfuse and Upstash signals are inspectable on the debug page."
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
        {eyebrow}
      </span>
      <h2 className="mt-3 font-display text-2xl font-semibold text-primary sm:text-3xl">{title}</h2>
    </div>
  );
}

function Guardrail({ icon, title, body }: { icon: ReactElement; title: string; body: string }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-primary">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <h3 className="font-display text-base font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}
