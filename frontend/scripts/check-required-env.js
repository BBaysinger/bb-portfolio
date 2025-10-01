#!/usr/bin/env node
/*
  Prebuild guard for required env vars (plain JS).

  Supports:
  - REQUIRED_ENVIRONMENT_VARIABLES: comma-separated list of env var names that MUST be set.
  - <PROFILE>_REQUIRED_ENVIRONMENT_VARIABLES: prefix-first per-environment override (e.g., PROD_REQUIRED_ENVIRONMENT_VARIABLES).
  - Any-of groups: use pipe within an entry to require at least one (e.g., "BACKEND_URL|NEXT_PUBLIC_BACKEND_URL").
  - Default behavior: in CI+prod, require at least one backend base URL var to avoid empty portfolio deploys.
*/
(function () {
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

  // Strict requirement: only accept canonical backend origin
  const defaultBackendGroup = ["BACKEND_INTERNAL_URL"];

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
      "  REQUIRED_ENVIRONMENT_VARIABLES=BACKEND_INTERNAL_URL",
      "  PROD_REQUIRED_ENVIRONMENT_VARIABLES=BACKEND_INTERNAL_URL",
      "\nNote: In CI+prod, a default requirement enforces at least one backend base URL variable to avoid empty portfolio deploys.",
    ].join("\n");
    console.error(msg);
    process.exit(1);
  } else {
    const summary = effectiveRequirements.length
      ? effectiveRequirements.map((g) => `[${g.join("|")}]`).join(", ")
      : "<none> (no requirements enforced)";
    console.log(
      `[check-required-env] All required envs satisfied. Profile=${profile} Requirements=${summary}\nCI=${CI} NODE_ENV=${NODE_ENV} ENV_PROFILE=${ENV_PROFILE}`,
    );
  }
})();
