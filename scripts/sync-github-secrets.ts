#!/usr/bin/env ts-node

/**
 * TODO: Planned enhancement — Env-file mode
 * ------------------------------------------------------------
 * Add a flag-driven mode (e.g., `--from-env`) to read secrets from env files
 * instead of JSON5, following the same override semantics we use in the apps:
 *   - Precedence: .env.local > .env.dev/.env.prod > .env
 *   - Environments:
 *       - "dev"  <- .env.dev (+ .env.dev.local)
 *       - "prod" <- .env.prod (+ .env.prod.local)
 *   - Repo-level defaults may be derived from .env.prod unless overridden.
 *   - Keep current JSON5 mode as default for backward compatibility.
 *   - Add `--verify-json5` to report drift between JSON5 and env files.
 *   - Use dotenv (and optionally dotenv-expand) for parsing.
 *   - Preserve dry-run behavior; never print secret values (show lengths only).
 *   - Optional: allow a simple mapping file if GH secret names differ from env keys.
 */

/**
 * Sync secrets.json5 into GitHub secrets (destructive: removes extras)
 * - Supports repo-level secrets (strings/files)
 * - Supports environment-scoped secrets via `environments: { <env>: { strings, files } }`
 * - NEW: If a sibling ".private" file exists (e.g.,
 *        ./.github-secrets.private.json5 next to ./.github-secrets.private.json5),
 *        values from the private file are overlaid onto the provided
 *        template for keys defined in the template schema. Extra keys in
 *        the private file are ignored. This keeps JSON5 as the schema-of-record
 *        while allowing real values to remain untracked.
 *
 * Usage:
 *   ./sync-github-secrets.ts <owner/repo> <secrets.json5> [--dry-run]
 *
 * Examples:
 * npx ts-node ./scripts/sync-github-secrets.ts BBaysinger/bb-portfolio ./.github-secrets.private.json5 --dry-run
 * npx ts-node ./scripts/sync-github-secrets.ts BBaysinger/bb-portfolio ./.github-secrets.private.json5
 */

import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

import JSON5 from "json5";

interface SecretGroup {
  strings?: Record<string, string>;
  files?: Record<string, string>;
}

interface SecretsFile extends SecretGroup {
  environments?: Record<string, SecretGroup>;
}

if (process.argv.length < 4 || process.argv.length > 5) {
  console.error(
    "Usage: sync-github-secrets.ts <owner/repo> <secrets.json5> [--dry-run]",
  );
  process.exit(1);
}

const REPO = process.argv[2];
const JSON_FILE = process.argv[3];
const DRY_RUN = process.argv[4] === "--dry-run";

if (!fs.existsSync(JSON_FILE)) {
  console.error(`Error: File not found: ${JSON_FILE}`);
  process.exit(1);
}

console.log(`📥 Reading secrets from ${JSON_FILE} ...`);

const raw = fs.readFileSync(JSON_FILE, "utf8");
let baseData: SecretsFile = JSON5.parse(raw);

// Normalize structure for base
baseData.strings = baseData.strings ?? {};
baseData.files = baseData.files ?? {};
baseData.environments = baseData.environments ?? {};

// Attempt to overlay private values from sibling ".private" file
const privatePath = path.join(
  path.dirname(JSON_FILE),
  path.basename(JSON_FILE).replace(/\.json5$/, ".private.json5"),
);

let data: SecretsFile = baseData;
if (
  privatePath &&
  path.resolve(privatePath) !== path.resolve(JSON_FILE) &&
  fs.existsSync(privatePath)
) {
  try {
    const rawPrivate = fs.readFileSync(privatePath, "utf8");
    const privateData: SecretsFile = JSON5.parse(rawPrivate);

    const merged: SecretsFile = {
      strings: { ...baseData.strings },
      files: { ...baseData.files },
      environments: { ...baseData.environments },
    };

    // Helper to overlay by schema keys only
    const overlayBySchema = (
      schema: SecretGroup,
      overlay: SecretGroup | undefined,
    ): SecretGroup => {
      const result: SecretGroup = {
        strings: { ...(schema.strings ?? {}) },
        files: { ...(schema.files ?? {}) },
      };
      if (overlay?.strings) {
        for (const key of Object.keys(schema.strings ?? {})) {
          if (key in overlay.strings!) {
            result.strings![key] = overlay.strings![key];
          }
        }
      }
      if (overlay?.files) {
        for (const key of Object.keys(schema.files ?? {})) {
          if (key in overlay.files!) {
            result.files![key] = overlay.files![key];
          }
        }
      }
      return result;
    };

    // Repo-level overlay
    const repoOverlay = overlayBySchema(baseData, privateData);
    merged.strings = repoOverlay.strings;
    merged.files = repoOverlay.files;

    // Environment-scoped overlay
    merged.environments = {};
    for (const [envName, envSchema] of Object.entries(
      baseData.environments ?? {},
    )) {
      const envOverlay = overlayBySchema(
        envSchema,
        privateData.environments?.[envName],
      );
      merged.environments![envName] = envOverlay;
    }

    data = merged;
    console.log(
      `🔒 Using private overrides from ${privatePath} (restricted to template schema)`,
    );
  } catch {
    console.warn(
      `⚠️ Failed to parse private overrides at ${privatePath}; proceeding without overlays.`,
    );
  }
}

// Expand ~ in file paths (after overlay)
for (const [k, v] of Object.entries(data.files ?? {})) {
  if (typeof v === "string" && v.startsWith("~")) {
    data.files![k] = path.join(os.homedir(), v.slice(1));
  }
}

function listSecrets(scope: "repo" | "env", env?: string): string[] {
  try {
    const scopeFlag = scope === "env" && env ? `--env ${env}` : "";
    const output = execSync(
      `gh secret list --repo ${REPO} ${scopeFlag} --json name -q '.[].name'`,
      { encoding: "utf8" },
    );
    return output.split(/\r?\n/).filter(Boolean);
  } catch {
    const suffix = scope === "env" && env ? ` for environment '${env}'` : "";
    console.error(
      `Error: failed to fetch current GitHub secrets${suffix}. Is gh authenticated? Does the environment exist?`,
    );
    return [];
  }
}

function removeExtras(
  scope: "repo" | "env",
  env: string | undefined,
  current: string[],
  desired: string[],
) {
  for (const key of current) {
    if (!desired.includes(key)) {
      const scopeFlag = scope === "env" && env ? `--env ${env}` : "";
      if (DRY_RUN) {
        console.log(
          `🗑 (dry run) Would remove old secret${env ? ` (${env})` : ""}: ${key}`,
        );
      } else {
        console.log(`🗑 Removing old secret${env ? ` (${env})` : ""}: ${key}`);
        execSync(`gh secret delete ${key} --repo ${REPO} ${scopeFlag}`.trim(), {
          stdio: "inherit",
        });
      }
    }
  }
}

function setStrings(
  scope: "repo" | "env",
  env: string | undefined,
  strings: Record<string, string>,
) {
  for (const [key, value] of Object.entries(strings)) {
    const scopeFlag = scope === "env" && env ? `--env ${env}` : "";
    if (DRY_RUN) {
      console.log(
        `🔑 (dry run) Would set string${env ? ` (${env})` : ""} ${key} (length: ${value.length})`,
      );
    } else {
      console.log(`🔑 Setting string${env ? ` (${env})` : ""} ${key} ...`);
      execSync(`gh secret set ${key} --repo ${REPO} ${scopeFlag}`.trim(), {
        input: value,
        stdio: ["pipe", "inherit", "inherit"],
      });
    }
  }
}

function setFiles(
  scope: "repo" | "env",
  env: string | undefined,
  files: Record<string, string>,
) {
  for (const [key, filepath] of Object.entries(files)) {
    if (!fs.existsSync(filepath)) {
      console.warn(
        `⚠️ Skipping ${key}${env ? ` (${env})` : ""}, file not found: ${filepath}`,
      );
      continue;
    }
    const size = fs.statSync(filepath).size;
    const scopeFlag = scope === "env" && env ? `--env ${env}` : "";
    if (DRY_RUN) {
      console.log(
        `📄 (dry run) Would set file${env ? ` (${env})` : ""} ${key} from ${filepath} (${size} bytes)`,
      );
    } else {
      console.log(
        `📄 Setting file${env ? ` (${env})` : ""} ${key} from ${filepath} ...`,
      );
      const content = fs.readFileSync(filepath, "utf8");
      execSync(`gh secret set ${key} --repo ${REPO} ${scopeFlag}`.trim(), {
        input: content,
        stdio: ["pipe", "inherit", "inherit"],
      });
    }
  }
}

// Repo-level secrets
{
  const currentRepoKeys = listSecrets("repo");
  const desiredRepoKeys = [
    ...Object.keys(data.strings!),
    ...Object.keys(data.files!),
  ];
  removeExtras("repo", undefined, currentRepoKeys, desiredRepoKeys);
  setStrings("repo", undefined, data.strings!);
  setFiles("repo", undefined, data.files!);
}

// Environment-scoped secrets
for (const [envName, group] of Object.entries(data.environments!)) {
  const strings = group.strings ?? {};
  const files = group.files ?? {};
  const currentEnvKeys = listSecrets("env", envName);
  const desiredEnvKeys = [...Object.keys(strings), ...Object.keys(files)];
  removeExtras("env", envName, currentEnvKeys, desiredEnvKeys);
  setStrings("env", envName, strings);
  setFiles("env", envName, files);
}

if (DRY_RUN) {
  console.log("✅ Dry run complete! No secrets were changed.");
} else {
  console.log(
    `✅ Sync complete! Repo ${REPO} (repo-level and environments) now matches ${JSON_FILE}.`,
  );
}
