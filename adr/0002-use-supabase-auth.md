# ADR 0002: Adopt Supabase Auth

## Status

Accepted

## Context

We need to implement user authentication functionality for the stock assessment web application.

The following requirements exist:

- User authentication is required to control access and operations based on user roles
- We want to defer development of an admin panel, so using a SaaS solution is desirable
- We need to support different user roles such as scientist operator and administrator
- Persistent storage should be separated between environments (develop, preview, production)
- Vercel preview environments should use in-memory user repository to reduce SaaS cost

## Decision

Adopt Supabase Auth for user authentication.

- Use Supabase Auth for authentication management
- Use Supabase CLI with Docker for local development
- Use in-memory user repository for Vercel preview environments (controlled by environment variable)
- Store user roles in `public` schema tables (separate from `auth` schema)
- Use `@supabase/supabase-js` client library

## Consequences

### Benefits

1. **Development Speed**
   - No need to build and maintain an admin panel for user management
   - Supabase provides a ready-made authentication system
   - Supabase CLI with Docker allows local development without external services
   - Rich authentication features (email/password, OAuth, etc.) out of the box

2. **Security**
   - Authentication data is stored in `auth` schema, separated from application data
   - Supabase handles security best practices (password hashing, session management, etc.)
   - Row Level Security (RLS) can be used for fine-grained access control

3. **Flexibility**
   - Can switch between Supabase and in-memory repository based on environment
   - Easy to test authentication flows locally with Docker
   - Preview environments can work without external dependencies

4. **Cost Efficiency**
   - Free tier available for development and small projects
   - Pay-as-you-go pricing for production use

5. **Integration**
   - Works well with Next.js App Router
   - TypeScript support available
   - Can be integrated with existing clean architecture

### Drawbacks and Considerations

1. **Vendor Lock-in**
   - Dependent on Supabase service
   - Migration to another service would require code changes
     - However, using repository pattern allows easier migration

2. **Local Development Setup**
   - Requires Docker for local Supabase instance
   - Additional setup step compared to pure in-memory solution
     - However, this provides more realistic development environment

3. **Preview Environment Complexity**
   - Need to maintain both Supabase and in-memory implementations
   - Environment variable management required

4. **Schema Separation**
   - Need to understand `auth` schema vs `public` schema separation
   - Application data (roles, profiles) should be stored in `public` schema
   - Need to sync data between `auth.users` and `public` tables if needed

### Alternatives Considered

1. **Auth0**
   - Similar SaaS authentication service
   - More enterprise-focused, potentially more complex
   - Higher cost for small projects
   - Less integrated with database (Supabase provides both auth and database)

2. **Firebase Auth**
   - Google's authentication service
   - Good integration with Firebase ecosystem
   - Less flexible for custom database schemas

3. **Custom Authentication**
   - Full control over implementation
   - However, requires significant development time
   - Security implementation is complex and error-prone
   - Need to build and maintain admin panel
   - Does not meet the requirement to defer admin panel development

4. **NextAuth.js (Auth.js)**
   - Popular authentication library for Next.js
   - More flexible, can work with various providers
   - However, still requires backend implementation and database setup
   - More code to maintain compared to Supabase Auth

## Related ADRs

- ADR 0001: Adopt Next.js - This ADR builds on the Next.js decision
