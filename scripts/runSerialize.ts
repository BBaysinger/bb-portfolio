import fs from "fs";
import path from "path";
import { syncWithCanonical } from "./syncWithCanonical";
import { parseJson5File } from "./parseJson5File";
import { serializeJson5 } from "./serializeJson5";

const rootDir = process.cwd();

/**
 * Recursively searches for package.json5 and package.json file pairs throughout the project.
 *
 * This function traverses the directory tree looking for directories that contain both:
 * - package.json5 (the formatted file with comments)
 * - package.json (the canonical source of truth)
 *
 * These pairs are used for synchronization, where the canonical package.json structure
 * is applied to the package.json5 file while preserving all comments and formatting.
 *
 * @param dir - Directory to search (searches recursively through subdirectories)
 * @returns Array of tuples containing [json5Path, canonicalJsonPath] pairs
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
function findJsonPairs(dir: string): [string, string][] {
  const results: [string, string][] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively search subdirectories
      results.push(...findJsonPairs(fullPath));
    } else if (entry.name === "package.json5") {
      // Found a package.json5 file - check if canonical package.json exists
      const canonicalPath = path.join(dir, "package.json");
      if (fs.existsSync(canonicalPath)) {
        results.push([fullPath, canonicalPath]);
      }
    }
  }

  return results;
}

// Find all package.json5 + package.json pairs in the project
const pairs = findJsonPairs(rootDir);

if (pairs.length === 0) {
  console.info("No package.json5 + package.json pairs found.");
  process.exit(0);
}

// Process each pair: sync canonical structure with formatted comments
for (const [json5Path, jsonPath] of pairs) {
  console.info(`🛠 Syncing: ${json5Path}`);

  // Parse the existing JSON5 file to extract comments and structure
  const parsed = parseJson5File(json5Path);

  // Load the canonical JSON structure (source of truth for data)
  const canonical = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  // Synchronize: apply canonical structure while preserving comments
  const synced = syncWithCanonical(parsed, canonical);

  // Write the synchronized result back to the JSON5 file
  fs.writeFileSync(json5Path, serializeJson5(synced), "utf-8");

  console.info(`✅ Synced: ${json5Path}`);
}
