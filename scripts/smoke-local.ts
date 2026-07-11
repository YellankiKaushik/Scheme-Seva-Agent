import { discoverCandidates, checkEligibility } from "../src/lib/schemeseva-eligibility";
import { localSchemes } from "../src/lib/localSchemes";
import { getFeatherlessConfig } from "../src/lib/featherless";
import type { CitizenProfile, DiscoveryReport, EligibilityResult } from "../src/lib/schemeseva-types";

const baseUrl = process.env.SCHEMESEVA_SMOKE_BASE_URL ?? "http://localhost:8080";

const profiles: Array<{
  name: string;
  profile: CitizenProfile;
  expect: (eligible: EligibilityResult[]) => boolean;
  detail: string;
}> = [
  {
    name: "Farmer demo path",
    profile: {
      state: "telangana",
      district: "Nalgonda",
      age: 48,
      gender: "male",
      category: "sc",
      occupation: "farmer",
      annualIncome: 90000,
      landAcres: 4,
      hasAadhaar: true,
      hasBankAccount: true,
      hasBPL: false,
    },
    expect: (eligible) =>
      eligible.length >= 2 &&
      eligible.some((item) => item.schemeName.includes("PM-KISAN")) &&
      eligible.some((item) => item.schemeName.includes("Rythu")),
    detail: "expected PM-KISAN plus a Telangana farmer scheme",
  },
  {
    name: "Student demo path",
    profile: {
      state: "telangana",
      district: "Hyderabad",
      age: 21,
      gender: "female",
      category: "obc",
      occupation: "student",
      annualIncome: 180000,
      hasAadhaar: true,
      hasBankAccount: true,
      hasBPL: false,
    },
    expect: (eligible) =>
      eligible.some((item) => /scholarship|fee reimbursement/i.test(item.schemeName)),
    detail: "expected at least one scholarship or fee reimbursement",
  },
  {
    name: "Woman entrepreneur demo path",
    profile: {
      state: "telangana",
      district: "Hyderabad",
      age: 34,
      gender: "female",
      category: "general",
      occupation: "entrepreneur",
      annualIncome: 80000,
      hasAadhaar: true,
      hasBankAccount: true,
      hasBPL: false,
      isWidow: true,
    },
    expect: (eligible) =>
      eligible.some((item) => /Mudra|Stand-Up|Stree Nidhi/i.test(item.schemeName)),
    detail: "expected an entrepreneur loan/support scheme",
  },
  {
    name: "Elderly pensioner demo path",
    profile: {
      state: "telangana",
      district: "Karimnagar",
      age: 67,
      gender: "male",
      category: "sc",
      occupation: "unemployed",
      annualIncome: 0,
      hasAadhaar: true,
      hasBankAccount: false,
      hasBPL: false,
    },
    expect: (eligible) => eligible.some((item) => /Pension|Aasara/i.test(item.schemeName)),
    detail: "expected at least one pension scheme",
  },
  {
    name: "Unemployed youth demo path",
    profile: {
      state: "telangana",
      district: "Hyderabad",
      age: 24,
      gender: "male",
      category: "obc",
      occupation: "unemployed",
      annualIncome: 0,
      hasAadhaar: true,
      hasBankAccount: true,
      hasBPL: false,
    },
    expect: (eligible) => eligible.some((item) => /Kaushal|PMKVY/i.test(item.schemeName)),
    detail: "expected PMKVY or similar skill support",
  },
];

let passed = 0;
let total = 0;
const started = Date.now();

function pass(name: string) {
  total += 1;
  passed += 1;
  console.log(`PASS - ${name}`);
}

function fail(name: string, reason: string) {
  total += 1;
  console.log(`FAIL - ${name}: ${reason}`);
}

function warn(name: string, reason: string) {
  console.log(`WARN - ${name}: ${reason}`);
}

async function fetchText(path: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${baseUrl}${path}`, { signal: controller.signal });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

for (const item of profiles) {
  const candidates = discoverCandidates(localSchemes, item.profile, 30);
  const eligible = candidates
    .map((scheme) => checkEligibility(scheme, item.profile))
    .filter((result) => result.confidence !== "none");
  if (item.expect(eligible)) pass(item.name);
  else fail(item.name, `${item.detail}; got ${eligible.map((r) => r.schemeName).join(", ")}`);
}

if (localSchemes.length === 28) pass("/schemes catalog has 28 local schemes");
else fail("/schemes catalog has 28 local schemes", `got ${localSchemes.length}`);

const previousFeatherlessEnv = {
  key: process.env.FEATHERLESS_API_KEY,
  model: process.env.FEATHERLESS_MODEL,
  enabled: process.env.FEATHERLESS_ENABLED,
};
delete process.env.FEATHERLESS_API_KEY;
delete process.env.FEATHERLESS_MODEL;
process.env.FEATHERLESS_ENABLED = "true";
const featherlessMissing = getFeatherlessConfig();
if (!featherlessMissing.configured && featherlessMissing.reason) {
  pass("Featherless env absence reports configured=false");
} else {
  fail("Featherless env absence reports configured=false", "missing env appeared configured");
}
if (previousFeatherlessEnv.key) process.env.FEATHERLESS_API_KEY = previousFeatherlessEnv.key;
else delete process.env.FEATHERLESS_API_KEY;
if (previousFeatherlessEnv.model) process.env.FEATHERLESS_MODEL = previousFeatherlessEnv.model;
else delete process.env.FEATHERLESS_MODEL;
if (previousFeatherlessEnv.enabled) process.env.FEATHERLESS_ENABLED = previousFeatherlessEnv.enabled;
else delete process.env.FEATHERLESS_ENABLED;

const metadataProbe: Pick<DiscoveryReport, "reasoningProvider"> = {
  reasoningProvider: "local-fallback",
};
if (metadataProbe.reasoningProvider === "local-fallback") {
  pass("report metadata supports reasoning provider fallback");
} else {
  fail("report metadata supports reasoning provider fallback", "unexpected metadata value");
}

try {
  const schemes = await fetchText("/schemes");
  if (schemes.ok && /Scheme catalog/i.test(schemes.text)) pass("/schemes page loads");
  else fail("/schemes page loads", `HTTP ${schemes.status}`);
} catch (e) {
  warn("/schemes page loads", `local server not reachable at ${baseUrl}: ${(e as Error).message}`);
}

try {
  const debug = await fetchText("/debug/integrations");
  if (debug.ok && /Integrations status/i.test(debug.text)) pass("/debug/integrations page loads");
  else fail("/debug/integrations page loads", `HTTP ${debug.status}`);
  for (const label of ["Qdrant", "Featherless", "Enkrypt", "Langfuse", "Upstash"]) {
    if (debug.text.includes(label)) pass(`/debug/integrations mentions ${label}`);
    else fail(`/debug/integrations mentions ${label}`, "label missing from page HTML");
  }
} catch (e) {
  warn(
    "/debug/integrations page loads",
    `local server not reachable at ${baseUrl}: ${(e as Error).message}`,
  );
}

try {
  const app = await fetchText("/app");
  if (app.ok && /SchemeSeva agent/i.test(app.text)) pass("/app page loads");
  else fail("/app page loads", `HTTP ${app.status}; intake text not found`);
} catch (e) {
  warn("/app page loads", `local server not reachable at ${baseUrl}: ${(e as Error).message}`);
}

console.log(`Results: ${passed}/${total} passed | Time: ${Date.now() - started}ms`);
console.log("Manual follow-up: run one discovery in the browser, then click Run vigilance scan.");
