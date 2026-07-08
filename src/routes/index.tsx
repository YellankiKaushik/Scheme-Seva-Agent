import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { schemeSevaLogo } from "@/lib/logo";

export const Route = createFileRoute("/")({
    component: LandingPage,
});

function LandingPage() {
    return (
        <div className="min-h-screen bg-background">
            <SiteHeader />

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div
                    aria-hidden
                    className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--saffron)_20%,transparent),transparent)]"
                />
                <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
                    <div className="mx-auto max-w-3xl text-center">
                        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                            HiDevs × Mastra Hackathon 2026 · Open Innovation Track
                        </span>
                        <h1 className="mt-6 font-display text-5xl font-semibold text-primary sm:text-6xl">
                            Find every government scheme
                            <br />
                            <span className="text-accent">you're entitled to.</span>
                        </h1>
                        <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
                            India runs 1,000+ welfare schemes. Most eligible citizens never claim them
                            because discovery is broken. SchemeSeva is a civic AI agent that finds what
                            you qualify for — and keeps watching, so you never miss a new benefit.
                        </p>
                        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                            <Link
                                to="/app"
                                className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm hover:opacity-95"
                            >
                                Try the agent →
                            </Link>
                            <Link
                                to="/architecture"
                                className="inline-flex items-center rounded-lg border border-border bg-card px-6 py-3 text-base font-semibold text-primary hover:bg-secondary"
                            >
                                See the architecture
                            </Link>
                        </div>
                        <p className="mt-4 text-xs text-muted-foreground">
                            No sign-up. Free. Under 60 seconds. 28 verified central + Telangana schemes.
                        </p>
                    </div>

                    <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
                        {[
                            ["1,000+", "central schemes"],
                            ["₹20L Cr", "annual allocation"],
                            ["70%+", "go unclaimed"],
                            ["<60s", "per discovery"],
                        ].map(([n, l]) => (
                            <div
                                key={l}
                                className="rounded-xl border border-border bg-card p-4 text-center shadow-sm"
                            >
                                <div className="font-display text-2xl font-semibold text-primary">{n}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{l}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Problem */}
            <section className="border-y border-border/60 bg-parchment/40 py-20">
                <div className="mx-auto max-w-5xl px-4">
                    <h2 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
                        The discovery gap costs Indian citizens billions.
                    </h2>
                    <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
                        Research on PM-JAY confirms: the barrier isn't that schemes don't exist —
                        it's that eligible citizens don't know they qualify. Existing portals like
                        myScheme fail in four structural ways.
                    </p>

                    <div className="mt-10 grid gap-4 md:grid-cols-2">
                        {[
                            {
                                t: "Rigid 12-question form",
                                d: "No natural language. If a citizen's situation doesn't fit the boxes, they get nothing.",
                            },
                            {
                                t: "Keyword-only matching",
                                d: "No semantic reasoning across occupation, income, category, or life stage.",
                            },
                            {
                                t: "No memory",
                                d: "A returning citizen fills the same form from scratch. Their history is invisible.",
                            },
                            {
                                t: "Reactive only",
                                d: "The portal never tells you when a new scheme launches that matches you.",
                            },
                        ].map((f) => (
                            <div key={f.t} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                                <h3 className="font-display text-lg font-semibold text-primary">{f.t}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Agent pipeline */}
            <section className="py-20">
                <div className="mx-auto max-w-6xl px-4">
                    <div className="max-w-3xl">
                        <span className="text-sm font-semibold uppercase tracking-wider text-accent">
                            The Agent Pipeline
                        </span>
                        <h2 className="mt-2 font-display text-3xl font-semibold text-primary sm:text-4xl">
                            Five specialised agents. One TypeScript system.
                        </h2>
                        <p className="mt-3 text-lg text-muted-foreground">
                            Orchestrated to think, retrieve, remember, evaluate, and act — the five
                            agentic verbs judged by the hackathon.
                        </p>
                    </div>

                    <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
                        {[
                            {
                                n: "01",
                                name: "Profile Agent",
                                verb: "Think",
                                d: "Parses free-text into a validated CitizenProfile. Asks one follow-up if a critical field is missing. Never assumes.",
                            },
                            {
                                n: "02",
                                name: "Discovery Agent",
                                verb: "Retrieve",
                                d: "Generates 4–5 semantic queries across occupation, income, category, state, and gender. Returns top-20 unique candidate schemes.",
                            },
                            {
                                n: "03",
                                name: "Eligibility Agent",
                                verb: "Evaluate",
                                d: "Runs deterministic rule-based eligibilityChecker. Hard-failed criteria excluded. Confidence: high or medium.",
                            },
                            {
                                n: "04",
                                name: "Report Agent",
                                verb: "Communicate",
                                d: "8th-grade markdown report. 'Likely eligible' language. Every scheme cites sourceUrl + lastVerified.",
                            },
                            {
                                n: "05",
                                name: "Vigilance Agent",
                                verb: "Act",
                                d: "Autonomous. Scans saved profiles against new schemes. Fires alerts without being asked — the primary differentiator.",
                            },
                        ].map((a) => (
                            <li
                                key={a.n}
                                className="relative rounded-xl border border-border bg-card p-5 shadow-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-display text-2xl font-semibold text-accent">
                                        {a.n}
                                    </span>
                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                                        {a.verb}
                                    </span>
                                </div>
                                <h3 className="mt-3 font-display text-lg font-semibold text-primary">
                                    {a.name}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.d}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* Trust layer */}
            <section className="border-t border-border/60 bg-parchment/40 py-20">
                <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-2 md:items-center">
                    <div>
                        <h2 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
                            Trust built into every output.
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            AI in the government sector carries risks of hallucination and bias. Every
                            SchemeSeva report is validated by an AI safety layer before it reaches you.
                        </p>
                        <ul className="mt-6 space-y-3 text-base text-primary">
                            <li className="flex gap-3">
                                <Check /> "Likely eligible" language — never a legal guarantee
                            </li>
                            <li className="flex gap-3">
                                <Check /> Every scheme cites its official source URL
                            </li>
                            <li className="flex gap-3">
                                <Check /> Every scheme shows a "last verified" date
                            </li>
                            <li className="flex gap-3">
                                <Check /> Deterministic rule-based eligibility — not LLM-guessed
                            </li>
                            <li className="flex gap-3">
                                <Check /> Missing-document checklist for medium-confidence matches
                            </li>
                        </ul>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                        <div className="flex items-center gap-2">
                            <img src={schemeSevaLogo} alt="" width={36} height={36} className="h-9 w-9" />
                            <div>
                                <div className="font-display text-lg font-semibold text-primary">
                                    Rythu Bandhu — Telangana
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Government of Telangana · State scheme
                                </div>
                            </div>
                            <span className="ml-auto rounded-full bg-success/15 px-2 py-1 text-xs font-semibold text-success">
                                ✓ Likely eligible
                            </span>
                        </div>
                        <div className="mt-4 rounded-lg bg-accent/10 px-3 py-2 text-sm font-semibold text-primary">
                            ₹10,000 / acre / year
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                            You likely qualify because you're a Telangana farmer with a pattadar
                            passbook and a linked bank account.
                        </p>
                        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Source: rythubandhu.telangana.gov.in</span>
                            <span>Last verified: 15 Jun 2026</span>
                        </div>
                        <div className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            ✓ Validated by AI safety layer
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20">
                <div className="mx-auto max-w-3xl px-4 text-center">
                    <h2 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
                        Try SchemeSeva now.
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Describe yourself in plain English. Get a personalised report in under a minute.
                    </p>
                    <Link
                        to="/app"
                        className="mt-8 inline-flex items-center rounded-lg bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-sm hover:opacity-95"
                    >
                        Launch the agent →
                    </Link>
                </div>
            </section>

            <SiteFooter />
        </div>
    );
}

function Check() {
    return (
        <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-success"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
        >
            <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z"
            />
        </svg>
    );
}
