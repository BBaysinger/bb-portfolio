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
  // React StrictMode control
  // - Default: disabled in development, enabled in production
  // - Override: set REACT_STRICT_MODE="false" to force off, any other value to force on
  reactStrictMode: resolvedStrictMode,
  async rewrites() {
    // Normalize profile so we look up PROD_ / DEV_ / LOCAL_ consistently
    const rawProfile = (
      process.env.ENV_PROFILE ||
      process.env.NODE_ENV ||
      ""
    ).toLowerCase();
    const normalizedProfile = rawProfile.startsWith("prod")
      ? "prod"
      : rawProfile === "development" || rawProfile.startsWith("dev")
        ? "dev"
        : rawProfile.startsWith("local")
          ? "local"
          : rawProfile; // fallback to raw (e.g., empty string)
    const prefix = normalizedProfile
      ? `${normalizedProfile.toUpperCase()}_`
      : "";

    console.info("[next.config.ts] DEBUG - Environment info:", {
      ENV_PROFILE: process.env.ENV_PROFILE,
      NODE_ENV: process.env.NODE_ENV,
      profile: normalizedProfile,
      prefix,
      availableEnvVars: Object.keys(process.env)
        .filter((key) => key.includes("BACKEND") || key.includes("API"))
        .sort(),
    });

    const pickValue = (...names: string[]) => {
      for (const n of names) {
        const v = process.env[n];
        console.info(
          `[next.config.ts] Checking ${n}:`,
          v ? "✓ found" : "✗ not found",
        );
        if (v) return v;
      }
      return "";
    };

    // Prefer prefixed variables for the current profile; fall back to common public var
    const internalApi = pickValue(
      `${prefix}BACKEND_INTERNAL_URL`,
      `${prefix}NEXT_PUBLIC_BACKEND_URL`,
      // Final fallback for environments where only NEXT_PUBLIC_BACKEND_URL is set
      `NEXT_PUBLIC_BACKEND_URL`,
    );

    if (!internalApi) {
      console.error(
        `[next.config.ts] No backend URL found. Expected: ${prefix}BACKEND_INTERNAL_URL or ${prefix}NEXT_PUBLIC_BACKEND_URL`,
      );
      return [];
    }

    const base = internalApi.replace(/\/$/, "");
    // Ensure destination is a valid absolute URL for external rewrite
    if (!/^https?:\/\//i.test(base)) {
      throw new Error(
        `[next.config.ts] Invalid backend URL for rewrites: ${base}. ` +
          `Set ${prefix}BACKEND_INTERNAL_URL to a valid http(s) URL. ` +
          `Profile: ${profile}, Prefix: ${prefix}`,
      );
    }
    return [
      {
        source: "/api/:path*",
        destination: `${base}/api/:path*`,
      },
    ];
  },
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
                ? "img-src 'self' data: https: http:;"
                : "img-src 'self' data: https:;";
              return [
                "default-src 'self';",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' data:;",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com data:;",
                imgSrc,
                "font-src 'self' https://fonts.gstatic.com data:;",
                "connect-src 'self' https: http: ws: wss:;",
                "media-src 'self';",
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
