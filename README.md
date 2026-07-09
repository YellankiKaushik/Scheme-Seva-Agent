# SchemeSeva

**Find government schemes you may likely qualify for - and get alerted when new matches appear.**

SchemeSeva is an independent civic AI agent for discovering Indian government schemes, explaining likely eligibility in simple language, and proactively watching for new matching opportunities.

- **Live Demo:** https://scheme-seva-agent.vercel.app/
- **GitHub Repository:** https://github.com/YellankiKaushik/Scheme-Seva-Agent
- **Judge Guide:** [JUDGES_GUIDE.md](./JUDGES_GUIDE.md)

## One-Minute Overview

SchemeSeva helps citizens find government welfare schemes without needing to know which portal, ministry, or keyword to search first. A user shares basic profile details, the agent searches a verified Central + Telangana scheme catalog, checks rules, validates the output, and returns a source-grounded report with documents, next steps, source URLs, and last verified dates.

The differentiator is the **Vigilance Agent**. After the first discovery run, SchemeSeva can keep watch and alert the user when a new or unseen scheme appears that they may likely qualify for. That makes the project more than a chatbot: it retrieves, remembers, evaluates, reports, and acts.

## Problem Statement

Government scheme discovery is still hard for many citizens:

- Schemes are fragmented across central, state, ministry, and department portals.
- Eligibility rules are confusing and depend on age, income, location, category, occupation, documents, and special status.
- Citizens often miss benefits because they do not know what to search for.
- Existing portals are mostly reactive: the user must come back and search again.

## Solution

SchemeSeva provides a guided, source-grounded workflow:

- **Guided citizen profile:** Collects basic eligibility signals without collecting Aadhaar numbers or bank account numbers.
- **Source-grounded scheme discovery:** Searches a verified catalog of 28 Central + Telangana schemes.
- **Likely eligibility report:** Uses "likely eligible" guidance, not final-decision language.
- **Documents and next steps:** Shows what to prepare and where to continue.
- **Vigilance Agent:** Watches for new matching opportunities and validates alerts before display.

## Why This Is An AI Agent, Not A Chatbot

SchemeSeva is not a single prompt wrapped in a chat UI. It has coordinated agent behavior:

| Agent capability | SchemeSeva evidence                                                                    |
| ---------------- | -------------------------------------------------------------------------------------- |
| Retrieves        | Qdrant vector retrieval searches verified schemes semantically.                        |
| Remembers        | Qdrant session memory stores profile context by session key.                           |
| Evaluates        | Eligibility rules are checked deterministically before reporting.                      |
| Acts             | Vigilance Agent scans unseen schemes and creates proactive alerts.                     |
| Coordinates      | Profile, Discovery, Eligibility, Report, and Vigilance agents run as a typed workflow. |

## AI Workflow

1. **Profile Agent** structures state, district, age, gender, category, occupation, income, landholding, document status, and special conditions.
2. **Discovery Agent** retrieves candidate schemes from Qdrant vector search, with local keyword fallback for demo resilience.
3. **Eligibility Agent** checks hard rules such as state scope, age, gender, category, income, occupation, landholding, Aadhaar status, bank account status, and BPL status.
4. **Report Agent** produces a plain-language, source-grounded report with likely matches, reasons, documents, steps, source URLs, and last verified dates.
5. **Vigilance Agent** scans saved session memory against unseen schemes and raises proactive alerts when a new likely match appears.

## Mandatory Stack Integration

### Mastra - Agent Orchestration Layer

SchemeSeva exposes a Mastra-style architecture in `src/mastra/` with typed agents and workflows. Because the deployed runtime has constraints around running the full Mastra Node runtime, the app uses a **TypeScript workflow adapter** around SchemeSeva server functions.

This adapter is intentionally honest:

- Agents expose `run()` methods.
- Workflows expose `run()` and typed steps.
- The UI calls the workflow layer, not isolated one-off functions.
- The debug page reports the workflow mode so judges can see whether the app is running through the adapter/fallback path.

### Qdrant - Memory & Retrieval Layer

Qdrant is used for both retrieval and memory:

- **Scheme vector retrieval:** Semantic search over the verified scheme catalog.
- **Persistent session memory:** Stores citizen profile context and previously seen schemes.
- **Pending alert memory:** Stores or simulates proactive Vigilance alerts.

Collections used:

- `schemeseva_schemes`
- `citizen_sessions`
- `pending_alerts`

The app remains runnable in local demo mode if Qdrant is unavailable, and the UI/debug page makes fallback status visible.

### Enkrypt AI - Safety & Evaluation Layer

Enkrypt AI validates citizen-facing outputs:

- Discovery reports are checked before display.
- Vigilance alerts are checked before display.
- The app shows visible `Safety: enkrypt` badges when Enkrypt is active.
- If Enkrypt is unavailable, fallback status remains honest instead of being hidden.

### Supporting Stack

- **OpenRouter reasoning:** Profile extraction and report generation.
- **Gemini embeddings:** Embeddings for Qdrant semantic retrieval.
- **Langfuse observability:** Tracing and integration status visibility.
- **Upstash Redis rate limiting:** Discovery and Vigilance rate limiting.
- **Vercel deployment:** Hosted live app.
- **Supabase:** Optional fallback only; not required.

## Demo Walkthrough For Judges

1. Open the [Live Demo](https://scheme-seva-agent.vercel.app/).
2. Read the homepage hero and workflow summary.
3. Open `/schemes` and confirm **28 verified Central + Telangana schemes** with source URLs and last verified dates.
4. Open `/debug/integrations` and confirm the provider cards for Mastra, Qdrant, Enkrypt AI, OpenRouter, Gemini, Langfuse, Upstash, and optional Supabase fallback.
5. Open `/app`.
6. Click the **Farmer** demo profile.
7. Click **Find schemes**.
8. Confirm the report status badges:
   - `Retrieval: qdrant-vector`
   - `Memory: qdrant`
   - `Memory write: success`
   - `Safety: enkrypt`
   - `Workflow: adapter`
9. Confirm report cards and markdown include `sourceUrl` and `lastVerified`.
10. Click **Run vigilance scan**.
11. Confirm the PM-KUSUM alert appears with `Safety: enkrypt`.

## Evaluation Criteria Mapping

| Hackathon criterion        | SchemeSeva evidence                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Mastra Integration Depth   | Mastra-style typed workflow adapter with Profile, Discovery, Eligibility, Report, and Vigilance agents.                                   |
| Qdrant Integration Quality | Scheme vector retrieval, session memory, and pending alert memory through `schemeseva_schemes`, `citizen_sessions`, and `pending_alerts`. |
| Enkrypt AI Coverage        | Report validation and Vigilance alert validation before display, visible through safety badges.                                           |
| Agent Output Quality       | Source-grounded report with likely eligibility language, document lists, next steps, source URLs, and last verified dates.                |
| Problem Impact & Novelty   | Moves welfare discovery from reactive search to proactive watch-after-search alerts.                                                      |
| Engineering Quality        | TypeScript, TanStack Start, typed server functions, deterministic eligibility rules, fallbacks, and smoke tests.                          |
| User Experience            | Homepage, guided form, demo profiles, searchable catalog, report cards, and clear debug proof page.                                       |
| Documentation              | README plus concise judge guide and in-app architecture/debug pages.                                                                      |
| Live Demonstration         | Vercel deployment with `/app`, `/schemes`, `/architecture`, and `/debug/integrations`.                                                    |

## Screenshots / Proof

No screenshot files are currently committed in this repository.

Recommended screenshots to add before final submission:

- Homepage hero and workflow section
- `/schemes` catalog showing 28 schemes
- `/debug/integrations` provider cards
- `/app` report with status badges
- Vigilance alert showing PM-KUSUM and `Safety: enkrypt`

## Setup Instructions

Install dependencies:

```bash
pnpm install
```

Configure environment variables:

```bash
cp .env.example .env
```

Seed/index Qdrant for the full provider-backed demo:

```bash
pnpm seed:qdrant
```

Run locally:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Run smoke tests:

```bash
pnpm run smoke:local
```

## Environment Variables

Names only are listed here. Do not commit secret values.

### OpenRouter

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `SCHEMESEVA_SITE_URL`

### Gemini

- `GEMINI_API_KEY`
- `GEMINI_EMBEDDING_MODEL`

### Qdrant

- `QDRANT_URL`
- `QDRANT_API_KEY`
- `QDRANT_COLLECTION`
- `QDRANT_MEMORY_COLLECTION`
- `QDRANT_SESSIONS_COLLECTION`
- `QDRANT_ALERTS_COLLECTION`
- `QDRANT_VECTOR_SIZE`

### Enkrypt AI

- `ENKRYPT_API_KEY`
- `ENKRYPT_BASE_URL`

### Langfuse

- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_SECRET_KEY`
- `LANGFUSE_HOST`
- `LANGFUSE_BASE_URL`

### Upstash Redis

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Demo Mode

- `NEXT_PUBLIC_DEMO_MODE`
- `VITE_DEMO_MODE`

### Optional Supabase Fallback

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Verification Commands

```bash
pnpm typecheck
pnpm build
pnpm run smoke:local
pnpm audit
pnpm run lint
```

`pnpm run lint` is useful as a report-only check in the current repository because existing formatting/lint debt may be unrelated to feature behavior.

## Privacy And Safety

- No Aadhaar number is collected.
- No bank account number is collected.
- Reports are guidance only, not a government decision.
- Every result should be confirmed on official portals.
- User-facing language uses "likely eligible" or "may likely qualify."
- Source URLs and last verified dates remain visible.
- Local, Qdrant, and Enkrypt fallback states are kept honest in badges/debug output.

## Challenges Faced

- **Mastra runtime constraints:** The app uses a Mastra-style TypeScript adapter around server functions instead of overclaiming a full runtime path.
- **Qdrant vector memory design:** The system separates scheme retrieval, citizen session memory, and pending alert memory.
- **Enkrypt response schema handling:** Validation needed resilient parsing and fallback behavior without hiding safety status.
- **Careful eligibility language:** Reports had to stay helpful while avoiding final-decision or overconfident eligibility claims.
- **Vercel runtime differences:** The deployment needed provider fallbacks and debug checks that work across local and hosted environments.
- **Debug resilience:** `/debug/integrations` must show provider health without exposing secrets.

## Future Improvements

- Add more Indian states.
- Expand the verified scheme catalog.
- Add multilingual support.
- Add WhatsApp/SMS alerts.
- Build an NGO or field-worker dashboard.
- Add human-in-the-loop verification.
- Add assisted application workflows while keeping official portal confirmation.

## Security Notes

- Do not commit `.env`, `.env.local`, or secret values.
- Supabase remains optional and is not required for the demo.
- TanStack Start CSRF middleware and same-origin guards protect non-GET server requests.
- Production user accounts would require stronger auth/session hardening.
