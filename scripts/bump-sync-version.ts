import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

type PackageManifest = {
  version?: string;
};

type PackageLock = {
  version?: string;
  packages?: Record<string, { version?: string }>;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const packageManifestPaths = [
  path.join(repoRoot, "package.json"),
  path.join(repoRoot, "backend", "package.json"),
  path.join(repoRoot, "frontend", "package.json"),
];

const packageLockPaths = [
  path.join(repoRoot, "package-lock.json"),
  path.join(repoRoot, "backend", "package-lock.json"),
  path.join(repoRoot, "frontend", "package-lock.json"),
];

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJsonFile(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function bumpPatchVersion(version: string): string {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);

  if (!match) {
    throw new Error(
      `Expected root package version to use x.y.z format, received: ${version}`,
    );
  }

  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

const rootPackageJsonPath = path.join(repoRoot, "package.json");
const rootPackageJson = readJsonFile<PackageManifest>(rootPackageJsonPath);

if (!rootPackageJson.version) {
  throw new Error("Root package.json must declare a version before bumping.");
}

const nextVersion = bumpPatchVersion(rootPackageJson.version);

for (const manifestPath of packageManifestPaths) {
  const manifest = readJsonFile<PackageManifest>(manifestPath);
  manifest.version = nextVersion;
  writeJsonFile(manifestPath, manifest);
}

for (const lockPath of packageLockPaths) {
  if (!fs.existsSync(lockPath)) {
    continue;
  }

  const lockfile = readJsonFile<PackageLock>(lockPath);
  lockfile.version = nextVersion;

  if (lockfile.packages?.[""]) {
    lockfile.packages[""].version = nextVersion;
  }

  writeJsonFile(lockPath, lockfile);
}
