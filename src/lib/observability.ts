// Langfuse observability adapter. Uses the Langfuse REST ingestion API
// directly so it works in the Cloudflare Worker runtime without pulling
// the Node-only SDK. Falls back to a no-op tracer when credentials are
// missing, so the app never breaks.

export interface TraceHandle {
    id: string;
    name: string;
    startedAt: number;
    span(name: string, input?: unknown): SpanHandle;
    end(output?: unknown, error?: unknown): Promise<void>;
}

export interface SpanHandle {
    id: string;
    end(output?: unknown, error?: unknown): void;
}

export function langfuseConfigured(): boolean {
    return Boolean(
        process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY,
    );
}

export function langfuseStatus() {
    return {
        configured: langfuseConfigured(),
        host: process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com",
    };
}

function rid() {
    return (
        "t_" + Math.random().toString(36).slice(2) + Date.now().toString(36)
    );
}

async function ingest(events: unknown[]) {
    if (!langfuseConfigured()) return;
    const host = process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com";
    const auth =
        "Basic " +
        btoa(
            `${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`,
        );
    try {
        await fetch(`${host.replace(/\/$/, "")}/api/public/ingestion`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: auth },
            body: JSON.stringify({ batch: events }),
        });
    } catch {
        // no-op: observability must never break the request
    }
}

export function startTrace(name: string, input?: unknown): TraceHandle {
    const traceId = rid();
    const startedAt = Date.now();
    const pendingSpans: unknown[] = [];

    const handle: TraceHandle = {
        id: traceId,
        name,
        startedAt,
        span(spanName, spanInput) {
            const spanId = rid();
            const spanStart = new Date().toISOString();
            return {
                id: spanId,
                end(output, error) {
                    pendingSpans.push({
                        id: rid(),
                        type: "span-create",
                        timestamp: new Date().toISOString(),
                        body: {
                            id: spanId,
                            traceId,
                            name: spanName,
                            startTime: spanStart,
                            endTime: new Date().toISOString(),
                            input: spanInput,
                            output,
                            level: error ? "ERROR" : "DEFAULT",
                            statusMessage: error ? String(error) : undefined,
                        },
                    });
                },
            };
        },
        async end(output, error) {
            if (!langfuseConfigured()) return;
            const events = [
                {
                    id: rid(),
                    type: "trace-create",
                    timestamp: new Date().toISOString(),
                    body: {
                        id: traceId,
                        name,
                        input,
                        output,
                        metadata: {
                            durationMs: Date.now() - startedAt,
                            error: error ? String(error) : undefined,
                        },
                    },
                },
                ...pendingSpans,
            ];
            await ingest(events);
        },
    };
    return handle;
}
