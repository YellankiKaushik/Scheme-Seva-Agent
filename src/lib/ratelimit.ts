// Upstash-backed rate limiting. Missing or unreachable Upstash falls back to
// allow-all so local demo mode and hackathon judging flows keep running.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitProvider = "upstash" | "noop";
export type RateLimitMode = "active" | "noop";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset?: number;
  provider: RateLimitProvider;
  mode: RateLimitMode;
  reason?: string;
  error?: string;
}

export interface RateLimitStatus {
  configured: boolean;
  credentialsSet: boolean;
  connected: boolean | null;
  reachable: boolean | null;
  provider: RateLimitProvider;
  mode: RateLimitMode;
  rateLimiting: RateLimitMode;
  discoveryLimit: string;
  vigilanceLimit: string;
  host?: string;
  error?: string;
}

const DISCOVERY_LIMIT = 10;
const VIGILANCE_LIMIT = 3;
const WINDOW_SECONDS = 60;
const WINDOW = "60 s";

let redisClient: Redis | null = null;
let discoveryLimiter: Ratelimit | null = null;
let vigilanceLimiter: Ratelimit | null = null;
let genericLimiters = new Map<string, Ratelimit>();

export function isUpstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export const upstashConfigured = isUpstashConfigured;

function upstashHost() {
  const raw = process.env.UPSTASH_REDIS_REST_URL;
  if (!raw) return undefined;
  try {
    return new URL(raw).host;
  } catch {
    return "configured-url-invalid";
  }
}

function getRedis() {
  if (!isUpstashConfigured()) return null;
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisClient;
}

function normalizeIdentity(identity?: string | null) {
  const clean = identity?.trim();
  return clean ? clean.slice(0, 160) : "local-dev";
}

function noopResult(limit: number, reason: string, error?: string): RateLimitResult {
  return {
    allowed: true,
    limit,
    remaining: limit,
    provider: "noop",
    mode: "noop",
    reason,
    error,
  };
}

function getLimiter(kind: "discovery" | "vigilance" | "generic", limit: number, windowSeconds = 60) {
  const redis = getRedis();
  if (!redis) return null;
  if (kind === "discovery") {
    discoveryLimiter ??= new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(DISCOVERY_LIMIT, WINDOW),
      analytics: false,
      prefix: "schemeseva:ratelimit:discovery",
    });
    return discoveryLimiter;
  }
  if (kind === "vigilance") {
    vigilanceLimiter ??= new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(VIGILANCE_LIMIT, WINDOW),
      analytics: false,
      prefix: "schemeseva:ratelimit:vigilance",
    });
    return vigilanceLimiter;
  }

  const key = `${limit}:${windowSeconds}`;
  let limiter = genericLimiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(limit, `${windowSeconds} s`),
      analytics: false,
      prefix: "schemeseva:ratelimit:generic",
    });
    genericLimiters.set(key, limiter);
  }
  return limiter;
}

async function checkRateLimit(
  kind: "discovery" | "vigilance" | "generic",
  identity: string,
  limit: number,
  windowSeconds = WINDOW_SECONDS,
): Promise<RateLimitResult> {
  if (!isUpstashConfigured()) return noopResult(limit, "upstash-not-configured");

  const limiter = getLimiter(kind, limit, windowSeconds);
  if (!limiter) return noopResult(limit, "upstash-not-configured");

  try {
    const result = await limiter.limit(normalizeIdentity(identity));
    return {
      allowed: result.success,
      limit: result.limit ?? limit,
      remaining: result.remaining ?? 0,
      reset: result.reset,
      provider: "upstash",
      mode: "active",
      reason: result.success ? undefined : "rate-limit-exceeded",
    };
  } catch (e) {
    return noopResult(limit, "upstash-unreachable", (e as Error).message);
  }
}

export function rateLimitIdentity(sessionKey?: string | null, ip?: string | null) {
  if (sessionKey && sessionKey !== "ssr") return `session:${normalizeIdentity(sessionKey)}`;
  if (ip && ip !== "anon") return `ip:${normalizeIdentity(ip)}`;
  return "local-dev";
}

export function checkDiscoveryRateLimit(identity: string): Promise<RateLimitResult> {
  return checkRateLimit("discovery", identity, DISCOVERY_LIMIT);
}

export function checkVigilanceRateLimit(identity: string): Promise<RateLimitResult> {
  return checkRateLimit("vigilance", identity, VIGILANCE_LIMIT);
}

export async function getRateLimitStatus(): Promise<RateLimitStatus> {
  const configured = isUpstashConfigured();
  const base: RateLimitStatus = {
    configured,
    credentialsSet: configured,
    connected: null,
    reachable: null,
    provider: configured ? "upstash" : "noop",
    mode: configured ? "active" : "noop",
    rateLimiting: configured ? "active" : "noop",
    discoveryLimit: `${DISCOVERY_LIMIT}/min`,
    vigilanceLimit: `${VIGILANCE_LIMIT}/min`,
    host: upstashHost(),
  };

  if (!configured) {
    return {
      ...base,
      connected: false,
      reachable: false,
      provider: "noop",
      mode: "noop",
      rateLimiting: "noop",
      error: "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN missing.",
    };
  }

  try {
    const pong = await getRedis()!.ping();
    const connected = typeof pong === "string" ? pong.toUpperCase() === "PONG" : Boolean(pong);
    return {
      ...base,
      connected,
      reachable: connected,
      provider: connected ? "upstash" : "noop",
      mode: connected ? "active" : "noop",
      rateLimiting: connected ? "active" : "noop",
      error: connected ? undefined : "Upstash ping did not return PONG.",
    };
  } catch (e) {
    return {
      ...base,
      connected: false,
      reachable: false,
      provider: "noop",
      mode: "noop",
      rateLimiting: "noop",
      error: (e as Error).message,
    };
  }
}

export async function upstashStatus() {
  return getRateLimitStatus();
}

/**
 * Compatibility helper for older call sites. Prefer checkDiscoveryRateLimit or
 * checkVigilanceRateLimit for named SchemeSeva workflows.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  return checkRateLimit("generic", key, limit, windowSeconds);
}
