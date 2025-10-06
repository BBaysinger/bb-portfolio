/**
 * Health check utility for waiting for backend availability during build-time static generation.
 * Uses bounded retries with timeouts to avoid endless loops while still optimizing for static generation.
 */

/**
 * Waits for backend to be healthy with bounded retries and timeout.
 *
 * @param {string} baseUrl - The backend base URL to check
 * @param {Object} options - Configuration options for the health check
 * @param {number} [options.maxAttempts=15] - Maximum number of attempts
 * @param {number} [options.intervalMs=3000] - Interval between attempts in milliseconds
 * @param {number} [options.requestTimeoutMs=5000] - Per-request timeout in milliseconds
 * @returns {Promise<void>} Promise that resolves when backend is healthy
 * @throws {Error} When max attempts exceeded
 */
export async function waitForBackendWithTimeout(baseUrl, options = {}) {
  const {
    maxAttempts = 15, // Max 15 tries
    intervalMs = 3000, // 3 seconds between tries
    requestTimeoutMs = 5000, // 5 second timeout per request
  } = options;

  // Skip health checks in CI/CD environments where backend services aren't running
  const isCiCd = process.env.CI || process.env.GITHUB_ACTIONS || process.env.BUILD_ID;
  if (isCiCd) {
    console.log('🏗️ CI/CD environment detected - skipping backend health check');
    throw new Error('CI/CD environment - backend not available');
  }

  const startTime = Date.now();

  console.log(
    `🔍 Checking backend health at ${baseUrl} (${maxAttempts} attempts @ ${intervalMs}ms intervals)`,
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {

    try {
      // Try a simple health check endpoint first, fallback to main API
      const healthUrls = [
        `${baseUrl}/api/health`,
        `${baseUrl}/api/projects?limit=1`,
      ];

      let lastError = null;

      for (const url of healthUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            requestTimeoutMs,
          );

          const response = await fetch(url, {
            signal: controller.signal,
            method: "GET",
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            console.log(
              `✅ Backend healthy at ${url} (attempt ${attempt}/${maxAttempts})`,
            );
            return;
          }

          lastError = new Error(
            `HTTP ${response.status}: ${response.statusText}`,
          );
        } catch (error) {
          lastError = error;
          // Try next URL
        }
      }

      // If we get here, all URLs failed
      throw lastError || new Error("All health check URLs failed");
    } catch (error) {
      const errorMessage = error?.message || "Unknown error";
      console.log(
        `⚠️ Try ${attempt} of ${maxAttempts} @ ${intervalMs}ms interval failed: ${errorMessage}`,
      );

      // Don't sleep after the last attempt
      if (attempt < maxAttempts) {
        console.log(`   Retrying in ${intervalMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
  }

  throw new Error(
    `Backend not healthy after ${maxAttempts} attempts over ${Date.now() - startTime}ms`,
  );
}
