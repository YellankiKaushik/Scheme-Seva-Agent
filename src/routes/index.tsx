import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const workflow = [
  ["Profile Agent", "Extracts state, age, occupation, category, income, and document status."],
  ["Discovery Agent", "Searches verified schemes using Qdrant retrieval or local fallback."],
  ["Eligibility Agent", "Checks hard rules deterministically instead of guessing."],
  ["Report Agent", "Explains likely matches, documents, sources, and application steps."],
  ["Vigilance Agent", "Keeps watching for new matches after a profile is saved."],
];

const stack = [
  ["Mastra", "Agent orchestration"],
  ["Qdrant", "Retrieval + memory"],
  ["Enkrypt AI", "Safety validation"],
  ["OpenRouter", "Reasoning"],
  ["Gemini", "Embeddings"],
  ["Langfuse", "Observability"],
  ["Upstash", "Rate limiting"],
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="max-w-3xl">
            <span className="text-sm font-semibold uppercase tracking-wider text-accent">
              Civic AI for welfare discovery
            </span>
            <h1 className="mt-3 font-display text-5xl font-semibold text-primary sm:text-6xl">
              SchemeSeva
            </h1>
            <p className="mt-5 text-xl leading-relaxed text-muted-foreground">
              Find government schemes you may qualify for - and get alerted when new ones appear.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/app"
                className="rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm hover:opacity-95"
              >
                Try the agent
              </Link>
              <Link
                to="/architecture"
                className="rounded-lg border border-border bg-card px-6 py-3 text-base font-semibold text-primary hover:bg-secondary"
              >
                View architecture
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-parchment/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl font-semibold text-primary">The problem</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <InfoCard
              title="Fragmented discovery"
              body="India has many welfare schemes across central and state portals. Citizens often do not know where to look."
            />
            <InfoCard
              title="Hard to understand"
              body="Eligibility rules depend on income, caste/category, location, age, occupation, documents, and special status."
            />
            <InfoCard
              title="Reactive portals"
              body="myScheme is useful, but it is reactive. SchemeSeva demonstrates a proactive agent that can keep watching."
            />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl font-semibold text-primary">How SchemeSeva works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-5">
            {workflow.map(([title, body], index) => (
              <li key={title} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <span className="font-display text-2xl font-semibold text-accent">{index + 1}</span>
                <h3 className="mt-3 font-display text-lg font-semibold text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-border/60 bg-parchment/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl font-semibold text-primary">Mandatory stack</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stack.map(([title, body]) => (
              <InfoCard key={title} title={title} body={body} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold text-primary">Trust and safety</h2>
            <ul className="mt-5 space-y-3 text-primary">
              <li>Uses “likely eligible” and “may qualify,” never guaranteed eligibility.</li>
              <li>Every scheme in the report includes source URLs and lastVerified dates.</li>
              <li>No Aadhaar numbers or bank account numbers are collected.</li>
              <li>Privacy delete support is included for stored session data.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-3xl font-semibold text-primary">Demo scope</h2>
            <p className="mt-4 text-muted-foreground">
              The local fallback includes representative central and Telangana schemes so the app
              works with no API keys. The judged demo path is 25-30 verified schemes seeded into
              Qdrant, focused on central and Telangana coverage.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <h2 className="font-display text-3xl font-semibold">The Vigilance differentiator</h2>
            <p className="mt-4 text-lg leading-relaxed opacity-90">
              After a user profile is saved, the Vigilance Agent can scan new or unseen schemes and
              alert the citizen when a matching opportunity appears. This proactive flow is what
              normal scheme portals do not do.
            </p>
            <Link
              to="/app"
              className="mt-7 inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-accent-foreground shadow-sm"
            >
              Run the demo
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h3 className="font-display text-lg font-semibold text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}
