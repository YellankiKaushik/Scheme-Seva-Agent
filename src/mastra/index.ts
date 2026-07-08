// Mastra orchestration adapter. This module exposes the SchemeSeva five-agent
// pipeline as a Mastra-style workflow. It intentionally wraps the existing,
// battle-tested server functions from `src/lib/schemeseva.functions.ts` and
// `src/lib/schemeseva-eligibility.ts` — no logic duplication.
//
// Why an adapter (and not a hard dependency on the `mastra` npm package):
// the Mastra runtime depends on Node-only APIs (worker_threads, child_process,
// filesystem watchers) that are not available in the Cloudflare Worker SSR
// runtime this app deploys to. The adapter mirrors Mastra's Agent/Workflow
// shape (`.run`, `.step`) so the surface can be swapped for real Mastra
// APIs in a Node deployment without touching callers.

import {
  schemeDiscoveryWorkflow,
  type SchemeDiscoveryInput,
  type SchemeDiscoveryResult,
} from "./workflows/schemeDiscoveryWorkflow";
import {
  vigilanceWorkflow,
  type VigilanceInput,
  type VigilanceResult,
} from "./workflows/vigilanceWorkflow";
import { profileAgent } from "./agents/profileAgent";
import { discoveryAgent } from "./agents/discoveryAgent";
import { eligibilityAgent } from "./agents/eligibilityAgent";
import { reportAgent } from "./agents/reportAgent";
import { vigilanceAgent } from "./agents/vigilanceAgent";

export const mastra = {
  name: "schemeseva",
  agents: {
    profile: profileAgent,
    discovery: discoveryAgent,
    eligibility: eligibilityAgent,
    report: reportAgent,
    vigilance: vigilanceAgent,
  },
  workflows: {
    schemeDiscovery: schemeDiscoveryWorkflow,
    vigilance: vigilanceWorkflow,
  },
  async runSchemeDiscovery(input: SchemeDiscoveryInput): Promise<SchemeDiscoveryResult> {
    return schemeDiscoveryWorkflow.run(input);
  },
  async runVigilance(input: VigilanceInput): Promise<VigilanceResult> {
    return vigilanceWorkflow.run(input);
  },
};

export function mastraStatus() {
  return {
    configured: true,
    mode: "adapter" as const,
    runtime: "adapter" as const,
    realRuntimeAvailable: false,
    reason:
      "Mastra API surface implemented as an adapter around the SchemeSeva server functions. The `mastra` npm package requires a Node runtime; this project runs on Cloudflare Workers, so the adapter mirrors Agent/Workflow shape and can be swapped for real Mastra APIs on a Node host.",
    agents: Object.keys(mastra.agents),
    workflows: Object.keys(mastra.workflows),
    workflowMode:
      "Profile Agent -> Discovery Agent -> Eligibility Agent -> Report Agent -> Safety validation",
    vigilanceMode:
      "Vigilance Agent -> saved sessions/schemes -> eligibility scan -> Enkrypt/fallback validation -> alerts",
  };
}
