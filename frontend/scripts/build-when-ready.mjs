#!/usr/bin/env node

/**
 * Build trigger script that waits for backend health before running Next.js build.
 * Will poll the backend health endpoint until healthy or until max wait time is reached.
 */

import { execSync } from "child_process";
import fetch from "node-fetch";

// Configurable variables
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
const HEALTH_PATH = "/api/health";
const MAX_WAIT_MS = 2 * 60 * 1000; // 2 minutes
const POLL_INTERVAL_MS = 3000; // 3 seconds

async function waitForBackendHealth() {
  const healthUrl = BACKEND_URL.replace(/\/$/, "") + HEALTH_PATH;
  const start = Date.now();
  let lastError = null;
  process.stdout.write(`⏳ Waiting for backend health at ${healthUrl} ...\n`);
  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      const res = await fetch(healthUrl, { timeout: 5000 });
      if (res.ok) {
        process.stdout.write("✅ Backend healthy!\n");
        return;
      } else {
        lastError = `Status: ${res.status}`;
      }
    } catch (err) {
      lastError = err.message || err;
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  process.stdout.write("\n❌ Backend did not become healthy in time.\n");
  if (lastError) {
    process.stderr.write(`Last error: ${lastError}\n`);
  }
  process.exit(1);
}

async function buildWhenReady() {
  await waitForBackendHealth();
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
