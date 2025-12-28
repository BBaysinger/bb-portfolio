import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { SecretBundle } from "./secrets";

export type Profile = "prod" | "dev" | string;
export type Target = "backend" | "frontend";

export interface CliOptions {
  outDir: string;
  profiles: Profile[];
  targets: Target[];
}

export interface WriterOptions extends CliOptions {
  resolveSecrets: (profile: Profile) => SecretBundle;
}

export const DEFAULT_PROFILES: Profile[] = ["prod", "dev"];
export const DEFAULT_TARGETS: Target[] = ["backend", "frontend"];

export const parseCliOptions = (args: string[]): CliOptions => {
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
    profiles: profiles.length ? profiles : [...DEFAULT_PROFILES],
    targets: targets.length ? targets : [...DEFAULT_TARGETS],
  };
};

const backendEnv = (profile: Profile, secrets: SecretBundle): string => {
  const isProd = profile === "prod";
  const get = (key: string, fallback = "") => secrets.strings[key] ?? fallback;
  const awsRegion = get("AWS_REGION", get("S3_REGION", "us-west-2"));

  const resolvedPublicServer = get("PUBLIC_SERVER_URL", get("FRONTEND_URL"));
  const payloadServerOverride = get(
    "PAYLOAD_PUBLIC_SERVER_URL",
    resolvedPublicServer,
  );

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
    `REQUIRED_ENVIRONMENT_VARIABLES_BACKEND=${get(
      "REQUIRED_ENVIRONMENT_VARIABLES_BACKEND",
      get("REQUIRED_ENVIRONMENT_VARIABLES"),
    )}`,
    `REQUIRED_ENVIRONMENT_VARIABLES=${get(
      "REQUIRED_ENVIRONMENT_VARIABLES",
      get("REQUIRED_ENVIRONMENT_VARIABLES_BACKEND"),
    )}`,
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
};

const frontendEnv = (profile: Profile, secrets: SecretBundle): string => {
  const isProd = profile === "prod";
  const get = (key: string, fallback = "") => secrets.strings[key] ?? fallback;
  const awsRegion = get("AWS_REGION", get("S3_REGION", "us-west-2"));

  const lines = [
    `NODE_ENV=${isProd ? "production" : "development"}`,
    `ENV_PROFILE=${profile}`,
    "",
    "# Env-guard definition list",
    `REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND=${get(
      "REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND",
      get("REQUIRED_ENVIRONMENT_VARIABLES"),
    )}`,
    `REQUIRED_ENVIRONMENT_VARIABLES=${get(
      "REQUIRED_ENVIRONMENT_VARIABLES",
      get("REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND"),
    )}`,
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
    `NEXT_PUBLIC_RUM_DEBUG=${get("NEXT_PUBLIC_RUM_DEBUG", "false")}`,
  ];

  return `${lines.join("\n")}\n`;
};

const writers: Record<
  Target,
  (profile: Profile, secrets: SecretBundle) => string
> = {
  backend: backendEnv,
  frontend: frontendEnv,
};

export const writeEnvFiles = (options: WriterOptions): void => {
  const { outDir, profiles, targets, resolveSecrets } = options;
  mkdirSync(outDir, { recursive: true });

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
