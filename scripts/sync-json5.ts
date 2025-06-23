import fs from 'fs';
import path from 'path';
import * as JSON5 from 'json5';

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('Please specify file types to sync (e.g. package, tsconfig)');
  process.exit(1);
}

const projectDirs = ['.', 'frontend', 'backend'];

function syncJson5(jsonPath: string) {
  const json5Path = jsonPath.replace(/\.json$/, '.json5');

  const exists = fs.existsSync(json5Path);
  if (!exists) {
    console.log(`🆕 Creating ${json5Path}`);
    fs.copyFileSync(jsonPath, json5Path);
  }

  try {
    const json5 = fs.readFileSync(json5Path, 'utf8');
    const parsed = JSON5.parse(json5);
    const out = JSON.stringify(parsed, null, 2) + '\n';
    fs.writeFileSync(jsonPath, out);
    console.log(`✅ Synced ${jsonPath}`);
  } catch (err) {
    console.error(`❌ Failed to sync ${jsonPath}`);
    console.error(err);
  }
}

projectDirs.forEach((dir) => {
  targets.forEach((base) => {
    const jsonPath = path.join(dir, `${base}.json`);
    if (fs.existsSync(jsonPath)) {
      syncJson5(jsonPath);
    }
  });
});
