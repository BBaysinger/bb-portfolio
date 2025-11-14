#!/usr/bin/env tsx
/**
 * Verify S3 project buckets are accessible and contain expected files
 *
 * This script checks that the project S3 buckets are properly configured
 * and accessible from the current environment.
 *
 * Usage:
 *   npm run projects:verify -- --env public
 *   npm run projects:verify -- --env nda
 *   npm run projects:verify -- --env both
 */
import { execSync } from "node:child_process";

import { ensureAwsCredentials } from "./lib/aws-creds";

// S3 bucket configuration for projects
const S3_BUCKETS = {
  public: "bb-portfolio-projects-public",
  nda: "bb-portfolio-projects-nda",
} as const;

type AccessLevel = "public" | "nda";

interface VerifyOptions {
  accessLevels: AccessLevel[];
  profile?: string;
  region: string;
}

function parseArguments(): VerifyOptions {
  const args = process.argv.slice(2);
  const options: VerifyOptions = {
    accessLevels: [],
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
      case "--profile":
        options.profile = args[++i];
        break;
      case "--region":
        options.region = args[++i];
        break;
      case "--help":
      case "-h":
        console.info(`
Usage: npm run projects:verify -- [options]

Options:
  --env <level>   Access level to verify: public, nda, or both
  --profile       AWS CLI profile to use (from ~/.aws/credentials)
  --region        AWS region (e.g., us-west-2)
  --help, -h      Show this help message

Examples:
  npm run projects:verify -- --env public
  npm run projects:verify -- --env both
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

function verifyBucket(
  accessLevel: AccessLevel,
  options: VerifyOptions,
): boolean {
  const bucket = S3_BUCKETS[accessLevel];

  console.info(`\n🔍 Verifying ${accessLevel.toUpperCase()} projects bucket`);
  console.info(`Bucket: s3://${bucket}`);

  try {
    // Check if bucket exists and is accessible
    const awsArgs = ["s3", "ls", `s3://${bucket}`, "--region", options.region];

    if (options.profile) {
      awsArgs.push("--profile", options.profile);
    }

    const command = `aws ${awsArgs.join(" ")}`;
    console.info(`💻 Command: ${command}`);

    const output = execSync(command, {
      encoding: "utf8",
      stdio: "pipe",
    });

    const files = output
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    console.info(`✅ Bucket accessible`);
    console.info(`📄 Files found: ${files.length}`);

    if (files.length > 0) {
      console.info("📋 Sample files:");
      files.slice(0, 5).forEach((file) => {
        const parts = file.trim().split(/\s+/);
        const fileName = parts[parts.length - 1];
        console.info(`   - ${fileName}`);
      });

      if (files.length > 5) {
        console.info(`   ... and ${files.length - 5} more files`);
      }
    } else {
      console.info("📄 Bucket is empty");
    }

    return true;
  } catch (error) {
    console.error(`❌ Failed to verify ${accessLevel} projects bucket:`, error);
    return false;
  }
}

async function main(): Promise<void> {
  console.info("🔍 BB-Portfolio - Project Buckets Verification");
  console.info("==============================================");

  const options = parseArguments();

  console.info(`Access Levels: ${options.accessLevels.join(", ")}`);
  console.info(`Region: ${options.region}`);

  // Ensure AWS credentials are available
  await ensureAwsCredentials({
    profile: options.profile,
    region: options.region,
  });

  let allSuccess = true;

  // Verify each specified access level
  for (const accessLevel of options.accessLevels) {
    const success = verifyBucket(accessLevel, options);
    if (!success) {
      allSuccess = false;
    }
  }

  console.info(
    `\n${allSuccess ? "🎉" : "❌"} Verification ${allSuccess ? "complete" : "failed"}!`,
  );

  if (!allSuccess) {
    console.error(
      "\n💡 Some buckets failed verification. Check your AWS credentials and bucket permissions.",
    );
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on("SIGINT", () => {
  console.info("\n\n👋 Verification cancelled by user");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.info("\n\n👋 Verification terminated");
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  console.error("💥 Unexpected error:", error);
  process.exit(1);
});
