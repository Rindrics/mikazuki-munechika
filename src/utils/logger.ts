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

/**
 * Extract caller function name from stack trace
 * Returns undefined if unable to determine
 */
function getCallerName(skipFrames: number = 4): string | undefined {
  try {
    const stack = new Error().stack;
    if (!stack) return undefined;

    const lines = stack.split("\n");
    // Skip frames: Error, getCallerName, createLogEntry, debug/info/warn/error, actual caller
    const callerLine = lines[skipFrames];
    if (!callerLine) return undefined;

    // Chrome/Node.js format: "    at functionName (file:line:col)"
    // or "    at Object.functionName (file:line:col)"
    // or "    at ClassName.methodName (file:line:col)"
    const chromeMatch = callerLine.match(/at\s+(?:(?:Object|Array|Function)\.)?([\w.<>]+)\s+\(/);
    if (chromeMatch) {
      return chromeMatch[1];
    }

    // Firefox/Safari format: "functionName@file:line:col"
    const firefoxMatch = callerLine.match(/^([\w.<>]+)@/);
    if (firefoxMatch) {
      return firefoxMatch[1];
    }

    // Anonymous function or unable to parse
    return undefined;
  } catch {
    return undefined;
  }
}

function redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()));

    if (isSensitive) {
      redacted[key] = "[REDACTED]";
    } else if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      redacted[key] = redactSensitiveFields(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

function getLogLevel(): LogLevel {
  const envLogLevel = (
    typeof window !== "undefined" ? process.env.NEXT_PUBLIC_LOG_LEVEL : process.env.LOG_LEVEL
  )?.toUpperCase();

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
  caller?: string;
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
  error?: Error,
  explicitCaller?: string
): LogEntry {
  // Use explicit caller if provided, otherwise auto-detect from stack trace
  const caller = explicitCaller ?? getCallerName();

  const entry: LogEntry = {
    schemaVersion: LOG_SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    level,
    message,
    environment,
    ...(globalContext.service && { service: globalContext.service }),
    ...(caller && { caller }),
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
   *
   * For `service`, if a value already exists, the new value will be appended with a dot separator
   * to create a hierarchical service name (e.g., "in-memory-user-repository" + "authenticate" = "in-memory-user-repository.authenticate")
   */
  setContext(context: Partial<LogContext>): void {
    for (const [key, value] of Object.entries(context)) {
      if (value === undefined) {
        delete globalContext[key as keyof LogContext];
      } else if (key === "service" && globalContext.service) {
        // Append to existing service name for hierarchical structure
        globalContext.service = `${globalContext.service}.${value}`;
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
