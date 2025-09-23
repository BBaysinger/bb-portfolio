#!/usr/bin/env ts-node

/**
 * Sync secrets.json5 into GitHub repo secrets (destructive: removes extras)
 *
 * Usage:
 *   ./sync-github-secrets.ts <owner/repo> <secrets.json5> [--dry-run]
 *
 * Examples:
  * npx ts-node ./scripts/sync-github-secrets.ts BBaysinger/bb-portfolio ./github-secrets.json5 --dry-run
  * npx ts-node ./scripts/sync-github-secrets.ts BBaysinger/bb-portfolio ./github-secrets.json5
*/

import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

import JSON5 from "json5";

interface SecretsFile {
  strings?: Record<string, string>;
  files?: Record<string, string>;
}

if (process.argv.length < 4 || process.argv.length > 5) {
  console.error("Usage: sync-github-secrets.ts <owner/repo> <secrets.json5> [--dry-run]");
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

// Expand ~ in file paths
for (const [k, v] of Object.entries(data.files)) {
  if (typeof v === "string" && v.startsWith("~")) {
    data.files[k] = path.join(os.homedir(), v.slice(1));
  }
}

// Get current GitHub secrets
let currentKeys: string[] = [];
try {
  const output = execSync(`gh secret list --repo ${REPO} --json name -q '.[].name'`, { encoding: "utf8" });
  currentKeys = output.split(/\r?\n/).filter(Boolean);
} catch {
  console.error("Error: failed to fetch current GitHub secrets. Is gh authenticated?");
  process.exit(1);
}

const desiredKeys = [
  ...Object.keys(data.strings),
  ...Object.keys(data.files),
];

// Remove extras
for (const key of currentKeys) {
  if (!desiredKeys.includes(key)) {
    if (DRY_RUN) {
      console.log(`🗑 (dry run) Would remove old secret: ${key}`);
    } else {
      console.log(`🗑 Removing old secret: ${key}`);
      execSync(`gh secret delete ${key} --repo ${REPO}`, { stdio: "inherit" });
    }
  }
}

// Set string secrets
for (const [key, value] of Object.entries(data.strings)) {
  if (DRY_RUN) {
    console.log(`🔑 (dry run) Would set string ${key} (length: ${value.length})`);
  } else {
    console.log(`🔑 Setting string ${key} ...`);
    execSync(`gh secret set ${key} --repo ${REPO}`, {
      input: value,
      stdio: ["pipe", "inherit", "inherit"],
    });
  }
}

// Set file secrets
for (const [key, filepath] of Object.entries(data.files)) {
  if (!fs.existsSync(filepath)) {
    console.warn(`⚠️ Skipping ${key}, file not found: ${filepath}`);
    continue;
  }
  if (DRY_RUN) {
    const size = fs.statSync(filepath).size;
    console.log(`📄 (dry run) Would set file ${key} from ${filepath} (${size} bytes)`);
  } else {
    console.log(`📄 Setting file ${key} from ${filepath} ...`);
    const content = fs.readFileSync(filepath, "utf8");
    execSync(`gh secret set ${key} --repo ${REPO}`, {
      input: content,
      stdio: ["pipe", "inherit", "inherit"],
    });
  }
}

if (DRY_RUN) {
  console.log("✅ Dry run complete! No secrets were changed.");
} else {
  console.log(`✅ Sync complete! Repo ${REPO} now matches ${JSON_FILE} exactly.`);
}
