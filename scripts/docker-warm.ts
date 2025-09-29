#!/usr/bin/env tsx
// NOTE (2025-09-28): We were experimenting with a dev warm-up that pings frontend/backends
// to avoid first-hit compile delays. Parking this for now; we'll come back to it.
/**
 * Warm up local dev containers by hitting key routes to trigger JIT compilation.
 *
 * - Frontend (Next.js): http://localhost:5050/
 * - Backend (Payload):  http://localhost:5051/api/health and http://localhost:5051/admin
 *
 * Options via env vars:
 * - WARM_TIMEOUT_MS: total time to wait for services (default 600000 = 10min)
 * - WARM_RETRY_INTERVAL_MS: delay between retries (default 2000 = 2s)
 *
 * Usage:
 *   npm run docker:warm
 */

import http from "node:http";

const FRONTEND: { host: string; port: number; paths: string[] } = {
  host: "localhost",
  port: 5050,
  paths: ["/"],
};
const BACKEND: { host: string; port: number; paths: string[] } = {
  host: "localhost",
  port: 5051,
  // hit health first, then admin to trigger UI bundle
  paths: ["/api/health", "/admin"],
};

const RETRY_INTERVAL = parseInt(
  process.env.WARM_RETRY_INTERVAL_MS || "2000",
  10,
);
const TIMEOUT = parseInt(process.env.WARM_TIMEOUT_MS || "600000", 10); // 10 minutes

function httpGet(host: string, port: number, path: string): Promise<number> {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path }, (res) => {
      // Drain data to allow socket reuse
      res.resume();
      resolve(res.statusCode || 0);
    });
    req.on("error", () => resolve(0));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve(0);
    });
  });
}

async function waitForReachable(
  host: string,
  port: number,
  label: string,
  path: string,
) {
  const start = Date.now();
  console.log(`Waiting for ${label} on http://${host}:${port}${path} ...`);
  while (true) {
    const code = await httpGet(host, port, path);
    if (code > 0) {
      console.log(
        `✓ ${label} reachable on http://${host}:${port}${path} (status ${code})`,
      );
      return;
    }
    if (Date.now() - start > TIMEOUT) {
      throw new Error(
        `Timeout waiting for ${label} on http://${host}:${port}${path}`,
      );
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, RETRY_INTERVAL));
  }
}

async function warm(
  host: string,
  port: number,
  paths: string[],
  label: string,
) {
  for (const p of paths) {
    const code = await httpGet(host, port, p);
    if (code > 0) {
      console.log(`• Warmed ${label} ${p} -> ${code}`);
    } else {
      console.warn(`• Skipped ${label} ${p} (not reachable yet)`);
    }
  }
}

async function main() {
  // Wait for both to be reachable
  await waitForReachable(FRONTEND.host, FRONTEND.port, "frontend", "/");
  await waitForReachable(BACKEND.host, BACKEND.port, "backend", "/api/health");

  // Warm routes
  await warm(FRONTEND.host, FRONTEND.port, FRONTEND.paths, "frontend");
  await warm(BACKEND.host, BACKEND.port, BACKEND.paths, "backend");

  console.log("Warm-up complete.");
}

main().catch((err) => {
  console.error("docker warm failed:", err.message || err);
  process.exit(1);
});
