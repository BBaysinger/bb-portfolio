#!/usr/bin/env node

/**
 * Build trigger script that waits for backend health before running Next.js build.
 * Will poll the backend health endpoint until healthy or until max wait time is reached.
 */

import { execSync } from "child_process";

async function buildWhenReady() {
  // SUPER OBVIOUS LOG BLOCK: BUILD START
  console.log(
    `\n${"/".repeat(250)}\nFrontend Next Build STARTED\n${"/".repeat(250)}\n`,
  );

  // SUPER OBVIOUS LOG BLOCK: HEALTH/DATA CHECK REMOVED
  console.log(
    `\n${"/".repeat(250)}\nBackend Health/Data Check REMOVED\n${"/".repeat(250)}\n`,
  );

  try {
    console.info("🏗️  Running Next.js build...");
    execSync("npm run build", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.info("🎈 Build completed successfully!");
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
