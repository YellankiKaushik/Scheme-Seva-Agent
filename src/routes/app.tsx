import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { schemeDiscoveryWorkflow } from "@/mastra/workflows/schemeDiscoveryWorkflow";
import { vigilanceWorkflow } from "@/mastra/workflows/vigilanceWorkflow";
import type { CitizenProfile, DiscoveryReport } from "@/lib/schemeseva-types";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "SchemeSeva agent — discover schemes you qualify for" },
      {
        name: "description",
        content:
          "Describe your situation in plain English. The SchemeSeva agent finds Indian government schemes you likely qualify for in under a minute.",
      },
      { property: "og:title", content: "Run the SchemeSeva agent" },
      {
        property: "og:description",
        content:
          "Free civic AI tool that discovers government welfare schemes for Indian citizens.",
      },
    ],
  }),
  component: AgentApp,
});

type Stage = "intake" | "clarify" | "running" | "report";

function getSessionKey(): string {
  if (typeof window === "undefined") return "ssr";
  let key = localStorage.getItem("schemeseva.session");
  if (!key) {
    key = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("schemeseva.session", key);
  }
  return key;
}

function AgentApp() {
  const [stage, setStage] = useState<Stage>("intake");
  const [text, setText] = useState("");
  const [clarifyAnswer, setClarifyAnswer] = useState("");
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [report, setReport] = useState<DiscoveryReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vigilance, setVigilance] = useState<{
    newMatches: number;
    alerts: Array<{
      id: string;
      schemeName: string;
      reason: string;
      urgency: string;
      validationProvider?: string;
      retrievalProvider?: string;
      memoryProvider?: string;
    }>;
  } | null>(null);
  const [sessionKey, setSessionKey] = useState("ssr");

  useEffect(() => {
    setSessionKey(getSessionKey());
  }, []);

  const examples = [
    "I'm a 42-year-old SC male farmer in Warangal, Telangana. I own 3 acres of land. My family income is around ₹1.2 lakh a year. I have Aadhaar and a bank account. I do not have a BPL card.",
    "I'm a 28-year-old woman in Hyderabad from an OBC family. I want to start a small tailoring business. Yearly income about ₹80,000.",
    "I'm 67 years old, widow, living alone in a village in Karimnagar. No income. I have Aadhaar.",
  ];

  async function handleIntake(inputText: string) {
    setError(null);
    setStage("running");
    try {
      const {
        profile: p,
        followUp: f,
        report: workflowReport,
      } = await schemeDiscoveryWorkflow.run({ sessionKey, text: inputText });
      setProfile(p);
      if (f) {
        setFollowUp(f);
        setStage("clarify");
        return;
      }
      if (workflowReport) {
        setReport(workflowReport);
        setStage("report");
        return;
      }
      await runFullDiscovery(p);
    } catch (e) {
      setError((e as Error).message);
      setStage("intake");
    }
  }

  async function runFullDiscovery(p: CitizenProfile) {
    setStage("running");
    try {
      const { report: workflowReport } = await schemeDiscoveryWorkflow.run({
        sessionKey,
        profile: p,
      });
      if (!workflowReport) throw new Error("Workflow did not return a report.");
      setReport(workflowReport);
      setStage("report");
    } catch (e) {
      setError((e as Error).message);
      setStage("intake");
    }
  }

  async function handleClarify() {
    const combined = `${text}\n\nAdditional: ${clarifyAnswer}`;
    setText(combined);
    setClarifyAnswer("");
    setFollowUp(null);
    await handleIntake(combined);
  }

  async function handleVigilance() {
    setVigilance(null);
    const r = await vigilanceWorkflow.run({ sessionKey });
    setVigilance(r);
  }

  function reset() {
    setStage("intake");
    setText("");
    setReport(null);
    setProfile(null);
    setFollowUp(null);
    setError(null);
    setVigilance(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        {stage === "intake" && (
          <section>
            <h1 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
              Tell me about yourself.
            </h1>
            <p className="mt-2 text-muted-foreground">
              Describe your situation in plain English — state, age, occupation, income, family. The
              Profile Agent will extract what it needs.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              placeholder="e.g. I'm a 35-year-old woman in Hyderabad. I run a small tea stall. My yearly income is about ₹1 lakh…"
              className="mt-6 w-full rounded-xl border border-input bg-card p-4 text-base text-primary shadow-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setText(ex)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-primary"
                >
                  Try example {i + 1}
                </button>
              ))}
            </div>
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            <button
              onClick={() => handleIntake(text)}
              disabled={text.trim().length < 10}
              className="mt-6 inline-flex items-center rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm disabled:opacity-50"
            >
              Run the agents →
            </button>
          </section>
        )}

        {stage === "clarify" && followUp && (
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">
              Profile Agent · needs one clarification
            </span>
            <h2 className="mt-2 font-display text-2xl font-semibold text-primary">{followUp}</h2>
            <textarea
              value={clarifyAnswer}
              onChange={(e) => setClarifyAnswer(e.target.value)}
              rows={3}
              className="mt-4 w-full rounded-lg border border-input bg-background p-3 text-primary outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleClarify}
              disabled={clarifyAnswer.trim().length < 2}
              className="mt-4 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground disabled:opacity-50"
            >
              Continue
            </button>
          </section>
        )}

        {stage === "running" && (
          <section className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-accent" />
            <h2 className="mt-6 font-display text-2xl font-semibold text-primary">
              The agents are working…
            </h2>
            <ul className="mx-auto mt-4 max-w-md space-y-2 text-left text-sm text-muted-foreground">
              <li>1. Extracting profile</li>
              <li>2. Searching verified schemes</li>
              <li>3. Checking eligibility criteria</li>
              <li>4. Generating report</li>
              <li>5. Safety check by Enkrypt AI</li>
            </ul>
          </section>
        )}

        {stage === "report" && report && (
          <section className="space-y-6">
            {report.safety.status === "safe" ? (
              <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium text-success">
                ✓ {report.safety.note}
              </div>
            ) : (
              <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm font-medium text-primary">
                ⚠ Safety layer: {report.safety.note}
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold text-primary">
                  Your personalised report
                </h2>
                <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-primary">
                  {report.eligible.length} likely matches
                </span>
              </div>
              <div className="prose-scheme mt-4 max-w-none text-primary">
                <ReactMarkdown>{report.reportMarkdown}</ReactMarkdown>
              </div>
            </div>

            <div className="rounded-xl border border-accent/40 bg-accent/5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                    Vigilance Agent · autonomous
                  </span>
                  <h3 className="mt-1 font-display text-xl font-semibold text-primary">
                    Simulate a new scheme launch
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The agent scans your saved profile against schemes you haven't seen and fires an
                    alert if you likely qualify — without being asked.
                  </p>
                </div>
                <button
                  onClick={handleVigilance}
                  className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Run vigilance scan
                </button>
              </div>
              {vigilance && (
                <div className="mt-4">
                  {vigilance.newMatches === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No new matching schemes right now — the agent will keep watching.
                    </p>
                  ) : (
                    vigilance.alerts.map((a) => (
                      <div key={a.id} className="rounded-lg border border-accent/40 bg-card p-4">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
                            {a.urgency} urgency
                          </span>
                          <h4 className="font-display font-semibold text-primary">
                            {a.schemeName}
                          </h4>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{a.reason}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Safety: {a.validationProvider ?? "fallback"} · Retrieval:{" "}
                          {a.retrievalProvider ?? "session memory"} · Memory:{" "}
                          {a.memoryProvider ?? "fallback"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={reset}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-primary hover:bg-secondary"
              >
                Start over
              </button>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
