# ADR 0012: Use Server Actions for Form Submissions

## Status

Accepted

## Context

We need to implement the assessment page (`/assess/[stockGroupName]`) where users can:

1. Input parameters (CatchData, BiologicalData)
2. Preview ABC calculation results
3. Save assessment results to the database

We need to choose how the client-side form communicates with server-side logic:

| Approach           | Description                                                                  |
| ------------------ | ---------------------------------------------------------------------------- |
| **Server Actions** | Next.js feature for calling server functions directly from client components |
| **API Routes**     | Traditional REST endpoints under `/app/api/`                                 |

## Decision

Use **Server Actions** for form submissions and data mutations in the assessment page.

### Implementation

```typescript
// src/app/assess/[stockGroupName]/actions.ts
"use server";

import { calculateAbc, SaveAssessmentResultService } from "@/application";

export async function calculateAbcAction(
  stockGroupName: string,
  catchData: CatchData,
  biologicalData: BiologicalData
): Promise<AcceptableBiologicalCatch> {
  // ... implementation
}

export async function saveAssessmentResultAction(
  stockGroupName: string,
  result: AcceptableBiologicalCatch
): Promise<void> {
  // ... implementation
}
```

## Consequences

### Benefits

1. **Type Safety**
   - TypeScript types flow seamlessly between client and server
   - No need to define separate request/response schemas
   - Compile-time error detection for function signatures

2. **Simplicity**
   - No HTTP endpoint management
   - Actions co-located with the page they serve
   - Less boilerplate compared to API routes

3. **Progressive Enhancement**
   - Forms can work without JavaScript when used with `<form action={...}>`
   - Better user experience on slow connections

4. **Security**
   - Actions are internal-only (not accessible via HTTP from outside)
   - Automatic CSRF protection by Next.js

### Drawbacks

1. **Not Reusable as Public API**
   - Cannot be called from external services
   - If we need a public API later, we would need to create separate API routes

2. **Debugging**
   - Network tab doesn't show clear request/response like REST APIs
   - Requires understanding of Server Actions internals

### When to Use API Routes Instead

- External service integration (webhooks, third-party APIs)
- Public API for mobile apps or other clients
- When explicit HTTP semantics are required

## Related ADRs

- [ADR 0001: Adopt Next.js](./0001-use-nextjs.md) - Server Actions are a Next.js feature
