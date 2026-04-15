/**
 * Import media from an external sibling folder (../cms-seedings)
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
 *   npm run media:seed -- --seedings-dir ../cms-seedings/variants/opportunity-a
 *   PORTFOLIO_CONTENT_DIR=../cms-seedings/variants/opportunity-a npm run media:seed
 */
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const IMAGE_EXTS = new Set([".webp", ".png", ".jpg", ".jpeg", ".svg"]);

function parseArgs() {
  const args = process.argv.slice(2);
  let seedingsDir: string | undefined;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === "--seedings-dir") {
      seedingsDir = args[index + 1];
      index++;
      continue;
    }

    if (arg.startsWith("--seedings-dir=")) {
      seedingsDir = arg.slice("--seedings-dir=".length);
    }
  }

  return { seedingsDir };
}

function resolveSeedingsRoot(root: string, overrideDir?: string) {
  const configuredDir =
    overrideDir?.trim() || process.env.PORTFOLIO_CONTENT_DIR?.trim();

  if (!configuredDir) {
    return path.join(root, "..", "cms-seedings");
  }

  return path.isAbsolute(configuredDir)
    ? configuredDir
    : path.resolve(root, configuredDir);
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
  const { seedingsDir } = parseArgs();
  const root = process.cwd();
  const seedBaseCandidates = [resolveSeedingsRoot(root, seedingsDir)];

  let seedBase: string | null = null;
  for (const c of seedBaseCandidates) {
    if (await exists(c)) {
      seedBase = c;
      break;
    }
  }
  if (!seedBase) {
    console.error(
      "No seed folder found. Create ../cms-seedings next to the repo or pass --seedings-dir / PORTFOLIO_CONTENT_DIR.",
    );
    process.exit(2);
  }

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

  let grandTotal = 0;
  for (const map of mappers) {
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
