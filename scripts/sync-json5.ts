import fs from "fs";
import path from "path";
import { sync as globSync } from "glob";
import ignore from "ignore";

const rootDir = process.cwd();
const ig = ignore();
const gitignorePath = path.join(rootDir, ".gitignore");

if (fs.existsSync(gitignorePath)) {
  ig.add(fs.readFileSync(gitignorePath, "utf8"));
}

const packageJsonPaths = globSync("**/package.json", {
  cwd: rootDir,
  ignore: ["**/node_modules/**"],
  absolute: true,
});

function replaceValues(raw: string, source: any): string {
  function recurse(obj: any): void {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val && typeof val === "object" && !Array.isArray(val)) {
        recurse(val);
      } else {
        const value = JSON.stringify(val);
        const keyPattern = new RegExp(
          `^\\s*(?:"${key}"|${key})\\s*:\\s*(?:"(?:[^"\\\\]|\\\\.)*"|[^\\s,{}\\[\\]]+)`,
          "m"
        );
        raw = raw.replace(keyPattern, `${key}: ${value}`);
      }
    }
  }
  recurse(source);
  return raw;
}

function removeDeletedKeys(raw: string, source: any): string {
  const keep = new Set(Object.keys(source));
  const linePattern = /^\s*(?:"([^"]+)"|([a-zA-Z0-9_$]+))\s*:\s*(?:\{[^{}]*\}|\[[^\[\]]*\]|"(?:[^"\\]|\\.)*"|[^,\n]+),?\s*$/gm;

  return raw.replace(linePattern, (match, quoted, bare) => {
    const key = quoted || bare;
    return keep.has(key) ? match : "";
  });
}

function addMissingKeys(raw: string, source: any): string {
  const existingMatches = Array.from(
    raw.matchAll(/(?:"([^"]+)"|([a-zA-Z0-9_$]+))\s*:/g)
  );
  const existingKeys = new Set(
    existingMatches.map(([_, q, b]) => q || b).filter(Boolean)
  );

  const additions = Object.entries(source)
    .filter(([key]) => !existingKeys.has(key))
    .map(([key, val]) => `  ${key}: ${JSON.stringify(val)}`);

  if (!additions.length) return raw;
  return raw.replace(/\}\s*$/, ",\n" + additions.join(",\n") + "\n}");
}

function cleanupCommas(raw: string): string {
  return raw
    .replace(/,\s*,/g, ",")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/\n{2,}/g, "\n");
}

// 🔁 Main
for (const packageJsonPath of packageJsonPaths) {
  const relPath = path.relative(rootDir, packageJsonPath);
  if (ig.ignores(relPath)) continue;

  const json5Path = packageJsonPath + "5";
  if (!fs.existsSync(json5Path)) {
    console.log(`⏩ Skipping ${relPath} — no package.json5 found`);
    continue;
  }

  const rawJson5 = fs.readFileSync(json5Path, "utf8");
  const sourceJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  let updated = replaceValues(rawJson5, sourceJson);
  updated = removeDeletedKeys(updated, sourceJson);
  updated = addMissingKeys(updated, sourceJson);
  updated = cleanupCommas(updated);

  fs.writeFileSync(json5Path, updated);
  console.log(`✅ Synced ${relPath} → ${path.basename(json5Path)}`);
}
