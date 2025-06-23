import * as fs from 'fs';
import * as path from 'path';

// TODO: Come back to this.

const PACKAGE = 'package.json';
const PACKAGE5 = 'package.json5';

function findAllPackageJsonPaths(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...findAllPackageJsonPaths(fullPath));
    } else if (entry.name === PACKAGE) {
      results.push(fullPath);
    }
  }
  return results;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateValuesInJson5(pkgPath: string): void {
  const dir = path.dirname(pkgPath);
  const pkg5Path = path.join(dir, PACKAGE5);
  if (!fs.existsSync(pkg5Path)) {
    console.warn(`⚠️ Missing ${PACKAGE5} next to ${pkgPath}`);
    return;
  }

  const original = fs.readFileSync(pkg5Path, 'utf8');
  const json = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  let modified = original;

  const replaceRecursive = (obj: any, prefix = '') => {
    for (const key in obj) {
      const value = obj[key];
      const jsonKey = `${prefix}"${key}"`;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        replaceRecursive(value, `${jsonKey}: {`);
      } else {
        const valueRegex = new RegExp(
          `(${escapeRegExp(jsonKey)}\s*:\s*)"[^"]*"`,
          'g'
        );
        modified = modified.replace(valueRegex, `$1"${value}"`);
      }
    }
  };

  replaceRecursive(json);

  fs.writeFileSync(pkg5Path, modified);
  console.log(`✅ Synced: ${path.relative(process.cwd(), pkg5Path)}`);
}

const packages = findAllPackageJsonPaths(process.cwd());
packages.forEach(updateValuesInJson5);
