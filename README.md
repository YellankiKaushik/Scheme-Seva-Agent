# SchemeSeva

SchemeSeva is an independent TypeScript civic AI agent for discovering Indian government schemes a citizen is **likely eligible** for. It uses a five-agent workflow: profile extraction, scheme discovery, deterministic eligibility, grounded report generation, and proactive vigilance alerts.

The app can run locally in demo mode with a built-in verified scheme catalog. External services improve retrieval, safety, observability, and persistence, but they are not required for the basic demo flow.

## Stack

| Layer | Primary | Fallback |
| --- | --- | --- |
| Orchestration | Mastra-style typed adapter in `src/mastra/` | Always active |
| Reasoning | OpenRouter (`OPENROUTER_API_KEY`) | Local grounded profile/report fallback |
| Embeddings | Google Gemini (`GEMINI_API_KEY`) | Keyword/attribute retrieval |
| Retrieval + memory | Qdrant (`QDRANT_URL`, `QDRANT_API_KEY`) | Local static scheme catalog + in-memory session store |
| Safety | Enkrypt AI (`ENKRYPT_API_KEY`) | OpenRouter validator or passthrough in demo mode |
| Observability | Langfuse | No-op tracer |
| Rate limiting | Upstash Redis | Allow-all local fallback |
| Optional persistence | Supabase | Not required |

## Run Locally

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env` when enabling external providers. For the default local demo, `NEXT_PUBLIC_DEMO_MODE=true` is enough.

## Environment Variables

Primary:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `GEMINI_API_KEY`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `ENKRYPT_API_KEY`
- `ENKRYPT_BASE_URL`
- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_SECRET_KEY`
- `LANGFUSE_HOST`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_DEMO_MODE=true`

Optional fallback only:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Mastra Five-Agent Workflow

SchemeSeva exposes the submitted architecture through `src/mastra/`. The current build uses **adapter mode** because the deployment runtime is not a full Node Mastra runtime. The adapter is typed and verifiable: agents expose `run()`, workflows expose `run()` and `steps`, and callers route through those workflows.

- **Profile Agent** extracts a Zod-validated `CitizenProfile` and asks one clarification if critical fields are missing.
- **Discovery Agent** creates occupation, income, category, state, and special-status query angles, then uses Qdrant or local keyword fallback.
- **Eligibility Agent** applies deterministic rules. Hard-failed schemes are excluded.
- **Report Agent** writes plain-language guidance using “likely eligible,” official links, last verified dates, document lists, and confidence.
- **Vigilance Agent** scans saved sessions against unseen schemes and returns proactive alerts after safety validation.

## Verify

- `/` homepage
- `/app` five-agent discovery flow
- `/schemes` browse catalog
- `/architecture` stack and workflow explanation
- `/debug/integrations` provider status

Expected debug signals:

- OpenRouter configured/missing
- Gemini embeddings configured/missing
- Qdrant connected/fallback
- Enkrypt connected/fallback
- Langfuse configured/missing
- Upstash configured/missing
- Supabase optional fallback configured/missing
- Demo mode on/off

## Demo Script

1. Open homepage.
2. Click Try the Agent.
3. Use the farmer demo.
4. Watch the five-agent loader.
5. Show the report.
6. Point to retrieval and safety badges.
7. Point to `sourceUrl` and `lastVerified`.
8. Click Vigilance simulate.
9. Show proactive alert.
10. Say: “This is what myScheme does not do.”

## Verification Commands

```bash
pnpm install
pnpm exec tsc --noEmit
pnpm build
```

## Security Notes

- Do not commit `.env` or `.env.local`.
- Server function CSRF protection is still a TODO for production hardening.
- SchemeSeva provides discovery guidance, not official eligibility approval.
