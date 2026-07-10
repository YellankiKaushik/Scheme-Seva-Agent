# SchemeSeva Judge Guide

**Live demo:** https://scheme-seva-agent.vercel.app/

**Repository:** https://github.com/YellankiKaushik/Scheme-Seva-Agent

**Tagline:** Find government schemes you may likely qualify for - and get alerted when new matches appear.

SchemeSeva is a TypeScript-native civic AI agent for source-grounded government scheme discovery. It uses a guided no-login demo flow, 28 verified Central + Telangana schemes, Qdrant retrieval and memory, Enkrypt AI validation, and a Vigilance Agent that can alert when a new matching scheme appears.

## 5-Minute Judging Path

1. Open the live demo.
2. Click **View 28 schemes** or open `/schemes`.
3. Confirm the catalog is Central + Telangana and includes `sourceUrl` and `lastVerified`.
4. Open **Check integrations** or go to `/debug/integrations`.
5. Confirm cards for Mastra, Qdrant, Enkrypt AI, OpenRouter, Gemini, Langfuse, Upstash, and optional Supabase fallback.
6. Open **Launch agent** or go to `/app`.
7. Click the **Farmer** demo profile.
8. Click **Find schemes**.
9. Look for report badges such as `Retrieval: qdrant-vector`, `Memory: qdrant`, `Memory write: success`, `Safety: enkrypt`, and `Workflow: adapter` when live providers are active.
10. Confirm the report includes official source URLs and last verified dates.
11. Click **Run vigilance scan**.
12. Confirm the PM-KUSUM alert appears with `Safety: enkrypt` when Enkrypt is active.

## Mandatory Stack Proof

| Requirement | Where to verify |
| --- | --- |
| Mastra orchestration | `/architecture`, `/debug/integrations`, `Workflow: adapter`, and `src/mastra` |
| Qdrant retrieval | `/debug/integrations` Qdrant card and `Retrieval: qdrant-vector` badge |
| Qdrant memory | `Memory: qdrant`, `Memory write: success`, and `citizen_sessions` integration |
| Qdrant pending alerts | Vigilance scan output and `pending_alerts` memory diagnostics |
| Enkrypt AI validation | `/debug/integrations` Enkrypt card and `Safety: enkrypt` badges |
| OpenRouter reasoning | `/debug/integrations` OpenRouter card |
| Gemini embeddings | `/debug/integrations` Gemini card and Qdrant vector retrieval path |
| Langfuse observability | `/debug/integrations` Langfuse card |
| Upstash rate limiting | `/debug/integrations` Upstash card |

## Honest Implementation Notes

- SchemeSeva uses a **Mastra-style TypeScript workflow adapter** around server functions because the deployed runtime has constraints around the full Mastra Node runtime.
- The current scheme catalog contains **28 verified Central + Telangana schemes**, not a full national database.
- The app uses a demo/browser session key, not production user accounts.
- Reports are guidance only and use **likely eligible** / **may likely qualify** wording.
- Citizens must confirm final eligibility and application steps on official portals.
- The app does not collect Aadhaar numbers or bank account numbers.
- The app does not automatically submit applications.
- Supabase is optional fallback only and is not required for the demo.

## Why It Is Not Just A Chatbot

- It retrieves verified schemes through Qdrant.
- It remembers session context through Qdrant memory.
- It evaluates eligibility rules deterministically.
- It validates outputs through Enkrypt AI.
- It acts proactively through the Vigilance Agent.

## Supporting Docs

- [README.md](../README.md) - judge-friendly project overview.
- [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md) - detailed technical report draft.
- `/architecture` - in-app architecture explanation.
- `/debug/integrations` - live provider status without secrets.
