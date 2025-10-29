#!/usr/bin/env tsx
/**
 * Upload local media files to S3 buckets
 *
 * This script syncs the local backend/media files to the appropriate S3 buckets.
 * It supports different environments (dev/prod) and excludes system/git files.
 *
 * Usage:
 *   npm run media:upload -- --env dev
 *   npm run media:upload -- --env prod
 *   npm run media:upload -- --env both
 *   npm run media:upload -- --dry-run --env dev
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { ensureAwsCredentials } from "./lib/aws-creds";

// Get script directory and repo root
const scriptDir = path.dirname(__filename);
const repoRoot = path.resolve(scriptDir, "..");

// S3 bucket configuration from Terraform outputs
const S3_BUCKETS = {
  dev: "bb-portfolio-media-dev",
  prod: "bb-portfolio-media-prod",
} as const;

// Media collections to sync
const MEDIA_COLLECTIONS = [
  "brand-logos",
  "project-screenshots",
  "project-thumbnails",
] as const;

type Environment = "dev" | "prod";

interface Options {
  environments: Environment[];
  dryRun: boolean;
  profile?: string;
  region?: string;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    environments: [],
    dryRun: false,
    profile: undefined,
    region: undefined,
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
  --dry-run       Show what would be uploaded without actually uploading
  --profile       AWS CLI profile to use (from ~/.aws/credentials)
  --region        AWS region (e.g., us-west-2)
  --help, -h      Show this help message

Examples:
  npm run media:upload -- --env dev
  npm run media:upload -- --env prod --dry-run
  npm run media:upload -- --env both
        `);
        process.exit(0);
    }
  }

  if (options.environments.length === 0) {
    console.error("Please specify an environment with --env <dev|prod|both>");
    console.info("Use --help for more information");
    process.exit(1);
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
    console.error('Run "npm run seed:media" first to import media files');
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

function syncCollection(
  collection: string,
  environment: Environment,
  dryRun: boolean,
  opts: { profile?: string; region?: string },
) {
  const bucket = S3_BUCKETS[environment];
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

function main() {
  const options = parseArgs();

  console.info("🚀 Portfolio Media Upload Script");
  console.info("================================");

  checkPrerequisites();

  // Show summary of what will be uploaded
  console.info("\nMedia files summary:");
  let totalFiles = 0;
  for (const collection of MEDIA_COLLECTIONS) {
    const count = countFiles(collection);
    console.info(`  ${collection}: ${count} files`);
    totalFiles += count;
  }
  console.info(`  Total: ${totalFiles} files`);

  if (totalFiles === 0) {
    console.info(
      '\nNo media files found. Run "npm run seed:media" first to import files.',
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

  // Confirm before proceeding (unless dry run)
  if (!options.dryRun) {
    console.info("\n⚠️  This will upload files to AWS S3. Continue? (y/N)");
    // Note: In a real interactive script, you'd want to read from stdin
    // For now, we'll proceed since it's called with explicit args
  }

  // Upload to each environment
  for (const env of options.environments) {
    console.info(`\n📦 Uploading to ${env.toUpperCase()} environment...`);

    for (const collection of MEDIA_COLLECTIONS) {
      syncCollection(collection, env, options.dryRun, {
        profile: options.profile,
        region: options.region,
      });
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
  main();
}
