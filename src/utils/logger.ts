export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_SCHEMA_VERSION = "1.0.0";

interface LogContext {
  userId?: string;
  requestId?: string;
  service?: string;
}

const SENSITIVE_FIELDS = [
  "password",
  "passwd",
  "pwd",
  "secret",
  "token",
  "apiKey",
  "api_key",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "authorization",
  "auth",
];

function redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()));

    if (isSensitive) {
      redacted[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      redacted[key] = redactSensitiveFields(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

function getLogLevel(): LogLevel {
  const envLogLevel =
    (typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_LOG_LEVEL
      : process.env.LOG_LEVEL)?.toUpperCase();

  if (envLogLevel) {
    switch (envLogLevel) {
      case "DEBUG":
        return LogLevel.DEBUG;
      case "INFO":
        return LogLevel.INFO;
      case "WARN":
        return LogLevel.WARN;
      case "ERROR":
        return LogLevel.ERROR;
      default:
        console.warn(`Unknown LOG_LEVEL: ${envLogLevel}. Using default.`);
    }
  }

  // Default based on environment
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "production") {
    return LogLevel.ERROR;
  }

  return LogLevel.DEBUG;
}

function getEnvironment(): string {
  const nodeEnv = process.env.NODE_ENV || "development";
  return nodeEnv;
}

function getDeploymentInfo(): {
  deploymentId?: string;
  gitCommitSha?: string;
} {
  const deploymentId =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID
      : process.env.VERCEL_DEPLOYMENT_ID;

  const gitCommitSha =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_GIT_COMMIT_SHA
      : process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA;

  return {
    deploymentId,
    gitCommitSha,
  };
}

const currentLogLevel = getLogLevel();
const environment = getEnvironment();
const deploymentInfo = getDeploymentInfo();

// Global context storage
// For server-side: can use AsyncLocalStorage in the future
// For client-side: can use React Context or session storage
let globalContext: LogContext = {};

interface LogEntry {
  schemaVersion: string;
  timestamp: string;
  level: string;
  message: string;
  service?: string;
  userId?: string;
  requestId?: string;
  environment: string;
  deploymentId?: string;
  gitCommitSha?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

function createLogEntry(
  level: string,
  message: string,
  metadata?: Record<string, unknown>,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    schemaVersion: LOG_SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    level,
    message,
    environment,
    ...(globalContext.service && { service: globalContext.service }),
    ...(globalContext.userId && { userId: globalContext.userId }),
    ...(globalContext.requestId && { requestId: globalContext.requestId }),
    ...(deploymentInfo.deploymentId && { deploymentId: deploymentInfo.deploymentId }),
    ...(deploymentInfo.gitCommitSha && { gitCommitSha: deploymentInfo.gitCommitSha }),
  };

  // Add metadata
  if (metadata && Object.keys(metadata).length > 0) {
    entry.metadata = redactSensitiveFields(metadata);
  }

  // Add error information
  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return entry;
}

function outputLog(entry: LogEntry, consoleMethod: typeof console.log | typeof console.error) {
  const isDevelopment = environment === "development";
  const logString = isDevelopment ? JSON.stringify(entry, null, 2) : JSON.stringify(entry);
  consoleMethod(logString);
}

/**
 * Structured logger implementation
 */
export const logger = {
  /**
   * Set global context (userId, requestId, service)
   * These values will be automatically included in all log entries
   * Pass undefined to remove a field from context
   */
  setContext(context: Partial<LogContext>): void {
    for (const [key, value] of Object.entries(context)) {
      if (value === undefined) {
        delete globalContext[key as keyof LogContext];
      } else {
        globalContext[key as keyof LogContext] = value as string;
      }
    }
  },

  /**
   * Clear global context
   */
  clearContext(): void {
    globalContext = {};
  },

  /**
   * Get current global context
   */
  getContext(): Readonly<LogContext> {
    return { ...globalContext };
  },

  debug(message: string, metadata?: Record<string, unknown>): void {
    if (currentLogLevel <= LogLevel.DEBUG) {
      const entry = createLogEntry("debug", message, metadata);
      outputLog(entry, console.debug);
    }
  },

  info(message: string, metadata?: Record<string, unknown>): void {
    if (currentLogLevel <= LogLevel.INFO) {
      const entry = createLogEntry("info", message, metadata);
      outputLog(entry, console.info);
    }
  },

  warn(message: string, metadata?: Record<string, unknown>): void {
    if (currentLogLevel <= LogLevel.WARN) {
      const entry = createLogEntry("warn", message, metadata);
      outputLog(entry, console.warn);
    }
  },

  error(message: string, metadata?: Record<string, unknown>, error?: Error): void {
    if (currentLogLevel <= LogLevel.ERROR) {
      const entry = createLogEntry("error", message, metadata, error);
      outputLog(entry, console.error);
    }
  },
};

/**
 * Higher-order function to automatically log function execution
 * Sets service context and logs function entry/exit with arguments and return value
 *
 * @param serviceName - Service name to set in logger context
 * @param fn - Function to wrap with logging
 * @returns Wrapped function with automatic logging
 *
 * @example
 * ```typescript
 * export const calculateAbc = withLogger(
 *   "calculate-abc",
 *   (stock: FisheryStock, catchData: CatchData, biologicalData: BiologicalData) => {
 *     return stock.estimateAbundance(catchData, biologicalData).assess();
 *   }
 * );
 * ```
 */
export function withLogger<T extends (...args: any[]) => any>(
  serviceName: string,
  fn: T
): T {
  const wrapped = ((...args: Parameters<T>): ReturnType<T> => {
    // Save previous context and set service context for this function call
    const previousContext = logger.getContext();
    logger.setContext({ service: serviceName });

    // Use serviceName as function name, or fall back to fn.name or "anonymous"
    const functionName = fn.name || serviceName.split(".").pop() || "anonymous";
    logger.debug(`${functionName} called`, {
      args: redactSensitiveFields(
        args.reduce((acc, arg, index) => {
          acc[`arg${index}`] = arg;
          return acc;
        }, {} as Record<string, unknown>)
      ),
    });

    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result
          .then((resolvedValue) => {
            logger.debug(`${functionName} completed`, {
              result: resolvedValue,
            });
            // Restore previous context after async operation completes
            logger.setContext(previousContext);
            return resolvedValue;
          })
          .catch((error) => {
            logger.error(`${functionName} failed`, { error: error.message }, error);
            // Restore previous context even on error
            logger.setContext(previousContext);
            throw error;
          }) as ReturnType<T>;
      }

      // Handle sync functions
      logger.debug(`${functionName} completed`, {
        result: result,
      });
      // Restore previous context after sync operation completes
      logger.setContext(previousContext);
      return result;
    } catch (error) {
      logger.error(
        `${functionName} failed`,
        { error: error instanceof Error ? error.message : String(error) },
        error instanceof Error ? error : new Error(String(error))
      );
      // Restore previous context even on error
      logger.setContext(previousContext);
      throw error;
    }
  }) as T;

  return wrapped;
}
