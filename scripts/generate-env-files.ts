#!/usr/bin/env tsx
/*
  Unified env file generator.
  ---------------------------
  Generates backend/frontend .env files for one or more profiles by reading
  .github-secrets.private.json5 plus the matching .github-secrets.private.<env>.json5
  overlay. Outputs unprefixed environment variables regardless of profile.

  Usage examples:
    tsx scripts/generate-env-files.ts --out ./tmp/env-bundle
    tsx scripts/generate-env-files.ts ./tmp/env-bundle --profiles prod,dev --targets backend,frontend
    tsx scripts/generate-env-files.ts ./tmp/env-bundle --profiles prod --targets backend
*/

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadSecrets,
  type SecretBundle,
  canonicalEnvKeys,
} from "./lib/secrets";

type Profile = "prod" | "dev" | string;
type Target = "backend" | "frontend";

type CliOptions = {
  outDir: string;
  profiles: Profile[];
  targets: Target[];
};

type EnvWriters = Record<
  Target,
  (profile: Profile, secrets: SecretBundle) => string
>;

const ADDITIONAL_ENV_KEYS = ["S3_REGION"] as const;

const preferEnvSource =
  process.env.GENERATE_ENV_FROM_ENV === "true" ||
  process.env.GITHUB_ACTIONS === "true";

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

const sharedEnvSecrets = collectEnvSecrets();
const hasEnvSecrets = Object.keys(sharedEnvSecrets).length > 0;
const usingEnvSecrets = preferEnvSource && hasEnvSecrets;

const ensureProfileModeCompatibility = (profiles: Profile[]) => {
  if (preferEnvSource && !hasEnvSecrets) {
    throw new Error(
      "Env-source mode requested but no matching environment variables were found. Ensure the workflow exports the canonical secrets before running this script.",
    );
  }
  if (usingEnvSecrets && profiles.length > 1) {
    throw new Error(
      "Environment-sourced generation supports one profile per run. Invoke the script separately for each environment.",
    );
  }
};

const DEFAULT_PROFILES: Profile[] = ["prod", "dev"];
const DEFAULT_TARGETS: Target[] = ["backend", "frontend"];

const resolveSecrets = (profile: Profile): SecretBundle => {
  if (usingEnvSecrets) {
    return { strings: { ...sharedEnvSecrets }, files: {} };
  }
  return loadSecrets({ profile });
};

const writers: EnvWriters = {
  backend(profile, secrets) {
    const isProd = profile === "prod";
    const get = (key: string, fallback = "") =>
      secrets.strings[key] ?? fallback;
    const awsRegion = get("AWS_REGION", get("S3_REGION", "us-west-2"));

    const resolvedPublicServer = get("PUBLIC_SERVER_URL", get("FRONTEND_URL"));
    const payloadServerOverride = get("PAYLOAD_PUBLIC_SERVER_URL", resolvedPublicServer);

    const lines = [
      `NODE_ENV=${isProd ? "production" : "development"}`,
      `ENV_PROFILE=${profile}`,
    ];

    if (!isProd) {
      lines.push("PORT=3000");
    }

    lines.push(
      "",
      "# Env-guard definition list",
      `REQUIRED_ENVIRONMENT_VARIABLES=${get("REQUIRED_ENVIRONMENT_VARIABLES")}`,
      "",
      `AWS_REGION=${awsRegion}`,
      `S3_REGION=${get("S3_REGION", awsRegion)}`,
      "",
      `MONGODB_URI=${get("MONGODB_URI")}`,
      `PAYLOAD_SECRET=${get("PAYLOAD_SECRET")}`,
      "",
      `S3_BUCKET=${get("S3_BUCKET")}`,
      `PUBLIC_PROJECTS_BUCKET=${get("PUBLIC_PROJECTS_BUCKET")}`,
      `PUBLIC_PROJECTS_PREFIX=${get("PUBLIC_PROJECTS_PREFIX")}`,
      `NDA_PROJECTS_BUCKET=${get("NDA_PROJECTS_BUCKET")}`,
      `NDA_PROJECTS_PREFIX=${get("NDA_PROJECTS_PREFIX")}`,
      "",
      `FRONTEND_URL=${get("FRONTEND_URL")}`,
      `PUBLIC_SERVER_URL=${resolvedPublicServer}`,
      `PAYLOAD_PUBLIC_SERVER_URL=${payloadServerOverride}`,
      `BACKEND_INTERNAL_URL=${get(
        "BACKEND_INTERNAL_URL",
        isProd
          ? "http://bb-portfolio-backend-prod:3000"
          : "http://bb-portfolio-backend-dev:3000",
      )}`,
      "",
      `SECURITY_TXT_EXPIRES=${get("SECURITY_TXT_EXPIRES")}`,
      "",
      `SES_FROM_EMAIL=${get("SES_FROM_EMAIL", get("SMTP_FROM_EMAIL"))}`,
      `SES_TO_EMAIL=${get("SES_TO_EMAIL")}`,
      `SMTP_FROM_EMAIL=${get("SMTP_FROM_EMAIL", get("SES_FROM_EMAIL"))}`,
    );

    return `${lines.join("\n")}\n`;
  },

  frontend(profile, secrets) {
    const isProd = profile === "prod";
    const get = (key: string, fallback = "") =>
      secrets.strings[key] ?? fallback;
    const awsRegion = get("AWS_REGION", get("S3_REGION", "us-west-2"));

    const lines = [
      `NODE_ENV=${isProd ? "production" : "development"}`,
      `ENV_PROFILE=${profile}`,
      "",
      `BACKEND_INTERNAL_URL=${get(
        "BACKEND_INTERNAL_URL",
        isProd
          ? "http://bb-portfolio-backend-prod:3000"
          : "http://bb-portfolio-backend-dev:3000",
      )}`,
      `FRONTEND_URL=${get("FRONTEND_URL")}`,
      "",
      `PUBLIC_PROJECTS_BUCKET=${get("PUBLIC_PROJECTS_BUCKET")}`,
      `PUBLIC_PROJECTS_PREFIX=${get("PUBLIC_PROJECTS_PREFIX")}`,
      `NDA_PROJECTS_BUCKET=${get("NDA_PROJECTS_BUCKET")}`,
      `NDA_PROJECTS_PREFIX=${get("NDA_PROJECTS_PREFIX")}`,
      "",
      `AWS_REGION=${awsRegion}`,
      "",
      "# CloudWatch RUM (Real User Monitoring)",
      `NEXT_PUBLIC_RUM_APP_MONITOR_ID=${get("NEXT_PUBLIC_RUM_APP_MONITOR_ID")}`,
      `NEXT_PUBLIC_RUM_IDENTITY_POOL_ID=${get("NEXT_PUBLIC_RUM_IDENTITY_POOL_ID")}`,
      `NEXT_PUBLIC_RUM_GUEST_ROLE_ARN=${get("NEXT_PUBLIC_RUM_GUEST_ROLE_ARN")}`,
      `NEXT_PUBLIC_RUM_REGION=${get("NEXT_PUBLIC_RUM_REGION", awsRegion)}`,
    ];

    return `${lines.join("\n")}\n`;
  },
};

const parseCli = (): CliOptions => {
  const args = process.argv.slice(2);
  let outDir: string | undefined;
  let profiles: Profile[] = [];
  let targets: Target[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!outDir && !arg.startsWith("--")) {
      outDir = arg;
      continue;
    }
    if (arg === "--out" || arg === "-o") {
      outDir = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--profiles" || arg === "-p") {
      const raw = args[i + 1] ?? "";
      profiles = raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      i += 1;
      continue;
    }
    if (arg === "--targets" || arg === "-t") {
      const raw = args[i + 1] ?? "";
      targets = raw
        .split(",")
        .map((item) => item.trim() as Target)
        .filter(
          (item): item is Target => item === "backend" || item === "frontend",
        );
      i += 1;
      continue;
    }
    console.warn(`⚠️  Unknown argument ignored: ${arg}`);
  }

  if (!outDir) {
    throw new Error(
      "Output directory is required. Pass as positional arg or --out <dir>.",
    );
  }

  return {
    outDir,
    profiles: profiles.length ? profiles : DEFAULT_PROFILES,
    targets: targets.length ? targets : DEFAULT_TARGETS,
  };
};

const writeEnvFiles = (options: CliOptions) => {
  const { outDir, profiles, targets } = options;
  mkdirSync(outDir, { recursive: true });
  ensureProfileModeCompatibility(profiles);

  for (const profile of profiles) {
    const secrets = resolveSecrets(profile);
    for (const target of targets) {
      const writer = writers[target];
      const content = writer(profile, secrets);
      const fileName = `${target}.env.${profile}`;
      const filePath = path.resolve(outDir, fileName);
      writeFileSync(filePath, content, "utf8");
      console.info(`📝 wrote ${fileName}`);
    }
  }
};

const run = () => {
  const options = parseCli();
  writeEnvFiles(options);
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  run();
}

export { run, writeEnvFiles };
