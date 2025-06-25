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

// Safely stringify values (with spacing preserved)
function safeStringify(value: any): string {
  return JSON.stringify(value, null, 2).replace(/\n/g, "\n  ");
}

function updateJson5(raw: string, source: Record<string, any>): string {
  const existingKeys = new Set<string>();
  const lines = raw.split("\n");
  const outputLines: string[] = [];
  let insideObject = false;
  let currentKey: string | null = null;
  let bracketLevel = 0;

  for (let line of lines) {
    const keyMatch = line.match(
      /^(\s*)(["']?)([a-zA-Z0-9_\-$@]+)\2\s*:\s*(.+?)?([,{[]?)\s*(\/\/.*)?$/,
    );

    if (keyMatch) {
      const [_, indent, , key, valRaw, trailing, comment] = keyMatch;
      existingKeys.add(key);
      currentKey = key;

      if (source.hasOwnProperty(key)) {
        let value = source[key];
        let serialized = safeStringify(value);

        // Handle single-line simple values
        if (
          typeof value !== "object" ||
          value === null ||
          (Array.isArray(value) && value.length <= 2)
        ) {
          serialized = JSON.stringify(value);
        }

        const fullLine = `${indent}"${key}": ${serialized}${comment ? " " + comment : ""}`;
        outputLines.push(fullLine);
      } else {
        // Key not in source, skip it
      }
    } else {
      // Copy comments or non-matching lines verbatim
      outputLines.push(line);
    }
  }

  // Add missing keys
  for (const key of Object.keys(source)) {
    if (!existingKeys.has(key)) {
      const serialized = safeStringify(source[key]);
      outputLines.splice(
        outputLines.length - 1,
        0,
        `  "${key}": ${serialized},`,
      );
    }
  }

  return outputLines.join("\n").replace(/,\s*([}\]])/g, "$1"); // Final comma cleanup
}

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

  const updated = updateJson5(rawJson5, sourceJson);
  fs.writeFileSync(json5Path, updated);
  console.log(`✅ Synced ${relPath} → ${path.basename(json5Path)}`);
}
