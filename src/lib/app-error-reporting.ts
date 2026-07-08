type AppErrorOptions = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

type AppEvents = {
  captureException?: (error: unknown, options?: AppErrorOptions) => void;
};

declare global {
  interface Window {
    __schemeSevaEvents?: AppEvents;
  }
}

export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__schemeSevaEvents?.captureException?.(error, {
    tags: { component: "tanstack-route-boundary" },
    extra: context,
  });
}
