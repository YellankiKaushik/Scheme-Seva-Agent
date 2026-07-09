# SchemeSeva Judge Guide

**Live Demo:** https://scheme-seva-agent.vercel.app/

SchemeSeva helps citizens find government schemes they may likely qualify for, then uses a Vigilance Agent to watch for new matching opportunities.

## 5-Minute Judging Path

1. Open the live demo.
2. Click **View 28 schemes** and confirm the catalog is Central + Telangana, with `sourceUrl` and `lastVerified`.
3. Open **Check integrations** or go to `/debug/integrations`.
4. Confirm cards for Mastra, Qdrant, Enkrypt AI, OpenRouter, Gemini, Langfuse, Upstash, and optional Supabase fallback.
5. Open **Launch agent** or go to `/app`.
6. Click the **Farmer** demo profile.
7. Click **Find schemes**.
8. Look for report badges:
   - `Retrieval: qdrant-vector`
   - `Memory: qdrant`
   - `Memory write: success`
   - `Safety: enkrypt`
   - `Workflow: adapter`
9. Confirm the report includes official source URLs and last verified dates.
10. Click **Run vigilance scan**.
11. Confirm the PM-KUSUM alert appears with `Safety: enkrypt`.

## Mandatory Stack Proof

| Requirement            | Where to verify                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Mastra orchestration   | `/architecture`, `/debug/integrations`, and `Workflow: adapter` badge in `/app` report |
| Qdrant retrieval       | `/debug/integrations` Qdrant card and `Retrieval: qdrant-vector` badge                 |
| Qdrant memory          | `/debug/integrations` memory provider and `Memory: qdrant` badge                       |
| Qdrant pending alerts  | Vigilance scan output and Qdrant alert diagnostics                                     |
| Enkrypt AI validation  | `/debug/integrations` Enkrypt card and `Safety: enkrypt` badges                        |
| OpenRouter reasoning   | `/debug/integrations` OpenRouter card                                                  |
| Gemini embeddings      | `/debug/integrations` Gemini card                                                      |
| Langfuse observability | `/debug/integrations` Langfuse card                                                    |
| Upstash rate limiting  | `/debug/integrations` Upstash card                                                     |

## Honest Limitation

SchemeSeva uses a Mastra-style TypeScript workflow adapter around server functions because the deployed runtime has constraints around running the full Mastra Node runtime. The adapter still routes through typed Profile, Discovery, Eligibility, Report, and Vigilance agents, and the UI/debug page makes this mode visible instead of hiding it.

## Why It Is Not Just A Chatbot

- It retrieves verified schemes through Qdrant.
- It remembers session context through Qdrant memory.
- It evaluates eligibility rules deterministically.
- It validates outputs through Enkrypt AI.
- It acts proactively through the Vigilance Agent.

## Future Scope

- More states and a larger verified catalog
- Multilingual support
- WhatsApp/SMS alerts
- NGO/field-worker dashboard
- Human-in-the-loop verification
- Assisted application workflows
