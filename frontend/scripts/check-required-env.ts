#!/usr/bin/env tsx
/*
  Frontend prebuild guard for required env vars (TypeScript version).

  Features:
  - Loads .env files with Next.js-like precedence before validation:
    1) .env
    2) .env.[development|production] (based on NODE_ENV)
    3) .env.local (overrides)
  - REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND: comma-separated list; supports ANY-of groups with "|".
  - Default safety: in CI+prod, require a backend base URL if no explicit requirements were provided.
*/

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TAG = "[frontend:check-required-env]";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

type RequirementGroup = string[];

type RequirementList = RequirementGroup[];

async function loadEnvFiles(paths: string[]): Promise<void> {
  try {
    const dotenvMod = await import("dotenv");
    const dotenv = (dotenvMod.default || dotenvMod) as {
      config: (options: { path: string; override: boolean }) => void;
    };

    for (const filePath of paths) {
      if (existsSync(filePath)) {
        dotenv.config({ path: filePath, override: true });
      }
    }
  } catch {
    try {
      for (const filePath of paths) {
        if (!existsSync(filePath)) continue;
        const content = readFileSync(filePath, "utf8");
        for (const rawLine of content.split(/\r?\n/)) {
          const line = rawLine.trim();
          if (!line || line.startsWith("#")) continue;
          const idx = line.indexOf("=");
          if (idx === -1) continue;
          const key = line.slice(0, idx).trim();
          if (!key) continue;
          const rawValue = line.slice(idx + 1).trim();
          const value = rawValue.replace(/^"|^'|"$|'$/g, "");
          process.env[key] = value;
        }
      }
      console.info(`${TAG} Loaded .env files via fallback parser`);
    } catch (error) {
      console.warn(
        `${TAG} Warning: dotenv not available; skipping .env preload`,
        error,
      );
    }
  }
}

function parseRequirements(input: string): RequirementList {
  if (!input) return [];
  return input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((entry) =>
      entry
        .split("|")
        .map((value) => value.trim())
        .filter(Boolean),
    );
}

function summarize(groups: RequirementList): string {
  if (!groups.length) return "<none> (no requirements enforced)";
  return groups.map((group) => `[${group.join("|")}]`).join(", ");
}

async function main() {
  const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
  const envFiles = [
    resolve(rootDir, ".env"),
    nodeEnv === "production"
      ? resolve(rootDir, ".env.production")
      : resolve(rootDir, ".env.development"),
    resolve(rootDir, ".env.local"),
  ];
  await loadEnvFiles(envFiles);

  const { CI, GITHUB_ACTIONS, NODE_ENV, ENV_PROFILE } = process.env;
  const inCI = CI === "true" || GITHUB_ACTIONS === "true";
  const lifecycle = (process.env.npm_lifecycle_event || "").toLowerCase();
  const isBuildLifecycle =
    lifecycle.includes("build") || lifecycle === "prebuild";

  const deriveProfile = (): string => {
    const raw = (ENV_PROFILE || NODE_ENV || "").toLowerCase().trim();
    if (raw) return raw;
    if (isBuildLifecycle) return "prod";
    return "local";
  };

  const profile = deriveProfile();

  const rawListFrontend =
    `${process.env.REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND || ""}`.trim();
  const requirements = parseRequirements(rawListFrontend);
  const defaultBackendGroup: RequirementGroup = ["BACKEND_INTERNAL_URL"];
  const hasDefinitionVar = rawListFrontend.length > 0;

  if ((inCI || profile === "prod") && !hasDefinitionVar) {
    const msg = [
      `${TAG} Missing definition of required env list.`,
      `Profile: ${profile || "<none>"}`,
      "Please set REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND.",
      'Define a comma-separated list of groups ("|" for ANY-of).',
      "Example:",
      "  REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND=BACKEND_INTERNAL_URL",
    ].join("\n");
    console.error(msg);
    process.exit(1);
  }

  const effectiveRequirements: RequirementList = requirements.length
    ? requirements
    : inCI || profile === "prod"
      ? [defaultBackendGroup]
      : [];

  const missingGroups: string[] = [];
  for (const group of effectiveRequirements) {
    const satisfied = group.some((name) => !!process.env[name]);
    if (!satisfied) missingGroups.push(group.join("|"));
  }

  if (missingGroups.length > 0) {
    const msg = [
      `${TAG} Missing required environment variables.`,
      `Profile: ${profile || "<none>"}`,
      "Definition source: REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND",
      "The following requirements were not satisfied (ANY-of within each group):",
      ...missingGroups.map((group) => `  - ${group}`),
      "",
      "Configure REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND accordingly.",
      "Example:",
      "  REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND=BACKEND_INTERNAL_URL",
      "",
      "Note: In CI+prod, a default requirement enforces at least one backend base URL variable to avoid empty deploys.",
    ].join("\n");

    if (inCI || profile === "prod") {
      console.error(msg);
      process.exit(1);
    } else {
      console.warn(msg);
    }
  } else {
    console.info(
      `${TAG} All required envs satisfied. Profile=${profile} Source=REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND Requirements=${summarize(effectiveRequirements)}\nCI=${CI} NODE_ENV=${NODE_ENV} ENV_PROFILE=${ENV_PROFILE} LIFECYCLE=${lifecycle}`,
    );
  }
}

main().catch((error) => {
  console.error(`${TAG} Unexpected failure`, error);
  process.exit(1);
});
