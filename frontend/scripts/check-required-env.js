#!/usr/bin/env node
/*
  Prebuild guard for required env vars (ESM-compatible JS).

  Features:
  - Loads .env files with Next.js-like precedence before validation:
    1) .env
    2) .env.[development|production] (based on NODE_ENV)
    3) .env.local (overrides)
  - REQUIRED_ENVIRONMENT_VARIABLES: comma-separated list; supports ANY-of groups with "|".
  - <PROFILE>_REQUIRED_ENVIRONMENT_VARIABLES: per-environment override (e.g., PROD_REQUIRED_ENVIRONMENT_VARIABLES).
  - Default safety: in CI+prod, require a backend base URL if no explicit requirements were provided.
*/
(async function () {
  // Load .env files using dotenv with proper precedence
  try {
    // Use ESM-compatible imports
    const { dirname, resolve } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const { existsSync } = await import("node:fs");
    const dotenvMod = await import("dotenv");
    const dotenv = dotenvMod && (dotenvMod.default || dotenvMod);

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const root = resolve(__dirname, "..");

    const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
    const envFiles = [
      resolve(root, ".env"),
      nodeEnv === "production"
        ? resolve(root, ".env.production")
        : resolve(root, ".env.development"),
      resolve(root, ".env.local"),
    ];

    for (const p of envFiles) {
      if (existsSync(p)) {
        dotenv.config({ path: p, override: true });
      }
    }
  } catch (_) {
    // If dotenv isn't available, fallback to a minimal .env loader.
    try {
      const { dirname, resolve } = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const { existsSync, readFileSync } = await import("node:fs");
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const root = resolve(__dirname, "..");
      const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
      const envFiles = [
        resolve(root, ".env"),
        nodeEnv === "production"
          ? resolve(root, ".env.production")
          : resolve(root, ".env.development"),
        resolve(root, ".env.local"),
      ];
      const apply = (line) => {
        const idx = line.indexOf("=");
        if (idx === -1) return;
        const key = line.slice(0, idx).trim();
        const val = line
          .slice(idx + 1)
          .trim()
          .replace(/^"|^'|"$|'$/g, "");
        if (!key) return;
        process.env[key] = val; // override like dotenv override: true
      };
      for (const p of envFiles) {
        if (!existsSync(p)) continue;
        const content = readFileSync(p, "utf8");
        for (const raw of content.split(/\r?\n/)) {
          const line = raw.trim();
          if (!line || line.startsWith("#")) continue;
          apply(line);
        }
      }
      console.info(
        "[check-required-env] Loaded .env files via fallback parser",
      );
    } catch (__) {
      console.warn(
        "[check-required-env] Warning: dotenv not available; skipping .env preload",
      );
    }
  }
  const {
    CI,
    GITHUB_ACTIONS,
    NODE_ENV,
    ENV_PROFILE,
    REQUIRED_ENVIRONMENT_VARIABLES,
  } = process.env;

  const inCI = CI === "true" || GITHUB_ACTIONS === "true";
  const isProdEnv = NODE_ENV === "production" || ENV_PROFILE === "prod";
  const profile = (ENV_PROFILE || (isProdEnv ? "prod" : NODE_ENV || ""))
    .toLowerCase()
    .trim();

  const profileUpper = (profile || "").toUpperCase();
  const newProfileKey = profileUpper
    ? `${profileUpper}_REQUIRED_ENVIRONMENT_VARIABLES`
    : "";
  const rawList = (
    (process.env[newProfileKey] || REQUIRED_ENVIRONMENT_VARIABLES || "") + ""
  ).trim();

  const parseRequirements = (s) => {
    if (!s) return [];
    return s
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((entry) =>
        entry
          .split("|")
          .map((v) => v.trim())
          .filter(Boolean),
      );
  };

  const requirements = parseRequirements(rawList);

  // Strict requirement: accept only profile-prefixed backend origin (no backwards compatibility)
  const defaultBackendGroup = [
    `${profile.toUpperCase()}_BACKEND_INTERNAL_URL`,
  ].filter(Boolean);

  const effectiveRequirements =
    requirements.length > 0
      ? requirements
      : inCI && isProdEnv
        ? [defaultBackendGroup]
        : [];

  const missingGroups = [];
  for (const group of effectiveRequirements) {
    const satisfied = group.some((name) => !!process.env[name]);
    if (!satisfied) missingGroups.push(group.join("|"));
  }

  if (missingGroups.length > 0) {
    const msg = [
      "[check-required-env] Missing required environment variables.",
      `Profile: ${profile || "<none>"}`,
      "The following requirements were not satisfied (ANY of within each group):",
      ...missingGroups.map((g) => `  - ${g}`),
      "\nConfigure REQUIRED_ENVIRONMENT_VARIABLES or <PROFILE>_REQUIRED_ENVIRONMENT_VARIABLES.",
      "Examples:",
      "  REQUIRED_ENVIRONMENT_VARIABLES=PROD_BACKEND_INTERNAL_URL",
      "  PROD_REQUIRED_ENVIRONMENT_VARIABLES=PROD_BACKEND_INTERNAL_URL",
      "\nNote: In CI+prod, a default requirement enforces at least one backend base URL variable to avoid empty portfolio deploys.",
    ].join("\n");
    console.error(msg);
    process.exit(1);
  } else {
    const summary = effectiveRequirements.length
      ? effectiveRequirements.map((g) => `[${g.join("|")}]`).join(", ")
      : "<none> (no requirements enforced)";
    console.info(
      `[check-required-env] All required envs satisfied. Profile=${profile} Requirements=${summary}\nCI=${CI} NODE_ENV=${NODE_ENV} ENV_PROFILE=${ENV_PROFILE}`,
    );
  }
})();
