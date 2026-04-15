/**
 * Watches the frontend workspace and refreshes the prod-like local runtime
 * whenever relevant files change.
 *
 * This exists to unblock iOS validation on the production-like server when the
 * standard Next.js dev runtime is not reliable over LAN. The watcher rebuilds
 * and restarts only after a successful production-style rebuild.
 */

import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, "..");
const port = process.env.PORT?.trim() || "3004";
const backendInternalUrl =
  process.env.BACKEND_INTERNAL_URL?.trim() || "http://localhost:8081";
const debounceMs = Number.parseInt(
  process.env.PROD_LIKE_WATCH_DEBOUNCE_MS || "250",
  10,
);

const ignoredPathSegments = new Set([".git", ".next", "node_modules"]);

const ignoredFileSuffixes = [".log", ".pid", ".tsbuildinfo"];

let rebuildTimer: NodeJS.Timeout | null = null;
let rebuildInFlight = false;
let rebuildQueued = false;
let watcherClosed = false;

function shouldIgnoreRelativePath(relativePath: string) {
  if (!relativePath) return false;

  const normalized = relativePath.split(path.sep).join("/");
  const segments = normalized.split("/");

  if (segments.some((segment) => ignoredPathSegments.has(segment))) {
    return true;
  }

  return ignoredFileSuffixes.some((suffix) => normalized.endsWith(suffix));
}

function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: appDir,
      env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(
          new Error(
            `${command} ${args.join(" ")} exited from signal ${signal}`,
          ),
        );
        return;
      }

      if (code !== 0) {
        reject(
          new Error(`${command} ${args.join(" ")} exited with code ${code}`),
        );
        return;
      }

      resolve();
    });
  });
}

async function refreshProdLike(reason: string) {
  if (rebuildInFlight) {
    rebuildQueued = true;
    return;
  }

  rebuildInFlight = true;
  rebuildQueued = false;

  console.info(`[watch-prod-like] Refreshing prod-like runtime (${reason})`);

  try {
    await runCommand("npm", ["run", "start:prod-like:local:detached:restart"], {
      ...process.env,
      PORT: port,
      BACKEND_INTERNAL_URL: backendInternalUrl,
    });
    console.info(`[watch-prod-like] Ready on :${port}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[watch-prod-like] Refresh failed: ${message}`);
  } finally {
    rebuildInFlight = false;

    if (rebuildQueued && !watcherClosed) {
      rebuildQueued = false;
      scheduleRefresh("queued change");
    }
  }
}

function scheduleRefresh(reason: string) {
  if (rebuildTimer !== null) {
    clearTimeout(rebuildTimer);
  }

  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    void refreshProdLike(reason);
  }, debounceMs);
}

function shutdown() {
  watcherClosed = true;

  if (rebuildTimer !== null) {
    clearTimeout(rebuildTimer);
    rebuildTimer = null;
  }
}

console.info(`[watch-prod-like] Watching ${appDir}`);
console.info(`[watch-prod-like] Backend URL: ${backendInternalUrl}`);
console.info(`[watch-prod-like] Port: ${port}`);

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

const fileWatcher = watch(
  appDir,
  { recursive: true },
  (_eventType, filename) => {
    if (!filename) return;

    const relativePath = filename.toString();
    if (shouldIgnoreRelativePath(relativePath)) return;

    console.info(`[watch-prod-like] Change detected: ${relativePath}`);
    scheduleRefresh(relativePath);
  },
);

fileWatcher.on("error", (error) => {
  console.error(`[watch-prod-like] Watcher failed: ${error.message}`);
});

process.on("exit", () => {
  shutdown();
  fileWatcher.close();
});

void refreshProdLike("initial start");
