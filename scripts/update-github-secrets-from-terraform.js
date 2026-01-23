#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const cp = require("child_process");

const JSON5 = require("json5");

const REPO_ROOT = path.resolve(__dirname, "..");
const INFRA_DIR = path.join(REPO_ROOT, "infra");

const AWS_PROFILE = process.env.AWS_PROFILE || "bb-portfolio-user";

function execJson(cmd, options = {}) {
  const raw = cp.execSync(cmd, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  return JSON.parse(raw);
}

function readAwsCreds(profile) {
  const credsPath = path.join(os.homedir(), ".aws", "credentials");
  const raw = fs.readFileSync(credsPath, "utf8");

  let current = null;
  const out = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";"))
      continue;

    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      current = sectionMatch[1].trim();
      continue;
    }

    if (current !== profile) continue;

    const kv = trimmed.match(/^([^=]+)=(.*)$/);
    if (!kv) continue;

    out[kv[1].trim()] = kv[2].trim();
  }

  if (!out.aws_access_key_id || !out.aws_secret_access_key) {
    throw new Error(
      `Missing aws_access_key_id/aws_secret_access_key for profile [${profile}] in ${credsPath}`,
    );
  }

  return {
    accessKeyId: out.aws_access_key_id,
    secretAccessKey: out.aws_secret_access_key,
  };
}

function updateJson5(filePath, mutate) {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON5.parse(raw);
  mutate(parsed);
  fs.writeFileSync(filePath, JSON5.stringify(parsed, null, 2) + "\n", "utf8");
}

function getTfOutputs() {
  const outputs = execJson("terraform output -json", { cwd: INFRA_DIR });
  return outputs;
}

function getOutputValue(outputs, key) {
  if (!outputs[key]) {
    throw new Error(
      `Terraform output '${key}' not found. Re-run 'terraform apply' in ${INFRA_DIR}.`,
    );
  }
  return outputs[key].value;
}

function main() {
  const outputs = getTfOutputs();

  const ec2Host = getOutputValue(outputs, "bb_portfolio_elastic_ip");
  const projectsBucketNames = getOutputValue(outputs, "projects_bucket_names");
  const mediaBucketNames = getOutputValue(outputs, "media_bucket_names");

  const rumAppMonitorId = getOutputValue(outputs, "rum_app_monitor_id");
  const rumIdentityPoolId = getOutputValue(outputs, "rum_identity_pool_id");
  const rumGuestRoleArn = getOutputValue(outputs, "rum_guest_role_arn");
  const rumRegion = getOutputValue(outputs, "rum_region");

  const awsCreds = readAwsCreds(AWS_PROFILE);

  // Base secrets used by all envs
  updateJson5(path.join(REPO_ROOT, ".github-secrets.private.json5"), (cfg) => {
    const s = cfg.strings || cfg;
    s.AWS_ACCESS_KEY_ID = awsCreds.accessKeyId;
    s.AWS_SECRET_ACCESS_KEY = awsCreds.secretAccessKey;
    s.EC2_HOST = ec2Host;

    // Project buckets are shared across environments
    s.PUBLIC_PROJECTS_BUCKET = projectsBucketNames.public;
    s.NDA_PROJECTS_BUCKET = projectsBucketNames.nda;
  });

  // Dev overrides
  updateJson5(
    path.join(REPO_ROOT, ".github-secrets.private.dev.json5"),
    (cfg) => {
      const s = cfg.strings || cfg;
      s.S3_BUCKET = mediaBucketNames.dev;
    },
  );

  // Prod overrides
  updateJson5(
    path.join(REPO_ROOT, ".github-secrets.private.prod.json5"),
    (cfg) => {
      const s = cfg.strings || cfg;
      s.S3_BUCKET = mediaBucketNames.prod;

      // CloudWatch RUM (prod only)
      s.NEXT_PUBLIC_RUM_APP_MONITOR_ID = rumAppMonitorId;
      s.NEXT_PUBLIC_RUM_IDENTITY_POOL_ID = rumIdentityPoolId;
      s.NEXT_PUBLIC_RUM_GUEST_ROLE_ARN = rumGuestRoleArn;
      s.NEXT_PUBLIC_RUM_REGION = rumRegion;
    },
  );

  // Re-bundle merged secrets file with standard header.
  cp.execSync("npm run secrets:bundle -- --quiet", {
    cwd: REPO_ROOT,
    stdio: ["ignore", "ignore", "inherit"],
  });
}

main();
