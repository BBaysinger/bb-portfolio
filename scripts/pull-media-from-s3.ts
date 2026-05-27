#!/usr/bin/env tsx
/**
 * Pull media files from an S3 media bucket into the external sibling seedings folder.
 *
 * Default destination:
 *   ../cms-media-seedings/<collection>/
 *
 * Supported collections:
 * - project-brand-logos
 * - cv-experience-logos
 * - project-screenshots
 * - project-thumbnails
 *
 * Usage:
 *   npm run media:pull -- --env prod --collection project-brand-logos
 *   npm run media:pull -- --env prod --collection project-brand-logos --dry-run
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { ensureAwsCredentials } from "./lib/aws-creds";

const scriptDir = path.dirname(__filename);
const repoRoot = path.resolve(scriptDir, "..");

const MEDIA_COLLECTIONS = [
  "project-brand-logos",
  "cv-experience-logos",
  "project-screenshots",
  "project-thumbnails",
] as const;

type Environment = "dev" | "prod";
type MediaCollection = (typeof MEDIA_COLLECTIONS)[number];

const SOURCE_PREFIX_BY_COLLECTION: Record<MediaCollection, string> = {
  "project-brand-logos": "brand-logos",
  "cv-experience-logos": "cv-experience-logos",
  "project-screenshots": "project-screenshots",
  "project-thumbnails": "project-thumbnails",
};

interface Options {
  environment: Environment;
  collection: MediaCollection;
  dryRun: boolean;
  profile?: string;
  region?: string;
  tfvarsPath?: string;
  seedingsDir?: string;
}

type ResolvedSeedingsRoot = {
  path: string;
  source: "flag" | "media-env" | "default";
};

function readTfvarsValue(tfvarsPath: string, key: string): string | undefined {
  if (!existsSync(tfvarsPath)) return undefined;
  const raw = readFileSync(tfvarsPath, "utf8");
  const re = new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"\\s*$`, "m");
  const match = raw.match(re);
  return match?.[1];
}

function resolveBucket(
  environment: Environment,
  opts: { tfvarsPath?: string },
): string {
  const tfvarsPath =
    opts.tfvarsPath || path.resolve(repoRoot, "infra/terraform.tfvars");
  const tfvarsKey = environment === "dev" ? "dev_s3_bucket" : "prod_s3_bucket";
  const fromTfvars = readTfvarsValue(tfvarsPath, tfvarsKey);
  if (fromTfvars) return fromTfvars;
  throw new Error(
    `Missing ${tfvarsKey} in ${tfvarsPath}. Define it before running media pull.`,
  );
}

function parseArgs(): Options {
  const args = process.argv.slice(2);

  let environment: Environment | undefined;
  let collection: MediaCollection | undefined;
  let dryRun = false;
  let profile: string | undefined;
  let region: string | undefined;
  let tfvarsPath: string | undefined;
  let seedingsDir: string | undefined;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    switch (arg) {
      case "--env": {
        const value = args[++index];
        if (value !== "dev" && value !== "prod") {
          throw new Error(
            `Invalid environment: ${value}. Use 'dev' or 'prod'.`,
          );
        }
        environment = value;
        break;
      }
      case "--collection": {
        const value = args[++index] as MediaCollection;
        if (!MEDIA_COLLECTIONS.includes(value)) {
          throw new Error(
            `Invalid collection: ${value}. Use one of: ${MEDIA_COLLECTIONS.join(", ")}`,
          );
        }
        collection = value;
        break;
      }
      case "--dry-run":
        dryRun = true;
        break;
      case "--profile":
        profile = args[++index];
        break;
      case "--region":
        region = args[++index];
        break;
      case "--tfvars":
        tfvarsPath = args[++index];
        break;
      case "--seedings-dir":
        seedingsDir = args[++index];
        break;
      case "--help":
      case "-h":
        console.info(`
Usage: npm run media:pull -- [options]

Options:
  --env <env>            Source environment: dev or prod
  --collection <name>    One of: ${MEDIA_COLLECTIONS.join(", ")}
  --dry-run              Show what would be copied without writing files
  --profile <name>       AWS CLI profile to use
  --region <name>        AWS region
  --tfvars <path>        Terraform tfvars path
  --seedings-dir <path>  Override default ../cms-media-seedings destination
  --help, -h             Show help

Examples:
  npm run media:pull -- --env prod --collection project-brand-logos
  npm run media:pull -- --env prod --collection project-brand-logos --dry-run
        `);
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!environment) throw new Error("Missing --env <dev|prod>");
  if (!collection)
    throw new Error(`Missing --collection <${MEDIA_COLLECTIONS.join("|")}>`);

  return {
    environment,
    collection,
    dryRun,
    profile,
    region,
    tfvarsPath,
    seedingsDir,
  };
}

function resolveSeedingsRoot(seedingsDir?: string): ResolvedSeedingsRoot {
  if (seedingsDir?.trim()) {
    return {
      path: path.isAbsolute(seedingsDir)
        ? seedingsDir
        : path.resolve(repoRoot, seedingsDir),
      source: "flag",
    };
  }

  const mediaSeedDir = process.env.PORTFOLIO_MEDIA_SEED_DIR?.trim();
  if (mediaSeedDir) {
    return {
      path: path.isAbsolute(mediaSeedDir)
        ? mediaSeedDir
        : path.resolve(repoRoot, mediaSeedDir),
      source: "media-env",
    };
  }

  return {
    path: path.resolve(repoRoot, "../cms-media-seedings"),
    source: "default",
  };
}

function checkPrerequisites(destinationDir: string) {
  try {
    execSync("aws --version", { stdio: "ignore" });
  } catch {
    throw new Error(
      "AWS CLI not found. Install it before pulling media from S3.",
    );
  }

  mkdirSync(destinationDir, { recursive: true });
}

function syncCollection(options: Options) {
  const bucket = resolveBucket(options.environment, {
    tfvarsPath: options.tfvarsPath,
  });
  const resolvedSeedingsRoot = resolveSeedingsRoot(options.seedingsDir);
  const destinationDir = path.resolve(
    resolvedSeedingsRoot.path,
    options.collection,
  );

  checkPrerequisites(destinationDir);
  ensureAwsCredentials({ profile: options.profile, region: options.region });

  console.info(
    `Resolved media seed destination (${resolvedSeedingsRoot.source}): ${resolvedSeedingsRoot.path}`,
  );

  const sourcePrefix = SOURCE_PREFIX_BY_COLLECTION[options.collection];
  const sourcePath = `s3://${bucket}/${sourcePrefix}/`;
  const destinationPath = `${destinationDir}/`;
  const dryrunFlag = options.dryRun ? "--dryrun" : "";
  const quote = (value: string) => `"${value.replace(/"/g, '\\"')}"`;
  const cmd = [
    "aws",
    options.profile ? `--profile ${options.profile}` : "",
    options.region ? `--region ${options.region}` : "",
    "s3 sync",
    quote(sourcePath),
    quote(destinationPath),
    "--exclude",
    '".DS_Store"',
    dryrunFlag,
  ]
    .filter(Boolean)
    .join(" ");

  console.info(
    `${options.dryRun ? "[DRY RUN] " : ""}Pulling ${options.collection} from ${options.environment} into ${destinationDir}`,
  );
  console.info(`Command: ${cmd}`);

  execSync(cmd, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "inherit",
  });
}

function main() {
  try {
    const options = parseArgs();
    syncCollection(options);
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Failed to pull media from S3.",
    );
    process.exit(1);
  }
}

main();
