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
 *   npm run media:seed
 *   npm run media:seed -- --snapshot-root ../cms-media-seedings
 *   CMS_SNAPSHOT_ROOT=../cms-snapshots/_interactive-dev-w-outcomes npm run media:seed
 */
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const IMAGE_EXTS = new Set([".webp", ".png", ".jpg", ".jpeg", ".svg"]);

const SUPPORTED_COLLECTIONS = [
  "project-brand-logos",
  "cv-experience-logos",
  "project-screenshots",
  "project-thumbnails",
] as const;

type SupportedCollection = (typeof SUPPORTED_COLLECTIONS)[number];
type ResolvedSnapshotRoot = {
  path: string;
  source: "flag" | "snapshot-env" | "default";
};

function parseArgs() {
  const args = process.argv.slice(2);
  let snapshotRoot: string | undefined;
  const collections = new Set<SupportedCollection>();

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

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
      const collection = args[index + 1] as SupportedCollection | undefined;
      if (!collection || !SUPPORTED_COLLECTIONS.includes(collection)) {
        console.error(
          `Invalid collection: ${collection ?? ""}. Use one of: ${SUPPORTED_COLLECTIONS.join(", ")}`,
        );
        process.exit(1);
      }
      collections.add(collection);
      index++;
      continue;
    }

    if (arg.startsWith("--collection=")) {
      const collection = arg.slice(
        "--collection=".length,
      ) as SupportedCollection;
      if (!SUPPORTED_COLLECTIONS.includes(collection)) {
        console.error(
          `Invalid collection: ${collection}. Use one of: ${SUPPORTED_COLLECTIONS.join(", ")}`,
        );
        process.exit(1);
      }
      collections.add(collection);
      continue;
    }
  }

  return {
    snapshotRoot,
    collections:
      collections.size > 0 ? [...collections] : [...SUPPORTED_COLLECTIONS],
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
  if (snapshotRoot) {
    return {
      path: path.isAbsolute(snapshotRoot)
        ? snapshotRoot
        : path.resolve(root, snapshotRoot),
      source: "snapshot-env",
    };
  }

  return {
    path: path.join(root, "..", "cms-media-seedings"),
    source: "default",
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
        try {
          await fs.copyFile(s, d);
          count++;
        } catch {
          // ignore per-file copy errors
        }
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
      "No media source folder found. Create ../cms-media-seedings next to the repo, pass --snapshot-root, or set CMS_SNAPSHOT_ROOT in .env.local/.env.",
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
    selectedCollections.has(map.label as SupportedCollection),
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
