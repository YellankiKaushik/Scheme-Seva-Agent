// Optional Qdrant memory for citizen sessions and pending vigilance alerts.
// The app also has a local in-memory fallback, so the demo keeps working with
// zero external dependencies.

import { qdrantConfig, qdrantConfigured } from "./qdrant";
import type { CitizenProfile } from "./schemeseva-types";

const SESSIONS_COLLECTION =
  process.env.QDRANT_SESSIONS_COLLECTION ??
  process.env.QDRANT_MEMORY_COLLECTION ??
  "citizen_sessions";

const ALERTS_COLLECTION = process.env.QDRANT_ALERTS_COLLECTION ?? "pending_alerts";

function hashToInt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

async function upsertPoint(collection: string, id: number, payload: unknown) {
  const cfg = qdrantConfig();
  const res = await fetch(
    `${cfg.url!.replace(/\/$/, "")}/collections/${collection}/points?wait=true`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", "api-key": cfg.apiKey! },
      body: JSON.stringify({ points: [{ id, payload }] }),
    },
  );
  return res.ok;
}

export async function rememberSession(
  sessionKey: string,
  profile: CitizenProfile,
  summary: string,
) {
  if (!qdrantConfigured()) return { stored: false, reason: "qdrant-not-configured" };
  try {
    const ok = await upsertPoint(SESSIONS_COLLECTION, hashToInt(sessionKey), {
      session_key: sessionKey,
      profile,
      summary,
      updated_at: new Date().toISOString(),
    });
    return { stored: ok, collection: SESSIONS_COLLECTION };
  } catch (e) {
    return { stored: false, reason: (e as Error).message };
  }
}

export async function rememberAlert(alert: {
  id: string;
  sessionKey: string;
  schemeId: string;
  schemeName: string;
  reason: string;
  urgency: string;
}) {
  if (!qdrantConfigured()) return { stored: false, reason: "qdrant-not-configured" };
  try {
    const ok = await upsertPoint(ALERTS_COLLECTION, hashToInt(alert.id), {
      ...alert,
      created_at: new Date().toISOString(),
    });
    return { stored: ok, collection: ALERTS_COLLECTION };
  } catch (e) {
    return { stored: false, reason: (e as Error).message };
  }
}
