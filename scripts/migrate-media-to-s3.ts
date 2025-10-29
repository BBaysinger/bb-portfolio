/**
 * Database Migration: Local Filesystem → S3 URLs
 *
 * This script updates existing PayloadCMS media records to use S3 URLs instead of local filesystem paths.
 * Run this after uploading media files to S3 to make them accessible in production.
 *
 * Usage:
 *   # Run locally (automatically loads environment from .github-secrets.private.json5):
 *   npm run migrate:media-to-s3 -- --env dev --dry-run   # Preview changes to dev media bucket
 *   npm run migrate:media-to-s3 -- --env prod --dry-run  # Preview changes to prod media bucket
 *   npm run migrate:media-to-s3 -- --env dev             # Apply changes to dev media bucket
 *   npm run migrate:media-to-s3 -- --env prod            # Apply changes to prod media bucket
 *
 *   # Or run directly on production server:
 *   ssh user@server "cd /path/to/app && docker exec bb-portfolio-backend-prod node scripts/migrate-media-to-s3.js --env prod --dry-run"
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import JSON5 from "json5";

import {
  getPayload,
  type Payload,
} from "../backend/node_modules/payload/dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load environment variables from GitHub secrets file
 */
function loadEnvironmentFromSecrets(environment: "dev" | "prod") {
  const secretsPath = path.resolve(
    __dirname,
    "../.github-secrets.private.json5",
  );

  if (!fs.existsSync(secretsPath)) {
    throw new Error(
      `GitHub secrets file not found: ${secretsPath}\n` +
        `This script requires .github-secrets.private.json5 to load environment variables.`,
    );
  }

  try {
    const secretsContent = fs.readFileSync(secretsPath, "utf-8");
    const secrets = JSON5.parse(secretsContent);

    if (!secrets.strings) {
      throw new Error('Invalid secrets file format: missing "strings" section');
    }

    // Set ENV_PROFILE first
    process.env.ENV_PROFILE = environment;

    // Map environment-specific variables
    const envPrefix = environment.toUpperCase();
    const requiredVars = [
      `${envPrefix}_MONGODB_URI`,
      `${envPrefix}_PAYLOAD_SECRET`,
      `${envPrefix}_FRONTEND_URL`,
      `${envPrefix}_S3_BUCKET`,
      `${envPrefix}_AWS_REGION`,
      "S3_AWS_ACCESS_KEY_ID",
      "S3_AWS_SECRET_ACCESS_KEY",
    ];

    for (const varName of requiredVars) {
      const value = secrets.strings[varName];
      if (!value) {
        throw new Error(
          `Missing required variable "${varName}" in GitHub secrets file.\n` +
            `Please add it to .github-secrets.private.json5`,
        );
      }
      process.env[varName] = value;
    }

    console.info(
      `✅ Loaded ${requiredVars.length} environment variables from GitHub secrets`,
    );
  } catch (error) {
    throw new Error(
      `Failed to load GitHub secrets: ${error instanceof Error ? error.message : String(error)}\n` +
        `Check that .github-secrets.private.json5 exists and contains valid JSON5.`,
    );
  }
}

interface MediaDocument {
  id: string;
  filename?: string;
  url?: string;
}

interface MigrationStats {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
}

const S3_BUCKET_URLS = {
  dev: "https://bb-portfolio-media-dev.s3.us-west-2.amazonaws.com",
  prod: "https://bb-portfolio-media-prod.s3.us-west-2.amazonaws.com",
};

const MEDIA_COLLECTIONS = [
  { name: "brandLogos", prefix: "brand-logos" },
  { name: "projectScreenshots", prefix: "project-screenshots" },
  { name: "projectThumbnails", prefix: "project-thumbnails" },
];

async function migrateMediaCollection(
  payload: Payload,
  collectionName: string,
  s3Prefix: string,
  bucketUrl: string,
  dryRun: boolean = false,
): Promise<{
  total: number;
  updated: number;
  skipped: number;
  errors: number;
}> {
  const stats: MigrationStats = { total: 0, updated: 0, skipped: 0, errors: 0 };

  console.info(`\n📦 Processing ${collectionName}...`);

  try {
    // Get all documents in the collection
    const result = await payload.find({
      collection: collectionName as
        | "brandLogos"
        | "projectScreenshots"
        | "projectThumbnails",
      limit: 1000, // Adjust if you have more media files
    });

    stats.total = result.docs.length;
    console.info(`   Found ${stats.total} records`);

    for (const doc of result.docs) {
      try {
        const { id, filename, url } = doc as MediaDocument;

        // Skip if already has S3 URL
        if (url && url.includes("s3.amazonaws.com")) {
          stats.skipped++;
          continue;
        }

        // Skip if no filename
        if (!filename) {
          console.info(`   ⚠️ Skipping ${id}: No filename`);
          stats.skipped++;
          continue;
        }

        // Convert local path to S3 URL
        const cleanFilename = filename
          .replace(/^\/media\//, "")
          .replace(/^\/?/, "");
        const s3Url = `${bucketUrl}/${s3Prefix}/${cleanFilename}`;

        console.info(
          `   ${dryRun ? "[DRY RUN]" : "✏️"} ${id}: ${filename} → ${s3Url}`,
        );

        if (!dryRun) {
          // Use direct Mongoose update to bypass PayloadCMS validation
          const Model = payload.db.collections[collectionName];
          await Model.findByIdAndUpdate(id, {
            url: s3Url,
            filename: cleanFilename,
          });
        }

        stats.updated++;
      } catch (error) {
        console.error(
          `   ❌ Error updating ${doc.id}:`,
          error instanceof Error ? error.message : String(error),
        );
        stats.errors++;
      }
    }
  } catch (error) {
    console.error(
      `❌ Error processing ${collectionName}:`,
      error instanceof Error ? error.message : String(error),
    );
    stats.errors = stats.total;
  }

  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const envFlag = args.indexOf("--env");
  const dryRunFlag = args.includes("--dry-run");

  if (envFlag === -1 || !args[envFlag + 1]) {
    console.error("❌ Please specify environment: --env <dev|prod>");
    process.exit(1);
  }

  const environment = args[envFlag + 1] as "dev" | "prod";

  if (!S3_BUCKET_URLS[environment]) {
    console.error("❌ Invalid environment. Use: dev or prod");
    process.exit(1);
  }

  // Load environment variables from GitHub secrets
  try {
    loadEnvironmentFromSecrets(environment);
  } catch (error) {
    console.error(
      "❌ Failed to load environment:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }

  const bucketUrl = S3_BUCKET_URLS[environment];

  console.info("🔄 PayloadCMS Media Migration: Local → S3");
  console.info("==========================================");
  console.info(`Environment: ${environment.toUpperCase()}`);
  console.info(`S3 Bucket: ${bucketUrl}`);
  console.info(
    `Mode: ${dryRunFlag ? "DRY RUN (preview only)" : "LIVE MIGRATION"}`,
  );

  if (!dryRunFlag) {
    console.info("\n⚠️  WARNING: This will modify your database!");
    console.info("   Run with --dry-run first to preview changes.");
    console.info("   Press Ctrl+C to cancel, or wait 5 seconds to continue...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  let payload: Payload | null = null;

  try {
    // Dynamically import payload config after environment is set
    const { default: config } = await import(
      "../backend/src/payload.config.js"
    );

    // Initialize Payload
    payload = await getPayload({ config });

    const totalStats: MigrationStats = {
      total: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    // Migrate each media collection
    for (const { name, prefix } of MEDIA_COLLECTIONS) {
      const stats = await migrateMediaCollection(
        payload,
        name,
        prefix,
        bucketUrl,
        dryRunFlag,
      );

      totalStats.total += stats.total;
      totalStats.updated += stats.updated;
      totalStats.skipped += stats.skipped;
      totalStats.errors += stats.errors;
    }

    console.info("\n📊 Migration Summary");
    console.info("===================");
    console.info(`Total records: ${totalStats.total}`);
    console.info(`Updated: ${totalStats.updated}`);
    console.info(`Skipped: ${totalStats.skipped}`);
    console.info(`Errors: ${totalStats.errors}`);

    if (dryRunFlag) {
      console.info(
        `\n💡 This was a dry run. Remove --dry-run to apply changes to ${environment} media bucket.`,
      );
    } else {
      console.info("\n✅ Migration complete!");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    // Close database connection to allow script to exit
    if (payload && payload.db && typeof payload.db.destroy === "function") {
      try {
        await payload.db.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }
    process.exit(0);
  }
}

// Run main function if this is the main module
main().catch(console.error);
