# SchemeSeva — Product Requirements Document

## 1. Executive Summary
SchemeSeva is a TypeScript-native civic AI agent designed to bridge the discovery gap between Indian citizens and the government welfare schemes they may be eligible for. Unlike traditional reactive portals, SchemeSeva utilizes a multi-agent orchestration framework (Mastra) to provide conversational profile intake, semantic retrieval, rigorous eligibility reasoning, and proactive monitoring. By integrating Qdrant for persistent memory and Enkrypt AI for safety validation, the system ensures that recommendations are source-grounded, safe, and personalized. The core differentiator is the **Vigilance Agent**, which autonomously monitors new scheme launches and deadlines to alert citizens proactively.

## 2. Problem Statement
India manages over 3,000 central and state-level welfare schemes, yet a significant portion of the eligible population—particularly farmers, students, and small entrepreneurs—never claims these benefits. Current solutions like *myScheme* are reactive and form-based, requiring citizens to navigate complex jargon and proactively check for updates. The primary barriers are:
*   **Information Fragmentation:** Schemes are scattered across various ministry portals.
*   **Complexity:** Eligibility rules are difficult for laypeople to interpret.
*   **Reactive Discovery:** Citizens must remember to search for schemes; the system does not "find" the citizen.
*   **Trust Gap:** Fear of misinformation or "hallucinated" requirements in digital tools.

## 3. Goals & Objectives
*   **Discovery:** Enable users to discover relevant government schemes through natural language.
*   **Explainability:** Provide clear, plain-language reasoning for why a user may qualify.
*   **Actionability:** Deliver concrete document checklists and step-by-step application guidance.
*   **Trust & Safety:** Ground every recommendation in official data and validate all outputs via Enkrypt AI.
*   **Proactivity:** Transition from a "search tool" to an "agent" that monitors opportunities via the Vigilance Agent.
*   **Persistence:** Remember user context across sessions to provide a continuous service experience.

## 4. Target Users / Stakeholders
### 4.1 Primary Personas (MVP Focus)
*   **The Telangana Farmer:** Small-scale landholders (e.g., 2–5 acres) seeking agricultural subsidies and insurance.
*   **The Low-Income Student:** Students pursuing higher education requiring scholarships or fee reimbursements.
*   **The Woman Entrepreneur:** Individuals running micro-businesses looking for credit schemes like Mudra or Stand-Up India.

### 4.2 Secondary Stakeholders
*   **NGO Field Workers:** Using the tool to assist digitally illiterate citizens.
*   **Government Departments:** Benefiting from higher uptake of allocated welfare funds.

## 5. Functional Requirements
1.  **Natural Language Profile Intake:** Extract structured citizen data (age, income, occupation, etc.) from free-text descriptions.
2.  **Clarification Loops:** Automatically trigger follow-up questions if critical eligibility fields are missing.
3.  **Semantic Scheme Search:** Use vector embeddings to find schemes based on intent and context, not just keywords.
4.  **Metadata Filtering:** Narrow results by state (Telangana/Central), category (SC/ST/OBC/General), and benefit type.
5.  **Deterministic Eligibility Reasoning:** Validate profile data against specific scheme rules (income ceilings, age brackets).
6.  **Confidence Scoring:** Assign "High" or "Medium" confidence levels to matches based on data completeness.
7.  **Trust-Grounded Reporting:** Generate reports featuring official source URLs and "Last Verified" dates.
8.  **Safety Validation:** Pass 100% of citizen-facing text through Enkrypt AI before display.
9.  **Persistent Session Memory:** Store profiles in Qdrant to enable returning users to resume discovery.
10. **Proactive Vigilance Alerts:** Generate alerts for new scheme matches or upcoming deadlines without user initiation.

## 6. Non-Functional Requirements
*   **Reliability:** Use OpenRouter free auto-router to ensure LLM availability during high-traffic periods.
*   **Performance:** Target a full pipeline response time of under 30 seconds on Vercel.
*   **Safety:** Zero-tolerance for hallucinated scheme details or biased recommendations.
*   **Explainability:** All reports must be written at an 8th-grade reading level.
*   **Privacy:** No collection of sensitive PII (Aadhaar numbers, bank account details) in the MVP.
*   **Observability:** Full tracing of agent steps and token usage via Langfuse.
*   **Scalability:** Modular architecture capable of expanding from 50 to 1,000+ schemes.

## 7. System Architecture Overview
The system follows a multi-agent pipeline orchestrated by **Mastra**:
1.  **Profile Agent:** Parses input into a Zod-validated JSON profile.
2.  **Discovery Agent:** Generates semantic queries and retrieves candidates from Qdrant.
3.  **Eligibility Agent:** Scores candidates based on deterministic rules.
4.  **Report Agent:** Formats the final guidance with a "likely eligible" framing.
5.  **Vigilance Agent:** An autonomous background worker triggered by Vercel Cron to re-check saved profiles against new data.

## 8. Tech Stack
*   **Frontend:** Next.js 14, TypeScript, Tailwind CSS.
*   **Orchestration:** Mastra (@mastra/core).
*   **Vector Database:** Qdrant Cloud (Collections: `schemes`, `citizen_sessions`, `pending_alerts`).
*   **Reasoning LLM:** OpenRouter (Free Auto-Router for failover).
*   **Embedding Model:** Google Gemini (`gemini-embedding-001`).
*   **Safety Layer:** Enkrypt AI SDK.
*   **Observability:** Langfuse (OpenTelemetry tracing).
*   **Infrastructure:** Vercel (Hosting/Cron), Upstash (Redis for Rate Limiting).

## 9. Data Requirements
### 9.1 Schemes Collection Metadata
*   `scheme_id`, `title`, `ministry_or_department`, `central_or_state`, `state`, `benefit_type`, `benefit_amount`, `eligibility_criteria` (JSON), `required_documents`, `application_steps`, `official_url`, `last_verified_date`.

### 9.2 Citizen Sessions Collection
*   `session_id`, `structured_profile`, `previously_recommended_schemes`, `timestamp`, `last_scan_timestamp`.

## 10. API Specifications
*   `POST /api/discover`: Primary endpoint for profile intake and report generation.
*   `GET /api/schemes`: Endpoint for semantic search and direct scheme retrieval.
*   `POST /api/vigilance/run`: Trigger for the autonomous monitoring workflow.
*   `DELETE /api/privacy/delete`: GDPR/DPDP-compliant endpoint to purge user session data.

## 11. Security Requirements
*   **Rate Limiting:** Upstash Redis enforced sliding-window limits (e.g., 10 requests/min).
*   **Data Governance:** Right-to-erasure implementation for all persistent session data.
*   **OWASP Compliance:** Protection against prompt injection and broken access control.
*   **Environment Security:** All API keys stored server-side; no exposure to the client bundle.

## 12. Deployment & Infrastructure
*   **Cloud:** Vercel (Serverless functions).
*   **Automation:** Vercel Cron for daily Vigilance Agent scans (06:00 UTC).
*   **CI/CD:** GitHub integration for automated deployments.
*   **Seeding:** `ts-node` script to vectorize and upload curated JSON data to Qdrant.

## 13. Success Metrics
*   **Accuracy:** 100% of recommendations must include a valid `sourceUrl`.
*   **Safety:** 100% Enkrypt AI validation pass rate for delivered reports.
*   **Engagement:** Successful demonstration of a proactive alert via the Vigilance Agent.
*   **Latency:** End-to-end discovery in <30 seconds on production infrastructure.
*   **Coverage:** MVP dataset of 25–50 verified schemes (Central + Telangana).

## 14. Timeline & Milestones (8-Day Sprint)
*   **Day 1:** Project setup, Mastra skeleton, Qdrant collection creation.
*   **Day 2:** Curated dataset finalization (25–50 schemes).
*   **Day 3:** Data ingestion and semantic search tuning.
*   **Day 4:** Profile and Discovery Agent implementation.
*   **Day 5:** Eligibility reasoning logic and scoring.
*   **Day 6:** Report generation and Enkrypt AI integration.
*   **Day 7:** Vigilance Agent autonomous flow and UI polish.
*   **Day 8:** Final testing, documentation, and Vercel deployment.

## 15. Trust, Safety, and Verification
SchemeSeva provides **discovery and eligibility guidance**, not official government determinations.
*   **Enkrypt AI Checks:** Validates for hallucinations, factual inconsistency, demographic bias, toxicity, and overconfident claims.
*   **Mitigation Logic:** If Enkrypt flags an output, the system will:
    1.  Regenerate with stricter grounding.
    2.  Lower the confidence score.
    3.  Withhold unsupported details.
    4.  Display a prominent official verification disclaimer.
*   **Mandatory Citations:** Every scheme card must display the `sourceUrl` and `lastVerified` date.

## 16. Judging Criteria Mapping
*   **Mastra Integration (25%):** Demonstrated through a 5-agent chained workflow, custom tool calling (Qdrant/Eligibility), and branching logic for clarification loops.
*   **Qdrant Integration (20%):** High-quality semantic search and persistent "Citizen Memory" that powers the Vigilance Agent.
*   **Enkrypt AI Coverage (20%):** 100% coverage of citizen-facing outputs with automated regeneration on safety flags.
*   **Agent Output Quality (20%):** Source-grounded, plain-language reports with clear "likely eligible" framing and actionable steps.
*   **Problem Impact & Novelty (15%):** Addressing the "awareness gap" with a proactive agent that acts on the user's behalf.

## 17. Open Questions & Risks
*   **Data Staleness:** Government schemes change frequently. *Mitigation:* Prominent "Last Verified" dates and scheduled Vigilance re-checks.
*   **Eligibility Ambiguity:** Some rules are subjective. *Mitigation:* Use of "Medium Confidence" scores and directing users to official departments for final confirmation.
*   **LLM Timeouts:** Multi-agent chains can be slow. *Mitigation:* Optimized Vercel `maxDuration` and sequential loading indicators in the UI.