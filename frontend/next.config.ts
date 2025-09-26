import path from "path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../"),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  async rewrites() {
    // Prefer ENV_PROFILE-prefixed variables first (e.g., PROD_BACKEND_INTERNAL_URL),
    // then fall back to unprefixed variants
    const profile = (
      process.env.ENV_PROFILE ||
      process.env.NODE_ENV ||
      ""
    ).toLowerCase();
    const prefix = profile ? `${profile.toUpperCase()}_` : "";
    const pickValue = (...names: string[]) => {
      for (const n of names) {
        const v = process.env[n];
        if (v) return v;
      }
      return "";
    };
    const internalApi =
      pickValue(
        `${prefix}BACKEND_INTERNAL_URL`,
        `${prefix}INTERNAL_API_URL`,
        `${prefix}BACKEND_URL`,
        `${prefix}NEXT_PUBLIC_BACKEND_URL`,
        `${prefix}NEXT_PUBLIC_API_URL`,
      ) ||
      pickValue(
        "BACKEND_INTERNAL_URL",
        "INTERNAL_API_URL",
        "BACKEND_URL",
        "NEXT_PUBLIC_BACKEND_URL",
        "NEXT_PUBLIC_API_URL",
      );

    if (!internalApi) return [];

    const base = internalApi.replace(/\/$/, "");
    // Ensure destination is a valid absolute URL for external rewrite
    if (!/^https?:\/\//i.test(base)) {
      throw new Error(
        `Invalid BACKEND base URL for rewrites: ${base}. ` +
          `Set ${prefix}BACKEND_INTERNAL_URL or BACKEND_INTERNAL_URL to a http(s) URL.`,
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
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https: http:; media-src 'self'; object-src 'none'; frame-src 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
