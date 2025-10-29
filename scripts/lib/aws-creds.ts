import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseProfilesFromCredentials(credPath: string): string[] {
  if (!existsSync(credPath)) return [];
  const ini = readFileSync(credPath, "utf8");
  const matches = Array.from(ini.matchAll(/^\[(.+?)\]\s*$/gm));
  return matches.map((m) => m[1] as string);
}

export function ensureAwsCredentials(options: {
  profile?: string;
  region?: string;
}): void {
  const { profile: inputProfile, region } = options;
  const envProfile = process.env.AWS_PROFILE?.trim();
  const profile = (inputProfile || envProfile || "").trim();
  const hasStaticEnvCreds = Boolean(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY,
  );

  const credPath = path.join(os.homedir(), ".aws", "credentials");

  // If a specific profile is requested, validate credentials file and section
  if (profile) {
    if (!existsSync(credPath)) {
      throw new Error(
        `No AWS credentials file found at ~/.aws/credentials.\n` +
          `This script expects an AWS CLI profile ("${profile}").\n` +
          `Create ~/.aws/credentials with a [${profile}] profile or set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY env vars.`,
      );
    }
    const ini = readFileSync(credPath, "utf8");
    const section = new RegExp(`^\\[${escapeRegExp(profile)}\\]\\s*$`, "m");
    if (!section.test(ini)) {
      throw new Error(
        `AWS profile "${profile}" not found in ~/.aws/credentials.\nAdd a [${profile}] section or pass a different profile via --profile.`,
      );
    }
    // Validate by calling STS
    try {
      const cmd = [
        "aws",
        profile ? `--profile ${profile}` : "",
        region ? `--region ${region}` : "",
        "sts get-caller-identity",
      ]
        .filter(Boolean)
        .join(" ");
      execSync(cmd, { stdio: "ignore" });
    } catch {
      throw new Error(
        `Failed to use AWS profile "${profile}". If using SSO, run: aws sso login --profile ${profile}`,
      );
    }
    return;
  }

  // If no profile is specified, allow static env creds
  if (hasStaticEnvCreds) {
    try {
      const cmd = [
        "aws",
        region ? `--region ${region}` : "",
        "sts get-caller-identity",
      ]
        .filter(Boolean)
        .join(" ");
      execSync(cmd, { stdio: "ignore" });
      return;
    } catch {
      // fall through to auto-detect profiles
    }
  }

  // Try auto-detecting a profile from ~/.aws/credentials
  if (existsSync(credPath)) {
    const profiles = parseProfilesFromCredentials(credPath);
    const hasDefault = profiles.includes("default");
    const nonDefault = profiles.filter((p) => p !== "default");
    if (hasDefault) {
      // Default will be used automatically by AWS CLI; just validate
      try {
        const cmd = [
          "aws",
          region ? `--region ${region}` : "",
          "sts get-caller-identity",
        ]
          .filter(Boolean)
          .join(" ");
        execSync(cmd, { stdio: "ignore" });
        return;
      } catch {
        throw new Error(
          `Default AWS profile failed authentication. If using SSO, run: aws sso login`,
        );
      }
    }
    if (nonDefault.length === 1) {
      const auto = nonDefault[0];
      process.env.AWS_PROFILE = auto;
      try {
        const cmd = [
          "aws",
          `--profile ${auto}`,
          region ? `--region ${region}` : "",
          "sts get-caller-identity",
        ]
          .filter(Boolean)
          .join(" ");
        execSync(cmd, { stdio: "ignore" });
        console.info(
          `ℹ️  Using AWS profile "${auto}" from ~/.aws/credentials (auto-detected)`,
        );
        return;
      } catch {
        throw new Error(
          `Auto-detected profile "${auto}" failed authentication. If using SSO, run: aws sso login --profile ${auto}`,
        );
      }
    }
    if (nonDefault.length > 1) {
      throw new Error(
        `Multiple AWS profiles found in ~/.aws/credentials: ${nonDefault.join(", ")}.\nPass --profile <name> or set AWS_PROFILE to choose one.`,
      );
    }
  }

  // Final fallback: run STS — will fail with a clear message if no creds
  try {
    const cmd = [
      "aws",
      region ? `--region ${region}` : "",
      "sts get-caller-identity",
    ]
      .filter(Boolean)
      .join(" ");
    execSync(cmd, { stdio: "ignore" });
  } catch {
    throw new Error(
      `No AWS credentials found.\n` +
        `Provide a profile with --profile <name> (stored in ~/.aws/credentials),\n` +
        `or export AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY before running.\n` +
        `If you use SSO, authenticate first: aws sso login --profile <name>`,
    );
  }
}
