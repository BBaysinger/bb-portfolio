import * as fs from "fs";
import * as path from "path";
import { parse, stringify, CommentObject } from "comment-json";

/**
 * @file sync-json5.ts
 * @description
 * Recursively scans the project for all `package.json` files, and for each one:
 *  - Updates or creates a sibling `package.json5` file
 *  - Merges matching fields (`dependencies`, `devDependencies`, `scripts`)
 *  - Preserves existing comments using `comment-json`
 *
 * This allows you to keep commented configuration blocks (e.g., commented-out workspaces)
 * while ensuring your `.json5` files stay in sync with real package changes.
 *
 * Useful for monorepos where you want to preserve human-readable annotations,
 * while still using tools like `npm install`, `ncu -u`, etc., on the actual `package.json`.
 *
 * Usage:
 *   npx ts-node scripts/sync-json5.ts
 *
 * Requirements:
 *   - Run from the root of your project
 *   - `comment-json` must be installed (`npm i comment-json`)
 *
 * Limitations:
 *   - Does not preserve key ordering
 *   - Will overwrite duplicate keys in `.json5` without confirmation
 *
 * Author: Bradley Baysinger
 * Created: 2025-06-22
 */

// Helper: create an empty comment-aware object
const createEmptyCommentObject = (): CommentObject =>
  parse("{}", null, true) as CommentObject;

// Recursively find all package.json files, skipping node_modules
const findPackageJsonFiles = (dir: string): string[] => {
  const results: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      results.push(...findPackageJsonFiles(fullPath));
    } else if (entry.name === "package.json") {
      results.push(fullPath);
    }
  }

  return results;
};

// Sync one package.json with its sibling package.json5
const syncJson5 = (pkgPath: string) => {
  const dir = path.dirname(pkgPath);
  const pkg5Path = path.join(dir, "package.json5");

  const json = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  let json5: CommentObject;

  try {
    if (fs.existsSync(pkg5Path)) {
      json5 = parse(
        fs.readFileSync(pkg5Path, "utf8"),
        null,
        true,
      ) as CommentObject;
    } else {
      json5 = createEmptyCommentObject();
      console.log(`🆕 Creating ${path.relative(process.cwd(), pkg5Path)}`);
    }
  } catch (err) {
    console.error(`❌ Failed to parse ${pkg5Path}`);
    throw err;
  }

  const fieldsToSync = ["dependencies", "devDependencies", "scripts"];

  for (const field of fieldsToSync) {
    if (!json[field]) continue;

    const existing = json5[field];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      json5[field] = parse("{}", null, true);
    }

    const jsonField = json[field] as Record<string, string>;
    const json5Field = json5[field] as Record<string, string>;

    for (const [key, value] of Object.entries(jsonField)) {
      json5Field[key] = value;
    }
  }

  // Clean up invalid or empty fields before writing
  for (const field of fieldsToSync) {
    const value = json5[field];
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).length === 0
    ) {
      delete json5[field];
    }
  }

  fs.writeFileSync(pkg5Path, stringify(json5, null, 2));
  console.log(`✅ Synced ${path.relative(process.cwd(), pkgPath)}`);
};

// Run it
const allPackages = findPackageJsonFiles(process.cwd());
allPackages.forEach(syncJson5);
