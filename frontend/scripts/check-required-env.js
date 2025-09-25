#!/usr/bin/env node
/*
  Conventional prebuild guard: ensure backend base URL is provided for production builds.

  Fails fast in CI for production deployments to prevent shipping an empty portfolio.
  Allows local builds to proceed (you can set STRICT_BACKEND_URL=true to enforce locally).
*/

const {
  CI,
  GITHUB_ACTIONS,
  NODE_ENV,
  STRICT_BACKEND_URL,
  ENV_PROFILE,
  BACKEND_URL,
  NEXT_PUBLIC_BACKEND_URL,
  NEXT_PUBLIC_API_URL,
  API_URL,
  NEXT_PUBLIC_SITE_URL,
  SITE_URL,
} = process.env;

const inCI = CI === "true" || GITHUB_ACTIONS === "true";
const isProdEnv = NODE_ENV === "production" || ENV_PROFILE === "prod";
const strict = STRICT_BACKEND_URL === "true" || (inCI && isProdEnv);

const candidates = [
  BACKEND_URL,
  NEXT_PUBLIC_BACKEND_URL,
  NEXT_PUBLIC_API_URL,
  API_URL,
  NEXT_PUBLIC_SITE_URL,
  SITE_URL,
].filter(Boolean);

if (strict && candidates.length === 0) {
  const msg = [
    "[check-required-env] Missing backend base URL for production build.",
    "Provide one of: BACKEND_URL, NEXT_PUBLIC_BACKEND_URL, NEXT_PUBLIC_API_URL, API_URL, NEXT_PUBLIC_SITE_URL, SITE_URL.",
    "This guard fails in CI for production to avoid deploying an empty portfolio.",
    "Set STRICT_BACKEND_URL=false to disable, or run non-production builds locally.",
  ].join("\n");
  console.error(msg);
  process.exit(1);
} else {
  const chosen = candidates[0] || "<none>";
  const note = strict
    ? "strict mode active"
    : "non-strict mode (local dev/prod preview)";
  console.log(
    `[check-required-env] Using backend base: ${chosen} (${note})\nCI=${CI} NODE_ENV=${NODE_ENV} ENV_PROFILE=${ENV_PROFILE}`,
  );
}
