/**
 * Utility functions for logging and debugging
 */
export function createDebugLogger(debug: boolean) {
  return (...args: unknown[]) => {
    if (debug) console.info(...args);
  };
}
