# ADR 0009: Logging Responsibility Separation

## Status

Accepted

## Context

In application logging, there are two types of logs:

1. **Function call/exit logs**: Recording when a function is called and when it completes
2. **Internal logic logs**: Recording details of what happens inside the function

We considered using a `withLogger` higher-order function to automatically log function calls, but this approach has drawbacks:

- **Logging concerns leak to callers**: Callers must decide whether to wrap functions with `withLogger`, mixing logging concerns with business logic
- **Security risks**: Automatic argument logging may inadvertently log sensitive data (e.g., passwords)
- **Reduced clarity**: It's not obvious from reading the code what gets logged

## Decision

**All logging is the implementation's responsibility.** The implementation explicitly calls `logger.debug()`, `logger.info()`, etc. as needed.

```typescript
async function authenticate(email: string, password: string) {
  // Explicitly log what's safe to log (not the password!)
  logger.debug("authenticate called", { email });
  
  const user = await findUser(email);
  if (!user) {
    logger.debug("user not found", { email });
    return null;
  }

  if (!verifyPassword(user, password)) {
    logger.debug("invalid password", { email });
    return null;
  }

  logger.debug("authentication successful", { userId: user.id });
  return user;
}
```

The `caller` field in log entries is automatically extracted from the stack trace, so there's no need to manually specify the function name.

## Consequences

### Benefits

1. **Security by default**: Implementation controls exactly what gets logged, avoiding accidental exposure of sensitive data
2. **Clear logging intent**: Reading the code shows exactly what will be logged
3. **No caller burden**: Callers don't need to think about logging
4. **Automatic function name**: The `caller` field is auto-populated from the stack trace

### Drawbacks

1. **More verbose**: Each function must explicitly write its own logs
2. **Potential inconsistency**: Different developers may log differently

### Guidelines

| Situation | Approach |
|-----------|----------|
| Function entry | `logger.debug("called", { safeArgs })` |
| Function exit | `logger.debug("completed", { result })` |
| Errors | `logger.error("failed", { context }, error)` |
| Sensitive data | Never log passwords, tokens, etc. |

## Related

- [ADR 0008: Structured Logging](./0008-structured-logging.md)
