# ADR 0008: Structured Logging

## Status

Accepted

## Context

We need to implement structured logging for the stock assessment web application. Currently, we have a simple logger utility that uses `console.log` with log levels, but it does not support structured logging.

### Requirements

1. **Structured Log Format**: Logs should be in a consistent, parseable format (preferably JSON)
2. **Metadata and Context**: Logs should include essential metadata such as:
   - Timestamp
   - Log level
   - Service/component identifier
   - Request/transaction ID (for correlation)
   - User ID (when applicable)
   - Environment information
3. **Environment-Based Log Levels**:
   - Development & Preview: DEBUG
   - Production: ERROR
4. **Security**: Sensitive data should not be logged, or should be redacted
5. **Client and Server Support**: Next.js application requires logging on both client-side and server-side
6. **Performance**: Logging should not significantly impact application performance
7. **Consistency**: All logs should follow the same format across the application

### Current State

- Simple logger utility exists (`src/utils/logger.ts`)
- Uses `console.log` with log level filtering
- No structured format (plain text)
- No metadata (timestamp, IDs, etc.)
- Works on both client and server

## Decision

Implement structured logging using a custom logger that outputs JSON format, without introducing external dependencies like pino.

### Implementation Approach

1. **Custom Structured Logger**
   - Extend the existing logger utility to support structured logging
   - Output logs in JSON format
   - Include standard metadata fields in every log entry
   - Support both client-side and server-side execution

2. **Log Format (JSON)**

   ```json
   {
     "schemaVersion": "1.0.0",
     "timestamp": "2024-01-01T12:00:00.000Z",
     "level": "info",
     "message": "User logged in",
     "service": "auth",
     "userId": "user-123",
     "requestId": "req-456",
     "environment": "development",
     "deploymentId": "dpl_abc123",
     "gitCommitSha": "abc123def456",
     "metadata": {
       "email": "user@example.com"
     }
   }
   ```

   **Schema Version**: The `schemaVersion` field indicates the version of the log schema format. This enables:
   - Parsing different log format versions correctly
   - Backward compatibility when log format evolves
   - Tracking log format changes over time
   - Filtering and processing logs by schema version in log aggregation tools

3. **Standard Metadata Fields**

   These fields are automatically included in every log entry:
   - `schemaVersion`: Log schema version (e.g., "1.0.0") - enables format evolution and backward compatibility
   - `timestamp`: ISO 8601 format timestamp
   - `level`: Log level (debug, info, warn, error)
   - `message`: Human-readable log message
   - `service`: Service/component name (e.g., "auth", "repository", "api")
   - `userId`: Authenticated user ID (when available)
   - `requestId`: Request/transaction ID for correlation (when available)
   - `environment`: Current environment (development, preview, production)
   - `deploymentId`: Vercel deployment ID (when available, from `VERCEL_DEPLOYMENT_ID`)
   - `gitCommitSha`: Git commit SHA (when available, from `VERCEL_GIT_COMMIT_SHA` or `GIT_COMMIT_SHA`)
   - `metadata`: Additional context-specific data (optional, log entry-specific)

   **Field Organization**:

   Fields are organized into three categories:
   1. **Top-Level Standard Fields** (e.g., `environment`, `deploymentId`, `gitCommitSha`, `userId`, `requestId`):
      - Values that are consistent across multiple log entries (request/session/deployment scope)
      - Stored in memory/context and automatically included in all log entries
      - Placed at top level for easy filtering and querying in log aggregation tools
      - These are "global context" but kept at top level for better searchability

   2. **Log Entry Metadata** (`metadata` object):
      - Values specific to each individual log entry
      - Each log call can include different metadata
      - For example, a login log might include `{ email: "user@example.com" }`, while an error log might include `{ errorCode: "AUTH_FAILED" }`
      - Used for additional context that varies per log entry

   3. **Core Log Fields** (e.g., `timestamp`, `level`, `message`, `service`):
      - Essential fields present in every log entry
      - Always at top level for consistency

   **Why Top-Level vs. Metadata**:
   - **Top-Level**: Fields that are frequently used for filtering, searching, or correlation (environment, deploymentId, userId, requestId). Keeping them at top level makes queries simpler: `environment=production AND deploymentId=dpl_abc123`
   - **Metadata**: Fields that are specific to individual log entries and less commonly used for filtering. These can be nested in the `metadata` object to keep the top-level structure clean.

   The logger implementation should:
   - Store global context (userId, requestId, environment, deploymentId, etc.) in memory/context
   - Automatically include global context as top-level fields in all log entries
   - Allow per-log-call metadata to be passed explicitly and merged into the `metadata` object
   - Keep the distinction clear: top-level for common filters, metadata for entry-specific data

4. **Security Considerations**
   - Redact sensitive fields (passwords, tokens, etc.)
   - Do not log full request/response bodies containing sensitive data
   - Sanitize user input in log messages
   - Use environment-based log levels to reduce information leakage in production

5. **Client-Side vs Server-Side**
   - Server-side: Full structured logging with all metadata
   - Client-side: Simplified structured logging (reduced metadata to avoid performance impact)
   - Both use the same logger interface for consistency

6. **Log Output**
   - Development: Pretty-printed JSON for readability
   - Production: Compact JSON for parsing by log aggregation tools
   - Console output (can be extended to file or external service later)

## Consequences

### Benefits

1. **Structured Format**
   - JSON format enables easy parsing and filtering
   - Standard format across the application
   - Compatible with log aggregation tools (if needed in the future)

2. **Metadata and Context**
   - Timestamps enable chronological analysis
   - Service identifiers help filter logs by component
   - Request IDs enable correlation across services
   - User IDs enable user-specific log analysis

3. **Consistency**
   - All logs follow the same structure
   - Easier to understand and maintain
   - Better developer experience

4. **Flexibility**
   - Can extend to external logging services later
   - No vendor lock-in
   - Full control over log format and behavior
   - Compatible with OpenTelemetry format (JSON structured logs)
   - Can migrate to OpenTelemetry later without changing application code (only logger implementation)

5. **Performance**
   - No external dependencies (lightweight)
   - Conditional logging based on log level
   - Minimal overhead

6. **Security**
   - Built-in redaction for sensitive data
   - Environment-based log levels reduce information exposure

### Drawbacks

1. **Custom Implementation**
   - Requires maintenance and testing
   - May need to implement features that libraries provide out-of-the-box
   - Less community support compared to established libraries

2. **Limited Features**
   - No built-in log rotation
   - No built-in transport to external services
   - Manual implementation of advanced features if needed

3. **Development Effort**
   - Initial implementation requires time
   - Need to ensure consistency across the codebase

### Alternatives Considered

1. **Pino**
   - Pros: Fast, JSON structured logging, widely used, good performance
   - Cons: Primarily server-side focused, complex client-side integration, additional dependency
   - Decision: Not chosen because we need seamless client/server support and want to minimize dependencies

2. **Winston**
   - Pros: Flexible, many transports, good ecosystem
   - Cons: Heavier dependency, more complex configuration, primarily server-side
   - Decision: Not chosen for similar reasons as pino

3. **Console.log with JSON.stringify**
   - Pros: Simple, no dependencies
   - Cons: No metadata, no redaction, inconsistent format
   - Decision: Not chosen because it doesn't meet structured logging requirements

4. **External Logging Service (e.g., LogRocket, Sentry)**
   - Pros: Specialized tools, better analytics, built-in features
   - Cons: Additional cost, vendor lock-in, data privacy concerns, overkill for current needs
   - Decision: Not chosen because we don't need external services yet and want to keep data in our control

5. **OpenTelemetry**
   - Pros: Industry standard, supports logs/traces/metrics, vendor-neutral, future-proof
   - Cons: More complex setup, additional dependencies, may be overkill for current needs
   - Decision: Not chosen initially, but the custom implementation is designed to be compatible with OpenTelemetry in the future

## Implementation Notes

### Logger Interface

```typescript
logger.debug(message, metadata?)
logger.info(message, metadata?)
logger.warn(message, metadata?)
logger.error(message, metadata?, error?)
logger.setContext(context)
logger.clearContext()
logger.getContext()
```

**Usage Patterns**:

1. **`withLogger` for Function Wrapping** (Recommended for pure functions):
   - Automatically sets service context
   - Automatically logs function entry/exit with arguments and return values
   - Use when you want automatic logging without explicit calls

   ```typescript
   export const calculateAbc = withLogger("calculate-abc", (stock, catchData, biologicalData) => {
     return stock.estimateAbundance(catchData, biologicalData).assess();
   });
   ```

2. **Explicit `logger` Calls** (For components, classes, or when you need fine-grained control):
   - Use `logger.setContext()` to set service name and other context
   - Use `logger.debug()`, `logger.info()`, etc. for explicit logging
   - Use when you need to log specific conditions, intermediate steps, or errors

   ```typescript
   // React component or class method
   logger.setContext({ service: "auth" });
   logger.debug("Login attempt", { email });
   if (!authenticatedUser) {
     logger.debug("Login failed: invalid credentials", { email });
     return false;
   }
   logger.setContext({ userId: authenticatedUser.id });
   logger.info("Login successful", { email });
   ```

**Global Context Management**:

The logger maintains global context (userId, requestId, service, etc.) in memory and automatically includes it in all log entries. This can be implemented using:

- **Server-side**: AsyncLocalStorage (Node.js) or request context
- **Client-side**: React Context or session storage
- **Context API**: Provide methods to set/get global context:

```typescript
logger.setContext({ userId: "user-123", requestId: "req-456" });
logger.info("Processing request"); // Automatically includes userId and requestId
logger.clearContext(); // Clear context when request/session ends
```

**Metadata Parameter**:

The `metadata` parameter in each log call is for **log entry-specific** data that differs per log call. It is merged with global context when creating the log entry.

### Metadata Redaction

Sensitive fields should be redacted:

- Passwords
- API keys
- Tokens
- Credit card numbers
- Personal identification numbers

### Request ID Generation

- Server-side: Generate UUID for each request
- Client-side: Generate UUID for each user session or operation
- Include in all logs for correlation

### Environment Detection

- Use `NODE_ENV` for server-side
- Use `NEXT_PUBLIC_NODE_ENV` for client-side (if needed)
- Default to "development" if not set

### Deployment Information

Include deployment information when available:

- **Vercel Deployment ID**: From `VERCEL_DEPLOYMENT_ID` environment variable
  - Unique identifier for each Vercel deployment
  - Helps correlate logs with specific deployments
  - Useful for rollback and troubleshooting

- **Git Commit SHA**: From `VERCEL_GIT_COMMIT_SHA` or `GIT_COMMIT_SHA` environment variable
  - Identifies the exact code version that generated the log
  - Enables correlation with source code changes
  - Useful for debugging and release tracking

These fields are automatically included in all logs when available, without requiring explicit metadata in each log call.

### OpenTelemetry Compatibility

The custom logger implementation is designed to be compatible with OpenTelemetry:

1. **Log Format Compatibility**
   - JSON structured logs are compatible with OpenTelemetry Logs format
   - Standard metadata fields (timestamp, level, message) align with OpenTelemetry conventions
   - Additional fields can be added as attributes

2. **Future Migration Path**
   - Logger interface remains the same (`logger.debug()`, `logger.info()`, etc.)
   - Only the implementation needs to change (swap custom logger for OpenTelemetry logger)
   - Application code using the logger does not need to change
   - Can use OpenTelemetry's logger as a drop-in replacement

3. **OpenTelemetry Integration Strategy**
   - When migrating to OpenTelemetry, implement the logger using `@opentelemetry/api-logs`
   - Maintain the same logger interface to avoid code changes
   - Add OpenTelemetry context (trace ID, span ID) to log metadata automatically
   - Use OpenTelemetry's log processors and exporters for advanced features

4. **Benefits of Delayed Adoption**
   - Start simple with custom implementation
   - Learn logging requirements through usage
   - Migrate to OpenTelemetry when distributed tracing or advanced observability is needed
   - Avoid premature complexity

## Related ADRs

- ADR 0004: Audit Logging - Structured logs complement audit logs stored in database
- ADR 0002: Adopt Supabase Auth - Logs reference authenticated users
