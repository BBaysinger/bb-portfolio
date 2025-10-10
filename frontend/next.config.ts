import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Removed outputFileTracingRoot to follow Next.js conventions -
  // server.js should be directly in .next/standalone/ root
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Disable React StrictMode for dev environment to avoid double-rendering
  reactStrictMode: process.env.ENV_PROFILE !== "dev",
  async rewrites() {
    const profile = (
      process.env.ENV_PROFILE ||
      process.env.NODE_ENV ||
      ""
    ).toLowerCase();
    const prefix = profile ? `${profile.toUpperCase()}_` : "";

    console.log("[next.config.ts] DEBUG - Environment info:", {
      ENV_PROFILE: process.env.ENV_PROFILE,
      NODE_ENV: process.env.NODE_ENV,
      profile,
      prefix,
      availableEnvVars: Object.keys(process.env)
        .filter((key) => key.includes("BACKEND") || key.includes("API"))
        .sort(),
    });

    const pickValue = (...names: string[]) => {
      for (const n of names) {
        const v = process.env[n];
        console.log(
          `[next.config.ts] Checking ${n}:`,
          v ? "✓ found" : "✗ not found",
        );
        if (v) return v;
      }
      return "";
    };

    // Only use prefixed variables now - no backwards compatibility
    const internalApi = pickValue(
      `${prefix}BACKEND_INTERNAL_URL`,
      `${prefix}NEXT_PUBLIC_BACKEND_URL`,
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
                "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
                "style-src 'self' 'unsafe-inline';",
                imgSrc,
                "font-src 'self';",
                "connect-src 'self' https: http:;",
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
