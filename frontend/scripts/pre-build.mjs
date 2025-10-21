#!/usr/bin/env node

/**
 * Pre-build script for Next.js frontend.
 *
 * This script is reserved for future prebuild features. The backstory is that
 * we had a pre-build health/data check here, but we later determined that
 * this is not the place for that. Currently, it only triggers the Next.js
 * build and prints log blocks for CI visibility. Our key health check is now
 * performed at runtime, in AppShell.tsx, not during build.
 *
 * Lesson learned, lol.
 */

import { execSync } from "child_process";

async function preBuild() {
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
    console.info("� Build completed successfully!");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Build failed:", errorMessage);
    process.exit(1);
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  preBuild();
}

export { preBuild };
