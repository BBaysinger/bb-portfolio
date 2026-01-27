#!/usr/bin/env tsx
/**
 * Verify media files in S3 buckets
 *
 * This script checks that media files are properly uploaded to S3 and accessible.
 *
 * Usage:
 *   npm run media:verify -- --env dev
 *   npm run media:verify -- --env prod
 *   npm run media:verify -- --env both
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { ensureAwsCredentials } from "./lib/aws-creds";

// Get script directory and repo root
const scriptDir = path.dirname(__filename);
const repoRoot = path.resolve(scriptDir, "..");

function readTfvarsValue(tfvarsPath: string, key: string): string | undefined {
  try {
    const raw = readFileSync(tfvarsPath, "utf8");
    const re = new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"\\s*$`, "m");
    const match = raw.match(re);
    return match?.[1];
  } catch {
    return undefined;
  }
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
  return environment === "dev"
    ? "bb-portfolio-media-dev"
    : "bb-portfolio-media-prod";
}

const MEDIA_COLLECTIONS = [
  "brand-logos",
  "project-screenshots",
  "project-thumbnails",
] as const;

type Environment = "dev" | "prod";

interface Options {
  environments: Environment[];
  profile?: string;
  region?: string;
  tfvarsPath?: string;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    environments: [],
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
      case "--profile":
        options.profile = args[++i];
        break;
      case "--region":
        options.region = args[++i];
        break;
      case "--help":
      case "-h":
        console.info(`
Usage: npm run media:verify -- [options]

Options:
  --env <env>     Environment to verify: dev, prod, or both
  --profile       AWS CLI profile to use (from ~/.aws/credentials)
  --region        AWS region (e.g., us-west-2)
  --tfvars        Path to Terraform tfvars file (defaults to infra/terraform.tfvars)
  --help, -h      Show this help message

Examples:
  npm run media:verify -- --env dev
  npm run media:verify -- --env both
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

  return options;
}

function verifyCollection(
  collection: string,
  environment: Environment,
  opts: { profile?: string; region?: string },
  buckets: { tfvarsPath?: string },
): { count: number; success: boolean } {
  const bucket = resolveBucket(environment, { tfvarsPath: buckets.tfvarsPath });
  const s3Path = `s3://${bucket}/${collection}/`;

  try {
    const global = [
      "aws",
      opts.profile ? `--profile ${opts.profile}` : "",
      opts.region ? `--region ${opts.region}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const result = execSync(
      `${global} s3 ls "${s3Path}" --recursive | grep -E "\\.(svg|webp|png|jpg|jpeg)$" | wc -l`,
      { cwd: repoRoot, encoding: "utf8" },
    );
    const count = parseInt(result.trim());
    return { count, success: true };
  } catch (error) {
    console.error(`Error verifying ${collection} in ${environment}:`, error);
    return { count: 0, success: false };
  }
}

function testSampleUrls(environment: Environment) {
  const bucket = resolveBucket(environment, {});

  const region = process.env.AWS_REGION || "us-west-2";

  // Test a few sample URLs to see if they're accessible
  const sampleFiles = [
    "brand-logos/bbi.svg",
    "project-thumbnails/bikini-bottom.webp",
  ];

  console.info(`\nTesting sample URLs for ${environment}...`);

  for (const file of sampleFiles) {
    try {
      const url = `https://${bucket}.s3.${region}.amazonaws.com/${file}`;
      const status = execSync(
        `curl -s -o /dev/null -w "%{http_code}" -I "${url}"`,
        {
          stdio: "pipe",
          encoding: "utf8",
        },
      ).trim();
      if (status === "200") {
        console.info(`  ✅ ${file}`);
      } else {
        console.info(`  ❌ ${file} - HTTP ${status}`);
      }
    } catch {
      console.info(`  ❌ ${file} - Not accessible`);
    }
  }
}

function main() {
  const options = parseArgs();

  console.info("🔍 Portfolio Media Verification");
  console.info("==============================");

  // Check AWS CLI
  try {
    execSync("aws --version", { stdio: "ignore" });
  } catch {
    console.error("AWS CLI not found. Please install and configure it.");
    process.exit(1);
  }

  // Validate credentials before attempting any S3 calls
  try {
    ensureAwsCredentials({ profile: options.profile, region: options.region });
  } catch (e) {
    console.error(`\n❌ ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  for (const env of options.environments) {
    console.info(`\n📦 Verifying ${env.toUpperCase()} environment...`);

    let totalFiles = 0;
    let hasErrors = false;

    for (const collection of MEDIA_COLLECTIONS) {
      const result = verifyCollection(
        collection,
        env,
        {
          profile: options.profile,
          region: options.region,
        },
        {
          tfvarsPath: options.tfvarsPath,
        },
      );
      console.info(`  ${collection}: ${result.count} files`);

      if (!result.success) {
        hasErrors = true;
      }
      totalFiles += result.count;
    }

    console.info(`  Total: ${totalFiles} files`);

    if (totalFiles === 0) {
      console.info(
        `  ⚠️  No files found in ${env} bucket. Run media upload first.`,
      );
      hasErrors = true;
    }

    if (!hasErrors) {
      testSampleUrls(env);
    }
  }

  console.info("\n✅ Verification complete!");
}

// Run main function if this script is executed directly
if (require.main === module) {
  main();
}
