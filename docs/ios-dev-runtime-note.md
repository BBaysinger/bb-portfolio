# iOS Next Dev Runtime Note

## Status

There is a known local-only issue when this app is opened on iOS through the LAN dev server on `:3000`.

Observed behavior:

- the page HTML loads
- the hero can degrade to a partial render
- client-side behavior may fail to hydrate or behave inconsistently on iOS browsers

This has been observed across Safari, Chrome, and Firefox on iOS, which all share WebKit.

## Current Workaround

For iOS validation over LAN, use the prod-like local server on `:3004` instead of the dev server on `:3000`.

Current guidance:

- desktop development: continue using `:3000`
- iOS validation: use `:3004`

## What We Verified

- the problem reproduces on iOS against the local dev runtime
- the same app works correctly on the prod-like local runtime on `:3004`
- this points to a dev-runtime-specific problem rather than an app-code regression in the production path

## Investigation Notes For Later

The next pass should focus on the development runtime rather than viewport code or hero rendering logic.

Suggested sequence:

1. Confirm the exact iOS and Safari/WebKit versions involved.
2. Re-test against the current Next.js version and the newest patch available at the time.
3. Compare `next dev --webpack` with the default dev path if the project config changes.
4. Inspect whether the failure is tied to HMR, the dev overlay, or another dev-only client bootstrap path.
5. Reduce to a minimal reproduction if the issue still exists.
6. If reproducible in a small app, file it upstream or search for matching reports in Next.js discussions/issues.

## Official Docs Checked

We did a quick official-docs pass after isolating the issue.

What the docs do confirm:

- Next.js explicitly distinguishes `next dev` behavior from production builds.
- Next.js documents general debugging workflows for local development.
- Next.js lists modern Safari as a supported browser target.

What the docs did not provide:

- no official Next.js page found that documents this exact iOS LAN dev-runtime failure
- no official WebKit note found that clearly maps to this specific symptom

So the current status is:

- workaround is known and reliable
- root cause is still unconfirmed
- future investigation should start from the dev runtime path, not the viewport hook work
