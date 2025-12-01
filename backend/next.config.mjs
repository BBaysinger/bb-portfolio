import { withPayload } from '@payloadcms/next/withPayload'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// React Strict Mode handling:
// Original orchestrator disabled Strict Mode in dev to avoid double-invocation side effects
// (duplicate Payload hooks, extra DB hits, etc.). It regressed; restore behavior.
// Policy:
//   - ENV_PROFILE=dev (or NODE_ENV=development): reactStrictMode OFF
//   - ENV_PROFILE=prod (or NODE_ENV=production): keep default (ON) unless overridden
// Override: set REACT_STRICT_MODE explicitly ("false" => off, anything else => on)
const envProfile = (process.env.ENV_PROFILE || process.env.NODE_ENV || '').toLowerCase()
const strictOverride = process.env.REACT_STRICT_MODE
const resolvedStrict =
  typeof strictOverride === 'string'
    ? strictOverride !== 'false'
    : !['dev', 'development'].includes(envProfile) // disable only for dev

// Dev-only visibility for Strict Mode resolution
if (process.env.NODE_ENV !== 'production') {
  console.info('[backend next.config.mjs] React StrictMode resolved:', {
    ENV_PROFILE: process.env.ENV_PROFILE,
    NODE_ENV: process.env.NODE_ENV,
    REACT_STRICT_MODE: strictOverride,
    resolvedStrict,
  })
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js config here
  // Admin routes now live under src/app/(payload)/admin so no Next.js basePath is required
  // Normalize URLs to include trailing slash to match admin expectations and health checks
  trailingSlash: true,
  reactStrictMode: resolvedStrict,
  // Emit a self-contained server bundle suitable for minimal runtimes
  output: 'standalone',
  // Limit dev-only experimental config to dev environments
  // Remove invalid experimental key (allowedDevOrigins) to prevent unnecessary restarts
  experimental: undefined,
  // Preserve monorepo boundary for standalone output tracing
  outputFileTracingRoot: path.join(__dirname, '../'),
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  // Security headers for backend (Payload CMS)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
