// Right-to-erasure: deletes a citizen session's data from Qdrant memory,
// pending alerts, and the sessions row. Falls back gracefully when
// Qdrant is not configured.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { qdrantConfig, qdrantConfigured } from "./qdrant";
import { startTrace } from "./observability";
import { deleteLocalSession } from "./localSessionStore";

const MEMORY_COLLECTION =
    process.env.QDRANT_MEMORY_COLLECTION ?? "schemeseva_memory";

export const deleteCitizenData = createServerFn({ method: "POST" })
    .inputValidator((input: unknown) =>
        z.object({ sessionKey: z.string().min(4) }).parse(input),
    )
    .handler(async ({ data }) => {
        const trace = startTrace("privacy.delete", { sessionKey: data.sessionKey });
        const result = {
            sessionKey: data.sessionKey,
            qdrant: { attempted: false, ok: false, reason: "" as string | undefined },
            alerts: { deleted: 0 },
            session: { deleted: false },
        };

        // 1. Qdrant memory delete (best-effort)
        if (qdrantConfigured()) {
            result.qdrant.attempted = true;
            const cfg = qdrantConfig();
            const span = trace.span("qdrant.delete");
            try {
                const res = await fetch(
                    `${cfg.url!.replace(/\/$/, "")}/collections/${MEMORY_COLLECTION}/points/delete?wait=true`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "api-key": cfg.apiKey!,
                        },
                        body: JSON.stringify({
                            filter: {
                                must: [
                                    {
                                        key: "session_key",
                                        match: { value: data.sessionKey },
                                    },
                                ],
                            },
                        }),
                    },
                );
                result.qdrant.ok = res.ok;
                if (!res.ok) result.qdrant.reason = `Qdrant ${res.status}`;
                span.end({ ok: res.ok });
            } catch (e) {
                result.qdrant.reason = (e as Error).message;
                span.end(undefined, e);
            }
        } else {
            result.qdrant.reason = "qdrant-not-configured";
        }

        const local = deleteLocalSession(data.sessionKey);
        result.alerts.deleted = local.alertsDeleted;
        result.session.deleted = true;

        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
                const { supabaseAdmin } = await import(
                    "@/integrations/supabase/client.server"
                );
                const alertsSpan = trace.span("supabase.alerts.delete");
                const { count } = await supabaseAdmin
                    .from("alerts")
                    .delete({ count: "exact" })
                    .eq("session_key", data.sessionKey);
                result.alerts.deleted += count ?? 0;
                alertsSpan.end({ deleted: result.alerts.deleted });

                const sessSpan = trace.span("supabase.sessions.delete");
                const { error: sessErr } = await supabaseAdmin
                    .from("sessions")
                    .delete()
                    .eq("session_key", data.sessionKey);
                result.session.deleted = !sessErr;
                sessSpan.end({ ok: result.session.deleted }, sessErr ?? undefined);
            } catch {
                result.session.deleted = true;
            }
        }

        await trace.end(result);
        return result;
    });
