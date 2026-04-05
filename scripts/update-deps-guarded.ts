#!/usr/bin/env tsx

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

type PackageTarget = {
  label: string;
  cwd: string;
};

type Guardrail = {
  packageName: string;
  maxMajor: number;
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
  { label: "backend", cwd: path.join(repoRoot, "backend") },
  { label: "frontend", cwd: path.join(repoRoot, "frontend") },
];

const guardrails: Guardrail[] = [
  {
    packageName: "eslint",
    maxMajor: 9,
    reason:
      "eslint-plugin-import@2.32.0 and eslint-plugin-react-hooks@7.0.1 currently peer-support only eslint^9.",
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

function getUpgradedPackages(target: PackageTarget): Record<string, string> {
  const result = runCommand("ncu", ["--jsonUpgraded"], target.cwd, {
    captureOutput: true,
  });

  const trimmed = result.stdout.trim();
  if (!trimmed) return {};

  return JSON.parse(trimmed) as Record<string, string>;
}

function buildPlan(target: PackageTarget): UpgradePlan {
  const upgraded = getUpgradedPackages(target);
  const allowed: UpgradePlan["allowed"] = [];
  const blocked: UpgradePlan["blocked"] = [];

  for (const [name, version] of Object.entries(upgraded)) {
    const guardrail = getGuardrail(name);
    const major = parseMajor(version);

    if (guardrail && major !== null && major > guardrail.maxMajor) {
      blocked.push({ name, version, reason: guardrail.reason });
      continue;
    }

    allowed.push({ name, version });
  }

  allowed.sort((left, right) => left.name.localeCompare(right.name));
  blocked.sort((left, right) => left.name.localeCompare(right.name));

  return { target, allowed, blocked };
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

  console.info(`\n[${target.label}] running npm install`);
  const firstAttempt = runCommand("npm", ["install"], target.cwd, {
    allowFailure: true,
  });
  if (firstAttempt.status === 0) return;

  if (!fs.existsSync(lockfilePath)) {
    throw new Error(
      `[${target.label}] npm install failed and no lockfile exists to retry.`,
    );
  }

  console.info(
    `[${target.label}] initial install failed, deleting package-lock.json and retrying once`,
  );
  fs.rmSync(lockfilePath, { force: true });
  runCommand("npm", ["install"], target.cwd);
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
    console.info("\nNo allowed dependency updates found.");
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
