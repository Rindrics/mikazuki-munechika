import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";

const serviceName = process.env.OTEL_SERVICE_NAME || "mikazuki-munechika";

function getEnvironmentName(): string {
  // Vercel provides VERCEL_ENV: "production" | "preview" | "development"
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV;
  }
  // Local development
  return "local";
}

export const meterProvider = new MeterProvider({
  readers: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      exportIntervalMillis: 10000, // Export every 10 seconds
    }),
  ],
  resource: resourceFromAttributes({
    "service.name": serviceName,
    "deployment.environment": getEnvironmentName(),
  }),
});

// Create a meter for the application
export const meter = meterProvider.getMeter(serviceName);
