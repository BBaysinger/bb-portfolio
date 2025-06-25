// scripts/sync-json5.ts
import fs from "fs";
import path from "path";
import { sync as globSync } from "glob";
import ignore from "ignore";

const rootDir = process.cwd();
const ig = ignore();
const gitignorePath = path.join(rootDir, ".gitignore");

if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
  ig.add(gitignoreContent);
}

const packageJsonPaths = globSync("**/package.json", {
  cwd: rootDir,
  ignore: ["**/node_modules/**"],
  absolute: true,
});

function replaceValuesInJson5(rawJson5: string, sourceObj: any): string {
  let updated = rawJson5;

  function recurse(obj: any, pathParts: string[] = []) {
    for (const key in obj) {
      const val = obj[key];
      const jsonPath = [...pathParts, key];
      const jsonPointer = `"${key}"`;

      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        recurse(val, jsonPath);
      } else {
        // Create a regex that matches this key-value pair
        const regex = new RegExp(
          `"${key}"\\s*:\\s*(?:".*?"|\\d+|true|false|null)`,
          "g",
        );
        const replacement = `"${key}": ${JSON.stringify(val)}`;
        updated = updated.replace(regex, replacement);
      }
    }
  }

  recurse(sourceObj);
  return updated;
}

// Process each file
for (const packageJsonPath of packageJsonPaths) {
  const relPath = path.relative(rootDir, packageJsonPath);
  if (ig.ignores(relPath)) continue;

  const json5Path = packageJsonPath + "5";
  if (!fs.existsSync(json5Path)) {
    console.log(`⏩ Skipping ${relPath} — no package.json5 found`);
    continue;
  }

  const rawJson5 = fs.readFileSync(json5Path, "utf8");
  const rawJson = fs.readFileSync(packageJsonPath, "utf8");
  const parsedJson = JSON.parse(rawJson);

  const updated = replaceValuesInJson5(rawJson5, parsedJson);
  fs.writeFileSync(json5Path, updated);
  console.log(`✅ Synced ${relPath} → ${path.basename(json5Path)}`);
}
