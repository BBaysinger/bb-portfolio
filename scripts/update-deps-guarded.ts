#!/usr/bin/env tsx

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

type PackageTarget = {
  label: string;
  cwd: string;
  installArgs?: string[];
  lockfileRefreshArgs?: string[];
};

type Guardrail = {
  packageName: string;
  maxMajor: number;
  reason: string;
};

type FamilyGuardrail = {
  name: string;
  members: string[];
  reason: string;
};

type UpgradePlan = {
  target: PackageTarget;
  allowed: Array<{ name: string; version: string }>;
  blocked: Array<{ name: string; version: string; reason: string }>;
};

type CliOptions = {
  dryRun: boolean;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const targets: PackageTarget[] = [
  { label: "root", cwd: repoRoot },
  {
    label: "backend",
    cwd: path.join(repoRoot, "backend"),
    installArgs: ["--legacy-peer-deps"],
    lockfileRefreshArgs: ["--package-lock-only", "--legacy-peer-deps"],
  },
  { label: "frontend", cwd: path.join(repoRoot, "frontend") },
];

const guardrails: Guardrail[] = [
  {
    packageName: "eslint",
    maxMajor: 9,
    reason:
      "eslint-plugin-import@2.32.0 and eslint-plugin-react-hooks@7.0.1 currently peer-support only eslint^9.",
  },
  {
    packageName: "typescript",
    maxMajor: 6,
    reason:
      "TypeScript is a core toolchain dependency here; review new major upgrades explicitly instead of auto-applying them.",
  },
  {
    packageName: "next",
    maxMajor: 16,
    reason:
      "Next.js major upgrades can require config and runtime changes; review them explicitly instead of auto-applying them.",
  },
  {
    packageName: "payload",
    maxMajor: 3,
    reason:
      "Payload major upgrades can require coordinated backend changes; review them explicitly instead of auto-applying them.",
  },
  {
    packageName: "react",
    maxMajor: 19,
    reason:
      "React major upgrades should be reviewed together with react-dom and framework compatibility.",
  },
  {
    packageName: "react-dom",
    maxMajor: 19,
    reason:
      "React DOM major upgrades should be reviewed together with react and framework compatibility.",
  },
];

const familyGuardrails: FamilyGuardrail[] = [
  {
    name: "Payload family",
    members: [
      "payload",
      "@payloadcms/db-mongodb",
      "@payloadcms/email-nodemailer",
      "@payloadcms/next",
      "@payloadcms/payload-cloud",
      "@payloadcms/richtext-lexical",
      "@payloadcms/storage-s3",
      "@payloadcms/ui",
    ],
    reason:
      "Payload packages are version-coupled in this repo and should upgrade together on the same release.",
  },
  {
    name: "Next family",
    members: ["next", "eslint-config-next", "@next/eslint-plugin-next"],
    reason:
      "Next.js and its ESLint packages should stay aligned on the same release in this repo.",
  },
  {
    name: "React family",
    members: ["react", "react-dom"],
    reason:
      "react and react-dom should be upgraded together on the same release.",
  },
];

function parseArgs(argv: string[]): CliOptions {
  const args = new Set(argv);

  if (args.has("--help") || args.has("-h")) {
    console.info("Usage: tsx scripts/update-deps-guarded.ts [--dry-run]");
    console.info("");
    console.info("Updates root/backend/frontend dependencies with guardrails.");
    console.info("Runs npm install for each changed package root.");
    console.info(
      "Syncs package.json5 only after all updates/install steps succeed.",
    );
    process.exit(0);
  }

  return {
    dryRun: args.has("--dry-run"),
  };
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  options: { allowFailure?: boolean; captureOutput?: boolean } = {},
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: options.captureOutput ? "pipe" : "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  const status = result.status ?? 1;
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  if (!options.allowFailure && status !== 0) {
    throw new Error(
      `Command failed (${status}): ${command} ${args.join(" ")} in ${cwd}`,
    );
  }

  return { status, stdout, stderr };
}

function parseMajor(versionSpec: string): number | null {
  const match = versionSpec.match(/\d+/);
  if (!match) return null;
  return Number.parseInt(match[0], 10);
}

function getGuardrail(packageName: string): Guardrail | undefined {
  return guardrails.find((guardrail) => guardrail.packageName === packageName);
}

function getManifestPackages(target: PackageTarget): Set<string> {
  const packageJsonPath = path.join(target.cwd, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };

  return new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {}),
  ]);
}

function getUpgradedPackages(target: PackageTarget): Record<string, string> {
  const result = runCommand("ncu", ["--jsonUpgraded"], target.cwd, {
    captureOutput: true,
  });

  const trimmed = result.stdout.trim();
  if (!trimmed) return {};

  return JSON.parse(trimmed) as Record<string, string>;
}

function extractVersionCore(versionSpec: string): string | null {
  const match = versionSpec.match(/\d+(?:\.\d+){0,2}/);
  return match?.[0] ?? null;
}

function blockUpgrade(
  blocked: Map<string, { version: string; reason: string }>,
  name: string,
  version: string,
  reason: string,
): void {
  if (blocked.has(name)) return;
  blocked.set(name, { version, reason });
}

function applyFamilyGuardrails(
  target: PackageTarget,
  upgraded: Record<string, string>,
  blocked: Map<string, { version: string; reason: string }>,
): void {
  const manifestPackages = getManifestPackages(target);

  for (const family of familyGuardrails) {
    const presentMembers = family.members.filter((member) =>
      manifestPackages.has(member),
    );

    if (presentMembers.length < 2) continue;

    const upgradedMembers = presentMembers.filter(
      (member) => member in upgraded,
    );
    if (!upgradedMembers.length) continue;

    const missingMembers = presentMembers.filter(
      (member) => !(member in upgraded),
    );

    if (missingMembers.length) {
      const reason = `${family.reason} Missing companion upgrades: ${missingMembers.join(", ")}.`;
      for (const member of upgradedMembers) {
        blockUpgrade(blocked, member, upgraded[member], reason);
      }
      continue;
    }

    const versionCores = new Set(
      upgradedMembers
        .map((member) => extractVersionCore(upgraded[member]))
        .filter((version): version is string => Boolean(version)),
    );

    if (versionCores.size > 1) {
      const reason = `${family.reason} Planned versions do not align across the family.`;
      for (const member of upgradedMembers) {
        blockUpgrade(blocked, member, upgraded[member], reason);
      }
    }
  }
}

function applyFrontendTypescriptEslintGuardrail(
  target: PackageTarget,
  upgraded: Record<string, string>,
  blocked: Map<string, { version: string; reason: string }>,
): void {
  if (target.label !== "frontend") return;

  const manifestPackages = getManifestPackages(target);
  if (!manifestPackages.has("eslint-config-next")) return;

  const typescriptEslintPackages = [
    "@typescript-eslint/eslint-plugin",
    "@typescript-eslint/parser",
  ];

  const plannedUpdates = typescriptEslintPackages.filter(
    (packageName) => packageName in upgraded,
  );

  if (!plannedUpdates.length) return;

  const reason =
    "Frontend currently relies on eslint-config-next's transitive typescript-eslint package, which is still resolving 8.58.1 here. Do not auto-upgrade @typescript-eslint/parser or @typescript-eslint/eslint-plugin in frontend until eslint-config-next and its transitive typescript-eslint release align.";

  for (const packageName of plannedUpdates) {
    blockUpgrade(blocked, packageName, upgraded[packageName], reason);
  }
}

function buildPlan(target: PackageTarget): UpgradePlan {
  const upgraded = getUpgradedPackages(target);
  const blocked = new Map<string, { version: string; reason: string }>();

  for (const [name, version] of Object.entries(upgraded)) {
    const guardrail = getGuardrail(name);
    const major = parseMajor(version);

    if (guardrail && major !== null && major > guardrail.maxMajor) {
      blockUpgrade(blocked, name, version, guardrail.reason);
    }
  }

  applyFamilyGuardrails(target, upgraded, blocked);
  applyFrontendTypescriptEslintGuardrail(target, upgraded, blocked);

  const allowed: UpgradePlan["allowed"] = [];
  const blockedEntries: UpgradePlan["blocked"] = [];

  for (const [name, version] of Object.entries(upgraded)) {
    const blockedUpgrade = blocked.get(name);
    if (blockedUpgrade) {
      blockedEntries.push({
        name,
        version: blockedUpgrade.version,
        reason: blockedUpgrade.reason,
      });
      continue;
    }

    allowed.push({ name, version });
  }

  allowed.sort((left, right) => left.name.localeCompare(right.name));
  blockedEntries.sort((left, right) => left.name.localeCompare(right.name));

  return { target, allowed, blocked: blockedEntries };
}

function printPlan(plan: UpgradePlan): void {
  console.info(
    `\n[${plan.target.label}] allowed updates: ${plan.allowed.length}`,
  );
  for (const entry of plan.allowed) {
    console.info(`  - ${entry.name} -> ${entry.version}`);
  }

  if (!plan.blocked.length) return;

  console.info(
    `[${plan.target.label}] blocked updates: ${plan.blocked.length}`,
  );
  for (const entry of plan.blocked) {
    console.info(`  - ${entry.name} -> ${entry.version}`);
    console.info(`    ${entry.reason}`);
  }
}

function applyAllowedUpdates(plan: UpgradePlan): void {
  if (!plan.allowed.length) return;

  const filter = plan.allowed.map((entry) => entry.name).join(",");
  console.info(`\n[${plan.target.label}] applying guarded updates`);
  runCommand("ncu", ["-u", "--filter", filter], plan.target.cwd);
}

function installWithRetry(target: PackageTarget): void {
  const lockfilePath = path.join(target.cwd, "package-lock.json");
  const nodeModulesPath = path.join(target.cwd, "node_modules");
  const installArgs = ["install", ...(target.installArgs ?? [])];
  const lockfileRefreshArgs = [
    "install",
    ...(target.lockfileRefreshArgs ?? ["--package-lock-only"]),
  ];

  console.info(`\n[${target.label}] running npm install`);
  const firstAttempt = runCommand("npm", installArgs, target.cwd, {
    allowFailure: true,
  });
  if (firstAttempt.status === 0) {
    console.info(`[${target.label}] refreshing package-lock.json`);
    runCommand("npm", lockfileRefreshArgs, target.cwd);
    return;
  }

  if (!fs.existsSync(lockfilePath)) {
    throw new Error(
      `[${target.label}] npm install failed and no lockfile exists to retry.`,
    );
  }

  console.info(
    `[${target.label}] initial install failed, deleting package-lock.json and node_modules before retrying once`,
  );
  fs.rmSync(lockfilePath, { force: true });
  fs.rmSync(nodeModulesPath, { recursive: true, force: true });
  runCommand("npm", installArgs, target.cwd);
  console.info(`[${target.label}] refreshing package-lock.json`);
  runCommand("npm", lockfileRefreshArgs, target.cwd);
}

function syncPackages(): void {
  console.info("\n[root] syncing package.json5 manifests");
  runCommand("npm", ["run", "sync:packages"], repoRoot);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  console.info(
    options.dryRun
      ? "Running guarded dependency update in dry-run mode."
      : "Running guarded dependency update.",
  );

  const plans = targets.map(buildPlan);
  plans.forEach(printPlan);

  const changedPlans = plans.filter((plan) => plan.allowed.length > 0);

  if (!changedPlans.length) {
    if (options.dryRun) {
      console.info("\nNo allowed dependency updates found.");
      return;
    }

    console.info("\nNo allowed dependency updates found.");
    syncPackages();
    console.info("\nGuarded dependency update completed successfully.");
    return;
  }

  if (options.dryRun) {
    console.info("\nDry run complete. No files were changed.");
    return;
  }

  for (const plan of changedPlans) {
    applyAllowedUpdates(plan);
  }

  for (const plan of changedPlans) {
    installWithRetry(plan.target);
  }

  syncPackages();

  console.info("\nGuarded dependency update completed successfully.");
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nGuarded dependency update failed: ${message}`);
  console.error(
    "package.json5 sync was skipped because not all steps succeeded.",
  );
  process.exit(1);
});
