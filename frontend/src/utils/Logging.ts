export function createDebugLogger(debug: boolean) {
  return (...args: unknown[]) => {
    if (debug) console.info(...args);
  };
}
