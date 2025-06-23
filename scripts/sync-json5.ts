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
      generated.push("}");
    } else {
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

  const lines = raw.split(/\r?\n/);
  const updatedLines: string[] = [];
  const touchedFields = new Set<string>();

  let currentField: string | null = null;
  let blockLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!currentField) {
      // Detect start of a syncable block
      for (const field of fieldsToSync) {
        if (
          trimmed.startsWith(`"${field}"`) &&
          trimmed.endsWith("{") &&
          !touchedFields.has(field)
        ) {
          currentField = field;
          blockLines = [line]; // Store block header
          touchedFields.add(field);
          i++;
          // DO NOT push this line to updatedLines — it will be handled in full block rebuild
          break;
        }
      }

      if (!currentField) {
        updatedLines.push(line);
        i++;
      }

      continue;
    }

    // Inside a field block
    blockLines.push(line);

    if (trimmed === "},") {
      const field = currentField;
      currentField = null;

      const fieldLines = blockLines.slice(1, blockLines.length - 1); // exclude header/footer
      const finalBlock: string[] = [];

      const existingKeys = new Set<string>();
      for (const entryLine of fieldLines) {
        const match = entryLine.match(/^\s*"([^"]+)"\s*:/);
        if (match) {
          existingKeys.add(match[1]);
        }
      }

      for (let line of fieldLines) {
        const match = line.match(/^(\s*)"([^"]+)"\s*:\s*"([^"]+)"(,?)/);
        if (match) {
          const [, indent, key, oldVal, comma] = match;
          const newVal = json[field!]?.[key];
          if (newVal && newVal !== oldVal) {
            line = `${indent}"${key}": "${newVal}"${comma}`;
          }
        }
        finalBlock.push(line);
      }

      // Add missing keys
      const jsonField = json[field!] as Record<string, string>;
      if (jsonField) {
        for (const [key, value] of Object.entries(jsonField)) {
          if (!existingKeys.has(key)) {
            finalBlock.push(`    "${key}": "${value}",`);
          }
        }
      }

      // Rebuild block safely
      updatedLines.push(blockLines[0]); // Header: "scripts": {
      updatedLines.push(...finalBlock);
      updatedLines.push(blockLines[blockLines.length - 1]); // Footer: "},"

      blockLines = [];
      i++;
      continue;
    }

    i++;
  }

  fs.writeFileSync(pkg5Path, updatedLines.join("\n"));
  console.log(`✅ Synced ${path.relative(process.cwd(), pkgPath)}`);
};

const allPackages = findPackageJsonFiles(process.cwd());
allPackages.forEach(syncJson5LineByLine);
