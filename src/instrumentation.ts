import { metrics } from "@opentelemetry/api";
import * as Sentry from "@sentry/nextjs";
import { meterProvider, meter } from "./lib/meter-provider";

const errorCounter = meter.createCounter("http_request_errors_total", {
  description: "Total HTTP request errors",
});

export async function register() {
  console.log("Initializing OpenTelemetry Metrics...");

  // Register metrics
  metrics.setGlobalMeterProvider(meterProvider);

  // Sentry initialization
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError: typeof Sentry.captureRequestError = (
  error,
  request,
  context
) => {
  // Send to Sentry
  Sentry.captureRequestError(error, request, context);

  // Record error metric
  errorCounter.add(1, {
    path: request.path,
    route: context.routePath,
  });
};

// Export meterProvider for manual flush in Route Handlers
export { meterProvider };
