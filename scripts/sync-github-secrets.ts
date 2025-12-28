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
 *   - Keep current JSON5 mode as default for consistency.
 *   - Add `--verify-json5` to report drift between JSON5 and env files.
 *   - Use dotenv (and optionally dotenv-expand) for parsing.
 *   - Preserve dry-run behavior; never print secret values (show lengths only).
 *   - Optional: allow a simple mapping file if GH secret names differ from env keys.
 */

/**
 * Sync secrets.json5 into GitHub secrets (destructive: removes extras)
 * - Repo-level secrets always sync first, followed by every detected GitHub Environment
 * - Environment manifests are discovered automatically (e.g., .github-secrets.private.dev.json5)
 * - Use --omit-env <name> to skip specific environments, or --omit-env all for repo-only runs
 * - Automatically creates GitHub Environments if they are referenced but missing
 * - Optional overlay: if a sibling ".private" file exists next to the template, only
 *   schema keys present in the template are copied from the private file.
 *
 * Usage:
 *   ./sync-github-secrets.ts <owner/repo> <secrets.json5> [--omit-env <name>] [--dry-run]
 *
 * Examples:
 * npx ts-node ./scripts/sync-github-secrets.ts BBaysinger/bb-portfolio ./.github-secrets.private.json5 --dry-run
 * npx ts-node ./scripts/sync-github-secrets.ts BBaysinger/bb-portfolio ./.github-secrets.private.json5 --omit-env dev --dry-run
 */

import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

import JSON5 from "json5";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface SecretGroup {
  strings?: Record<string, string>;
  files?: Record<string, string>;
}

interface SecretsFile extends SecretGroup {
  environments?: Record<string, SecretGroup>;
}

const args = process.argv.slice(2);
let REPO: string | undefined;
let JSON_FILE: string | undefined;
let DRY_RUN = false;
const omitEnvs = new Set<string>();
const ensuredEnvironments = new Set<string>();
let omitAllEnvs = false;

const markOmit = (value?: string) => {
  const label = value?.trim();
  if (!label) {
    console.error(
      "--omit-env flag requires a value (e.g., dev, prod, stage, all)",
    );
    process.exit(1);
  }
  if (label.toLowerCase() === "all") {
    omitAllEnvs = true;
    return;
  }
  omitEnvs.add(label);
};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--dry-run") {
    DRY_RUN = true;
    continue;
  }
  if (arg === "--omit-env") {
    markOmit(args[i + 1]);
    i += 1;
    continue;
  }
  if (arg === "--omit-envs") {
    const list = args[i + 1];
    if (!list) {
      console.error(
        "--omit-envs flag requires a comma-separated list (e.g., dev,stage)",
      );
      process.exit(1);
    }
    list
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((env) => markOmit(env));
    i += 1;
    continue;
  }
  if (arg === "--env" || arg === "-e") {
    console.error(
      "❌ The --env flag is no longer supported. Secrets sync now targets all environments by default. Use --omit-env <name> to skip specific environments.",
    );
    process.exit(1);
  }
  if (!REPO) {
    REPO = arg;
    continue;
  }
  if (!JSON_FILE) {
    JSON_FILE = arg;
    continue;
  }
  console.error(`Unexpected argument: ${arg}`);
  process.exit(1);
}

if (!REPO || !JSON_FILE) {
  console.error(
    "Usage: sync-github-secrets.ts <owner/repo> <secrets.json5> [--omit-env <name|all>] [--dry-run]",
  );
  process.exit(1);
}

const manifestPath = JSON_FILE ? path.resolve(JSON_FILE) : undefined;

if (!manifestPath || !fs.existsSync(manifestPath)) {
  console.error(
    `Error: File not found: ${JSON_FILE ?? "<unspecified secrets file>"}`,
  );
  process.exit(1);
}

const manifestDir = path.dirname(manifestPath);
const manifestBaseName = path.basename(manifestPath);
const envSuffixMatch = manifestBaseName.match(/(.+)\.([^.]+)\.json5$/);
if (envSuffixMatch) {
  const candidateBaseName = `${envSuffixMatch[1]}.json5`;
  const candidateBasePath = path.join(manifestDir, candidateBaseName);
  if (
    candidateBaseName !== manifestBaseName &&
    fs.existsSync(candidateBasePath)
  ) {
    console.error(
      "❌ Please run the sync script with the shared manifest (e.g., .github-secrets.private.json5). Use --omit-env to skip environments instead of supplying environment-specific files.",
    );
    process.exit(1);
  }
}

console.info(`📥 Reading secrets from ${manifestPath} (repo scope)...`);

const raw = fs.readFileSync(manifestPath, "utf8");
let baseData: SecretsFile = JSON5.parse(raw);

// Normalize structure for base
baseData.strings = baseData.strings ?? {};
baseData.files = baseData.files ?? {};
baseData.environments = baseData.environments ?? {};

// Attempt to overlay private values from sibling ".private" file
const privatePath = path.join(
  path.dirname(manifestPath),
  path.basename(manifestPath).replace(/\.json5$/, ".private.json5"),
);

let data: SecretsFile = baseData;
if (
  privatePath &&
  manifestPath &&
  path.resolve(privatePath) !== manifestPath &&
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
    console.info(
      `🔒 Using private overrides from ${privatePath} (restricted to template schema)`,
    );
  } catch {
    console.warn(
      `⚠️ Failed to parse private overrides at ${privatePath}; proceeding without overlays.`,
    );
  }
}

// Validate required variables lists against provided secrets schema/values.
// Each ANY-of group in REQUIRED_ENVIRONMENT_VARIABLES must have at least one
// corresponding secret present after merging base + environment manifests.
// To bypass enforcement (not recommended), set ALLOW_MISSING_REQUIRED_GROUPS=true.
function parseRequirements(list: string | undefined): string[][] {
  if (!list) return [];
  return list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((group) =>
      group
        .split("|")
        .map((x) => x.trim())
        .filter(Boolean),
    );
}

const manifestStem = manifestBaseName.replace(/\.json5$/, "");
const envManifestRegex = new RegExp(
  `^${escapeRegExp(manifestStem)}\\.([A-Za-z0-9_-]+)\\.json5$`,
);
const defaultBaseCandidate = path.join(
  manifestDir,
  ".github-secrets.private.json5",
);

const readStrings = (input?: SecretGroup): Record<string, string> => {
  if (!input) return {};
  if (input.strings) return { ...input.strings };
  return { ...(input as Record<string, string>) };
};

const uniqueCandidates = Array.from(
  new Set<string>([manifestPath, defaultBaseCandidate]),
);

const baseStrings = (() => {
  for (const candidate of uniqueCandidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const parsed = JSON5.parse(
        fs.readFileSync(candidate, "utf8"),
      ) as SecretsFile;
      return readStrings(parsed);
    } catch (err) {
      console.warn(
        `⚠️ Failed to parse base secrets at ${candidate}: ${(err as Error).message}`,
      );
    }
  }
  return readStrings(data);
})();
const allowMissingGroups =
  (process.env.ALLOW_MISSING_REQUIRED_GROUPS || "").toLowerCase() === "true";

validateRepoRequirements(data.strings ?? {});

function validateRepoRequirements(strings: Record<string, string>) {
  const front = strings["REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND"];
  const back = strings["REQUIRED_ENVIRONMENT_VARIABLES_BACKEND"];
  const legacy = strings["REQUIRED_ENVIRONMENT_VARIABLES"];

  if (!front && !back && !legacy) {
    console.info(
      "ℹ️ Base manifest does not define any required env lists; skipping repo-level validation.",
    );
    return;
  }

  if (front || back) {
    console.info(
      "ℹ️ Split required env lists defined on base manifest; each environment will be validated against them.",
    );
    if (front) {
      console.info("  - REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND");
    }
    if (back) {
      console.info("  - REQUIRED_ENVIRONMENT_VARIABLES_BACKEND");
    }
    return;
  }

  console.info(
    "ℹ️ REQUIRED_ENVIRONMENT_VARIABLES defined on base manifest; each environment will be validated against this legacy list.",
  );
}

function validateEnvironmentRequirements(
  envName: string,
  stringsOverride?: Record<string, string>,
) {
  const strings = stringsOverride ?? {};
  const frontSource =
    strings["REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND"] ||
    baseStrings["REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND"];
  const backSource =
    strings["REQUIRED_ENVIRONMENT_VARIABLES_BACKEND"] ||
    baseStrings["REQUIRED_ENVIRONMENT_VARIABLES_BACKEND"];
  const legacySource =
    strings["REQUIRED_ENVIRONMENT_VARIABLES"] ||
    baseStrings["REQUIRED_ENVIRONMENT_VARIABLES"];

  const splitMode = !!frontSource || !!backSource;
  const toValidate: Array<{ label: string; source: string }> = [];

  if (splitMode) {
    if (frontSource) {
      toValidate.push({
        label: "REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND",
        source: frontSource,
      });
    }
    if (backSource) {
      toValidate.push({
        label: "REQUIRED_ENVIRONMENT_VARIABLES_BACKEND",
        source: backSource,
      });
    }
  } else if (legacySource) {
    toValidate.push({
      label: "REQUIRED_ENVIRONMENT_VARIABLES",
      source: legacySource,
    });
  }

  if (toValidate.length === 0) {
    console.info(
      `ℹ️ [${envName}] No required env lists defined; skipping validation.`,
    );
    return;
  }

  const mergedStrings = { ...baseStrings, ...strings };
  const keys = new Set(Object.keys(mergedStrings));

  for (const item of toValidate) {
    const groups = parseRequirements(item.source);

    const missing: string[] = [];
    for (const group of groups) {
      const satisfied = group.some((k) => keys.has(k));
      if (!satisfied) missing.push(group.join("|"));
    }

    if (missing.length) {
      const header = `❌ [${envName}] Missing required secret groups for ${item.label}:`;
      const body = missing.map((g) => `  • ${g}`).join("\n");
      const footer =
        "Each group uses '|' to indicate ANY-of. Add one secret for each group.";
      const message = [header, body, footer].join("\n");
      if (allowMissingGroups) {
        console.warn(message);
      } else {
        console.error(message);
        process.exit(1);
      }
      return;
    }

    const summary =
      groups.map((g) => `[${g.join("|")}]`).join(", ") || "<none>";
    console.info(`✅ [${envName}] ${item.label} satisfied: ${summary}`);
  }
}

const expandFileShortcuts = (files?: Record<string, string>) => {
  if (!files) return;
  for (const [k, v] of Object.entries(files)) {
    if (typeof v === "string" && v.startsWith("~")) {
      files[k] = path.join(os.homedir(), v.slice(1));
    }
  }
};

expandFileShortcuts(data.files);

const normalizeGroup = (group?: SecretGroup): SecretGroup => ({
  strings: { ...(group?.strings ?? {}) },
  files: { ...(group?.files ?? {}) },
});

type EnvTarget = { group: SecretGroup; source: string };
const envTargets = new Map<string, EnvTarget>();

for (const [envName, envGroup] of Object.entries(data.environments ?? {})) {
  envTargets.set(envName, {
    group: normalizeGroup(envGroup),
    source: `${manifestPath}#environments.${envName}`,
  });
}

const siblingEnvFiles = fs
  .readdirSync(manifestDir)
  .filter((file) => envManifestRegex.test(file));

for (const fileName of siblingEnvFiles) {
  const match = fileName.match(envManifestRegex);
  if (!match) continue;
  const envName = match[1];
  const filePath = path.join(manifestDir, fileName);
  try {
    const rawEnv = fs.readFileSync(filePath, "utf8");
    const parsedEnv = JSON5.parse(rawEnv) as SecretsFile;
    envTargets.set(envName, {
      group: normalizeGroup(parsedEnv),
      source: filePath,
    });
    console.info(
      `🌱 Discovered environment secrets for '${envName}' at ${filePath}`,
    );
  } catch (err) {
    console.error(
      `❌ Failed to parse environment secrets at ${filePath}: ${(err as Error).message}`,
    );
    process.exit(1);
  }
}

for (const target of envTargets.values()) {
  expandFileShortcuts(target.group.files);
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

function ensureEnvironmentExists(env: string) {
  if (ensuredEnvironments.has(env)) return;
  const envPath = `repos/${REPO}/environments/${env}`;
  try {
    execSync(`gh api ${envPath} --silent`, { stdio: "ignore" });
    ensuredEnvironments.add(env);
    return;
  } catch {
    console.info(
      `ℹ️  GitHub environment '${env}' not found. Creating it now...`,
    );
  }

  try {
    execSync(`gh api ${envPath} --method PUT`, {
      stdio: "inherit",
    });
    ensuredEnvironments.add(env);
    console.info(`✅ Created GitHub environment '${env}'.`);
  } catch {
    console.error(
      `❌ Failed to create GitHub environment '${env}'. Ensure you have admin access and the repo allows environment creation.`,
    );
    process.exit(1);
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
        console.info(
          `🗑 (dry run) Would remove old secret${env ? ` (${env})` : ""}: ${key}`,
        );
      } else {
        console.info(`🗑 Removing old secret${env ? ` (${env})` : ""}: ${key}`);
        execSync(`gh secret delete ${key} --repo ${REPO} ${scopeFlag}`.trim(), {
          stdio: "inherit",
        });
      }
    }
  }
}

function describeTarget(
  scope: "repo" | "env",
  env: string | undefined,
  key: string,
) {
  if (scope === "env" && env) return `${key} (env=${env})`;
  return `${key} (repo)`;
}

function setStrings(
  scope: "repo" | "env",
  env: string | undefined,
  strings: Record<string, string>,
) {
  for (const [key, value] of Object.entries(strings)) {
    const scopeFlag = scope === "env" && env ? `--env ${env}` : "";
    const targetLabel = describeTarget(scope, env, key);
    if (DRY_RUN) {
      console.info(
        `🔑 (dry run) Would set string ${targetLabel} (length: ${value.length})`,
      );
    } else {
      console.info(`🔑 Setting string ${targetLabel} ...`);
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
    const targetLabel = describeTarget(scope, env, key);
    if (DRY_RUN) {
      console.info(
        `📄 (dry run) Would set file ${targetLabel} from ${filepath} (${size} bytes)`,
      );
    } else {
      console.info(`📄 Setting file ${targetLabel} from ${filepath} ...`);
      const content = fs.readFileSync(filepath, "utf8");
      execSync(`gh secret set ${key} --repo ${REPO} ${scopeFlag}`.trim(), {
        input: content,
        stdio: ["pipe", "inherit", "inherit"],
      });
    }
  }
}

const syncScope = (
  scope: "repo" | "env",
  envName: string | undefined,
  group: SecretGroup | undefined,
) => {
  const strings = group?.strings ?? {};
  const files = group?.files ?? {};
  const currentKeys = listSecrets(scope, envName);
  const desiredKeys = [...Object.keys(strings), ...Object.keys(files)];
  removeExtras(scope, envName, currentKeys, desiredKeys);
  setStrings(scope, envName, strings);
  setFiles(scope, envName, files);
};

syncScope("repo", undefined, data);

const envEntries = Array.from(envTargets.entries());
if (!envEntries.length) {
  console.info(
    "ℹ️ No environment-specific manifests detected; repo-level secrets only.",
  );
}

if (omitAllEnvs) {
  console.info("🚫 Skipping all environment secrets per --omit-env all.");
} else {
  for (const envName of omitEnvs) {
    if (!envTargets.has(envName)) {
      console.warn(
        `⚠️ Requested to omit unknown environment '${envName}'; ignoring.`,
      );
    }
  }

  for (const [envName, target] of envEntries) {
    if (omitEnvs.has(envName)) {
      console.info(`🚫 Skipping environment '${envName}' per --omit-env flag.`);
      continue;
    }
    validateEnvironmentRequirements(envName, target.group.strings);
    ensureEnvironmentExists(envName);
    syncScope("env", envName, target.group);
  }
}

if (DRY_RUN) {
  console.info("✅ Dry run complete! No secrets were changed.");
} else {
  console.info(
    `✅ Sync complete! Repo ${REPO} (repo-level and environments) now matches ${manifestPath}.`,
  );
}
