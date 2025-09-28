/**
 * Import media from an external sibling folder (../seedings or ../seeding)
 * into backend/media/* for local development.
 *
 * This does NOT commit any media. It only copies files into the ignored
 * backend/media folders so a fresh clone can be hydrated from your local
 * working assets directory that lives outside the repo.
 *
 * Supported structure examples under ../seedings (or ../seeding):
 * - brand-logos/
 * - project-screenshots/
 * - project-thumbnails/
 *
 * or with an intermediate images/ folder, e.g. images/brand-logos, etc.
 * Also accepts legacy:
 * - client-logos/ (mapped to brand-logos)
 * - project-carousel/ (mapped to project-screenshots)
 * - project-carousel/thumbs (mapped to project-thumbnails)
 *
 * Usage:
 *   npm run media:import
 */
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const IMAGE_EXTS = new Set([".webp", ".png", ".jpg", ".jpeg", ".svg"]);

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
  const root = process.cwd();
  const seedBaseCandidates = [
    path.join(root, "..", "seedings"),
    path.join(root, "..", "seeding"),
  ];

  let seedBase: string | null = null;
  for (const c of seedBaseCandidates) {
    if (await exists(c)) {
      seedBase = c;
      break;
    }
  }
  if (!seedBase) {
    console.error(
      "No seed folder found. Create ../seedings (or ../seeding) next to the repo and place your images inside.",
    );
    process.exit(2);
  }

  const backendMedia = path.join(root, "backend", "media");

  const mappers: Mapping[] = [
    {
      label: "brand-logos",
      dest: path.join(backendMedia, "brand-logos"),
      sources: [
        path.join(seedBase, "brand-logos"),
        path.join(seedBase, "images", "brand-logos"),
        path.join(seedBase, "client-logos"), // legacy
      ],
    },
    {
      label: "project-screenshots",
      dest: path.join(backendMedia, "project-screenshots"),
      sources: [
        path.join(seedBase, "project-screenshots"),
        path.join(seedBase, "images", "project-screenshots"),
        path.join(seedBase, "project-carousel"), // legacy
      ],
    },
    {
      label: "project-thumbnails",
      dest: path.join(backendMedia, "project-thumbnails"),
      sources: [
        path.join(seedBase, "project-thumbnails"),
        path.join(seedBase, "images", "project-thumbnails"),
        path.join(seedBase, "project-carousel", "thumbs"), // legacy
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
      console.log(`Imported ${copied} file(s) into ${map.label}`);
      grandTotal += copied;
    }
  }

  if (grandTotal === 0) {
    console.log(
      "No media imported. Ensure you placed files under the seed folder in one of the supported subpaths.",
    );
  } else {
    console.log(`Import complete. Total files copied: ${grandTotal}`);
  }
}

main().catch((err) => {
  console.error("media import failed", err);
  process.exit(1);
});
