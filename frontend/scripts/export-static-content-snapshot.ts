#!/usr/bin/env tsx

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { getServerBrandingLockup } from "../src/data/BrandingLockup";
import { getBuildTimeCvExperienceData } from "../src/data/CvExperience";
import { getServerGreeting } from "../src/data/Greeting";

const TAG = "[frontend:export-static-content-snapshot]";

async function main() {
  delete process.env.STATIC_CONTENT_SNAPSHOT_PATH;

  const outputPath = resolve(
    process.cwd(),
    process.env.STATIC_CONTENT_SNAPSHOT_OUT ||
      "./.cache/static-content-snapshot.json",
  );
  const profile = (
    process.env.ENV_PROFILE ||
    process.env.NEXT_PUBLIC_ENV_PROFILE ||
    process.env.NODE_ENV ||
    "unknown"
  ).toLowerCase();

  const [brandingLockup, greeting, cvExperience] = await Promise.all([
    getServerBrandingLockup(),
    getServerGreeting(),
    getBuildTimeCvExperienceData(),
  ]);

  const envelope = {
    brandingLockup,
    greeting,
    cvExperience,
    generatedAt: new Date().toISOString(),
    sourceProfile: profile,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");

  console.info(`${TAG} Wrote static content snapshot to ${outputPath}`);
}

main().catch((error) => {
  console.error(`${TAG} Failed`, error);
  process.exit(1);
});
