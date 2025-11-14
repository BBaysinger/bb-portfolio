#!/usr/bin/env tsx
/**
 * Upload local project files to S3 project buckets
 *
 * This script syncs local project files to the appropriate S3 project buckets.
 * It supports different access levels (public/nda) and excludes system/git files.
 *
 * Note: This is for static project files. For Payload CMS media, use upload-media-to-s3.ts.
 *
 * Usage:
 *   npm run projects:upload -- --env public
 *   npm run projects:upload -- --env nda
 *   npm run projects:upload -- --env both
 *   npm run projects:upload -- --dry-run --env public
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { ensureAwsCredentials } from "./lib/aws-creds";

// Get script directory and repo root
const scriptDir = path.dirname(__filename);
const repoRoot = path.resolve(scriptDir, "..");
const workspaceRoot = path.resolve(repoRoot, "..");

// S3 bucket configuration for projects (static files)
const S3_BUCKETS = {
  public: "bb-portfolio-projects-public",
  nda: "bb-portfolio-projects-nda",
} as const;

type AccessLevel = "public" | "nda";

// Source directories for project files (in workspace parent, not repo)
const PROJECT_SOURCES = {
  public: path.join(workspaceRoot, "projects-deploy-public"),
  nda: path.join(workspaceRoot, "projects-deploy-nda"),
} as const;

interface UploadOptions {
  accessLevels: AccessLevel[];
  dryRun: boolean;
  profile?: string;
  region: string;
}

function parseArguments(): UploadOptions {
  const args = process.argv.slice(2);
  const options: UploadOptions = {
    accessLevels: [],
    dryRun: false,
    region: "us-west-2",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--env":
        const env = args[++i];
        if (env === "both") {
          options.accessLevels = ["public", "nda"];
        } else if (env === "public" || env === "nda") {
          options.accessLevels = [env];
        } else {
          console.error(
            `Invalid access level: ${env}. Use 'public', 'nda', or 'both'`,
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
Usage: npm run projects:upload -- [options]

Options:
  --env <level>   Access level to upload to: public, nda, or both
  --dry-run       Show what would be uploaded without actually uploading
  --profile       AWS CLI profile to use (from ~/.aws/credentials)
  --region        AWS region (e.g., us-west-2)
  --help, -h      Show this help message

Examples:
  npm run projects:upload -- --env public
  npm run projects:upload -- --env nda --dry-run
  npm run projects:upload -- --env both
        `);
        process.exit(0);
    }
  }

  if (options.accessLevels.length === 0) {
    console.error(
      "Please specify an access level with --env <public|nda|both>",
    );
    console.info("Use --help for more information");
    process.exit(1);
  }

  return options;
}

function uploadToS3(accessLevel: AccessLevel, options: UploadOptions): void {
  const bucket = S3_BUCKETS[accessLevel];
  const sourceDir = PROJECT_SOURCES[accessLevel];

  console.info(
    `\n📁 Uploading to ${accessLevel.toUpperCase()} projects bucket`,
  );
  console.info(`Source: ${sourceDir}`);
  console.info(`Target: s3://${bucket}`);

  // Check if source directory exists
  if (!existsSync(sourceDir)) {
    console.warn(`⚠️  Source directory not found: ${sourceDir}`);
    console.info(
      `   Create this directory and add your ${accessLevel} project files`,
    );
    return;
  }

  // Build AWS CLI sync command - properly quote paths with spaces
  const quotedSourceDir = `"${sourceDir}"`;
  const awsArgs = [
    "s3",
    "sync",
    quotedSourceDir,
    `s3://${bucket}`,
    "--region",
    options.region,
    "--delete", // Remove files from S3 that are not in source
    "--exclude",
    ".DS_Store",
    "--exclude",
    "*.tmp",
    "--exclude",
    "Thumbs.db",
    "--exclude",
    ".git/*",
    "--exclude",
    ".gitignore",
    "--exclude",
    "node_modules/*",
  ];

  if (options.dryRun) {
    awsArgs.push("--dryrun");
  }

  if (options.profile) {
    awsArgs.push("--profile", options.profile);
  }

  const command = `aws ${awsArgs.join(" ")}`;

  console.info(`💻 Command: ${command}`);

  try {
    const output = execSync(command, {
      encoding: "utf8",
      stdio: "pipe",
      cwd: workspaceRoot, // Run from workspace root, not repo root
    });

    if (output.trim()) {
      console.info(output);
    }

    if (!options.dryRun) {
      console.info(
        `✅ Successfully uploaded to ${accessLevel} projects bucket`,
      );
    } else {
      console.info(`🔍 Dry run complete for ${accessLevel} projects bucket`);
    }
  } catch (error) {
    console.error(
      `❌ Failed to upload to ${accessLevel} projects bucket:`,
      error,
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.info("🚀 BB-Portfolio - Project Files Upload");
  console.info("=====================================");

  const options = parseArguments();

  console.info(`Access Levels: ${options.accessLevels.join(", ")}`);
  console.info(`Dry Run: ${options.dryRun ? "Yes" : "No"}`);
  console.info(`Region: ${options.region}`);

  // Ensure AWS credentials are available
  await ensureAwsCredentials({
    profile: options.profile,
    region: options.region,
  });

  // Upload to each specified access level
  for (const accessLevel of options.accessLevels) {
    uploadToS3(accessLevel, options);
  }

  console.info(
    `\n🎉 Project upload ${options.dryRun ? "simulation" : "process"} complete!`,
  );

  if (options.dryRun) {
    console.info(
      "💡 This was a dry run. Remove --dry-run to actually upload files.",
    );
  }
}

// Handle process termination gracefully
process.on("SIGINT", () => {
  console.info("\n\n👋 Upload cancelled by user");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.info("\n\n👋 Upload terminated");
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  console.error("💥 Unexpected error:", error);
  process.exit(1);
});
