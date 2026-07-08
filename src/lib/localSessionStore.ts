import type { CitizenProfile, EligibilityResult } from "./schemeseva-types";

export interface StoredSession {
  sessionKey: string;
  profile: CitizenProfile;
  foundSchemes: EligibilityResult[];
  reportMarkdown?: string;
  safetyStatus?: string;
  updatedAt: string;
  lastScanAt?: string;
}

export interface StoredAlert {
  id: string;
  sessionKey: string;
  schemeId: string;
  schemeName: string;
  reason: string;
  urgency: string;
  createdAt: string;
}

const sessions = new Map<string, StoredSession>();
const alerts: StoredAlert[] = [];

export function saveLocalSession(session: Omit<StoredSession, "updatedAt">) {
  sessions.set(session.sessionKey, {
    ...session,
    updatedAt: new Date().toISOString(),
  });
}

export function getLocalSession(sessionKey: string): StoredSession | null {
  return sessions.get(sessionKey) ?? null;
}

export function deleteLocalSession(sessionKey: string) {
  sessions.delete(sessionKey);
  const before = alerts.length;
  for (let i = alerts.length - 1; i >= 0; i--) {
    if (alerts[i].sessionKey === sessionKey) alerts.splice(i, 1);
  }
  return { alertsDeleted: before - alerts.length };
}

export function saveLocalAlert(alert: Omit<StoredAlert, "createdAt">) {
  const stored = { ...alert, createdAt: new Date().toISOString() };
  alerts.push(stored);
  return stored;
}

export function latestLocalDiscoveryRun(): string | null {
  return (
    Array.from(sessions.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
      ?.updatedAt ?? null
  );
}

export function latestLocalVigilanceRun(): string | null {
  return alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.createdAt ?? null;
}
