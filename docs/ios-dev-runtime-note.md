# LAN Next Dev Runtime Note

## Status

The local LAN `:3000` issue is resolved.

The failure was not a viewport or hydration bug in the app code. It was a Next.js dev-runtime websocket authorization problem in the Docker local frontend.

## Root Cause

`bb-portfolio-frontend-local` runs `next dev` inside Docker.

That matters because:

- the browser opens the site from the host LAN address, for example `http://192.168.86.245:3000`
- Next 16 protects dev-only assets and the HMR websocket with `allowedDevOrigins`
- inside the container, `networkInterfaces()` only sees container addresses like `172.18.x.x`, not the host machine's LAN address
- the browser's HMR websocket therefore arrived with `Origin: http://192.168.86.245:3000`, which Next treated as unauthorized and closed

Observed symptom during debugging:

- page HTML loaded normally
- `/_next/webpack-hmr` repeatedly failed with websocket close code `1006`
- container logs showed `Blocked cross-origin request to Next.js dev resource /_next/webpack-hmr from "192.168.86.245"`

## Permanent Fix

The frontend now configures `allowedDevOrigins` in [frontend/next.config.ts](../frontend/next.config.ts) for development.

The allowlist includes:

- private LAN IPv4 wildcard patterns such as `192.168.*.*`, `10.*.*.*`, and `172.16-31.*.*`
- explicit non-internal IPv4 addresses visible from the current runtime
- optional extra values from `NEXT_ALLOWED_DEV_ORIGINS`

This allows Docker local dev on `:3000` to accept HMR websocket upgrades from normal LAN browser origins.

## Operational Note

Because this setting lives in `next.config.ts`, changing it requires a frontend restart.

For Docker local:

- restart `bb-portfolio-frontend-local`
- or rerun the local compose frontend flow

Without a restart, the running `next dev` process will keep the previous origin allowlist.

## When To Use `:3004`

The prod-like local server on `:3004` is still useful for performance checks or when you intentionally want to avoid dev-runtime behavior.

Use `:3000` for normal hot-reload iteration.
Use `:3004` for production-style validation when that distinction matters.
