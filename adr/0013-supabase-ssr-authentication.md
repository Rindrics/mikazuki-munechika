# ADR 0013: Supabase SSR Authentication

## Status

Accepted

## Context

When using Server Actions with Next.js App Router, Supabase authentication information must be properly transmitted.

With only `@supabase/supabase-js`'s `createClient`:
- Authentication information set on the client side is not transmitted to Server Actions
- `auth.uid()` becomes NULL and RLS policies do not function correctly

## Decision

Use the `@supabase/ssr` package to implement cookie-based authentication.

### Implementation

1. **Client-side**: Use `createBrowserClient`

```typescript
// src/infrastructure/supabase-client.ts
import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseClient(): SupabaseClient {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
```

2. **Server-side**: Use `createServerClient`

```typescript
// src/infrastructure/supabase-server-client.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // ...
      },
    },
  });
}
```

3. **Middleware**: Session token refresh

```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  // Create Supabase client and refresh session
  const supabase = createServerClient(...);
  await supabase.auth.getUser();
  return supabaseResponse;
}
```

### File Structure

```
src/
├── infrastructure/
│   ├── supabase-client.ts          # Browser client (createBrowserClient)
│   └── supabase-server-client.ts   # Server client (createServerClient)
└── middleware.ts                    # Session refresh middleware
```

### Important Notes

- `supabase-server-client.ts` uses `next/headers` and cannot be imported from client components
- Do not export from `index.ts`; import directly from Server Actions
- Middleware refreshes the session on every request

## Consequences

### Benefits

1. **Authentication in Server Actions**: RLS policies function correctly
2. **Cookie-based authentication**: Compatible with Next.js App Router
3. **Automatic session refresh**: Tokens are automatically refreshed by middleware

### Drawbacks

1. **Increased complexity**: Different client creation methods are required for client and server
2. **Import constraints**: Server-only code cannot be imported from client components
3. **Middleware required**: Middleware is required for all projects using authentication

### Related ADRs

- ADR 0002: Use Supabase Auth
- ADR 0011: Use Server Actions
