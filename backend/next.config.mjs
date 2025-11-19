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

console.info('[backend next.config.mjs] React StrictMode resolved:', {
  ENV_PROFILE: process.env.ENV_PROFILE,
  NODE_ENV: process.env.NODE_ENV,
  REACT_STRICT_MODE: strictOverride,
  resolvedStrict,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js config here
  // Normalize URLs to include a trailing slash so SSR and client generate identical HREFs
  // This avoids hydration mismatches like "/admin/collections/users" vs "/admin/collections/users/"
  trailingSlash: true,
  reactStrictMode: resolvedStrict,
  // Ensure admin-static assets are requested from /admin/_next so we can
  // route them cleanly at the reverse proxy without relying on Referer
  // This does NOT change application routes, only the asset URLs
  assetPrefix: '/admin',
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
