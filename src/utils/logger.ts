/**
 * Log levels in order of severity (lowest to highest)
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Get current log level from environment variable
 * Defaults based on environment:
 * - development & preview: DEBUG
 * - production: ERROR
 */
function getLogLevel(): LogLevel {
  // Support both server-side (LOG_LEVEL) and client-side (NEXT_PUBLIC_LOG_LEVEL)
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

  // development or preview
  return LogLevel.DEBUG;
}

const currentLogLevel = getLogLevel();

/**
 * Logger utility that respects log level configuration
 */
export const logger = {
  debug: (...args: unknown[]) => {
    if (currentLogLevel <= LogLevel.DEBUG) {
      console.debug("[DEBUG]", ...args);
    }
  },

  info: (...args: unknown[]) => {
    if (currentLogLevel <= LogLevel.INFO) {
      console.info("[INFO]", ...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (currentLogLevel <= LogLevel.WARN) {
      console.warn("[WARN]", ...args);
    }
  },

  error: (...args: unknown[]) => {
    if (currentLogLevel <= LogLevel.ERROR) {
      console.error("[ERROR]", ...args);
    }
  },
};

