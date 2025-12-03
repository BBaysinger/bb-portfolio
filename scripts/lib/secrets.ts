import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Script } from "node:vm";

import JSON5 from "json5";

type Json5Parser = { parse: (raw: string) => unknown };

const fallbackJson5: Json5Parser = {
  parse: (raw: string) => {
    const script = new Script(`(${raw})`);
    return script.runInNewContext({});
  },
};

const json5: Json5Parser = (() => {
  try {
    const candidate = JSON5 as Json5Parser | undefined;
    if (candidate && typeof candidate.parse === "function") {
      return candidate;
    }
  } catch {
    // Ignore and fall back below.
  }
  return fallbackJson5;
})();

export type SecretProfile = string;

export type SecretMap = Record<string, string>;

export interface SecretBundle {
  strings: SecretMap;
  files: SecretMap;
}

const DEFAULT_SHARED_FILE = ".github-secrets.private.json5";

const profileFile = (profile: SecretProfile): string =>
  `.github-secrets.private.${profile}.json5`;

const normalizeBundle = (data: unknown): SecretBundle => {
  if (!data || typeof data !== "object") {
    return { strings: {}, files: {} };
  }

  if (
    (data as { strings?: unknown }).strings ||
    (data as { files?: unknown }).files
  ) {
    const { strings, files } = data as {
      strings?: Record<string, unknown>;
      files?: Record<string, unknown>;
    };
    const safeStrings: SecretMap = {};
    const safeFiles: SecretMap = {};

    if (strings) {
      for (const [key, value] of Object.entries(strings)) {
        if (value === undefined || value === null) continue;
        safeStrings[key] = String(value);
      }
    }

    if (files) {
      for (const [key, value] of Object.entries(files)) {
        if (value === undefined || value === null) continue;
        safeFiles[key] = String(value);
      }
    }

    return { strings: safeStrings, files: safeFiles };
  }

  const plain = data as Record<string, unknown>;
  const safeStrings: SecretMap = {};
  for (const [key, value] of Object.entries(plain)) {
    if (value === undefined || value === null) continue;
    safeStrings[key] = String(value);
  }
  return { strings: safeStrings, files: {} };
};

const readSecretsFile = (filePath: string): SecretBundle => {
  if (!existsSync(filePath)) {
    return { strings: {}, files: {} };
  }
  const raw = readFileSync(filePath, "utf8");
  const parsed = json5.parse(raw) as unknown;
  return normalizeBundle(parsed);
};

export interface LoadSecretsOptions {
  profile?: SecretProfile;
  rootDir?: string;
  sharedFile?: string;
}

export const loadSecrets = (options: LoadSecretsOptions = {}): SecretBundle => {
  const { profile, rootDir, sharedFile = DEFAULT_SHARED_FILE } = options;
  const baseDir = rootDir ? path.resolve(rootDir) : process.cwd();
  const sharedPath = path.resolve(baseDir, sharedFile);
  const shared = readSecretsFile(sharedPath);

  if (!profile) {
    return shared;
  }

  const profilePath = path.resolve(baseDir, profileFile(profile));
  if (!existsSync(profilePath)) {
    return shared;
  }

  const scoped = readSecretsFile(profilePath);
  return {
    strings: { ...shared.strings, ...scoped.strings },
    files: { ...shared.files, ...scoped.files },
  };
};

export const resolveSecret = (
  key: string,
  options: LoadSecretsOptions = {},
): string => {
  const bundle = loadSecrets(options);
  if (key in bundle.strings) {
    return bundle.strings[key];
  }
  if (key in bundle.files) {
    return bundle.files[key];
  }
  return "";
};

export const canonicalEnvKeys = [
  "AWS_REGION",
  "S3_BUCKET",
  "MONGODB_URI",
  "PAYLOAD_SECRET",
  "FRONTEND_URL",
  "PUBLIC_SERVER_URL",
  "BACKEND_INTERNAL_URL",
  "PUBLIC_PROJECTS_BUCKET",
  "PUBLIC_PROJECTS_PREFIX",
  "NDA_PROJECTS_BUCKET",
  "NDA_PROJECTS_PREFIX",
  "SES_FROM_EMAIL",
  "SES_TO_EMAIL",
  "SMTP_FROM_EMAIL",
  "SECURITY_TXT_EXPIRES",
  "REQUIRED_ENVIRONMENT_VARIABLES",
  "NEXT_PUBLIC_RUM_APP_MONITOR_ID",
  "NEXT_PUBLIC_RUM_IDENTITY_POOL_ID",
  "NEXT_PUBLIC_RUM_GUEST_ROLE_ARN",
  "NEXT_PUBLIC_RUM_REGION",
] as const;

export type CanonicalEnvKey = (typeof canonicalEnvKeys)[number];
