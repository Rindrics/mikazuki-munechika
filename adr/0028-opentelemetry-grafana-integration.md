# ADR 0028: OpenTelemetry and Grafana Integration

## Status

Proposed

## Context

We want to improve the observability of this Next.js application by sending telemetry data to Grafana.

### Requirements

1. **Vercel environment** (production, preview): Send telemetry to Grafana Cloud
2. **Local environment**: Send telemetry to local Grafana container
3. **Protocol**: Use OpenTelemetry (OTel)
4. **Coexistence with Sentry**: Continue using existing Sentry for error tracking

### Current State

- Sentry is already deployed (error tracking, Session Replay)
- Structured logger is implemented (ADR 0008)
- Grafana startup script exists in `package.json`
- ADR 0008 considers OpenTelemetry migration as a future option

### Vercel Environment Specifics

In Vercel's serverless environment, standard OpenTelemetry SDK configuration may not work correctly. Vercel provides its own `@vercel/otel` package, which enables proper integration with Vercel's infrastructure.

## Decision

### 1. OTel SDK Selection

**Use `@vercel/otel` for both Vercel and local environments.**

Rationale:
- `@vercel/otel` is required for Vercel environment
- Using the same SDK locally maintains code consistency
- `@vercel/otel` wraps the standard OpenTelemetry SDK internally and supports destination switching via `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable

### 2. Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         Next.js App                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  instrumentation.ts                                             │ │
│  │  - OTel SDK initialization via @vercel/otel                     │ │
│  │  - Sentry initialization (existing)                             │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
         ┌─────────────────────┴─────────────────────┐
         │                                           │
         ▼                                           ▼
┌─────────────────────┐                   ┌─────────────────────┐
│   Vercel Env        │                   │   Local Env         │
│                     │                   │                     │
│  Vercel OTel        │                   │  Next.js Process    │
│  Collector          │                   │  (OTLP Exporter)    │
│         │           │                   │         │           │
│         ▼           │                   │         ▼           │
│  Grafana Cloud      │                   │  OTel Collector     │
│  (OTLP endpoint)    │                   │  → Jaeger (:16686)  │
└─────────────────────┘                   └─────────────────────┘
```

### 3. Environment-specific Configuration

| Environment | `OTEL_EXPORTER_OTLP_ENDPOINT` | Auth | Visualization |
|-------------|-------------------------------|------|---------------|
| Vercel (production) | Grafana Cloud OTLP endpoint | API Key (env var) | Grafana Cloud |
| Vercel (preview) | Grafana Cloud OTLP endpoint | API Key (env var) | Grafana Cloud |
| Local | `http://localhost:4318` | None | Jaeger (:16686) |

### 4. Local Environment Infrastructure

Manage local OTel infrastructure with `docker-compose.yml` in the project root.

```yaml
# docker-compose.yml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686" # Jaeger UI
      - "14250:14250" # gRPC
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/jaeger]
```

This starts:
- **OpenTelemetry Collector**: OTLP receiver (port 4317, 4318)
- **Jaeger**: Trace visualization UI (port 16686)

Startup command:

```bash
docker-compose up -d
```

> **Note**: Migration to Grafana + Tempo is possible in the future by updating the docker-compose.yml.

### 5. Telemetry Types and Priority

1. **Traces** (First priority): Request flow visualization
2. **Metrics** (Future): Performance indicators
3. **Logs** (Future): Integration with existing structured logs

### 6. Role Separation with Sentry

| Function | Tool |
|----------|------|
| Error tracking | Sentry |
| Session Replay | Sentry |
| Distributed tracing | Grafana (OTel) |
| Metrics | Grafana (OTel) |
| Dashboards | Grafana |

## Consequences

### Benefits

1. **Unified Observability**
   - Avoid vendor lock-in by adhering to OTel standards
   - Handle Traces/Metrics/Logs uniformly

2. **Environment Consistency**
   - Use the same `@vercel/otel` SDK in all environments
   - Switch destinations using only environment variables

3. **Leverage Existing Assets**
   - Continue using Sentry's error tracking capabilities
   - Future integration with ADR 0008 structured logs is possible

4. **Improved Local Development**
   - View production-equivalent telemetry locally
   - Enable early problem detection

### Drawbacks

1. **Increased Complexity**
   - Manage two telemetry systems: Sentry and OTel
   - Additional containers required locally (OTel Collector + Jaeger)

2. **Cost**
   - Grafana Cloud usage fees
   - Learning cost for setup and operations

3. **Increased Dependencies**
   - Dependency on `@vercel/otel`
   - Dependency on Grafana ecosystem

### Alternatives Considered

1. **Achieve observability with Sentry only**
   - Pros: Already deployed, no additional cost
   - Cons: Limited distributed tracing, low dashboard customizability
   - Decision: Not adopted. Grafana has richer observability features

2. **Use standard OpenTelemetry SDK directly**
   - Pros: Vendor independent
   - Cons: Complex configuration in Vercel environment, potential issues with edge runtime
   - Decision: Not adopted. Prioritize stability in Vercel environment

3. **Completely replace Sentry with OTel**
   - Pros: Unified telemetry system
   - Cons: Lose features like Session Replay, high migration cost
   - Decision: Not adopted. Leverage each tool's strengths

## Implementation Notes

### Required Packages

```bash
pnpm add @vercel/otel @opentelemetry/sdk-logs @opentelemetry/api-logs @opentelemetry/instrumentation
```

For adding custom spans:

```bash
pnpm add @opentelemetry/api
```

### Auto-generated Spans by Next.js

Next.js automatically generates the following spans:

- `[http.method] [next.route]` - Root span for requests
- `render route (app) [next.route]` - Rendering in App Router
- `fetch [http.method] [http.url]` - Fetch requests
- `executing api route (app) [next.route]` - API Route Handler execution
- `generateMetadata [next.page]` - Metadata generation

### Custom Span Example

```typescript
import { trace } from '@opentelemetry/api'

export async function calculateABC(stockId: string) {
  return await trace
    .getTracer('mikazuki-munechika')
    .startActiveSpan('calculateABC', async (span) => {
      try {
        span.setAttribute('stock.id', stockId)
        // ... calculation logic ...
        return result
      } finally {
        span.end()
      }
    })
}
```

### Update instrumentation.ts

```typescript
import { registerOTel } from '@vercel/otel';
import * as Sentry from "@sentry/nextjs";

export async function register() {
  // OpenTelemetry initialization
  registerOTel({ serviceName: 'mikazuki-munechika' });

  // Sentry initialization (existing)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```

### Update next.config.ts

```typescript
const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: true,
  },
};
```

### Environment Variables

```bash
# Vercel (production/preview)
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-xx-xxx.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic <base64-encoded-credentials>"

# Local (.env.local)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Enable verbose spans (recommended for development)
NEXT_OTEL_VERBOSE=1

# Disable fetch spans (when using custom fetch instrumentation)
# NEXT_OTEL_FETCH_DISABLED=1
```

## Related ADRs

- ADR 0008: Structured Logging - Future integration with OTel Logs
- ADR 0011: Vercel Env Management - Environment variable management policy

## References

- [Next.js OpenTelemetry Guide](https://nextjs.org/docs/app/guides/open-telemetry) - Official documentation
- [Vercel OpenTelemetry Documentation](https://vercel.com/docs/otel/)
- [@vercel/otel npm package](https://www.npmjs.com/package/@vercel/otel)
- [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/) - Official documentation
- [Jaeger](https://www.jaegertracing.io/docs/) - Distributed tracing platform
- [Grafana Cloud OTLP](https://grafana.com/docs/grafana-cloud/send-data/otlp/)
- [Grafana Tempo](https://grafana.com/docs/tempo/latest/)
