#!/usr/bin/env tsx

import { fileURLToPath } from "node:url";

import { parseCliOptions, writeEnvFiles } from "./lib/env-writers";
import { canonicalEnvKeys } from "./lib/secrets";

/**
 * GitHub-friendly entrypoint that reads canonical secrets directly from
 * process.env (populated by the workflow) and emits .env bundles.
 */
const ADDITIONAL_ENV_KEYS = ["S3_REGION"] as const;

const collectEnvSecrets = () => {
  const keys = new Set<string>([...canonicalEnvKeys, ...ADDITIONAL_ENV_KEYS]);
  const entries: [string, string][] = [];
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== "") {
      entries.push([key, value]);
    }
  }
  return Object.fromEntries(entries);
};

const run = () => {
  const options = parseCliOptions(process.argv.slice(2));
  if (options.profiles.length !== 1) {
    throw new Error(
      "Environment-sourced generation supports exactly one profile per invocation.",
    );
  }

  const secrets = collectEnvSecrets();
  if (!Object.keys(secrets).length) {
    throw new Error(
      "No environment-based secrets found. Ensure canonical environment variables are exported before running this script.",
    );
  }

  writeEnvFiles({
    ...options,
    resolveSecrets: () => ({ strings: { ...secrets }, files: {} }),
  });
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  run();
}

export { run };
