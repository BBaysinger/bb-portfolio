import * as fs from "fs";
import * as path from "path";

const fieldsToSync = ["dependencies", "devDependencies", "scripts"];

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

const syncJson5LineByLine = (pkgPath: string) => {
  const dir = path.dirname(pkgPath);
  const pkg5Path = path.join(dir, "package.json5");

  const json = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  if (!fs.existsSync(pkg5Path)) {
    console.warn(`⚠️ Skipping missing file: ${pkg5Path}`);
    return;
  }

  const raw = fs.readFileSync(pkg5Path, "utf8");
  const trimmed = raw.trim();

  // If file is empty or just an empty object, populate it fresh
  const isEmpty = trimmed === "" || trimmed === "{}";

  if (isEmpty) {
    const generated: string[] = ["{"];

    for (const field of fieldsToSync) {
      const entries = json[field];
      if (!entries || Object.keys(entries).length === 0) continue;

      generated.push(`  "${field}": {`);
      const keys = Object.keys(entries);
      keys.forEach((key, i) => {
        const comma = i < keys.length - 1 ? "," : "";
        generated.push(`    "${key}": "${entries[key]}"${comma}`);
      });
      generated.push("  },");
    }

    if (generated.length === 1) {
      generated.push("}"); // Only opening brace so far — close it cleanly
    } else {
      // Remove trailing comma from last block
      const lastLine = generated[generated.length - 1];
      if (lastLine.trim().endsWith(",")) {
        generated[generated.length - 1] = lastLine.replace(/,\s*$/, "");
      }
      generated.push("}");
    }

    fs.writeFileSync(pkg5Path, generated.join("\n"));
    console.log(`🆕 Populated empty ${path.relative(process.cwd(), pkg5Path)}`);
    return;
  }

  // Else: update existing file line-by-line
  const lines = raw.split(/\r?\n/);
  const updatedLines: string[] = [];

  let currentField: string | null = null;

  for (let line of lines) {
    const lineTrimmed = line.trim();

    for (const field of fieldsToSync) {
      if (lineTrimmed.startsWith(`"${field}"`) && lineTrimmed.endsWith("{")) {
        currentField = field;
        break;
      }
    }

    if (currentField && lineTrimmed === "},") {
      currentField = null;
    }

    if (currentField) {
      const match = line.match(/^(\s*)"([^"]+)"\s*:\s*"([^"]+)"(,?)/);
      if (match) {
        const [, indent, key, oldVal, comma] = match;
        const newVal = json[currentField]?.[key];
        if (newVal && newVal !== oldVal) {
          line = `${indent}"${key}": "${newVal}"${comma}`;
        }
      }
    }

    updatedLines.push(line);
  }

  fs.writeFileSync(pkg5Path, updatedLines.join("\n"));
  console.log(`✅ Synced ${path.relative(process.cwd(), pkgPath)}`);
};

const allPackages = findPackageJsonFiles(process.cwd());
allPackages.forEach(syncJson5LineByLine);
