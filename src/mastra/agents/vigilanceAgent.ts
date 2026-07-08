// Mastra-style Vigilance Agent. Wraps runVigilance server fn.
import { runVigilance } from "@/lib/schemeseva.functions";

export const vigilanceAgent = {
  name: "VigilanceAgent",
  description:
    "Autonomously scans a saved citizen session against unseen schemes, runs deterministic eligibility and Enkrypt/fallback safety validation, then emits proactive alerts.",
  async run(sessionKey: string) {
    return runVigilance({ data: { sessionKey } });
  },
};
