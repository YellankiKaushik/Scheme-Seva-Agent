import { createStart, createMiddleware, createCsrfMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const csrfMiddleware = createMiddleware().server(async ({ next, request }) => {
  const method = request.method.toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const origin = request.headers.get("origin");
    if (origin) {
      const requestUrl = new URL(request.url);
      const originUrl = new URL(origin);
      if (originUrl.host !== requestUrl.host) {
        return new Response("Cross-site request blocked", { status: 403 });
      }
    }
  }
  return next();
});

const tanstackCsrfMiddleware = createCsrfMiddleware({
  filter: ({ request }) => !["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase()),
  allowRequestsWithoutOriginCheck: true,
  failureResponse: new Response("Cross-site request blocked", { status: 403 }),
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [tanstackCsrfMiddleware, csrfMiddleware, errorMiddleware],
}));
