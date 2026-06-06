#!/usr/bin/env tsx
/**
 * Upload local media files to S3 media buckets
 *
 * This script syncs the local backend/media files to the appropriate S3 media buckets.
 * It supports different environments (dev/prod) and excludes system/git files.
 *
 * Note: This is for Payload CMS media uploads. For project files, use a separate script.
 *
 * Usage:
 *   npm run media:upload -- --env dev
 *   npm run media:upload -- --env prod
 *   npm run media:upload -- --env both
 *   npm run media:upload -- --dry-run --env dev
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { ensureAwsCredentials } from "./lib/aws-creds";
import {
  MEDIA_COLLECTIONS,
  ensureMediaCollection,
} from "./lib/media-collections";

// Get script directory and repo root
const scriptDir = path.dirname(__filename);
const repoRoot = path.resolve(scriptDir, "..");

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
    `Missing ${tfvarsKey} in ${tfvarsPath}. Define it before running media uploads.`,
  );
}

type MediaCollection = string;

type Environment = "dev" | "prod";

interface Options {
  environments: Environment[];
  collections: MediaCollection[];
  dryRun: boolean;
  yes: boolean;
  profile?: string;
  region?: string;
  tfvarsPath?: string;
}

type ResolvedSnapshotRoot = {
  path: string;
  source: "snapshot-env";
};

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    environments: [],
    collections: [],
    dryRun: false,
    yes: false,
    profile: undefined,
    region: undefined,
    tfvarsPath: undefined,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--env":
        const env = args[++i];
        if (env === "both") {
          options.environments = ["dev", "prod"];
        } else if (env === "dev" || env === "prod") {
          options.environments = [env];
        } else {
          console.error(
            `Invalid environment: ${env}. Use 'dev', 'prod', or 'both'`,
          );
          process.exit(1);
        }
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--collection": {
        const collection = args[++i];
        if (!collection) {
          console.error("Missing value for --collection.");
          process.exit(1);
        }

        let ensuredCollection: MediaCollection;
        try {
          ensuredCollection = ensureMediaCollection(collection);
        } catch (error) {
          console.error(
            error instanceof Error
              ? error.message
              : `Invalid collection: ${collection}.`,
          );
          process.exit(1);
        }
        if (!options.collections.includes(ensuredCollection)) {
          options.collections.push(ensuredCollection);
        }
        break;
      }
      case "--yes":
      case "-y":
        options.yes = true;
        break;
      case "--profile":
        options.profile = args[++i];
        break;
      case "--region":
        options.region = args[++i];
        break;
      case "--help":
      case "-h":
        console.info(`
Usage: npm run media:upload -- [options]

Options:
  --env <env>     Environment to upload to: dev, prod, or both
  --collection    Limit upload to a specific collection (repeatable)
  --dry-run       Show what would be uploaded without actually uploading
  --yes, -y       Skip confirmation prompts (required for prod in non-interactive runs)
  --profile       AWS CLI profile to use (from ~/.aws/credentials)
  --region        AWS region (e.g., us-west-2)
  --tfvars        Path to Terraform tfvars file (defaults to infra/terraform.tfvars)
  --help, -h      Show this help message

Examples:
  npm run media:upload -- --env dev
  npm run media:upload -- --env dev --collection project-brand-logos
  npm run media:upload -- --env prod --dry-run
  npm run media:upload -- --env prod --yes
  npm run media:upload -- --env both
        `);
        process.exit(0);
      case "--tfvars":
        options.tfvarsPath = args[++i];
        break;
    }
  }

  if (options.environments.length === 0) {
    console.error("Please specify an environment with --env <dev|prod|both>");
    console.info("Use --help for more information");
    process.exit(1);
  }

  if (options.collections.length === 0) {
    options.collections = [...MEDIA_COLLECTIONS];
  }

  return options;
}

function checkPrerequisites() {
  // Check if AWS CLI is available
  try {
    execSync("aws --version", { stdio: "ignore" });
  } catch {
    console.error(
      "AWS CLI not found. Please install it and configure your credentials.",
    );
    console.error(
      "See: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html",
    );
    process.exit(1);
  }

  // Check if media directory exists
  const mediaDir = path.join(repoRoot, "backend/media");
  if (!existsSync(mediaDir)) {
    console.error(`Media directory not found: ${mediaDir}`);
    console.error('Run "npm run media:import" first to import media files');
    process.exit(1);
  }

  // Check each collection directory
  for (const collection of MEDIA_COLLECTIONS) {
    const collectionDir = path.join(mediaDir, collection);
    if (!existsSync(collectionDir)) {
      console.warn(`Warning: Collection directory not found: ${collectionDir}`);
    }
  }
}

function resolveSnapshotRoot(): ResolvedSnapshotRoot {
  const envSnapshotRoot = process.env.CMS_SNAPSHOT_ROOT?.trim();
  if (!envSnapshotRoot) {
    console.error("CMS_SNAPSHOT_ROOT is required for media uploads.");
    process.exit(1);
  }

  return {
    path: path.isAbsolute(envSnapshotRoot)
      ? envSnapshotRoot
      : path.resolve(repoRoot, envSnapshotRoot),
    source: "snapshot-env",
  };
}

function listCollectionFiles(rootDir: string, relativeDir = ""): string[] {
  const currentDir = path.join(rootDir, relativeDir);
  const entries = readdirSync(currentDir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const entryRelativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listCollectionFiles(rootDir, entryRelativePath));
      continue;
    }
    if (entry.isFile()) {
      results.push(entryRelativePath);
    }
  }

  return results;
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function resolveSnapshotFilePath(
  snapshotRoot: string,
  collection: MediaCollection,
  relativePath: string,
): string | null {
  const candidates = [
    path.join(snapshotRoot, collection, relativePath),
    path.join(snapshotRoot, "images", collection, relativePath),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function validateSnapshotFreshness(collections: MediaCollection[]) {
  const resolvedSnapshotRoot = resolveSnapshotRoot();
  if (!existsSync(resolvedSnapshotRoot.path)) {
    console.info(
      `\nSnapshot freshness check skipped: no snapshot root at ${resolvedSnapshotRoot.path}`,
    );
    return;
  }

  const conflicts: string[] = [];

  for (const collection of collections) {
    const localCollectionDir = path.join(repoRoot, "backend/media", collection);
    if (!existsSync(localCollectionDir)) continue;

    for (const relativePath of listCollectionFiles(localCollectionDir)) {
      const localFilePath = path.join(localCollectionDir, relativePath);
      const snapshotFilePath = resolveSnapshotFilePath(
        resolvedSnapshotRoot.path,
        collection,
        relativePath,
      );
      if (!snapshotFilePath) continue;

      const localStat = statSync(localFilePath);
      const snapshotStat = statSync(snapshotFilePath);
      if (snapshotStat.mtimeMs <= localStat.mtimeMs) continue;

      if (sha256File(localFilePath) === sha256File(snapshotFilePath)) continue;

      conflicts.push(
        `${collection}/${relativePath} local=${new Date(localStat.mtimeMs).toISOString()} snapshot=${new Date(snapshotStat.mtimeMs).toISOString()}`,
      );
    }
  }

  if (conflicts.length === 0) {
    console.info(
      `\nSnapshot freshness check passed against ${resolvedSnapshotRoot.path} (${resolvedSnapshotRoot.source}).`,
    );
    return;
  }

  const preview = conflicts
    .slice(0, 10)
    .map((entry) => `  - ${entry}`)
    .join("\n");
  const suffix =
    conflicts.length > 10
      ? `\n  ... ${conflicts.length - 10} more conflict(s)`
      : "";

  throw new Error(
    "Refusing media upload because backend/media contains older overlapping files than the snapshot root. Reconcile backend/media with the newer snapshot files before uploading.\n" +
      `Snapshot root: ${resolvedSnapshotRoot.path}\n` +
      preview +
      suffix,
  );
}

function syncCollection(
  collection: string,
  environment: Environment,
  dryRun: boolean,
  opts: { profile?: string; region?: string },
  buckets: { tfvarsPath?: string },
) {
  const bucket = resolveBucket(environment, { tfvarsPath: buckets.tfvarsPath });
  const localPath = `backend/media/${collection}/`;
  const s3Path = `s3://${bucket}/${collection}/`;

  // Build command string with proper excludes
  const excludes = ["--exclude", '".DS_Store"', "--exclude", '".git*"'];
  const dryrunFlag = dryRun ? "--dryrun" : "";

  const cmdParts = [
    "aws",
    opts.profile ? `--profile ${opts.profile}` : "",
    opts.region ? `--region ${opts.region}` : "",
    "s3 sync",
    localPath,
    s3Path,
    ...excludes,
    dryrunFlag,
  ].filter(Boolean);

  const fullCommand = cmdParts.join(" ");

  console.info(
    `\n${dryRun ? "[DRY RUN] " : ""}Syncing ${collection} to ${environment}...`,
  );
  console.info(`Command: ${fullCommand}`);

  try {
    execSync(fullCommand, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "inherit",
    });
  } catch (error) {
    console.error(`Failed to sync ${collection} to ${environment}:`, error);
    process.exit(1);
  }
}

function countFiles(collection: string): number {
  try {
    const result = execSync(
      `find backend/media/${collection} -type f \\( -name "*.svg" -o -name "*.webp" -o -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \\) | wc -l`,
      { cwd: repoRoot, encoding: "utf8" },
    );
    return parseInt(result.trim());
  } catch {
    return 0;
  }
}

async function confirmProductionUpload(options: Options): Promise<void> {
  const targetsProduction = options.environments.includes("prod");
  if (options.dryRun || !targetsProduction) return;
  if (options.yes) return;

  const targetLabel =
    options.environments.length > 1 ? "dev and production" : "production";
  const confirmationToken =
    options.environments.length > 1 ? "upload both" : "upload prod";

  if (!input.isTTY || !output.isTTY) {
    console.error(
      `Production media upload requires explicit confirmation. Re-run with --yes if you intend to upload to ${targetLabel}.`,
    );
    process.exit(1);
  }

  console.info("\n⚠️  Production media upload confirmation required.");
  console.info(
    `This run targets ${targetLabel} assets and can overwrite S3 objects.`,
  );
  console.info(
    `Type \"${confirmationToken}\" to continue, or anything else to cancel.`,
  );

  const rl = createInterface({ input, output });
  try {
    const answer = (
      await rl.question(`Confirm ${targetLabel} upload: `)
    ).trim();

    if (answer !== confirmationToken) {
      console.info("Upload cancelled.");
      process.exit(1);
    }
  } finally {
    rl.close();
  }
}

async function main() {
  const options = parseArgs();

  console.info("🚀 Portfolio Media Upload Script");
  console.info("================================");

  checkPrerequisites();
  validateSnapshotFreshness(options.collections);

  // Show summary of what will be uploaded
  console.info("\nMedia files summary:");
  let totalFiles = 0;
  for (const collection of options.collections) {
    const count = countFiles(collection);
    console.info(`  ${collection}: ${count} files`);
    totalFiles += count;
  }
  console.info(`  Total: ${totalFiles} files`);

  if (totalFiles === 0) {
    console.info(
      '\nNo media files found. Run "npm run media:import" first to import files.',
    );
    process.exit(0);
  }

  console.info(`\nTarget environments: ${options.environments.join(", ")}`);
  console.info(`Mode: ${options.dryRun ? "DRY RUN" : "UPLOAD"}`);

  // Validate credentials before attempting any syncs
  try {
    ensureAwsCredentials({ profile: options.profile, region: options.region });
  } catch (e) {
    console.error(`\n❌ ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  await confirmProductionUpload(options);

  // Upload to each environment
  for (const env of options.environments) {
    console.info(`\n📦 Uploading to ${env.toUpperCase()} environment...`);

    for (const collection of options.collections) {
      syncCollection(
        collection,
        env,
        options.dryRun,
        {
          profile: options.profile,
          region: options.region,
        },
        {
          tfvarsPath: options.tfvarsPath,
        },
      );
    }
  }

  console.info("\n✅ Upload complete!");

  if (!options.dryRun) {
    console.info("\nNext steps:");
    console.info("1. Deploy your application to use S3 storage");
    console.info("2. Test image loading in the target environment");
    console.info('3. Run "npm run media:verify" to check uploaded files');
  }
}

// Run main function if this script is executed directly
if (require.main === module) {
  void main();
}
