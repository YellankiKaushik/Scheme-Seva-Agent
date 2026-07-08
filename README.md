# SchemeSeva

**Government Scheme Discovery & Eligibility Agent for Indian Citizens**
Built for the HiDevs × Mastra Hackathon — Open Innovation Challenge.

SchemeSeva lets a citizen describe their situation in plain English and returns a source-grounded list of central and Telangana government schemes they are **likely eligible** for — with reasons, documents, application steps, and official links. A Vigilance Agent watches saved profiles and fires proactive alerts when new matching schemes are found.

---

## Hackathon stack mapping

The reference architecture calls for Mastra + Qdrant + Enkrypt AI on Next.js. This project delivers the same **five-agent pipeline and guarantees** on the Lovable Cloud stack (TanStack Start + Supabase + Lovable AI Gateway). Every requirement in the PRD has a concrete counterpart:

| PRD requirement | Implementation in this repo |
|---|---|
| **Mastra** orchestration of 5 agents | Five typed server-function agents composed in `src/lib/schemeseva.functions.ts` (Profile → Discovery → Eligibility → Report → Safety) plus a standalone Vigilance Agent (`runVigilance`) |
| **Qdrant** retrieval + session memory | `discoverCandidates()` in `src/lib/schemeseva-eligibility.ts` (keyword + attribute scoring over the seeded `schemes` table); citizen sessions in Supabase table `sessions` (session_key → profile, found_schemes, report, safety_status) |
| **Enkrypt AI** safety validation | `runDiscovery` runs a strict Safety Agent (Gemini) that checks the generated report for hallucination, bias and toxicity against the source schemes, returning `{status, note}` shown in the UI |
| **Vigilance Agent** proactive alerts | `runVigilance` scans saved profile against un-shown schemes and writes new `alerts` rows; UI has a live "Simulate a new scheme launch" panel on `/app` |
| Next.js frontend | TanStack Start (React 19 + SSR) — routes: `/`, `/app`, `/schemes`, `/architecture` |
| Gemini LLM | `google/gemini-3-flash-preview` via Lovable AI Gateway (no user key needed) |

---

## What's in the box

- **28 curated schemes** (central + Telangana) with structured eligibility rules, documents, steps, official URL, and last-verified date — see `supabase/migrations/*seed*.sql`. Covers PM-KISAN, Rythu Bandhu, Rythu Bima, PM-JAY, Fee Reimbursement, Kalyana Lakshmi, Aasara, PM Mudra, PM SVANidhi, Stand-Up India, Ujjwala, MGNREGA, NSP scholarships, and more.
- **Deterministic Eligibility Agent** (`checkEligibility`) — hard-fail on state / age / gender / category / income / occupation / disability; soft-fail (medium confidence) on missing docs.
- **Report Agent** writes 8th-grade markdown with the mandated card structure and always uses "likely eligible" wording.
- **Safety Agent** grades every report before it reaches the user.
- **Vigilance demo** — one click simulates a new scheme launch and returns a proactive alert.
- **Privacy-first** — no Aadhaar number, bank number, phone, or address is ever collected. Only state, age, occupation, approximate income, category (optional) and a random session key.

---

## Run it

```bash
bun install
bun run dev
```

The app runs on Lovable Cloud with everything pre-provisioned. `LOVABLE_API_KEY` (Gemini gateway) and Supabase URL/keys are already set as project secrets — no `.env` editing needed for local preview.

For a self-hosted checkout, copy `.env.example` to `.env` and fill in your own values.

---

## Demo script (2 minutes)

1. Open `/` — click **Launch the agent**.
2. Click **"Try example 1"** (Telangana farmer, 3 acres, ₹1.2 L income).
3. Click **Run the agents →**. Watch the five-agent loader.
4. See the safety banner (✓ Validated) and the personalised markdown report — PM-KISAN, Rythu Bandhu, Rythu Bima etc. with reasons, docs, steps, source URLs, and the mandatory "may be eligible" disclaimer.
5. Click **Run vigilance scan** in the Vigilance panel — a proactive alert appears for a scheme the citizen hadn't seen yet.
6. Visit `/schemes` for the full catalog and `/architecture` for the five-agent diagram.

---

## Test profiles (all handled)

- **Telangana farmer** — "42-year-old farmer in Warangal, 3 acres, family income ₹1.2 lakh…"
- **Low-income student** — SC, Hyderabad, income < ₹2 L → NSP / Fee Reimbursement
- **Woman entrepreneur** — Telangana, tailoring business → PM Mudra, Stand-Up India
- **Missing income** — Profile Agent asks exactly one clarifying question via `followUp`
- **Safety failure** — Safety Agent flags overconfident wording; report is regenerated with disclaimer.
- **Vigilance** — save profile → click Simulate → alert appears.

---

## Environment variables

See `.env.example`. On Lovable Cloud every variable below is auto-provisioned.

- `LOVABLE_API_KEY` — Gemini + gateway (auto)
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — DB + auth (auto)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — browser client (auto)

---

## Known limitations

- Scheme catalog is 28 curated entries, not the full India-wide corpus.
- Retrieval is keyword+attribute scoring, not true vector search — swap in Qdrant by replacing `discoverCandidates()` if you have a cluster.
- No SMS/WhatsApp delivery for vigilance alerts (in-app only).
- No login required in the MVP — session is a random local key.

---

## Disclaimer

SchemeSeva provides **discovery and eligibility guidance** based on public data. Final eligibility and approval depend on official government verification. The system never claims guaranteed eligibility.

---

## Mandatory Stack Integration (hackathon compliance)

SchemeSeva now ships real integration adapters for the three mandatory hackathon technologies. Each adapter **prefers the real service when credentials are present** and only falls back to the Lovable Cloud demo path when they are not.

| Layer | Primary (mandatory) | Fallback (demo resilience) |
|---|---|---|
| Orchestration | **Mastra**-style Agent/Workflow adapter in `src/mastra/` wrapping the five SchemeSeva agents | — (adapter is always active) |
| Retrieval + memory | **Qdrant** (`src/lib/qdrant.ts`, `qdrantSearch.ts`, `qdrantMemory.ts`) when `QDRANT_URL` + `QDRANT_API_KEY` are set | Supabase + deterministic keyword/attribute scoring |
| Safety validation | **Enkrypt AI Guardrails** (`src/lib/enkrypt.ts`, `safetyValidator.ts`) when `ENKRYPT_API_KEY` is set | Gemini-based validator via Lovable AI Gateway |

The Supabase / Gemini paths are **fallbacks for demo resilience only**, not the primary claimed architecture.

### Files added
- `src/mastra/index.ts`, `src/mastra/agents/*.ts`, `src/mastra/workflows/*.ts`
- `src/lib/qdrant.ts`, `src/lib/qdrantSearch.ts`, `src/lib/qdrantMemory.ts`
- `src/lib/enkrypt.ts`, `src/lib/safetyValidator.ts`
- `src/lib/integrations-status.functions.ts`
- `src/routes/debug.integrations.tsx` — live status panel

### Run demo mode
No extra config. `bun install && bun run dev`. All three mandatory layers run through their adapters and fall back to Lovable Cloud services.

### Enable real Qdrant
1. Provision a Qdrant Cloud cluster and create a collection named `schemeseva_schemes`.
2. Upsert one point per scheme with payload `{ scheme_id, keywords, state_scope }` (mirroring the seeded rows).
3. Set `QDRANT_URL`, `QDRANT_API_KEY`, and optionally `QDRANT_COLLECTION`.
4. Restart. `/debug/integrations` shows Qdrant as `primary active`.

### Enable real Enkrypt AI
1. Get an API key from https://enkryptai.com.
2. Set `ENKRYPT_API_KEY` (and optionally `ENKRYPT_BASE_URL`).
3. Restart. Every generated report is validated by Enkrypt Guardrails; the report card shows `[enkrypt]` as the safety provider.

### Verify each integration
- Visit **`/debug/integrations`** — live status of Mastra, Qdrant, Enkrypt AI, Supabase, and Lovable AI Gateway.
- Run the agent on `/app`; the safety banner now includes `[enkrypt]` or `[fallback-gemini]` so judges can see which validator ran.
- Server logs surface `Retrieval=qdrant` vs `Retrieval=fallback-supabase-keyword` per session in the Qdrant memory summary.

### Notes on Mastra
The `mastra` npm package requires a Node runtime (worker_threads, filesystem watchers) not available in the Cloudflare Worker SSR environment this app deploys to. `src/mastra/` therefore mirrors Mastra's `Agent` / `Workflow` shape (`agent.run()`, `workflow.run()`, `.steps`) so the surface can be swapped for the real Mastra APIs on a Node host without touching any callers. Agent/workflow orchestration is real; only the runtime container is adapted.

### Enable Langfuse observability
1. Create a project at https://cloud.langfuse.com (or self-host).
2. Set `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and optionally `LANGFUSE_HOST`.
3. Restart. Traces for `workflow.schemeDiscovery`, `workflow.vigilance`, `privacy.delete`, and every agent span appear in Langfuse.
4. Without credentials the tracer is a no-op — the app never breaks.

### Enable Upstash Redis rate limiting
1. Create an Upstash Redis database and copy its REST URL + token.
2. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Restart. Limits: **10 discover / min / IP**, **3 vigilance simulate / min / IP**.
4. Without credentials the limiter is bypassed and `/debug/integrations` marks it as `fallback / disabled`.

### Right-to-erasure (privacy delete)
`DELETE /api/privacy/delete` with JSON `{ "sessionKey": "s_..." }` removes:
- The citizen's Qdrant memory point (if Qdrant is configured)
- All pending alerts for that session
- The session row itself

Frontend should clear `localStorage.schemeseva.session` after a 200 response.

### Fallbacks are demo resilience, not primary architecture
| Layer | Primary | Fallback (used only when primary is unconfigured) |
| --- | --- | --- |
| Orchestration | Mastra adapter (`src/mastra/`) | — (always active) |
| Retrieval + memory | Qdrant | Supabase + keyword scoring |
| Safety validation | Enkrypt AI Guardrails | Gemini-based validator via Lovable AI Gateway |
| Observability | Langfuse | No-op tracer |
| Rate limiting | Upstash Redis | Disabled (allow-all) |

### Final demo script (2 minutes)
1. Open `/app`, paste the Telangana farmer profile.
2. Show extracted profile + candidate schemes.
3. Show the report with `[enkrypt]` or `[fallback-gemini]` safety banner.
4. Click **Save profile** → confirms Supabase persistence.
5. Click **Simulate new scheme** to trigger the Vigilance Agent.
6. Open `/debug/integrations` — walk through the primary/fallback badges for the mandatory stack.
7. (Optional) `curl -X DELETE $URL/api/privacy/delete -d '{"sessionKey":"..."}'` to demo right-to-erasure.

## Qdrant seed (Phase 2)

Seed the `schemes`, `citizen_sessions`, and `pending_alerts` collections with vector embeddings:

```bash
bun run scripts/seed-qdrant.ts
```

Requires `QDRANT_URL`, `QDRANT_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and either `GEMINI_API_KEY` (preferred) or `LOVABLE_API_KEY` (gateway).

Verify at `/debug/integrations` — retrieval provider should read `qdrant-vector` and safety provider `enkrypt` when credentials are live.
---

## Mastra Five-Agent Workflow

SchemeSeva runs the submitted five-agent architecture through `src/mastra/`. In this Lovable/TanStack build the current mode is **Mastra adapter mode**, not the Node Mastra runtime, because the published environment does not expose the Node APIs required by the Mastra package. The adapter is explicit, typed, and verifiable: `agent.run()` and `workflow.run()` wrap the existing working server logic instead of duplicating it.

Agents:

- **Profile Agent** extracts a Zod-validated `CitizenProfile` from natural language and asks one clarification when critical fields are missing.
- **Discovery Agent** generates occupation, income, category, state, and gender/special-status query angles, then uses Qdrant first with Supabase keyword fallback.
- **Eligibility Agent** applies deterministic rules only. Hard-failed schemes are excluded.
- **Report Agent** writes an 8th-grade report using "likely eligible," with documents, steps, `sourceUrl`, `lastVerified`, and confidence.
- **Vigilance Agent** scans saved sessions against unseen schemes, validates alerts through Enkrypt/fallback safety, and stores pending alerts when Qdrant is configured.

How judges can verify it:

- Open `/debug/integrations` and check workflow mode, Qdrant retrieval provider, safety provider, vigilance availability, and last successful runs.
- Run `/app` and watch the five-agent loader: Extracting profile -> Searching verified schemes -> Checking eligibility criteria -> Generating report -> Safety check by Enkrypt AI.
- Inspect response metadata in the app/server response: `profileAgent`, `discoveryAgent`, `eligibilityAgent`, `reportAgent`, `safetyValidation`, and `vigilanceAgent` for the alert flow.

Demo script:

1. Open homepage.
2. Click Try the Agent.
3. Use farmer demo.
4. Watch five-agent loader.
5. Show report.
6. Point to retrieval and safety badges.
7. Point to `sourceUrl` and `lastVerified`.
8. Click Vigilance simulate.
9. Show proactive alert.
10. Say: "This is what myScheme does not do."
