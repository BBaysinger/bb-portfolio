#!/usr/bin/env node

/**
 * Simple build trigger script that runs Next.js build.
 * Simplified version with health check logic removed since it's not useful in CI/CD context.
 */

import { execSync } from "child_process";

async function buildWhenReady() {
  try {
    console.info("🏗️  Running Next.js build...");

    execSync("npm run build", {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    console.info("🎉 Build completed successfully!");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Build failed:", errorMessage);
    process.exit(1);
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildWhenReady();
}

export { buildWhenReady };
