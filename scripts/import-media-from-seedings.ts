/**
 * Import media from an external sibling folder (../cms-media-seedings)
 * into backend/media/* for local development.
 *
 * This does NOT commit any media. It only copies files into the ignored
 * backend/media folders so a fresh clone can be hydrated from your local
 * working assets directory that lives outside the repo.
 *
 * Supported structure examples under the selected seedings root:
 * - project-brand-logos/
 * - cv-experience-logos/
 * - project-screenshots/
 * - project-thumbnails/
 *
 * or with an intermediate images/ folder, e.g. images/project-brand-logos, etc.
 *
 * Usage:
 *   npm run media:seed
 *   npm run media:seed -- --seedings-dir ../cms-media-seedings
 *   PORTFOLIO_MEDIA_SEED_DIR=../cms-snapshots/_interactive-dev-w-outcomes npm run media:seed
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
type ResolvedSeedingsRoot = {
  path: string;
  source: "flag" | "media-env" | "default";
};

function parseArgs() {
  const args = process.argv.slice(2);
  let seedingsDir: string | undefined;
  const collections = new Set<SupportedCollection>();

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === "--seedings-dir") {
      seedingsDir = args[index + 1];
      index++;
      continue;
    }

    if (arg.startsWith("--seedings-dir=")) {
      seedingsDir = arg.slice("--seedings-dir=".length);
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
    seedingsDir,
    collections:
      collections.size > 0 ? [...collections] : [...SUPPORTED_COLLECTIONS],
  };
}

function resolveSeedingsRoot(
  root: string,
  overrideDir?: string,
): ResolvedSeedingsRoot {
  if (overrideDir?.trim()) {
    return {
      path: path.isAbsolute(overrideDir)
        ? overrideDir
        : path.resolve(root, overrideDir),
      source: "flag",
    };
  }

  const mediaSeedDir = process.env.PORTFOLIO_MEDIA_SEED_DIR?.trim();
  if (mediaSeedDir) {
    return {
      path: path.isAbsolute(mediaSeedDir)
        ? mediaSeedDir
        : path.resolve(root, mediaSeedDir),
      source: "media-env",
    };
  }

  return {
    path: path.join(root, "..", "cms-media-seedings"),
    source: "default",
  };
}

async function exists(p: string) {
  try {
    await fs.access(p, fsConstants.F_OK);
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
  const { seedingsDir, collections } = parseArgs();
  const root = process.cwd();
  const resolvedSeedingsRoot = resolveSeedingsRoot(root, seedingsDir);
  const seedBaseCandidates = [resolvedSeedingsRoot.path];

  let seedBase: string | null = null;
  for (const c of seedBaseCandidates) {
    if (await exists(c)) {
      seedBase = c;
      break;
    }
  }
  if (!seedBase) {
    console.error(
      "No media seed folder found. Create ../cms-media-seedings next to the repo, pass --seedings-dir, or set PORTFOLIO_MEDIA_SEED_DIR in .env.local/.env.",
    );
    process.exit(2);
  }

  console.info(
    `Resolved media seed root (${resolvedSeedingsRoot.source}): ${seedBase}`,
  );
  console.info(`Collections: ${collections.join(", ")}`);

  const backendMedia = path.join(root, "backend", "media");

  const mappers: Mapping[] = [
    {
      label: "project-brand-logos",
      dest: path.join(backendMedia, "project-brand-logos"),
      sources: [
        path.join(seedBase, "project-brand-logos"),
        path.join(seedBase, "images", "project-brand-logos"),
        path.join(seedBase, "brand-logos"),
        path.join(seedBase, "images", "brand-logos"),
      ],
    },
    {
      label: "cv-experience-logos",
      dest: path.join(backendMedia, "cv-experience-logos"),
      sources: [
        path.join(seedBase, "cv-experience-logos"),
        path.join(seedBase, "images", "cv-experience-logos"),
      ],
    },
    {
      label: "project-screenshots",
      dest: path.join(backendMedia, "project-screenshots"),
      sources: [
        path.join(seedBase, "project-screenshots"),
        path.join(seedBase, "images", "project-screenshots"),
      ],
    },
    {
      label: "project-thumbnails",
      dest: path.join(backendMedia, "project-thumbnails"),
      sources: [
        path.join(seedBase, "project-thumbnails"),
        path.join(seedBase, "images", "project-thumbnails"),
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
      "No media imported. Ensure you placed files under the seed folder in one of the supported subpaths.",
    );
  } else {
    console.info(`Import complete. Total files copied: ${grandTotal}`);
  }
}

main().catch((err) => {
  console.error("media import failed", err);
  process.exit(1);
});
