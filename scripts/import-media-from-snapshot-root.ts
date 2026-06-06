/**
 * Import media from an external CMS snapshot root into backend/media/* for
 * local development.
 *
 * This does NOT commit any media. It only copies files into the ignored
 * backend/media folders so a fresh clone can be hydrated from your local
 * working assets directory that lives outside the repo.
 *
 * Supported structure examples under the selected snapshot root:
 * - project-brand-logos/
 * - cv-experience-logos/
 * - project-screenshots/
 * - project-thumbnails/
 *
 * or with an intermediate images/ folder, e.g. images/project-brand-logos, etc.
 *
 * Usage:
 *   npm run media:import
 *   npm run media:import -- --snapshot-root ../cms-snapshots/local
 *   CMS_SNAPSHOT_ROOT=../cms-snapshots/_interactive-dev-w-outcomes npm run media:import
 */
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import {
  MEDIA_COLLECTIONS,
  ensureMediaCollection,
} from "./lib/media-collections";

const IMAGE_EXTS = new Set([".webp", ".png", ".jpg", ".jpeg", ".svg"]);
type SupportedCollection = string;
type ResolvedSnapshotRoot = {
  path: string;
  source: "flag" | "snapshot-env";
};

function parseArgs() {
  const args = process.argv.slice(2);
  let snapshotRoot: string | undefined;
  const collections = new Set<SupportedCollection>();

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      console.info(`
Usage: npm run media:import -- [options]

Options:
  --snapshot-root <path> Override the cms-snapshot root for this run
  --collection <name>    Limit import to a specific media collection (repeatable)
  --help, -h             Show help

Examples:
  npm run media:import
  npm run media:import -- --snapshot-root ../cms-snapshots/local
  npm run media:import -- --collection project-thumbnails
      `);
      process.exit(0);
    }

    if (arg === "--snapshot-root") {
      snapshotRoot = args[index + 1];
      index++;
      continue;
    }

    if (arg.startsWith("--snapshot-root=")) {
      snapshotRoot = arg.slice("--snapshot-root=".length);
      continue;
    }

    if (arg === "--collection") {
      const collection = args[index + 1];
      if (!collection) {
        console.error("Missing value for --collection.");
        process.exit(1);
      }
      collections.add(ensureMediaCollection(collection));
      index++;
      continue;
    }

    if (arg.startsWith("--collection=")) {
      const collection = arg.slice("--collection=".length);
      collections.add(ensureMediaCollection(collection));
      continue;
    }
  }

  return {
    snapshotRoot,
    collections:
      collections.size > 0 ? [...collections] : [...MEDIA_COLLECTIONS],
  };
}

function resolveSnapshotRoot(
  root: string,
  overrideDir?: string,
): ResolvedSnapshotRoot {
  if (overrideDir?.trim()) {
    return {
      path: path.isAbsolute(overrideDir)
        ? overrideDir
        : path.resolve(root, overrideDir),
      source: "flag",
    };
  }

  const snapshotRoot = process.env.CMS_SNAPSHOT_ROOT?.trim();
  if (!snapshotRoot) {
    throw new Error(
      "CMS_SNAPSHOT_ROOT is required when --snapshot-root is not provided.",
    );
  }

  return {
    path: path.isAbsolute(snapshotRoot)
      ? snapshotRoot
      : path.resolve(root, snapshotRoot),
    source: "snapshot-env",
  };
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function sha256File(filePath: string): Promise<string> {
  return createHash("sha256")
    .update(await fs.readFile(filePath))
    .digest("hex");
}

function formatMtime(timestampMs: number): string {
  return new Date(timestampMs).toISOString();
}

async function copyDirFiltered(src: string, dest: string): Promise<number> {
  if (!(await exists(src))) return 0;
  await ensureDir(dest);
  let count = 0;
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      count += await copyDirFiltered(s, d);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTS.has(ext)) {
        if (await exists(d)) {
          const [sourceStat, destStat] = await Promise.all([
            fs.stat(s),
            fs.stat(d),
          ]);
          if (sourceStat.mtimeMs < destStat.mtimeMs) {
            const [sourceHash, destHash] = await Promise.all([
              sha256File(s),
              sha256File(d),
            ]);
            if (sourceHash !== destHash) {
              throw new Error(
                "Refusing media:import because an older cms-snapshot file would overwrite newer backend/media state.\n" +
                  `CMS snapshot file: ${s} (${formatMtime(sourceStat.mtimeMs)})\n` +
                  `Local file: ${d} (${formatMtime(destStat.mtimeMs)})`,
              );
            }
          }
        }
        await fs.copyFile(s, d);
        count++;
      }
    }
  }
  return count;
}

type Mapping = { label: string; dest: string; sources: string[] };

async function main() {
  const { snapshotRoot, collections } = parseArgs();
  const root = process.cwd();
  const resolvedSnapshotRoot = resolveSnapshotRoot(root, snapshotRoot);
  const sourceCandidates = [resolvedSnapshotRoot.path];

  let sourceRoot: string | null = null;
  for (const candidate of sourceCandidates) {
    if (await exists(candidate)) {
      sourceRoot = candidate;
      break;
    }
  }
  if (!sourceRoot) {
    console.error(
      "No media source folder found at the resolved CMS snapshot root.",
    );
    process.exit(2);
  }

  console.info(
    `Resolved media source root (${resolvedSnapshotRoot.source}): ${sourceRoot}`,
  );
  console.info(`Collections: ${collections.join(", ")}`);

  const backendMedia = path.join(root, "backend", "media");

  const mappers: Mapping[] = [
    {
      label: "project-brand-logos",
      dest: path.join(backendMedia, "project-brand-logos"),
      sources: [
        path.join(sourceRoot, "project-brand-logos"),
        path.join(sourceRoot, "images", "project-brand-logos"),
        path.join(sourceRoot, "brand-logos"),
        path.join(sourceRoot, "images", "brand-logos"),
      ],
    },
    {
      label: "cv-experience-logos",
      dest: path.join(backendMedia, "cv-experience-logos"),
      sources: [
        path.join(sourceRoot, "cv-experience-logos"),
        path.join(sourceRoot, "images", "cv-experience-logos"),
      ],
    },
    {
      label: "project-screenshots",
      dest: path.join(backendMedia, "project-screenshots"),
      sources: [
        path.join(sourceRoot, "project-screenshots"),
        path.join(sourceRoot, "images", "project-screenshots"),
      ],
    },
    {
      label: "project-thumbnails",
      dest: path.join(backendMedia, "project-thumbnails"),
      sources: [
        path.join(sourceRoot, "project-thumbnails"),
        path.join(sourceRoot, "images", "project-thumbnails"),
      ],
    },
  ];

  const selectedCollections = new Set(collections);
  const selectedMappers = mappers.filter((map) =>
    selectedCollections.has(map.label),
  );

  let grandTotal = 0;
  for (const map of selectedMappers) {
    let copied = 0;
    for (const src of map.sources) {
      copied += await copyDirFiltered(src, map.dest);
    }
    if (copied > 0) {
      console.info(`Imported ${copied} file(s) into ${map.label}`);
      grandTotal += copied;
    }
  }

  if (grandTotal === 0) {
    console.info(
      "No media imported. Ensure you placed files under the snapshot root in one of the supported subpaths.",
    );
  } else {
    console.info(`Import complete. Total files copied: ${grandTotal}`);
  }
}

main().catch((err) => {
  console.error("media import failed", err);
  process.exit(1);
});
