#!/usr/bin/env tsx

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  ProjectDataStore,
  type ParsedPortfolioProjectData,
  type PortfolioProjectBase,
} from "../src/data/ProjectData";

const TAG = "[frontend:export-project-data-snapshot]";

type SnapshotEnvelope = {
  data: Record<string, PortfolioProjectBase>;
  metadata: {
    containsSanitizedPlaceholders: boolean;
    hasNdaAccess: boolean;
  };
  generatedAt: string;
  sourceProfile: string;
};

const normalizeParsedRecord = (
  parsed: ParsedPortfolioProjectData,
): Record<string, PortfolioProjectBase> => {
  const out: Record<string, PortfolioProjectBase> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!value) continue;
    const { id: _id, index: _index, ...base } = value;
    void _id;
    void _index;
    out[key] = base;
  }
  return out;
};

async function main() {
  const outputPath = resolve(
    process.cwd(),
    process.env.PROJECT_DATA_SNAPSHOT_OUT ||
      "./.cache/project-data-snapshot.json",
  );
  const profile = (
    process.env.ENV_PROFILE ||
    process.env.NEXT_PUBLIC_ENV_PROFILE ||
    process.env.NODE_ENV ||
    "unknown"
  ).toLowerCase();

  const cookieHeader = (process.env.PROJECT_DATA_SNAPSHOT_COOKIE || "").trim();
  const requestHeaders = cookieHeader ? { cookie: cookieHeader } : undefined;

  const store = new ProjectDataStore();
  const initResult = await store.initialize({
    headers: requestHeaders,
    disableCache: true,
    includeNdaInActive: true,
  });

  const data = normalizeParsedRecord(store.projectsRecord);
  const keyCount = Object.keys(data).length;
  if (keyCount === 0) {
    throw new Error("Snapshot export produced zero projects.");
  }

  const envelope: SnapshotEnvelope = {
    data,
    metadata: {
      containsSanitizedPlaceholders: Boolean(
        initResult.containsSanitizedPlaceholders,
      ),
      hasNdaAccess: Boolean(initResult.includeNdaInActive),
    },
    generatedAt: new Date().toISOString(),
    sourceProfile: profile,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");

  console.info(`${TAG} Wrote ${keyCount} projects to ${outputPath}`);
  console.info(
    `${TAG} containsSanitizedPlaceholders=${envelope.metadata.containsSanitizedPlaceholders} hasNdaAccess=${envelope.metadata.hasNdaAccess}`,
  );
}

main().catch((error) => {
  console.error(`${TAG} Failed`, error);
  process.exit(1);
});
