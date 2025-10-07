#!/usr/bin/env node

/**
 * Build trigger script that waits for backend health, then runs Next.js build once.
 * Used for initial deployments where backend must be ready before frontend SSG can run.
 */

import { execSync } from "child_process";
import { waitForBackendWithTimeout } from "../src/utils/healthCheck.js";

async function buildWhenReady() {
  try {
    // Get backend URL from environment
    const profile = (
      process.env.ENV_PROFILE ||
      process.env.NODE_ENV ||
      ""
    ).toLowerCase();
    const prefix = profile ? `${profile.toUpperCase()}_` : "";

    const backendUrl =
      process.env[`${prefix}BACKEND_INTERNAL_URL`] ||
      process.env[`${prefix}NEXT_PUBLIC_BACKEND_URL`];

    if (!backendUrl) {
      console.log(
        "⚠️  No backend URL configured, proceeding with build anyway...",
      );
    } else {
      console.log("🔍 Waiting for backend to be ready before building...");

      // Wait for backend with reasonable retry configuration
      await waitForBackendWithTimeout(backendUrl, {
        maxAttempts: 15, // Try 15 times max
        intervalMs: 3000, // 3 seconds between attempts
        requestTimeoutMs: 5000, // 5 second per-request timeout
      });

      console.log("✅ Backend is ready! Starting Next.js build...");
    }

    // Run the build
    console.log("🏗️  Running next build...");
    execSync("npm run build", {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    console.log("🎉 Build completed successfully!");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (
      errorMessage.includes("Health check timed out") ||
      errorMessage.includes("not healthy") ||
      errorMessage.includes("CI/CD environment - backend not available")
    ) {
      console.warn(
        "⚠️  Backend not ready, but proceeding with build anyway (pages will be generated on-demand)...",
      );

      // Fallback: build without backend
      try {
        execSync("npm run build", {
          stdio: "inherit",
          cwd: process.cwd(),
        });
        console.log("🎉 Fallback build completed!");
      } catch (buildError) {
        console.error("❌ Build failed:", buildError);
        process.exit(1);
      }
    } else {
      console.error("❌ Build script failed:", errorMessage);
      process.exit(1);
    }
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildWhenReady();
}

export { buildWhenReady };
