import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const mediaCollectionsPath = path.resolve(
  moduleDir,
  "../media-collections.txt",
);

function loadMediaCollections(): string[] {
  return readFileSync(mediaCollectionsPath, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export const MEDIA_COLLECTIONS = loadMediaCollections();
export const CV_MEDIA_COLLECTION = "cv-experience-logos";
export const PROJECT_MEDIA_COLLECTIONS = MEDIA_COLLECTIONS.filter(
  (collection) => collection !== CV_MEDIA_COLLECTION,
);

export function ensureMediaCollection(value: string): string {
  if (!MEDIA_COLLECTIONS.includes(value)) {
    throw new Error(
      `Invalid collection: ${value}. Use one of: ${MEDIA_COLLECTIONS.join(", ")}`,
    );
  }

  return value;
}
