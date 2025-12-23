import packageJson from "../../package.json";

/**
 * Get the current application version from package.json
 */
export function getAppVersion(): string {
  return packageJson.version;
}

/**
 * Current application version
 */
export const APP_VERSION = packageJson.version;
