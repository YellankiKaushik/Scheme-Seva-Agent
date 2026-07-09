// Optional Qdrant memory for citizen sessions and pending vigilance alerts.
// The app also has a local in-memory fallback, so the demo keeps working with
// zero external dependencies.

import { embedText } from "./embeddings";
import { qdrantConfig, qdrantConfigured } from "./qdrant";
import type { CitizenProfile, EligibilityResult } from "./schemeseva-types";

const SESSIONS_COLLECTION =
  process.env.QDRANT_SESSIONS_COLLECTION ?? process.env.QDRANT_MEMORY_COLLECTION ?? "citizen_sessions";

const ALERTS_COLLECTION = process.env.QDRANT_ALERTS_COLLECTION ?? "pending_alerts";
const VECTOR_SIZE = parseInt(process.env.QDRANT_VECTOR_SIZE ?? "768", 10);

export type MemoryWriteStatus = "success" | "failed" | "skipped-local";

export interface SessionMemoryResult {
  stored: boolean;
  collection?: string;
  provider: "qdrant" | "local";
  memoryWrite: MemoryWriteStatus;
  reason?: string;
}

function hashToInt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function devLog(message: string, data: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[SchemeSeva memory] ${message}`, data);
  }
}

function maskSessionId(sessionKey: string): string {
  return `${sessionKey.slice(0, 6)}...`;
}

function deterministicVector(text: string, size = VECTOR_SIZE): number[] {
  let seed = hashToInt(text) || 1;
  const vector: number[] = [];
  for (let i = 0; i < size; i++) {
    seed = Math.imul(seed ^ (i + 1), 1664525) + 1013904223;
    const value = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    vector.push(Number(value.toFixed(6)));
  }
  return vector;
}

async function sessionVector(summary: string): Promise<number[]> {
  const embedded = await embedText(summary);
  if (embedded?.length === VECTOR_SIZE) return embedded;
  return deterministicVector(summary);
}

function safeProfile(profile: CitizenProfile): CitizenProfile {
  return {
    state: profile.state,
    district: profile.district,
    age: profile.age,
    gender: profile.gender,
    category: profile.category,
    annualIncome: profile.annualIncome,
    occupation: profile.occupation,
    landAcres: profile.landAcres,
    familySize: profile.familySize,
    hasAadhaar: profile.hasAadhaar,
    hasBankAccount: profile.hasBankAccount,
    hasBPL: profile.hasBPL,
    isBPL: profile.isBPL,
    isDisabled: profile.isDisabled,
    disability: profile.disability,
    isWidow: profile.isWidow,
    isMinority: profile.isMinority,
    notes: profile.notes,
  };
}

async function upsertPoint(collection: string, id: number, vector: number[], payload: unknown) {
  const cfg = qdrantConfig();
  const res = await fetch(
    `${cfg.url!.replace(/\/$/, "")}/collections/${collection}/points?wait=true`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", "api-key": cfg.apiKey! },
      body: JSON.stringify({ points: [{ id, vector, payload }] }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Qdrant memory ${res.status}: ${body.slice(0, 160)}`);
  }
  return true;
}

export async function rememberSession(
  sessionKey: string,
  profile: CitizenProfile,
  summary: string,
  foundSchemes: EligibilityResult[] = [],
  retrievalProvider?: string,
  safetyProvider?: string,
): Promise<SessionMemoryResult> {
  devLog("rememberSession called", {
    collection: SESSIONS_COLLECTION,
    sessionId: maskSessionId(sessionKey),
  });
  if (!qdrantConfigured()) {
    devLog("rememberSession skipped", {
      collection: SESSIONS_COLLECTION,
      sessionId: maskSessionId(sessionKey),
      reason: "qdrant-not-configured",
    });
    return {
      stored: false,
      provider: "local",
      memoryWrite: "skipped-local",
      reason: "qdrant-not-configured",
    };
  }
  try {
    const timestamp = new Date().toISOString();
    const vectorText = [
      profile.state,
      profile.district,
      profile.age,
      profile.gender,
      profile.category,
      profile.occupation,
      profile.annualIncome,
      profile.landAcres,
      summary,
    ]
      .filter((value) => value != null && value !== "")
      .join(" | ");
    const vector = await sessionVector(vectorText);
    const ok = await upsertPoint(SESSIONS_COLLECTION, hashToInt(sessionKey), vector, {
      sessionId: sessionKey,
      session_key: sessionKey,
      profile: safeProfile(profile),
      foundSchemes,
      found_schemes: foundSchemes,
      summary,
      retrievalProvider,
      retrieval_provider: retrievalProvider,
      safetyProvider,
      safety_provider: safetyProvider,
      timestamp,
      lastScanTimestamp: timestamp,
      updated_at: timestamp,
      last_scan_at: timestamp,
    });
    devLog("rememberSession success", {
      collection: SESSIONS_COLLECTION,
      sessionId: maskSessionId(sessionKey),
    });
    return {
      stored: ok,
      collection: SESSIONS_COLLECTION,
      provider: "qdrant",
      memoryWrite: "success",
    };
  } catch (e) {
    devLog("rememberSession failed", {
      collection: SESSIONS_COLLECTION,
      sessionId: maskSessionId(sessionKey),
      reason: (e as Error).message,
    });
    return {
      stored: false,
      collection: SESSIONS_COLLECTION,
      provider: "qdrant",
      memoryWrite: "failed",
      reason: (e as Error).message,
    };
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
    const vector = deterministicVector(`${alert.schemeName} ${alert.reason} ${alert.urgency}`);
    const ok = await upsertPoint(ALERTS_COLLECTION, hashToInt(alert.id), vector, {
      ...alert,
      created_at: new Date().toISOString(),
    });
    return { stored: ok, collection: ALERTS_COLLECTION };
  } catch (e) {
    return { stored: false, reason: (e as Error).message };
  }
}
