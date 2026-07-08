// Qdrant client adapter. Uses Qdrant REST API directly (no SDK dep) so it
// works in the Cloudflare Worker runtime. Falls back gracefully when
// credentials are not configured.

export interface QdrantStatus {
  configured: boolean;
  url: string | null;
  collection: string;
  reachable?: boolean;
  error?: string;
}

const COLLECTION = process.env.QDRANT_COLLECTION ?? "schemeseva_schemes";

export function qdrantConfigured(): boolean {
  return Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY);
}

export function qdrantConfig() {
  return {
    url: process.env.QDRANT_URL ?? null,
    apiKey: process.env.QDRANT_API_KEY ?? null,
    collection: COLLECTION,
  };
}

async function qFetch(path: string, init?: RequestInit) {
  const { url, apiKey } = qdrantConfig();
  if (!url || !apiKey) throw new Error("Qdrant not configured");
  const res = await fetch(`${url.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Qdrant ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function qdrantStatus(): Promise<QdrantStatus> {
  const cfg = qdrantConfig();
  if (!qdrantConfigured()) {
    return { configured: false, url: null, collection: cfg.collection };
  }
  try {
    await qFetch(`/collections/${cfg.collection}`);
    return { configured: true, url: cfg.url, collection: cfg.collection, reachable: true };
  } catch (e) {
    return {
      configured: true,
      url: cfg.url,
      collection: cfg.collection,
      reachable: false,
      error: (e as Error).message,
    };
  }
}

export const qdrant = { qFetch, qdrantConfigured, qdrantConfig, qdrantStatus };
