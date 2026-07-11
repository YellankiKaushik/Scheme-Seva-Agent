import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createOpenRouterProvider } from "./ai-gateway.server";
import type {
  CitizenProfile,
  Scheme,
  EligibilityResult,
  DiscoveryReport,
} from "./schemeseva-types";
import { checkEligibility, discoverCandidates } from "./schemeseva-eligibility";
import { searchSchemes } from "./qdrantSearch";
import { validateAlert, validateReport } from "./safetyValidator";
import { rememberSession, rememberAlert, loadRememberedSession } from "./qdrantMemory";
import {
  checkDiscoveryRateLimit,
  checkVigilanceRateLimit,
  rateLimitIdentity,
} from "./ratelimit";
import { flushObservability, startTrace } from "./observability";
import {
  completed,
  fallback,
  type DiscoveryAgentSteps,
  type VigilanceAgentSteps,
} from "@/mastra/types";
import { localSchemes } from "./localSchemes";
import { getLocalSession, saveLocalAlert, saveLocalSession } from "./localSessionStore";
import { qdrantConfig, qdrantConfigured } from "./qdrant";
import {
  buildReportGenerationInput,
  type FeatherlessErrorCategory,
  generateReportWithFeatherless,
  generateVigilanceReasonWithFeatherless,
  isFeatherlessConfigured,
} from "./featherless";

const MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free";
type ReasoningProvider = NonNullable<DiscoveryReport["reasoningProvider"]>;
type ReasoningMetadata = {
  reasoningAttemptedProviders: ReasoningProvider[];
  featherlessStatus: FeatherlessErrorCategory;
  fallbackReason?: string;
  featherlessErrorCategory?: FeatherlessErrorCategory;
};

function getGateway() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  return createOpenRouterProvider(key);
}

function supabaseServerConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function demoModeEnabled() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.VITE_DEMO_MODE === "true";
}

function mapSchemeRow(row: Record<string, unknown>): Scheme {
  return {
    id: row.id as string,
    schemeName: (row.scheme_name ?? row.schemeName) as string,
    ministry: row.ministry as string,
    benefitType: (row.benefit_type ?? row.benefitType) as string,
    benefitAmount: (row.benefit_amount ?? row.benefitAmount) as string,
    description: row.description as string,
    eligibility: (row.eligibility as Scheme["eligibility"]) ?? {},
    keywords: (row.keywords as string[]) ?? [],
    documentsRequired: ((row.documents_required ?? row.documentsRequired) as string[]) ?? [],
    applicationSteps: ((row.application_steps ?? row.applicationSteps) as string[]) ?? [],
    applicationUrl: ((row.application_url ?? row.applicationUrl) as string | null) ?? null,
    applicationMode: (row.application_mode ?? row.applicationMode ?? "both") as string,
    sourceUrl: (row.source_url ?? row.sourceUrl) as string,
    lastVerified: (row.last_verified ?? row.lastVerified) as string,
    lastUpdated: (row.last_updated ?? row.lastUpdated ?? row.last_verified ?? row.lastVerified) as string,
    stateScope: (row.state_scope ?? row.stateScope) as string,
  };
}

async function loadSchemesFromQdrant(): Promise<Scheme[] | null> {
  if (!qdrantConfigured()) return null;
  const cfg = qdrantConfig();
  try {
    const res = await fetch(
      `${cfg.url!.replace(/\/$/, "")}/collections/${cfg.collection}/points/scroll`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": cfg.apiKey! },
        body: JSON.stringify({ limit: 100, with_payload: true }),
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      result?: { points?: Array<{ payload?: Record<string, unknown> }> };
    };
    const schemes = (json.result?.points ?? [])
      .map((point) => point.payload)
      .filter(Boolean)
      .map((payload) => mapSchemeRow({ ...payload!, id: payload!.scheme_id ?? payload!.id }));
    return schemes.length ? schemes : null;
  } catch {
    return null;
  }
}

async function loadSchemes(ids?: string[]): Promise<Scheme[]> {
  const qdrantSchemes = await loadSchemesFromQdrant();
  if (qdrantSchemes?.length) {
    return ids?.length ? qdrantSchemes.filter((scheme) => ids.includes(scheme.id)) : qdrantSchemes;
  }

  if (supabaseServerConfigured()) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let query = supabaseAdmin.from("schemes").select("*");
      if (ids && ids.length) query = query.in("id", ids);
      const { data, error } = await query;
      if (!error && data?.length) return (data ?? []).map((row) => mapSchemeRow(row));
    } catch {
      // Continue to local catalog.
    }
  }

  return ids?.length ? localSchemes.filter((scheme) => ids.includes(scheme.id)) : localSchemes;
}

function extractProfileLocally(text: string): { profile: CitizenProfile; followUp: string | null } {
  const lower = text.toLowerCase();
  const age = Number(
    lower.match(/\b(\d{2})\s*(?:year|yr|y\/o|old)/)?.[1] ?? lower.match(/\b(\d{2})\b/)?.[1] ?? NaN,
  );
  const incomeMatch = lower.match(
    /(?:income|earn|earning|family income)[^\d]*(\d+(?:\.\d+)?)\s*(lakh|lac|k)?/,
  );
  const annualIncome = incomeMatch
    ? Math.round(Number(incomeMatch[1]) * (incomeMatch[2] ? 100000 : 1))
    : null;
  const state = lower.includes("telangana")
    ? "telangana"
    : lower.includes("andhra")
      ? "andhra pradesh"
      : null;
  const gender =
    lower.includes("female") || lower.includes("woman") || lower.includes("widow")
      ? "female"
      : lower.includes("male") || lower.includes("man")
        ? "male"
        : null;
  const category = lower.includes("sc")
    ? "sc"
    : lower.includes("st")
      ? "st"
      : lower.includes("obc")
        ? "obc"
        : lower.includes("minority")
          ? "minority"
          : lower.includes("general")
            ? "general"
            : null;
  const occupation = lower.includes("farmer")
    ? "farmer"
    : lower.includes("student")
      ? "student"
      : lower.includes("tailor")
        ? "tailoring"
        : lower.includes("business") || lower.includes("tiffin") || lower.includes("shop")
          ? "small business"
          : lower.includes("vendor")
            ? "street vendor"
            : null;
  const landMatch = lower.match(/(\d+(?:\.\d+)?)\s*acre/);
  const profile: CitizenProfile = {
    state,
    age: Number.isFinite(age) ? age : null,
    gender,
    category,
    annualIncome,
    occupation,
    landAcres: landMatch ? Number(landMatch[1]) : null,
    hasAadhaar: lower.includes("aadhaar") ? !lower.includes("no aadhaar") : null,
    hasBankAccount: lower.includes("bank")
      ? !(lower.includes("no bank") || lower.includes("without bank"))
      : null,
    hasBPL: lower.includes("bpl") ? !(lower.includes("no bpl") || lower.includes("not bpl")) : null,
    isBPL: lower.includes("bpl") ? !(lower.includes("no bpl") || lower.includes("not bpl")) : null,
    isDisabled: lower.includes("disabled") || lower.includes("disability") ? true : null,
    disability: lower.includes("disabled") || lower.includes("disability") ? true : null,
    isWidow: lower.includes("widow"),
    isMinority: lower.includes("minority"),
    notes: text,
  };
  const missing = [
    !profile.state ? "state" : null,
    !profile.age ? "age" : null,
    !profile.gender ? "gender" : null,
    !profile.category ? "category" : null,
    profile.annualIncome == null ? "annual income" : null,
    !profile.occupation ? "occupation" : null,
    profile.hasAadhaar == null ? "Aadhaar status" : null,
    profile.hasBankAccount == null ? "bank account status" : null,
    profile.hasBPL == null ? "BPL status" : null,
  ].filter(Boolean);
  return {
    profile,
    followUp: missing.length
      ? `Please share these details in one reply: ${missing.join(", ")}.`
      : null,
  };
}

function generateLocalReport(
  profile: CitizenProfile,
  schemes: Scheme[],
  eligibleResults: EligibilityResult[],
  reasoningSummary?: string,
) {
  if (eligibleResults.length === 0) {
    return "## No strong matches found\n\nBased on the details shared, we could not find schemes you are likely eligible for from the current verified catalog.\n\nThis is guidance based on the information you shared. Please confirm final eligibility on the official portal or with a local government office.";
  }
  const sections = eligibleResults.map((result, index) => {
    const scheme = schemes.find((s) => s.id === result.schemeId);
    const steps = (scheme?.applicationSteps ?? []).map((step, i) => `${i + 1}. ${step}`).join("\n");
    const docs = result.missingDocuments.length
      ? result.missingDocuments.map((doc) => `- ${doc}`).join("\n")
      : (scheme?.documentsRequired ?? []).map((doc) => `- ${doc}`).join("\n");
    return `### ${index + 1}. ${result.schemeName} - ${result.benefitAmount}

Why you likely qualify: ${result.reasons.join(" ")}

Steps to apply:
${steps || "1. Check the official source link and follow the latest instructions."}

Documents needed:
${docs || "- Check the official source for the latest document list."}

Application: ${scheme?.applicationUrl ?? result.sourceUrl}
Source: ${result.sourceUrl} · Last verified: ${result.lastVerified}
Confidence: ${result.confidence}`;
  });
  const summarySection = reasoningSummary
    ? `\n\n### Reasoning summary\n\n${reasoningSummary}`
    : "";
  return `## Schemes you are likely eligible for${summarySection}\n\n${sections.join("\n\n")}\n\nThis is guidance based on the information you shared. Please confirm final eligibility on the official portal or with a local government office.`;
}

function looksLikeSafetyVerdict(text: string) {
  const compact = text.trim();
  if (!compact) return true;
  if (/User Safety:|Safety Categories:|Report too short to validate/i.test(compact)) return true;
  return compact.length < 120 && /\bunsafe\b/i.test(compact);
}

function isCompleteSchemeReport(text: string, schemes: Scheme[]) {
  if (looksLikeSafetyVerdict(text)) return false;
  if (!schemes.length) return text.trim().length >= 120;
  const hasSchemeName = schemes.some((scheme) => text.includes(scheme.schemeName));
  const hasSource = /source\s*:/i.test(text) || schemes.some((scheme) => text.includes(scheme.sourceUrl));
  const hasLastVerified =
    /last verified\s*:/i.test(text) || schemes.some((scheme) => text.includes(scheme.lastVerified));
  return hasSchemeName && hasSource && hasLastVerified;
}

function safeReasoningSummary(text: string): string | null {
  const cleaned = text
    .replace(/```[a-z]*|```/gi, "")
    .replace(/\bguaranteed\b|\bapproved\b|\bfinal eligibility\b/gi, "likely eligible")
    .replace(/\s+/g, " ")
    .trim();
  if (looksLikeSafetyVerdict(cleaned)) return null;
  if (cleaned.length < 30) return null;
  return cleaned.slice(0, 900);
}

// ─────────────────────────────────────────────────────────────
// PROFILE AGENT — extract structured profile from free text
// ─────────────────────────────────────────────────────────────
export const extractProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ text: z.string().min(3).max(4000) }).parse(input))
  .handler(async ({ data }): Promise<{ profile: CitizenProfile; followUp: string | null }> => {
    const gateway = getGateway();
    const trace = startTrace("agent.profile", {
      textLength: data.text.length,
      provider: gateway ? "openrouter" : "local-demo",
    });
    if (!gateway) {
      const localSpan = trace.span("Profile Agent", { provider: "local-demo" });
      const result = extractProfileLocally(data.text);
      localSpan.end({ followUp: Boolean(result.followUp), profile: result.profile });
      await trace.end({ provider: "local-demo", followUp: Boolean(result.followUp) });
      await flushObservability();
      return result;
    }

    const schema = z.object({
      name: z.string().nullable(),
      state: z.string().nullable(),
      district: z.string().nullable(),
      age: z.number().nullable(),
      gender: z.enum(["male", "female", "other"]).nullable(),
      category: z.enum(["general", "sc", "st", "obc", "ebc", "minority"]).nullable(),
      annualIncome: z.number().nullable(),
      occupation: z.string().nullable(),
      landAcres: z.number().nullable(),
      hasAadhaar: z.boolean().nullable(),
      hasBankAccount: z.boolean().nullable(),
      hasBPL: z.boolean().nullable(),
      isBPL: z.boolean().nullable(),
      isDisabled: z.boolean().nullable(),
      disability: z.boolean().nullable(),
      isWidow: z.boolean().nullable(),
      isMinority: z.boolean().nullable(),
      familySize: z.number().nullable(),
      notes: z.string().nullable(),
      followUp: z.string().nullable(),
    });

    try {
      const profileSpan = trace.generation("Profile Agent", {
        provider: "openrouter",
        model: MODEL,
        textLength: data.text.length,
      });
      const generation = await generateText({
        model: gateway(MODEL),
        output: Output.object({ schema }),
        system:
          "CRISPE Profile Agent for SchemeSeva. Capacity: extract structured CitizenProfile JSON for Indian welfare eligibility. " +
          "Role: careful civic intake assistant. Insight: hard eligibility depends on stated facts, so never infer income, category, gender, documents, or BPL status. " +
          "Statement: fill required fields state, age, gender, category, annualIncome, occupation, hasBPL, hasAadhaar, hasBankAccount only when stated; set unknown values to null. " +
          "Personality: plain, respectful, 8th-grade English. Few-shot: '42 year old SC male farmer Telangana income 90000 has Aadhaar bank no BPL' means complete profile and no follow-up. " +
          "'I am a farmer' means null for missing facts and one follow-up asking for state, age, gender/category, income, and documents. " +
          "If any critical required field is missing, set followUp to exactly one specific clarifying question. Otherwise followUp = null.",
        prompt: data.text,
      });
      const { output } = generation;
      profileSpan.end({
        provider: "openrouter",
        model: MODEL,
        followUp: Boolean(output.followUp),
        profile: output,
        usage:
          (generation as { usage?: unknown; totalUsage?: unknown }).usage ??
          (generation as { usage?: unknown; totalUsage?: unknown }).totalUsage,
      });
      const { followUp, ...profile } = output;
      const normalized = {
        ...profile,
        isBPL: profile.isBPL ?? profile.hasBPL,
        hasBPL: profile.hasBPL ?? profile.isBPL,
        disability: profile.disability ?? profile.isDisabled,
        isDisabled: profile.isDisabled ?? profile.disability,
      } as CitizenProfile;
      await trace.end({ provider: "openrouter", followUp: Boolean(followUp), profile: normalized });
      await flushObservability();
      return { profile: normalized, followUp: followUp ?? null };
    } catch (e) {
      await trace.end({ provider: "openrouter", fallback: NoObjectGeneratedError.isInstance(e) }, e);
      await flushObservability();
      if (NoObjectGeneratedError.isInstance(e)) {
        return {
          profile: { notes: data.text },
          followUp:
            "I couldn't understand fully — could you share your state, age, occupation and rough yearly income?",
        };
      }
      throw e;
    }
  });

// ─────────────────────────────────────────────────────────────
// FULL DISCOVERY — Discovery → Eligibility → Report → Safety
// ─────────────────────────────────────────────────────────────
export const runDiscovery = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionKey: z.string().min(4),
        profile: z.record(z.string(), z.any()),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<DiscoveryReport> => {
    const profile = data.profile as CitizenProfile;

    // Rate limit: 10 discovery requests / minute / IP
    let ip = "anon";
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? "anon";
    } catch {
      // getRequestIP is unavailable outside request-bound server execution.
    }
    const rl = await checkDiscoveryRateLimit(rateLimitIdentity(data.sessionKey, ip));
    if (!rl.allowed) {
      throw new Error("Too many requests. Please wait a moment before trying again.");
    }

    const trace = startTrace("workflow.schemeDiscovery", {
      sessionKey: data.sessionKey,
      workflow: "discovery",
      profile,
    });
    try {
    const profileSpan = trace.span("Profile Agent", { source: "supplied-or-extracted", profile });
    profileSpan.end({ success: true });
    const catalogSpan = trace.span("Scheme catalog load", {
      qdrantConfigured: qdrantConfigured(),
      supabaseConfigured: supabaseServerConfigured(),
    });
    const allSchemes = await loadSchemes();
    catalogSpan.end({ schemesLoaded: allSchemes.length });

    // Discovery Agent — prefer Qdrant when configured, fall back to keyword scorer
    const discSpan = trace.span("Discovery Agent", { topN: 20 });
    const qdrantSearchSpan = trace.span("Qdrant search", {
      qdrantConfigured: qdrantConfigured(),
      embeddingsProvider: process.env.GEMINI_API_KEY ? "gemini" : "keyword-fallback",
    });
    const retrieval = await searchSchemes(allSchemes, profile, 20);
    const candidates = retrieval.schemes;
    qdrantSearchSpan.end({
      retrievalProvider: retrieval.source,
      candidates: candidates.length,
      ...retrieval.diagnostics,
    });
    discSpan.end({
      retrievalProvider: retrieval.source,
      count: candidates.length,
      ...retrieval.diagnostics,
    });
    const discoveryStatus =
      retrieval.source === "fallback-local-keyword"
        ? fallback(
            retrieval.source,
            retrieval.diagnostics.fallbackReason ??
              "Qdrant unavailable; used deterministic local catalog keyword fallback.",
          )
        : completed(retrieval.source, "Qdrant retrieval path used.");

    // Eligibility Agent — deterministic
    const eligibilitySpan = trace.span("Eligibility Agent", { candidates: candidates.length });
    const eligibleResults: EligibilityResult[] = candidates
      .map((s) => checkEligibility(s, profile))
      .filter((r) => r.confidence !== "none")
      .sort((a, b) => {
        if (a.confidence !== b.confidence) return a.confidence === "high" ? -1 : 1;
        return 0;
      });
    eligibilitySpan.end({ candidates: candidates.length, eligible: eligibleResults.length });

    const eligibleSchemes = eligibleResults
      .map((r) => candidates.find((c) => c.id === r.schemeId)!)
      .filter(Boolean);

    // Report Agent
    let reportMarkdown = "";
    let reasoningProvider: ReasoningProvider = "local-fallback";
    const reasoningAttemptedProviders: ReasoningProvider[] = [];
    let featherlessStatus: FeatherlessErrorCategory = "not_configured";
    let fallbackReason: string | undefined;

    if (eligibleResults.length === 0) {
      reportMarkdown =
        "## No strong matches found\n\nBased on the details shared, we could not find schemes you likely qualify for from our current catalog of 28 verified central + Telangana schemes.\n\nThis is guidance based on the information you shared. Please confirm final eligibility on the official portal or with a local government office.";
    } else {
      const gateway = getGateway();
      reasoningAttemptedProviders.push("featherless");
      const featherlessSpan = trace.generation("Report Agent", {
        provider: "featherless",
        configured: isFeatherlessConfigured(),
        eligibleCount: eligibleResults.length,
      });
      const featherless = await generateReportWithFeatherless(
        profile,
        eligibleSchemes,
        eligibleResults,
      );
      const featherlessSummary = featherless.ok ? safeReasoningSummary(featherless.text) : null;

      if (featherlessSummary) {
        reportMarkdown = generateLocalReport(
          profile,
          eligibleSchemes,
          eligibleResults,
          featherlessSummary,
        );
        reasoningProvider = "featherless";
        featherlessStatus = "success";
        featherlessSpan.end({
          schemes: eligibleResults.length,
          provider: "featherless",
          model: featherless.model,
        });
      } else {
        featherlessStatus = featherless.ok ? "incomplete_output" : featherless.errorCategory;
        fallbackReason = featherless.error ?? "Featherless returned no usable explanation text.";
        featherlessSpan.end({
          schemes: eligibleResults.length,
          provider: "featherless",
          fallback: true,
          errorCategory: featherlessStatus,
          reason: fallbackReason,
        });
      }

      if (!reportMarkdown) {
        reasoningAttemptedProviders.push(gateway ? "openrouter-fallback" : "local-fallback");
        const reportSpan = gateway
          ? trace.generation("Report Agent fallback", {
              provider: "openrouter",
              model: MODEL,
              eligibleCount: eligibleResults.length,
            })
          : trace.span("Report Agent local fallback", {
              provider: "local-fallback",
              eligibleCount: eligibleResults.length,
            });

        if (!gateway) {
          reportMarkdown = generateLocalReport(profile, eligibleSchemes, eligibleResults);
          reasoningProvider = "local-fallback";
          fallbackReason =
            fallbackReason ?? "OpenRouter is not configured; used local grounded report.";
          reportSpan.end({ schemes: eligibleResults.length, provider: "local-fallback" });
        } else {
          try {
            const generation = await generateText({
              model: gateway(MODEL),
              system:
                "You are the Report Agent for SchemeSeva. Generate a plain-language markdown report for an Indian citizen about government schemes they may qualify for. " +
                "Rules: (1) Always use the phrase 'likely eligible' and never claim guaranteed eligibility. " +
                "(2) Use 8th-grade reading level, no bureaucratic jargon. " +
                "(3) For each scheme use this exact structure: ### N. <Scheme Name> - <benefit>, then two-sentence 'Why you likely qualify', then a numbered 'Steps to apply' list, then a 'Documents needed' list, then a line 'Source: <url> - Last verified: <date>'. " +
                "(4) Never invent schemes, benefits, documents, dates, source URLs, or application steps. Only use the data provided. " +
                "(5) End with exactly one disclaimer paragraph: 'This is guidance based on the information you shared. Please confirm final eligibility on the official portal or with a local government office.'",
              prompt: buildReportGenerationInput(profile, eligibleSchemes, eligibleResults),
            });
            reportMarkdown = generation.text;
            if (isCompleteSchemeReport(reportMarkdown, eligibleSchemes)) {
              reasoningProvider = "openrouter-fallback";
            } else {
              reportMarkdown = generateLocalReport(profile, eligibleSchemes, eligibleResults);
              reasoningProvider = "local-fallback";
              fallbackReason =
                fallbackReason ?? "OpenRouter output was incomplete; used local grounded report.";
            }
            reportSpan.end({
              schemes: eligibleResults.length,
              provider: reasoningProvider,
              model: MODEL,
              usage:
                (generation as { usage?: unknown; totalUsage?: unknown }).usage ??
                (generation as { usage?: unknown; totalUsage?: unknown }).totalUsage,
            });
          } catch (e) {
            reportMarkdown = generateLocalReport(profile, eligibleSchemes, eligibleResults);
            reasoningProvider = "local-fallback";
            fallbackReason =
              fallbackReason ?? "OpenRouter fallback failed; used local grounded report.";
            reportSpan.end({
              schemes: eligibleResults.length,
              provider: "local-fallback",
              openRouterFallbackFailed: true,
              error: (e as Error).message?.slice(0, 160),
            });
          }
        }
      }
    }

    // Safety Agent - prefers Enkrypt AI; falls back to Gemini validator
    const sourceContext = JSON.stringify(
      eligibleSchemes.map((s) => ({
        id: s.id,
        name: s.schemeName,
        benefit: s.benefitAmount,
        source: s.sourceUrl,
        verified: s.lastVerified,
      })),
    );
    const safetySpan = trace.span("Enkrypt validation", {
      primaryProvider: "enkrypt",
      fallbackProvider: process.env.OPENROUTER_API_KEY ? "fallback-openrouter" : "passthrough",
      reportLength: reportMarkdown.length,
    });
    const safetyReport = await validateReport(reportMarkdown, sourceContext);
    safetySpan.end({
      safetyProvider: safetyReport.provider,
      safetyStatus: safetyReport.status,
      detections: safetyReport.detections?.length ?? 0,
    });
    const safety: DiscoveryReport["safety"] = {
      status: safetyReport.status,
      note: `[${safetyReport.provider}] ${safetyReport.note}`,
      provider: safetyReport.provider,
    };
    const agentSteps: DiscoveryAgentSteps = {
      profileAgent: completed(
        "mastra-adapter",
        "Profile supplied by workflow or validated before report generation.",
      ),
      discoveryAgent: discoveryStatus,
      eligibilityAgent: completed(
        "deterministic-rules",
        `${eligibleResults.length} likely matches after hard-fail exclusions.`,
      ),
      reportAgent: completed(
        reasoningProvider,
        eligibleResults.length ? "Plain-language report generated." : "No-match report generated.",
      ),
      safetyValidation:
        safetyReport.provider === "enkrypt"
          ? completed("enkrypt", safetyReport.note)
          : fallback(safetyReport.provider, safetyReport.note),
    };

    // Optional Qdrant semantic memory mirror
    const memorySpan = trace.span("Qdrant memory write", {
      retrievalProvider: retrieval.source,
      safetyProvider: safetyReport.provider,
      matches: eligibleResults.length,
    });
    const memoryResult = await rememberSession(
      data.sessionKey,
      profile,
      `Retrieval=${retrieval.source} · Reasoning=${reasoningProvider} · Matches=${eligibleResults.length} · Safety=${safetyReport.provider}/${safetyReport.status}`,
      eligibleResults,
      retrieval.source,
      safetyReport.provider,
      reasoningProvider,
    );
    memorySpan.end({
      memoryProvider: memoryResult.provider,
      memoryWrite: memoryResult.memoryWrite,
    });

    saveLocalSession({
      sessionKey: data.sessionKey,
      profile,
      foundSchemes: eligibleResults,
      reportMarkdown,
      safetyStatus: safety.status,
      lastScanAt: new Date().toISOString(),
    });

    if (supabaseServerConfigured()) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("sessions").upsert(
          {
            session_key: data.sessionKey,
            profile: profile as never,
            found_schemes: eligibleResults as never,
            report_markdown: reportMarkdown,
            safety_status: safety.status,
            last_scan_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "session_key" },
        );
      } catch {
        // Optional fallback store unavailable; local/Qdrant memory already captured the session.
      }
    }

    const result = {
      sessionKey: data.sessionKey,
      profile,
      eligible: eligibleResults,
      schemes: eligibleSchemes,
      reportMarkdown,
      safety,
      retrievalProvider: retrieval.source,
      reasoningProvider,
      reasoningAttemptedProviders,
      featherlessStatus,
      fallbackReason,
      featherlessErrorCategory: featherlessStatus,
      retrievalDiagnostics: retrieval.diagnostics,
      memoryProvider: memoryResult.provider === "qdrant" ? "qdrant" : "local",
      memoryWrite: memoryResult.memoryWrite,
      workflowMode: "adapter",
      agentSteps,
    } satisfies DiscoveryReport & ReasoningMetadata;
    await trace.end({
      matches: eligibleResults.length,
      retrieval: retrieval.source,
      reasoningProvider,
      reasoningAttemptedProviders,
      featherlessStatus,
      reasoningFallbackReason: fallbackReason,
      ...retrieval.diagnostics,
      safetyProvider: safetyReport.provider,
      memoryProvider: memoryResult.provider,
    });
    await flushObservability();
    return result;
    } catch (e) {
      await trace.end({ success: false }, e);
      await flushObservability();
      throw e;
    }
  });

// ─────────────────────────────────────────────────────────────
// VIGILANCE AGENT — simulate a new scheme, scan saved session
// ─────────────────────────────────────────────────────────────
export const runVigilance = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ sessionKey: z.string().min(4) }).parse(input))
  .handler(
    async ({
      data,
    }): Promise<{
      scanned: number;
      newMatches: number;
      alerts: Array<{
        id: string;
        schemeId: string;
        schemeName: string;
        reason: string;
        urgency: string;
        reasoningProvider: ReasoningProvider;
        safetyProvider: string;
        validationProvider: string;
        retrievalProvider: string;
        memoryProvider: string;
        memoryWrite: "success" | "failed" | "skipped-local";
      }>;
      workflowMode: "adapter";
      agentSteps: VigilanceAgentSteps;
      diagnostics: {
        sessionProvider: string;
        qdrantConfigured: boolean;
        scannedCandidates: number;
        alertStorage: "stored" | "skipped" | "failed";
        alertStorageReason: string;
        fallbackReason?: string;
      };
    }> => {
      // Rate limit: 3 vigilance simulate requests / minute / IP
      let ip = "anon";
      try {
        ip = getRequestIP({ xForwardedFor: true }) ?? "anon";
      } catch {
        // getRequestIP is unavailable outside request-bound server execution.
      }
      const rl = await checkVigilanceRateLimit(rateLimitIdentity(data.sessionKey, ip));
      if (!rl.allowed) {
        throw new Error("Too many requests. Please wait a moment before trying again.");
      }
      const trace = startTrace("workflow.vigilance", { sessionKey: data.sessionKey });
      try {

      // Load session
      const sessionSpan = trace.span("Session scan", {
        supabaseConfigured: supabaseServerConfigured(),
      });
      let sess: {
        profile: CitizenProfile;
        found_schemes: EligibilityResult[];
        provider: string;
      } | null = null;
      if (supabaseServerConfigured()) {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: supabaseSession } = await supabaseAdmin
            .from("sessions")
            .select("profile, found_schemes")
            .eq("session_key", data.sessionKey)
            .maybeSingle();
          if (supabaseSession) {
            sess = {
              profile: supabaseSession.profile as unknown as CitizenProfile,
              found_schemes:
                (supabaseSession.found_schemes as unknown as EligibilityResult[]) ?? [],
              provider: "supabase",
            };
          }
        } catch {
          sess = null;
        }
      }
      if (!sess) {
        const qdrantSession = await loadRememberedSession(data.sessionKey);
        if (qdrantSession) {
          sess = {
            profile: qdrantSession.profile,
            found_schemes: qdrantSession.foundSchemes,
            provider: qdrantSession.provider,
          };
        }
      }
      if (!sess) {
        const local = getLocalSession(data.sessionKey);
        if (local) {
          sess = {
            profile: local.profile,
            found_schemes: local.foundSchemes,
            provider: "local",
          };
        }
      }
      sessionSpan.end({ found: Boolean(sess), provider: sess?.provider ?? "none" });
      if (!sess) {
        const agentSteps: VigilanceAgentSteps = {
          vigilanceAgent: completed("mastra-adapter", "No saved session found."),
          discoveryAgent: fallback("none", "No session available to scan."),
          eligibilityAgent: fallback("none", "No session available to scan."),
          safetyValidation: fallback("none", "No alert generated."),
        };
        await trace.end({ scanned: 0 });
        await flushObservability();
        return {
          scanned: 0,
          newMatches: 0,
          alerts: [],
          workflowMode: "adapter",
          agentSteps,
          diagnostics: {
            sessionProvider: "none",
            qdrantConfigured: qdrantConfigured(),
            scannedCandidates: 0,
            alertStorage: "skipped",
            alertStorageReason: "No saved session found.",
          },
        };
      }

      const profile = sess.profile as unknown as CitizenProfile;
      const foundList = (sess.found_schemes as unknown as EligibilityResult[]) ?? [];
      const alreadyFound = new Set(foundList.map((r) => r.schemeId));

      // Simulate: pick one high-signal scheme the citizen doesn't have yet
      const schemeScanSpan = trace.span("Scheme scan", {
        foundSchemes: foundList.length,
      });
      const all = await loadSchemes();
      let candidates = discoverCandidates(all, profile, 30).filter(
        (s) => !alreadyFound.has(s.id),
      );
      if (demoModeEnabled() && profile.occupation?.toLowerCase().includes("farmer")) {
        const demoScheme =
          all.find((scheme) => scheme.id === "pm-kusum-004") ??
          all.find((scheme) => scheme.id === "soil-health-card-005");
        if (demoScheme && !candidates.some((scheme) => scheme.id === demoScheme.id)) {
          candidates = [demoScheme, ...candidates];
        }
      }
      schemeScanSpan.end({ catalogSize: all.length, unseenCandidates: candidates.length });

      const alerts: Array<{
        id: string;
        schemeId: string;
        schemeName: string;
        reason: string;
        urgency: string;
        reasoningProvider: ReasoningProvider;
        safetyProvider: string;
        validationProvider: string;
        retrievalProvider: string;
        memoryProvider: string;
        memoryWrite: "success" | "failed" | "skipped-local";
      }> = [];
      const diagnostics: {
        sessionProvider: string;
        qdrantConfigured: boolean;
        scannedCandidates: number;
        alertStorage: "stored" | "skipped" | "failed";
        alertStorageReason: string;
        fallbackReason?: string;
      } = {
        sessionProvider: sess.provider,
        qdrantConfigured: qdrantConfigured(),
        scannedCandidates: candidates.length,
        alertStorage: "skipped",
        alertStorageReason: "No validated alert generated.",
      };

      const eligibilityScanSpan = trace.span("Eligibility checks", {
        candidates: Math.min(candidates.length, 5),
      });
      for (const scheme of candidates.slice(0, 5)) {
        const r = checkEligibility(scheme, profile);
        if (r.confidence === "high" || r.confidence === "medium") {
          let alertReason = r.reasons[0] ?? "Matches your saved profile.";
          let alertReasoningProvider: ReasoningProvider = "local-fallback";
          const alertReasoningSpan = trace.generation("Alert reasoning", {
            schemeId: scheme.id,
            primaryProvider: "featherless",
            fallbackProvider: process.env.OPENROUTER_API_KEY
              ? "openrouter"
              : "local-fallback",
          });
          const featherlessReason = await generateVigilanceReasonWithFeatherless({
            profile,
            scheme,
            eligibility: r,
          });
          if (featherlessReason.ok && featherlessReason.text.length >= 12) {
            alertReason = featherlessReason.text;
            alertReasoningProvider = "featherless";
            alertReasoningSpan.end({
              provider: "featherless",
              model: featherlessReason.model,
            });
          } else {
            const gateway = getGateway();
            if (gateway) {
              try {
                const generation = await generateText({
                  model: gateway(MODEL),
                  system:
                    "You write short SchemeSeva Vigilance alert reasons. Use only the provided profile, scheme, and eligibility facts. Use likely-match language, never guarantee eligibility, do not invent benefits, and do not ask for Aadhaar number or bank account number. Return one sentence under 35 words.",
                  prompt: `Citizen profile: ${JSON.stringify(profile)}
Scheme: ${scheme.schemeName}
Benefit: ${scheme.benefitAmount}
Eligibility reasons: ${r.reasons.join(" ")}
Source: ${scheme.sourceUrl}
Last verified: ${scheme.lastVerified}

Write the alert reason.`,
                });
                if (generation.text.trim().length >= 12) {
                  alertReason = generation.text.trim();
                  alertReasoningProvider = "openrouter-fallback";
                }
                alertReasoningSpan.end({
                  provider: alertReasoningProvider,
                  featherlessFallbackReason: featherlessReason.error,
                });
              } catch (e) {
                alertReasoningSpan.end({
                  provider: "local-fallback",
                  featherlessFallbackReason: featherlessReason.error,
                  openRouterFallbackFailed: true,
                  error: (e as Error).message?.slice(0, 160),
                });
              }
            } else {
              alertReasoningSpan.end({
                provider: "local-fallback",
                featherlessFallbackReason: featherlessReason.error,
              });
            }
          }
          const alertValidationSpan = trace.span("Alert validation", {
            schemeId: scheme.id,
            confidence: r.confidence,
            primaryProvider: "enkrypt",
          });
          const safety = await validateAlert(
            `${scheme.schemeName}: ${alertReason} Urgency: ${r.confidence === "high" ? "high" : "medium"}.`,
            JSON.stringify({
              id: scheme.id,
              name: scheme.schemeName,
              benefit: scheme.benefitAmount,
              source: scheme.sourceUrl,
              verified: scheme.lastVerified,
              reason: alertReason,
            }),
          );
          alertValidationSpan.end({
            safetyProvider: safety.provider,
            safetyStatus: safety.status,
            fallbackReason: safety.fallbackReason,
          });
          if (safety.status !== "safe") continue;
          let alertId = `local-${Date.now()}`;
          let memoryProvider = "local";
          const pendingAlertSpan = trace.span("Pending alert write", {
            schemeId: scheme.id,
            safetyProvider: safety.provider,
          });
          if (supabaseServerConfigured()) {
            try {
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
              const { data: inserted } = await supabaseAdmin
                .from("alerts")
                .insert({
                  session_key: data.sessionKey,
                  scheme_id: scheme.id,
                  scheme_name: scheme.schemeName,
                  reason: alertReason,
                  urgency: r.confidence === "high" ? "high" : "medium",
                })
                .select("id")
                .single();
              if (inserted?.id) {
                alertId = inserted.id as string;
                memoryProvider = "supabase";
              }
            } catch {
              memoryProvider = "local";
            }
          }
          const alert = {
            id: alertId,
            schemeId: scheme.id,
            schemeName: scheme.schemeName,
            reason: alertReason,
            urgency: r.confidence === "high" ? "high" : "medium",
            reasoningProvider: alertReasoningProvider,
            safetyProvider: safety.provider,
            validationProvider: safety.provider,
            retrievalProvider: "saved-session+scheme-catalog",
            memoryProvider,
            memoryWrite: "skipped-local" as "success" | "failed" | "skipped-local",
          };
          if (safety.fallbackReason) diagnostics.fallbackReason = safety.fallbackReason;
          const qdrantAlert = await rememberAlert({ ...alert, sessionKey: data.sessionKey });
          if (qdrantAlert.stored) {
            alert.memoryProvider = `${memoryProvider}+qdrant-pending_alerts`;
            alert.memoryWrite = "success";
            diagnostics.alertStorage = "stored";
            diagnostics.alertStorageReason = `Stored in ${qdrantAlert.collection ?? "pending_alerts"}.`;
          } else {
            diagnostics.alertStorage = qdrantConfigured() ? "failed" : "skipped";
            alert.memoryWrite = qdrantConfigured() ? "failed" : "skipped-local";
            diagnostics.alertStorageReason =
              qdrantAlert.reason ?? "Qdrant is not configured for pending_alerts.";
          }
          alerts.push(alert);
          saveLocalAlert({ ...alert, sessionKey: data.sessionKey });
          pendingAlertSpan.end({
            memoryProvider: alert.memoryProvider,
            alertStorage: diagnostics.alertStorage,
            alertStorageReason: diagnostics.alertStorageReason,
          });
          if (alerts.length >= 1) break; // Return one fresh alert per simulate click
        }
      }
      eligibilityScanSpan.end({ alerts: alerts.length });

      await trace.end({ scanned: candidates.length, newMatches: alerts.length });
      await flushObservability();
      const agentSteps: VigilanceAgentSteps = {
        vigilanceAgent: completed("mastra-adapter", "Saved session scanned for new matches."),
        discoveryAgent: completed(
          "saved-session+scheme-catalog",
          `${candidates.length} unseen candidates scanned.`,
        ),
        eligibilityAgent: completed(
          "deterministic-rules",
          `${alerts.length} validated alert candidates emitted.`,
        ),
        safetyValidation:
          alerts[0]?.validationProvider === "enkrypt"
            ? completed("enkrypt", "Alert validated before display.")
            : fallback(
                alerts[0]?.validationProvider ?? "none",
                alerts.length ? "Fallback safety validation used." : "No alert generated.",
              ),
      };
      return {
        scanned: candidates.length,
        newMatches: alerts.length,
        alerts,
        workflowMode: "adapter",
        agentSteps,
        diagnostics,
      };
      } catch (e) {
        await trace.end({ success: false }, e);
        await flushObservability();
        throw e;
      }
    },
  );

// ─────────────────────────────────────────────────────────────
// Public reads (no auth needed)
// ─────────────────────────────────────────────────────────────
export const listSchemes = createServerFn({ method: "GET" }).handler(async () => {
  const schemes = await loadSchemes();
  return { schemes, count: schemes.length };
});
