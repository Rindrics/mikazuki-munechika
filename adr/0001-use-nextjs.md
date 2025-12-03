# ADR 0001: Adopt Next.js

## Status

Accepted

## Context

We need to implement a web application for stock assessment project with domain modeling.

The following requirements exist:

- A full-stack framework is desirable to maximize development speed
- Deployment ease is a priority
- TypeScript should be used to ensure type safety
- We want to develop with clean architecture

## Decision

Adopt Next.js (TypeScript).

- Use Next.js 16.0.6
- Use React 19.2.0
- Use App Router
- Use TypeScript 5.9.3

## Consequences

### Benefits

1. **Development Speed**
   - Hot Reload provides fast development experience
   - Server Components allow direct function calls from server components without HTTP overhead
   - Rich ecosystem and community support
   - Comprehensive official documentation
   - Full-stack development in a single project (frontend and backend)
   - API routes can be easily added when needed

2. **Deployment Ease**
   - Simple and fast deployment to Vercel
   - Support for other platforms (Netlify, AWS Amplify, etc.)
   - Relatively short build times
   - Zero-config deployment on many platforms
   - Built-in optimizations (code splitting, image optimization, etc.)

3. **Type Safety**
   - TypeScript type checking works effectively
   - Type safety is maintained when calling functions directly from Server Components
   - Compile-time error detection

4. **Performance**
   - Automatic optimizations with Server Components
   - Automatic code splitting
   - Built-in features like image optimization

### Drawbacks and Considerations

1. **Learning Curve**
   - Need to understand App Router concepts
   - Need to distinguish between Server Components and Client Components

2. **Vendor Lock-in**
   - Developed by Vercel, but usable on other platforms

3. **Framework Evolution**
   - Relatively new framework, so there may be significant changes
   - However, App Router is becoming more stable

4. **Statistical Packages**
   - Statistical packages available in JavaScript/TypeScript ecosystem are more limited compared to R
   - May need to integrate with R or Python for advanced statistical analysis

### Alternatives Considered

1. **Remix**
   - Similar full-stack framework
   - Smaller ecosystem compared to Next.js
   - Less deployment options and community support

2. **SvelteKit**
   - Different approach framework
   - Team may have less experience
   - Smaller ecosystem

3. **Pure React + Backend Framework**
   - More flexible, but setup and deployment become complex
   - Difficult to meet deployment ease requirements
   - Slower development speed due to separate frontend/backend setup

4. **R Shiny**
   - Excellent statistical packages ecosystem in R
   - However, deployment is more complex and slower compared to Next.js
   - Limited flexibility in UI/UX customization
   - Less suitable for modern web application development patterns
   - TypeScript type safety is not available
   - Does not align with development speed and deployment ease priorities

## Related ADRs

- None (first ADR)
