#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TAG = "[frontend:prepare-project-data-snapshot-secret]";
const DEFAULT_INPUT = "./.cache/project-data-snapshot.json";
const DEFAULT_MAX_BYTES = 65000;

function main() {
  const inputPath = resolve(
    process.cwd(),
    process.env.PROJECT_DATA_SNAPSHOT_IN || DEFAULT_INPUT,
  );
  const maxBytes = Number(
    process.env.PROJECT_DATA_SNAPSHOT_SECRET_MAX_BYTES || DEFAULT_MAX_BYTES,
  );

  const raw = readFileSync(inputPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  const compact = JSON.stringify(parsed);
  const byteLength = Buffer.byteLength(compact, "utf8");

  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    throw new Error("PROJECT_DATA_SNAPSHOT_SECRET_MAX_BYTES must be > 0");
  }

  if (byteLength > maxBytes) {
    throw new Error(
      `${TAG} Snapshot exceeds size budget (${byteLength} bytes > ${maxBytes} bytes).`,
    );
  }

  // Print only compact JSON so this command can be piped directly into GH secret tooling.
  process.stdout.write(compact);
  process.stderr.write(`${TAG} ready: ${byteLength} bytes from ${inputPath}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${TAG} Failed: ${message}`);
  process.exit(1);
}
