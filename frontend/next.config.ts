import type { NextConfig } from "next";

// Determine React Strict Mode behavior by environment profile
// Requirement:
// - local: ON
// - dev deployments: OFF
// - prod deployments: OFF
// Override with REACT_STRICT_MODE env var ("false" => force off, any other value => force on)
const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
const isDev = nodeEnv !== "production";
// Single profile knob:
// - ENV_PROFILE is the canonical server/build profile.
// - NEXT_PUBLIC_ENV_PROFILE is derived from ENV_PROFILE so client bundles can read it.
if (process.env.ENV_PROFILE && !process.env.NEXT_PUBLIC_ENV_PROFILE) {
  process.env.NEXT_PUBLIC_ENV_PROFILE = process.env.ENV_PROFILE;
}
const profile = (process.env.ENV_PROFILE || nodeEnv || "").toLowerCase();
const strictEnv = process.env.REACT_STRICT_MODE;

const defaultStrictForProfile = (p: string) => {
  switch (p) {
    case "local":
      return true; // ON locally
    case "dev":
    case "development":
      return false; // OFF in dev deployments
    case "prod":
    case "production":
      return false; // OFF in production deployments
    default:
      return false; // safe default: OFF
  }
};

const resolvedStrictMode =
  typeof strictEnv === "string"
    ? strictEnv !== "false"
    : defaultStrictForProfile(profile);

console.info("[next.config.ts] React StrictMode:", {
  NODE_ENV: process.env.NODE_ENV,
  ENV_PROFILE: process.env.ENV_PROFILE,
  profile,
  isDev,
  REACT_STRICT_MODE: strictEnv,
  resolvedStrictMode,
});

const nextConfig: NextConfig = {
  // No custom transpile/alias for aws-rum-web; rely on standard resolution under webpack.
  output: "standalone",
  // Force a unique build id per deployment to ensure HTML points to fresh chunk paths
  // This helps mitigate perceived "stale" frontend when code changes don't modify chunk hashes.
  // Prefer a commit SHA when available (CI), otherwise fall back to a timestamp.
  generateBuildId: async () => {
    const sha = process.env.CI_COMMIT_SHA || process.env.GITHUB_SHA || "";
    if (sha) return `bb-${sha.slice(0, 12)}`;
    // Timestamp build id – guarantees change per build even if code hashing is stable.
    return `bb-${Date.now().toString(36)}`;
  },
  // Removed outputFileTracingRoot to follow Next.js conventions -
  // server.js should be directly in .next/standalone/ root
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Keep default trailing slash redirects enabled to avoid build-time issues with API route resolution.
  // Server-side data fetching no longer relies on /api, so redirects here should not impact SSR.
  // React StrictMode control
  // - Default: disabled in development, enabled in production
  // - Override: set REACT_STRICT_MODE="false" to force off, any other value to force on
  reactStrictMode: resolvedStrictMode,
  // No build-time dependent rewrites. Use relative /api and handle routing at ingress/Compose.
  // Security headers for frontend
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: (() => {
              const BRAND = "nin" + "ten" + "do";
              const env = (
                process.env.ENV_PROFILE ||
                process.env.NODE_ENV ||
                ""
              ).toLowerCase();

              const allowHttpImages =
                env && env !== "prod" && env !== "production";

              const imgSrc = allowHttpImages
                ? "img-src 'self' blob: data: https: http:;"
                : "img-src 'self' blob: data: https:;";

              return [
                "default-src 'self';",
                `script-src 'self' 'unsafe-inline' 'unsafe-eval' data: https://media.${BRAND}.com https://code.${BRAND}.com;`,
                `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://media.${BRAND}.com https://use.typekit.net data:;`,
                imgSrc,
                "font-src 'self' https://fonts.gstatic.com https://use.typekit.net https://p.typekit.net data:;",
                `connect-src 'self' https: http: ws: wss: https://code.${BRAND}.com;`,
                "media-src 'self' blob: data:;",
                "object-src 'none';",
                "frame-src 'none';",
              ].join(" ");
            })(),
          },
        ],
      },
    ];
  },

  // Canonicalize legacy query-entry URLs early at the routing layer to avoid 404s
  // when hitting /project?p=slug or /nda?p=slug directly.
  async redirects() {
    return [
      {
        source: "/project",
        has: [
          {
            type: "query",
            key: "p",
          },
        ],
        destination: "/project/:p/",
        permanent: false,
      },
      {
        source: "/nda",
        has: [
          {
            type: "query",
            key: "p",
          },
        ],
        destination: "/nda/:p/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
