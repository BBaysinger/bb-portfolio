import fs from "fs";
import path from "path";
import { syncWithCanonical } from "./syncWithCanonical";
import { parseJson5File } from "./parseJson5File";
import { serializeJson5 } from "./serializeJson5";

const rootDir = process.cwd();

function findJsonPairs(dir: string): [string, string][] {
  const results: [string, string][] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...findJsonPairs(fullPath));
    } else if (entry.name === "package.json5") {
      const canonicalPath = path.join(dir, "package.json");
      if (fs.existsSync(canonicalPath)) {
        results.push([fullPath, canonicalPath]);
      }
    }
  }

  return results;
}

const pairs = findJsonPairs(rootDir);

if (pairs.length === 0) {
  console.info("No package.json5 + package.json pairs found.");
  process.exit(0);
}

for (const [json5Path, jsonPath] of pairs) {
  console.info(`🛠 Syncing: ${json5Path}`);

  const parsed = parseJson5File(json5Path);
  const canonical = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  const synced = syncWithCanonical(parsed, canonical);
  fs.writeFileSync(json5Path, serializeJson5(synced), "utf-8");

  console.info(`✅ Synced: ${json5Path}`);
}
