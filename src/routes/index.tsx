import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FileSearch,
  Layers3,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const problemPoints = [
  {
    title: "Schemes are fragmented",
    body: "Benefits are spread across central and state portals, notices, PDFs, and department pages.",
  },
  {
    title: "Eligibility is confusing",
    body: "Rules change by state, category, age, occupation, income, documents, and special status.",
  },
  {
    title: "Portals are mostly reactive",
    body: "Citizens often have to know what to search for before they can discover a useful benefit.",
  },
  {
    title: "People miss support",
    body: "Farmers, students, elders, entrepreneurs, and field workers can lose time chasing the wrong path.",
  },
];

const agents = [
  ["Profile Agent", "Structures basic profile details from a guided form or plain-language note."],
  [
    "Discovery Agent",
    "Searches the verified scheme catalog with Qdrant retrieval or honest local fallback.",
  ],
  [
    "Eligibility Agent",
    "Checks rules such as state, age, occupation, income, category, and documents.",
  ],
  [
    "Report Agent",
    "Explains likely matches, documents, next steps, sources, and last verified dates.",
  ],
  [
    "Vigilance Agent",
    "Keeps watch after the first search and can raise proactive alerts for new matches.",
  ],
  ["Enkrypt validation", "Checks citizen-facing outputs before they are shown."],
];

const workflow = [
  "Share basic profile details.",
  "The agent searches verified Central + Telangana schemes.",
  "Rules check likely eligibility.",
  "The report shows schemes, documents, next steps, sources, and last verified dates.",
  "Vigilance can alert when a new matching scheme appears.",
];

const features = [
  ["Guided profile form", "A clear intake flow that keeps required fields visible."],
  [
    "28 verified schemes",
    "Focused Central + Telangana catalog, without overclaiming national coverage.",
  ],
  ["Qdrant semantic retrieval", "Finds relevant schemes beyond exact keyword matching."],
  ["Enkrypt safety validation", "Validates reports and Vigilance alerts before display."],
  ["Proactive Vigilance alerts", "Demonstrates watch-after-search behavior for matching schemes."],
  ["Source-grounded reports", "Every result keeps sourceUrl and lastVerified visible."],
  [
    "Privacy-conscious handling",
    "The demo uses a session key and does not collect Aadhaar IDs or bank details.",
  ],
  ["Transparent debug page", "Judges can inspect integration status without exposing secrets."],
];

const benefits = [
  "Saves time during scheme discovery.",
  "Reduces confusion around rules and documents.",
  "Finds relevant schemes faster than manual browsing.",
  "Shows documents and next steps in simple language.",
  "Keeps official sources close to every recommendation.",
  "Keeps watching after the first search.",
  "Helps citizens, students, farmers, entrepreneurs, elderly citizens, and field workers.",
];

const personas = [
  [
    "Farmer",
    "Find farm, irrigation, income support, and equipment schemes they may likely qualify for.",
  ],
  [
    "Student",
    "Discover scholarships, fee support, and education-related benefits with source links.",
  ],
  ["Woman entrepreneur", "Spot enterprise, livelihood, and women-focused support programs faster."],
  [
    "Elderly pensioner",
    "Check likely pension and social assistance matches with simple next steps.",
  ],
  [
    "Unemployed youth",
    "Find skilling, employment, and self-employment schemes without portal hopping.",
  ],
  [
    "NGO / field worker",
    "Use a repeatable workflow to guide citizens and document scheme sources.",
  ],
];

const stack = [
  ["Mastra-style workflow", "Typed multi-agent orchestration"],
  ["Qdrant", "Vector retrieval, session memory, and pending alerts"],
  ["Enkrypt AI", "Report and alert validation"],
  ["OpenRouter", "Reasoning for profile and report steps"],
  ["Gemini", "Embeddings for semantic search"],
  ["Langfuse", "Observability traces"],
  ["Upstash Redis", "Rate limiting"],
  ["Vercel", "Deployed hackathon demo"],
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="border-b border-border/70 bg-parchment/45">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <Badge>Citizen-first welfare discovery</Badge>
              <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-primary sm:text-6xl">
                Find schemes you may likely qualify for, with sources and proactive alerts.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                SchemeSeva is a civic AI agent that helps citizens discover relevant government
                schemes, understand likely eligibility, and keep watch for future matches.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/app" className="ss-btn-primary">
                  <Sparkles className="h-4 w-4" />
                  Launch agent
                </Link>
                <Link to="/schemes" className="ss-btn-secondary">
                  <FileSearch className="h-4 w-4" />
                  View 28 schemes
                </Link>
              </div>
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                No sign-up required for the demo. Reports are guidance, not government approval.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/15 p-3 text-primary">
                  <Layers3 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-primary">
                    What happens after getting started?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    The agent builds a profile, searches schemes, checks rules, and validates the
                    report.
                  </p>
                </div>
              </div>
              <dl className="mt-6 grid gap-4 text-sm">
                <Fact
                  label="Data needed"
                  value="State, age, category, occupation, income, document status"
                />
                <Fact
                  label="Not collected"
                  value="Aadhaar IDs, bank details, passwords, or uploads"
                />
                <Fact
                  label="Output"
                  value="Likely eligible schemes with sourceUrl and lastVerified"
                />
              </dl>
              <Link
                to="/architecture"
                className="mt-6 inline-flex text-sm font-semibold text-accent"
              >
                See architecture
              </Link>
            </div>
          </div>
        </section>

        <Section eyebrow="The problem" title="Welfare discovery should not depend on luck.">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {problemPoints.map((item) => (
              <InfoCard key={item.title} title={item.title} body={item.body} />
            ))}
          </div>
        </Section>

        <Section
          eyebrow="The agent"
          title="SchemeSeva puts the agent workflow at the center."
          description="Instead of only searching text, the app runs a structured workflow that gathers profile facts, retrieves schemes, checks rules, writes a simple report, and validates the output before display."
          muted
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map(([title, body]) => (
              <InfoCard key={title} title={title} body={body} />
            ))}
          </div>
        </Section>

        <Section eyebrow="Workflow" title="From profile to source-grounded report.">
          <ol className="grid gap-4 lg:grid-cols-5">
            {workflow.map((item, index) => (
              <li key={item} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          eyebrow="Capabilities"
          title="Built for useful, inspectable recommendations."
          muted
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map(([title, body]) => (
              <InfoCard key={title} title={title} body={body} />
            ))}
          </div>
        </Section>

        <Section eyebrow="Benefits" title="Useful for citizens and the people helping them.">
          <div className="grid gap-3 md:grid-cols-2">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <p className="text-sm leading-relaxed text-muted-foreground">{benefit}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section eyebrow="Use cases" title="One workflow, many citizen situations." muted>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {personas.map(([title, body]) => (
              <InfoCard key={title} title={title} body={body} />
            ))}
          </div>
        </Section>

        <Section eyebrow="Trust and safety" title="Honest guidance, not false certainty.">
          <div className="grid gap-4 lg:grid-cols-3">
            <TrustCard
              icon={<AlertTriangle className="h-5 w-5" />}
              title="Guidance only"
              body="Reports use likely eligible language. Citizens should confirm details on official portals."
            />
            <TrustCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Validated output"
              body="Enkrypt checks reports and Vigilance alerts before citizen-facing display."
            />
            <TrustCard
              icon={<LockKeyhole className="h-5 w-5" />}
              title="Privacy-conscious demo"
              body="No Aadhaar IDs or bank details are collected. Source links and last verified dates stay visible."
            />
          </div>
        </Section>

        <Section
          eyebrow="Hackathon proof"
          title="The stack is visible, integrated, and judge-friendly."
          description="SchemeSeva keeps technical proof close without turning the product into a dashboard. The debug page shows integration status while preserving fallbacks and avoiding secret exposure."
          muted
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stack.map(([title, body]) => (
              <InfoCard key={title} title={title} body={body} compact />
            ))}
          </div>
        </Section>

        <section className="bg-primary py-16 text-primary-foreground">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="font-display text-3xl font-semibold">
                  Start with a demo profile or enter your own basic details.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed opacity-85">
                  Launch the agent, browse the verified catalog, inspect the architecture, or check
                  live integrations for the hackathon proof trail.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/app" className="ss-btn-accent">
                  <UserRound className="h-4 w-4" />
                  Launch agent
                </Link>
                <Link to="/schemes" className="ss-btn-on-dark">
                  <Search className="h-4 w-4" />
                  Browse schemes
                </Link>
                <Link to="/debug/integrations" className="ss-btn-on-dark">
                  <Bell className="h-4 w-4" />
                  Check integrations
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
  muted = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <section className={muted ? "border-y border-border/60 bg-parchment/45 py-16" : "py-16"}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 max-w-3xl">
          <Badge>{eyebrow}</Badge>
          <h2 className="mt-3 font-display text-3xl font-semibold text-primary sm:text-4xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
      {children}
    </span>
  );
}

function InfoCard({
  title,
  body,
  compact = false,
}: {
  title: string;
  body: string;
  compact?: boolean;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md">
      <h3 className="font-display text-lg font-semibold text-primary">{title}</h3>
      <p
        className={`mt-2 leading-relaxed text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}
      >
        {body}
      </p>
    </article>
  );
}

function TrustCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3 text-primary">
        <span className="rounded-lg bg-accent/15 p-2">{icon}</span>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 leading-relaxed text-primary">{value}</dd>
    </div>
  );
}
