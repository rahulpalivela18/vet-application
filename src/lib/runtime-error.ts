type RuntimeErrorContext = Record<string, unknown>;

/**
 * Reports an error caught by a React error boundary or route error component.
 * Logs to the console with the current route for easier debugging.
 */
export function reportRuntimeError(error: unknown, context: RuntimeErrorContext = {}) {
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const route = typeof window !== "undefined" ? window.location.pathname : undefined;

  console.error("[runtime-error]", message, { route, ...context }, stack ? { stack } : {});
}
