#!/usr/bin/env ts-node

/**
 * Sync secrets.json5 into GitHub secrets (destructive: removes extras)
 * - Supports repo-level secrets (strings/files)
 * - Supports environment-scoped secrets via `environments: { <env>: { strings, files } }`
 *
 * Usage:
 *   ./sync-github-secrets.ts <owner/repo> <secrets.json5> [--dry-run]
 *
 * Examples:
 * npx ts-node ./scripts/sync-github-secrets.ts BBaysinger/bb-portfolio ./.github-secrets.json5 --dry-run
 * npx ts-node ./scripts/sync-github-secrets.ts BBaysinger/bb-portfolio ./.github-secrets.json5
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
let data: SecretsFile = JSON5.parse(raw);

// Normalize structure
data.strings = data.strings ?? {};
data.files = data.files ?? {};
data.environments = data.environments ?? {};

// Expand ~ in file paths
for (const [k, v] of Object.entries(data.files)) {
  if (typeof v === "string" && v.startsWith("~")) {
    data.files[k] = path.join(os.homedir(), v.slice(1));
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
