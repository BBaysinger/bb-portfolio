import * as fs from 'fs';
import * as path from 'path';
import * as JSON5 from 'json5';

// Helper: Recursively walk JSON and build flat path map
const flatten = (obj: any, prefix = ''): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const key in obj) {
    const value = obj[key];
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value, fullPath));
    } else {
      result[fullPath] = value;
    }
  }
  return result;
};

// Helper: Unflatten into nested object
const unflatten = (flatObj: Record<string, any>): any => {
  const result: any = {};
  for (const flatKey in flatObj) {
    const keys = flatKey.split('.');
    keys.reduce((acc, key, idx) => {
      if (idx === keys.length - 1) {
        acc[key] = flatObj[flatKey];
        return;
      }
      if (!acc[key]) acc[key] = {};
      return acc[key];
    }, result);
  }
  return result;
};

// Extract comments and associate them with nearby keys
const extractComments = (lines: string[]): Record<string, string[]> => {
  const comments: Record<string, string[]> = {};
  let lastCommentLines: string[] = [];
  let currentPath: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^\/\//.test(trimmed) || /^\/\*/.test(trimmed)) {
      lastCommentLines.push(trimmed);
    } else {
      const match = trimmed.match(/^"([^"]+)":/);
      if (match) {
        const key = match[1];
        const pathStr = [...currentPath, key].join('.');
        if (lastCommentLines.length) {
          comments[pathStr] = [...lastCommentLines];
          lastCommentLines = [];
        }
      }

      if (trimmed.endsWith('{')) {
        const match = trimmed.match(/^"([^"]+)":\s*{/);
        if (match) currentPath.push(match[1]);
      } else if (trimmed === '},' || trimmed === '}') {
        currentPath.pop();
      }
    }
  }

  return comments;
};

const syncPackageJsonToJson5 = (pkgPath: string) => {
  const dir = path.dirname(pkgPath);
  const pkg5Path = path.join(dir, 'package.json5');

  if (!fs.existsSync(pkg5Path)) {
    console.warn(`⚠️ No package.json5 found at ${pkg5Path}`);
    return;
  }

  const json = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const rawJson5 = fs.readFileSync(pkg5Path, 'utf8');
  const json5Lines = rawJson5.split(/\r?\n/);
  const commentsMap = extractComments(json5Lines);

  const flatJson = flatten(json);
  const updatedFlat: Record<string, string[]> = {};

  const outputLines: string[] = ['{'];
  const keys = Object.keys(flatJson);
  keys.forEach((key, index) => {
    if (commentsMap[key]) {
      commentsMap[key].forEach(comment => outputLines.push(`  ${comment}`));
    }
    const segments = key.split('.');
    const indent = '  '.repeat(segments.length);
    const k = segments[segments.length - 1];
    const value = JSON.stringify(flatJson[key]);
    const comma = index < keys.length - 1 ? ',' : '';
    outputLines.push(`${indent}"${k}": ${value}${comma}`);
  });
  outputLines.push('}');

  fs.writeFileSync(pkg5Path, outputLines.join('\n'));
  console.log(`✅ Synced ${path.relative(process.cwd(), pkg5Path)}`);
};

syncPackageJsonToJson5(path.resolve(process.cwd(), 'package.json'));
