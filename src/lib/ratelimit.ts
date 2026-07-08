// Upstash Redis REST-based rate limiter. Uses fixed-window counters via
// INCR + EXPIRE. Falls back to allow-all when credentials are missing so
// the demo keeps working.

export interface RateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    provider: "upstash" | "fallback-none";
    reason?: string;
}

export function upstashConfigured(): boolean {
    return Boolean(
        process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
    );
}

export function upstashStatus() {
    return {
        configured: upstashConfigured(),
        url: process.env.UPSTASH_REDIS_REST_URL ?? null,
    };
}

async function upstashCmd(command: (string | number)[]): Promise<unknown> {
    const url = process.env.UPSTASH_REDIS_REST_URL!;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
    const res = await fetch(url.replace(/\/$/, ""), {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    return res.json();
}

/**
 * Fixed-window rate limit. `limit` requests per `windowSeconds` per `key`.
 */
export async function rateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
): Promise<RateLimitResult> {
    if (!upstashConfigured()) {
        return {
            allowed: true,
            limit,
            remaining: limit,
            provider: "fallback-none",
            reason: "upstash-not-configured",
        };
    }
    const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
    const rkey = `ratelimit:${key}:${bucket}`;
    try {
        const incr = (await upstashCmd(["INCR", rkey])) as { result: number };
        const count = incr.result;
        if (count === 1) {
            await upstashCmd(["EXPIRE", rkey, windowSeconds]);
        }
        return {
            allowed: count <= limit,
            limit,
            remaining: Math.max(0, limit - count),
            provider: "upstash",
        };
    } catch (e) {
        return {
            allowed: true,
            limit,
            remaining: limit,
            provider: "fallback-none",
            reason: (e as Error).message,
        };
    }
}
