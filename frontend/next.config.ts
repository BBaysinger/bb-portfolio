import type { NextConfig } from "next";

// Determine React Strict Mode behavior by environment profile
// Requirement:
// - local: ON
// - dev deployments: OFF
// - prod deployments: OFF
// Override with REACT_STRICT_MODE env var ("false" => force off, any other value => force on)
const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
const isDev = nodeEnv !== "production";
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
  output: "standalone",
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
              const env = (
                process.env.ENV_PROFILE ||
                process.env.NODE_ENV ||
                ""
              ).toLowerCase();
              const allowHttpImages =
                env && env !== "prod" && env !== "production";
              const imgSrc = allowHttpImages
                ? // Allow blob: for Haxe/Flambe project assets that are loaded via object URLs
                  // Still restrict to https/data (and http in non-prod) while disallowing other schemes.
                  "img-src 'self' blob: data: https: http:;"
                : "img-src 'self' blob: data: https:;";
              return [
                "default-src 'self';",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' data:;",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com data:;",
                imgSrc,
                "font-src 'self' https://fonts.gstatic.com data:;",
                // Allow blob: for potential project runtime asset fetching (e.g. audio/video blobs) and keep data:
                "connect-src 'self' https: http: ws: wss:;",
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
};

export default nextConfig;
