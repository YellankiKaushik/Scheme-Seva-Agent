import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { BellRing, FileText, RotateCcw, Search, Sparkles } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { schemeDiscoveryWorkflow } from "@/mastra/workflows/schemeDiscoveryWorkflow";
import { vigilanceWorkflow } from "@/mastra/workflows/vigilanceWorkflow";
import type { CitizenProfile, DiscoveryReport, Gender, Category } from "@/lib/schemeseva-types";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "SchemeSeva agent - discover schemes you may qualify for" },
      {
        name: "description",
        content:
          "Use a guided profile form or describe your situation in plain English. SchemeSeva finds Indian government schemes you are likely eligible for.",
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

type Stage = "intake" | "running" | "report";
type IntakeMode = "guided" | "words";
type FormStep = 1 | 2 | 3 | 4;
type Occupation =
  | "farmer"
  | "student"
  | "salaried"
  | "self_employed"
  | "entrepreneur"
  | "artisan"
  | "fisherfolk"
  | "unemployed";

interface ProfileFormState {
  state: string;
  district: string;
  age: string;
  gender: "" | Gender;
  category: "" | Extract<Category, "general" | "obc" | "sc" | "st">;
  occupation: "" | Occupation;
  annualIncome: string;
  landAcres: string;
  hasAadhaar: "" | "yes" | "no";
  hasBankAccount: "" | "yes" | "no";
  hasBPL: "" | "yes" | "no";
  familySize: string;
  isDisabled: "no" | "yes";
  isWidow: "no" | "yes";
  isMinority: "no" | "yes";
}

const emptyForm: ProfileFormState = {
  state: "",
  district: "",
  age: "",
  gender: "",
  category: "",
  occupation: "",
  annualIncome: "",
  landAcres: "",
  hasAadhaar: "",
  hasBankAccount: "",
  hasBPL: "",
  familySize: "",
  isDisabled: "no",
  isWidow: "no",
  isMinority: "no",
};

const demoProfiles: Array<{
  label: string;
  description: string;
  form: ProfileFormState;
}> = [
  {
    label: "Farmer",
    description: "48-year-old SC farmer in Nalgonda with 4 acres.",
    form: {
      ...emptyForm,
      state: "telangana",
      district: "Nalgonda",
      age: "48",
      gender: "male",
      category: "sc",
      occupation: "farmer",
      annualIncome: "90000",
      landAcres: "4",
      hasAadhaar: "yes",
      hasBankAccount: "yes",
      hasBPL: "no",
    },
  },
  {
    label: "Student",
    description: "21-year-old OBC engineering student in Hyderabad.",
    form: {
      ...emptyForm,
      state: "telangana",
      district: "Hyderabad",
      age: "21",
      gender: "female",
      category: "obc",
      occupation: "student",
      annualIncome: "180000",
      hasAadhaar: "yes",
      hasBankAccount: "yes",
      hasBPL: "no",
    },
  },
  {
    label: "Woman entrepreneur",
    description: "34-year-old widow entrepreneur in Hyderabad.",
    form: {
      ...emptyForm,
      state: "telangana",
      district: "Hyderabad",
      age: "34",
      gender: "female",
      category: "general",
      occupation: "entrepreneur",
      annualIncome: "80000",
      hasAadhaar: "yes",
      hasBankAccount: "yes",
      hasBPL: "no",
      isWidow: "yes",
    },
  },
  {
    label: "Elderly pensioner",
    description: "67-year-old SC citizen in Karimnagar with no income.",
    form: {
      ...emptyForm,
      state: "telangana",
      district: "Karimnagar",
      age: "67",
      gender: "male",
      category: "sc",
      occupation: "unemployed",
      annualIncome: "0",
      hasAadhaar: "yes",
      hasBankAccount: "no",
      hasBPL: "no",
    },
  },
  {
    label: "Unemployed youth",
    description: "24-year-old OBC unemployed graduate in Hyderabad.",
    form: {
      ...emptyForm,
      state: "telangana",
      district: "Hyderabad",
      age: "24",
      gender: "male",
      category: "obc",
      occupation: "unemployed",
      annualIncome: "0",
      hasAadhaar: "yes",
      hasBankAccount: "yes",
      hasBPL: "no",
    },
  },
];

function getSessionKey(): string {
  if (typeof window === "undefined") return "ssr";
  let key = localStorage.getItem("schemeseva.session");
  if (!key) {
    key = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("schemeseva.session", key);
  }
  return key;
}

function normalizeOccupation(
  occupation: string | null | undefined,
): ProfileFormState["occupation"] {
  const clean = occupation?.toLowerCase().replace(/\s+/g, "_");
  const allowed = [
    "farmer",
    "student",
    "salaried",
    "self_employed",
    "entrepreneur",
    "artisan",
    "fisherfolk",
    "unemployed",
  ];
  return allowed.includes(clean ?? "") ? (clean as Occupation) : "";
}

function profileToForm(profile: CitizenProfile): ProfileFormState {
  return {
    ...emptyForm,
    state: profile.state ?? "",
    district: profile.district ?? "",
    age: profile.age != null ? String(profile.age) : "",
    gender: profile.gender ?? "",
    category:
      profile.category === "general" ||
      profile.category === "obc" ||
      profile.category === "sc" ||
      profile.category === "st"
        ? profile.category
        : "",
    occupation: normalizeOccupation(profile.occupation),
    annualIncome: profile.annualIncome != null ? String(profile.annualIncome) : "",
    landAcres: profile.landAcres != null ? String(profile.landAcres) : "",
    hasAadhaar: profile.hasAadhaar == null ? "" : profile.hasAadhaar ? "yes" : "no",
    hasBankAccount: profile.hasBankAccount == null ? "" : profile.hasBankAccount ? "yes" : "no",
    hasBPL: profile.hasBPL == null ? "" : profile.hasBPL ? "yes" : "no",
    familySize: profile.familySize != null ? String(profile.familySize) : "",
    isDisabled: profile.isDisabled ? "yes" : "no",
    isWidow: profile.isWidow ? "yes" : "no",
    isMinority: profile.isMinority ? "yes" : "no",
  };
}

function formToProfile(form: ProfileFormState): CitizenProfile {
  const landAcres =
    form.occupation === "farmer" && form.landAcres.trim() ? Number(form.landAcres) : null;
  const familySize = form.familySize.trim() ? Number(form.familySize) : null;
  return {
    state: form.state.trim().toLowerCase(),
    district: form.district.trim() || null,
    age: Number(form.age),
    gender: form.gender || null,
    category: form.category || null,
    occupation: form.occupation || null,
    annualIncome: Number(form.annualIncome),
    landAcres,
    familySize,
    hasAadhaar: form.hasAadhaar === "yes",
    hasBankAccount: form.hasBankAccount === "yes",
    hasBPL: form.hasBPL === "yes",
    isBPL: form.hasBPL === "yes",
    isDisabled: form.isDisabled === "yes",
    disability: form.isDisabled === "yes",
    isWidow: form.isWidow === "yes",
    isMinority: form.isMinority === "yes",
    notes: buildProfileSummary(form),
  };
}

function buildProfileSummary(form: ProfileFormState): string {
  const parts = [
    `${form.age || "Unknown age"} year old ${form.category || "unknown category"} ${form.gender || "person"}`,
    form.occupation ? `${form.occupation.replace("_", " ")}` : "unknown occupation",
    `from ${[form.district, form.state].filter(Boolean).join(", ") || "unknown location"}`,
    `annual income ${form.annualIncome || "unknown"}`,
    form.occupation === "farmer" && form.landAcres ? `${form.landAcres} acres land` : "",
    form.hasAadhaar ? `${form.hasAadhaar === "yes" ? "has" : "does not have"} Aadhaar` : "",
    form.hasBankAccount
      ? `${form.hasBankAccount === "yes" ? "has" : "does not have"} bank account`
      : "",
    form.hasBPL ? `${form.hasBPL === "yes" ? "has" : "does not have"} BPL card` : "",
    form.isWidow === "yes" ? "widow" : "",
    form.isDisabled === "yes" ? "disabled" : "",
    form.isMinority === "yes" ? "minority" : "",
  ];
  return parts.filter(Boolean).join(". ");
}

function AgentApp() {
  const [stage, setStage] = useState<Stage>("intake");
  const [mode, setMode] = useState<IntakeMode>("guided");
  const [step, setStep] = useState<FormStep>(1);
  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [nlNotice, setNlNotice] = useState<string | null>(null);
  const [report, setReport] = useState<DiscoveryReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vigilance, setVigilance] = useState<{
    newMatches: number;
    alerts: Array<{
      id: string;
      schemeName: string;
      reason: string;
      urgency: string;
      safetyProvider?: string;
      validationProvider?: string;
      retrievalProvider?: string;
      memoryProvider?: string;
      memoryWrite?: string;
    }>;
    diagnostics?: {
      sessionProvider: string;
      qdrantConfigured: boolean;
      scannedCandidates: number;
      alertStorage: "stored" | "skipped" | "failed";
      alertStorageReason: string;
      fallbackReason?: string;
    };
  } | null>(null);
  const [vigilanceLoading, setVigilanceLoading] = useState(false);
  const [vigilanceError, setVigilanceError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState("ssr");

  useEffect(() => {
    setSessionKey(getSessionKey());
  }, []);

  function updateField<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function validateStep(targetStep = step) {
    const next: Record<string, string> = {};
    if (targetStep === 1) {
      if (!form.state.trim()) next.state = "State is required.";
      if (!form.age.trim() || Number(form.age) <= 0) next.age = "Enter a valid age.";
      if (!form.gender) next.gender = "Choose a gender.";
    }
    if (targetStep === 2) {
      if (!form.category) next.category = "Choose a category.";
      if (!form.occupation) next.occupation = "Choose an occupation.";
      if (form.annualIncome.trim() === "" || Number(form.annualIncome) < 0) {
        next.annualIncome = "Enter annual income, or 0 if there is no income.";
      }
      if (
        form.occupation === "farmer" &&
        (form.landAcres.trim() === "" || Number(form.landAcres) < 0)
      ) {
        next.landAcres = "Enter landholding in acres.";
      }
    }
    if (targetStep === 3) {
      if (!form.hasAadhaar) next.hasAadhaar = "Choose Aadhaar status.";
      if (!form.hasBankAccount) next.hasBankAccount = "Choose bank account status.";
      if (!form.hasBPL) next.hasBPL = "Choose BPL status.";
    }
    if (targetStep === 4) {
      if (form.familySize.trim() && Number(form.familySize) <= 0) {
        next.familySize = "Family size should be a positive number.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function continueStep() {
    if (!validateStep()) return;
    setStep((current) => Math.min(4, current + 1) as FormStep);
  }

  function backStep() {
    setErrors({});
    setStep((current) => Math.max(1, current - 1) as FormStep);
  }

  function applyDemo(profile: ProfileFormState) {
    setForm(profile);
    setMode("guided");
    setStep(4);
    setErrors({});
    setNlNotice("Demo profile loaded. Review the details, edit if needed, then find schemes.");
  }

  async function submitStructuredForm() {
    for (const candidateStep of [1, 2, 3, 4] as FormStep[]) {
      if (!validateStep(candidateStep)) {
        setStep(candidateStep);
        return;
      }
    }
    await runFullDiscovery(formToProfile(form));
  }

  async function handleNaturalLanguage() {
    setError(null);
    setReport(null);
    setVigilance(null);
    setVigilanceError(null);
    setNlNotice(null);
    setStage("running");
    try {
      const {
        profile,
        followUp,
        report: workflowReport,
      } = await schemeDiscoveryWorkflow.run({ sessionKey, text });
      if (followUp) {
        setForm(profileToForm(profile));
        setMode("guided");
        setStep(1);
        setNlNotice(`I found some details, but a few required fields are missing. ${followUp}`);
        setStage("intake");
        return;
      }
      if (workflowReport) {
        setReport(workflowReport);
        setStage("report");
        return;
      }
      setForm(profileToForm(profile));
      await runFullDiscovery(profile);
    } catch (e) {
      setError((e as Error).message);
      setStage("intake");
    }
  }

  async function runFullDiscovery(profile: CitizenProfile) {
    setError(null);
    setReport(null);
    setVigilance(null);
    setVigilanceError(null);
    setStage("running");
    try {
      const { report: workflowReport } = await schemeDiscoveryWorkflow.run({
        sessionKey,
        profile,
      });
      if (!workflowReport) throw new Error("Workflow did not return a report.");
      setReport(workflowReport);
      setStage("report");
    } catch (e) {
      setError((e as Error).message);
      setStage("intake");
    }
  }

  async function handleVigilance() {
    setVigilance(null);
    setVigilanceError(null);
    setVigilanceLoading(true);
    try {
      const result = await vigilanceWorkflow.run({ sessionKey });
      setVigilance(result);
    } catch (e) {
      setVigilanceError((e as Error).message || "Vigilance scan could not run.");
    } finally {
      setVigilanceLoading(false);
    }
  }

  function reset() {
    setStage("intake");
    setMode("guided");
    setStep(1);
    setForm(emptyForm);
    setText("");
    setReport(null);
    setNlNotice(null);
    setError(null);
    setErrors({});
    setVigilance(null);
    setVigilanceError(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        {stage === "intake" && (
          <section className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end">
              <div>
                <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                  SchemeSeva agent
                </span>
                <h1 className="mt-4 font-display text-3xl font-semibold text-primary sm:text-5xl">
                  Build a profile, then run the five-agent workflow.
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
                  Use the guided form or describe the situation in words. SchemeSeva searches the
                  verified catalog, checks rules, validates the report, and keeps sources visible.
                </p>
              </div>
              <aside className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <h2 className="font-display text-lg font-semibold text-primary">
                  No sign-up required for demo
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>Share only basic profile details needed for likely eligibility guidance.</li>
                  <li>
                    No Aadhaar numbers, bank account numbers, passwords, or uploads are collected.
                  </li>
                  <li>Confirm final eligibility and application steps on official portals.</li>
                </ul>
              </aside>
            </div>

            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 shadow-sm">
              <p className="text-sm font-semibold text-primary">
                Judge quick start: click the Farmer demo, review the loaded profile, then click Find
                schemes. The report should show Qdrant retrieval, Qdrant memory, Enkrypt safety, and
                workflow badges before the Vigilance scan.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              {demoProfiles.map((demo) => (
                <button
                  key={demo.label}
                  type="button"
                  onClick={() => applyDemo(demo.form)}
                  className="rounded-lg border border-border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:bg-parchment/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <span className="font-display text-base font-semibold text-primary">
                    {demo.label}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {demo.description}
                  </span>
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap gap-2 border-b border-border pb-4">
                <TabButton active={mode === "guided"} onClick={() => setMode("guided")}>
                  Guided form
                </TabButton>
                <TabButton active={mode === "words"} onClick={() => setMode("words")}>
                  Describe in words
                </TabButton>
              </div>

              {nlNotice && (
                <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-primary">
                  {nlNotice}
                </p>
              )}
              {error && (
                <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              {mode === "guided" ? (
                <div className="mt-6">
                  <Progress step={step} />
                  <div className="mt-6">
                    {step === 1 && <StepBasic form={form} errors={errors} update={updateField} />}
                    {step === 2 && (
                      <StepEconomic form={form} errors={errors} update={updateField} />
                    )}
                    {step === 3 && (
                      <StepDocuments form={form} errors={errors} update={updateField} />
                    )}
                    {step === 4 && <StepReview form={form} errors={errors} update={updateField} />}
                  </div>
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={backStep}
                      disabled={step === 1}
                      className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-primary transition hover:bg-secondary disabled:opacity-40"
                    >
                      Back
                    </button>
                    {step < 4 ? (
                      <button
                        type="button"
                        onClick={continueStep}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
                      >
                        <Sparkles className="h-4 w-4" />
                        Continue
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={submitStructuredForm}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
                      >
                        <Search className="h-4 w-4" />
                        Find schemes
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-6">
                  <label htmlFor="natural-profile" className="font-medium text-primary">
                    Describe the citizen profile
                  </label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    If anything critical is missing, SchemeSeva will move the extracted details into
                    the guided form so you can complete them.
                  </p>
                  <textarea
                    id="natural-profile"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={7}
                    placeholder="Example: 48-year-old SC male farmer from Nalgonda, Telangana. 4 acres land, annual income 90000, has Aadhaar and bank account, no BPL."
                    className="mt-4 w-full rounded-lg border border-input bg-background p-4 text-base text-primary outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={handleNaturalLanguage}
                    disabled={text.trim().length < 10}
                    className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-50"
                  >
                    <FileText className="h-4 w-4" />
                    Extract profile
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {stage === "running" && (
          <section className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-accent" />
            <h2 className="mt-6 font-display text-2xl font-semibold text-primary">
              The agents are working...
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
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                    Source-grounded report
                  </span>
                  <h1 className="mt-3 font-display text-3xl font-semibold text-primary">
                    Your likely eligible scheme matches
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Use this as guidance. Confirm final eligibility and application steps on the
                    official portal linked in each source.
                  </p>
                </div>
                <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-primary">
                  {report.eligible.length} likely matches
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusPill label={`Retrieval: ${report.retrievalProvider}`} />
              <StatusPill label={`Memory: ${report.memoryProvider ?? "local"}`} />
              <StatusPill label={`Memory write: ${report.memoryWrite ?? "skipped-local"}`} />
              <StatusPill label={`Safety: ${report.safety.provider}`} />
              <StatusPill label={`Workflow: ${report.workflowMode ?? "adapter"}`} />
            </div>

            {report.safety.status === "safe" ? (
              <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium text-success">
                Validated: {report.safety.note}
              </div>
            ) : (
              <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm font-medium text-primary">
                Validated: {report.safety.note}
              </div>
            )}

            {report.eligible.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {report.eligible.slice(0, 4).map((match) => (
                  <article
                    key={match.schemeId}
                    className="rounded-lg border border-border bg-card p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold uppercase text-success">
                        likely eligible
                      </span>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-primary">
                        {match.confidence} confidence
                      </span>
                    </div>
                    <h2 className="mt-3 font-display text-lg font-semibold text-primary">
                      {match.schemeName}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-success">{match.benefitAmount}</p>
                    <p className="mt-3 break-all text-xs text-muted-foreground">
                      sourceUrl:{" "}
                      <a
                        href={match.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-accent"
                      >
                        {match.sourceUrl}
                      </a>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      lastVerified: {match.lastVerified}
                    </p>
                  </article>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
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

            <div className="rounded-lg border border-accent/40 bg-accent/5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                    Vigilance Agent - autonomous
                  </span>
                  <h3 className="mt-1 font-display text-xl font-semibold text-primary">
                    Simulate a new scheme launch
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The agent scans your saved profile against schemes you have not seen and fires
                    an alert if you likely qualify.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleVigilance}
                  disabled={vigilanceLoading}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-50"
                >
                  <BellRing className="h-4 w-4" />
                  {vigilanceLoading ? "Scanning..." : "Run vigilance scan"}
                </button>
              </div>
              {vigilanceError && (
                <p className="mt-4 rounded-lg border border-warning/40 bg-card px-3 py-2 text-sm text-primary">
                  Vigilance scan could not complete: {vigilanceError}
                </p>
              )}
              {vigilance && (
                <div className="mt-4">
                  {vigilance.newMatches === 0 ? (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        No new matching schemes right now. The agent will keep watching.
                      </p>
                      {vigilance.diagnostics ? (
                        <p className="text-xs text-muted-foreground">
                          Diagnostics: scanned {vigilance.diagnostics.scannedCandidates} candidate
                          schemes via {vigilance.diagnostics.sessionProvider}; alert storage{" "}
                          {vigilance.diagnostics.alertStorage} (
                          {vigilance.diagnostics.alertStorageReason}).
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {vigilance.alerts.map((alert) => (
                        <AlertBanner key={alert.id} alert={alert} />
                      ))}
                      {vigilance.diagnostics?.fallbackReason ? (
                        <p className="text-xs text-muted-foreground">
                          Safety fallback: {vigilance.diagnostics.fallbackReason}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-primary transition hover:bg-secondary"
              >
                <RotateCcw className="h-4 w-4" />
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-secondary hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function Progress({ step }: { step: FormStep }) {
  const labels = ["Basic details", "Social + economic", "Documents", "Review"];
  return (
    <ol className="grid gap-2 sm:grid-cols-4">
      {labels.map((label, index) => {
        const number = index + 1;
        const active = number === step;
        const done = number < step;
        return (
          <li
            key={label}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              active || done
                ? "border-accent bg-accent/10 text-primary"
                : "border-border bg-background text-muted-foreground"
            }`}
          >
            <span className="font-semibold">{number}.</span> {label}
          </li>
        );
      })}
    </ol>
  );
}

function StepBasic({
  form,
  errors,
  update,
}: {
  form: ProfileFormState;
  errors: Record<string, string>;
  update: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void;
}) {
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <Field label="State" error={errors.state}>
        <input
          value={form.state}
          onChange={(e) => update("state", e.target.value)}
          className={inputClass}
          placeholder="Telangana"
        />
      </Field>
      <Field label="District (optional)">
        <input
          value={form.district}
          onChange={(e) => update("district", e.target.value)}
          className={inputClass}
          placeholder="Hyderabad"
        />
      </Field>
      <Field label="Age" error={errors.age}>
        <input
          type="number"
          min="0"
          value={form.age}
          onChange={(e) => update("age", e.target.value)}
          className={inputClass}
          placeholder="48"
        />
      </Field>
      <Field label="Gender" error={errors.gender}>
        <Segmented
          value={form.gender}
          options={["male", "female", "other"]}
          onChange={(value) => update("gender", value as Gender)}
        />
      </Field>
    </fieldset>
  );
}

function StepEconomic({
  form,
  errors,
  update,
}: {
  form: ProfileFormState;
  errors: Record<string, string>;
  update: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void;
}) {
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <Field label="Category" error={errors.category}>
        <Segmented
          value={form.category}
          options={["general", "obc", "sc", "st"]}
          onChange={(value) => update("category", value as ProfileFormState["category"])}
        />
      </Field>
      <Field label="Occupation" error={errors.occupation}>
        <select
          value={form.occupation}
          onChange={(e) => update("occupation", e.target.value as Occupation)}
          className={inputClass}
        >
          <option value="">Choose occupation</option>
          <option value="farmer">Farmer</option>
          <option value="student">Student</option>
          <option value="salaried">Salaried</option>
          <option value="self_employed">Self employed</option>
          <option value="entrepreneur">Entrepreneur</option>
          <option value="artisan">Artisan</option>
          <option value="fisherfolk">Fisherfolk</option>
          <option value="unemployed">Unemployed</option>
        </select>
      </Field>
      <Field label="Annual income" error={errors.annualIncome}>
        <input
          type="number"
          min="0"
          value={form.annualIncome}
          onChange={(e) => update("annualIncome", e.target.value)}
          className={inputClass}
          placeholder="90000"
        />
      </Field>
      {form.occupation === "farmer" && (
        <Field label="Landholding in acres" error={errors.landAcres}>
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.landAcres}
            onChange={(e) => update("landAcres", e.target.value)}
            className={inputClass}
            placeholder="4"
          />
        </Field>
      )}
    </fieldset>
  );
}

function StepDocuments({
  form,
  errors,
  update,
}: {
  form: ProfileFormState;
  errors: Record<string, string>;
  update: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void;
}) {
  return (
    <fieldset className="grid gap-4 sm:grid-cols-3">
      <Field label="Has Aadhaar?" error={errors.hasAadhaar}>
        <Segmented
          value={form.hasAadhaar}
          options={["yes", "no"]}
          onChange={(value) => update("hasAadhaar", value as "yes" | "no")}
        />
      </Field>
      <Field label="Has bank account?" error={errors.hasBankAccount}>
        <Segmented
          value={form.hasBankAccount}
          options={["yes", "no"]}
          onChange={(value) => update("hasBankAccount", value as "yes" | "no")}
        />
      </Field>
      <Field label="Has BPL card?" error={errors.hasBPL}>
        <Segmented
          value={form.hasBPL}
          options={["yes", "no"]}
          onChange={(value) => update("hasBPL", value as "yes" | "no")}
        />
      </Field>
    </fieldset>
  );
}

function StepReview({
  form,
  errors,
  update,
}: {
  form: ProfileFormState;
  errors: Record<string, string>;
  update: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void;
}) {
  const rows = [
    ["State", form.state],
    ["District", form.district || "Not provided"],
    ["Age", form.age],
    ["Gender", form.gender],
    ["Category", form.category],
    ["Occupation", form.occupation.replace("_", " ")],
    ["Annual income", form.annualIncome],
    ["Land acres", form.occupation === "farmer" ? form.landAcres : "Not applicable"],
    ["Aadhaar", form.hasAadhaar],
    ["Bank account", form.hasBankAccount],
    ["BPL", form.hasBPL],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <fieldset className="grid gap-4">
        <Field label="Family size (optional)" error={errors.familySize}>
          <input
            type="number"
            min="1"
            value={form.familySize}
            onChange={(e) => update("familySize", e.target.value)}
            className={inputClass}
            placeholder="4"
          />
        </Field>
        <Field label="Disabled?">
          <Segmented
            value={form.isDisabled}
            options={["yes", "no"]}
            onChange={(value) => update("isDisabled", value as "yes" | "no")}
          />
        </Field>
        <Field label="Widow?">
          <Segmented
            value={form.isWidow}
            options={["yes", "no"]}
            onChange={(value) => update("isWidow", value as "yes" | "no")}
          />
        </Field>
        <Field label="Minority community?">
          <Segmented
            value={form.isMinority}
            options={["yes", "no"]}
            onChange={(value) => update("isMinority", value as "yes" | "no")}
          />
        </Field>
      </fieldset>
      <div className="rounded-lg border border-border bg-background p-4">
        <h3 className="font-display text-lg font-semibold text-primary">Review details</h3>
        <dl className="mt-3 grid gap-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-border/50 py-1">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium capitalize text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-primary">{label}</span>
      <span className="mt-1 block">{children}</span>
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-md border px-3 py-2 text-sm font-semibold capitalize transition ${
            value === option
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-primary hover:bg-secondary"
          }`}
        >
          {option.replace("_", " ")}
        </button>
      ))}
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary shadow-sm">
      {label}
    </span>
  );
}

function AlertBanner({
  alert,
}: {
  alert: {
    schemeName: string;
    reason: string;
    urgency: string;
    safetyProvider?: string;
    validationProvider?: string;
    retrievalProvider?: string;
    memoryProvider?: string;
    memoryWrite?: string;
  };
}) {
  return (
    <div className="rounded-lg border border-accent/40 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
          {alert.urgency} urgency
        </span>
        <h4 className="font-display font-semibold text-primary">{alert.schemeName}</h4>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{alert.reason}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Safety: {alert.safetyProvider ?? alert.validationProvider ?? "fallback"} - Retrieval:{" "}
        {alert.retrievalProvider ?? "session memory"} - Memory: {alert.memoryProvider ?? "fallback"}
      </p>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-primary outline-none transition focus:ring-2 focus:ring-ring";
