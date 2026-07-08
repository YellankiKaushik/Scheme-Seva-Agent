// Raw HTTP endpoint for DELETE /api/privacy/delete. Delegates to the
// deleteCitizenData server function. Accepts { sessionKey } as JSON.

import { createFileRoute } from "@tanstack/react-router";
import { deleteCitizenData } from "@/lib/privacy.functions";

async function handleDelete(request: Request): Promise<Response> {
  let sessionKey = "";
  try {
    const body = (await request.json()) as { sessionKey?: string };
    sessionKey = body.sessionKey ?? "";
  } catch {
    // ignore
  }
  if (!sessionKey || sessionKey.length < 4) {
    return Response.json({ ok: false, error: "sessionKey required" }, { status: 400 });
  }
  try {
    const result = await deleteCitizenData({ data: { sessionKey } });
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/privacy/delete")({
  server: {
    handlers: {
      DELETE: async ({ request }) => handleDelete(request),
      // Convenience alias for browser clients that can't send DELETE bodies.
      POST: async ({ request }) => handleDelete(request),
    },
  },
});
