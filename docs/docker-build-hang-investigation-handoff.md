# Docker Build Hang Investigation Handoff

Last updated: 2026-04-17 (local), diagnostics upload timestamp in UTC may appear as 2026-04-18.

## TL;DR Action Card

1. Run `npm run precommit` before additional changes.
2. Open Docker support/GitHub issue and include diagnostics ID: `4FA003CD-21FD-4E55-A32E-7585E4CB357A/20260418033035`.
3. Use non-Docker frontend build for local validation.
4. Use CI Docker builds as source of truth for containerized frontend validation until Docker Desktop is stable.

## Current Status Update (Recovery)

- `docker:up` completed successfully in a later session.
- Application was reachable in-browser.
- Interpretation: local Docker behavior is currently recovered but may still be intermittent based on prior stalls.
- Recommendation: continue normal development flow, avoid unnecessary aggressive prune operations, and keep this document and diagnostics ID available if hangs recur.

## Executive Summary

The original frontend code-level build error was fixed. Local Docker Desktop builds still intermittently hang on macOS during the frontend image build path.

- Original code error: resolved.
- Backend Docker image build: consistently succeeds.
- Frontend Docker image build: intermittently hangs in Docker/BuildKit path even after cleanup and restart.
- Strong evidence points to a Docker Desktop/macOS runtime issue rather than an application code issue.

## What Was Originally Broken

CI/local Dockerized frontend build failed with:

- `Cannot find module 'fs/promises'`
- During SSG collection while loading snapshot logic in frontend data layer.

## Code Fix Applied

File changed:

- `frontend/src/data/ProjectData.ts`

What changed:

- Snapshot file loader now uses a runtime import approach that:
  - first tries `fs/promises`
  - then falls back to `fs.promises`
- This avoids bundler and module-resolution mismatches during SSG build-time code paths.

Commit:

- `3a6da3f1`
- Message: `Fix snapshot fs import for SSG builds`

## Validation Results

### Passed

- Non-Docker frontend build (`next build --webpack`) has succeeded.
- Backend Docker build path repeatedly succeeds.

### Still Failing/Unstable

- Frontend Docker build path intermittently hangs (often during dependency/build stages) with low/idle process activity.
- Reproduced even after:
  - Docker cleanup/prune
  - project maintenance script (`npm run docker:maintenance`)
  - Docker Desktop restart
  - full machine reboot
  - no-cache/pull diagnostic runs

## Why This Looks Environmental (Not App Logic)

1. The original code exception was addressed and validated outside Docker.
2. Backend image builds are healthy under same host.
3. Hang behavior is intermittent and host-runtime-like (stalls/hangs), not deterministic app error output.
4. Public issue reports match this pattern on Docker Desktop for macOS.

## Online Evidence Collected

Most relevant issue:

- https://github.com/docker/for-mac/issues/7369
- Title: Docker build command hangs after docker builder cache is cleaned
- Pattern in report: after builder prune / purge, subsequent builds can hang until reboot.

Related hang reports:

- https://github.com/docker/for-mac/issues/6940
- https://github.com/docker/for-mac/issues/7069

Official Docker troubleshooting docs used for escalation flow:

- https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/

## Diagnostics Collected

Docker Desktop diagnostics were gathered and uploaded.

- Diagnostics ID: `4FA003CD-21FD-4E55-A32E-7585E4CB357A/20260418033035`

This ID should be included in any Docker support ticket or GitHub bug report.

## Reproduction Pattern (High-Level)

1. Build backend image in CI-like local flow: succeeds.
2. Build frontend image in same flow: may progress partially, then hangs.
3. Retry after cleanup/restart can still hang.

## Practical Current Workaround

Until Docker Desktop stability is restored:

1. Validate frontend with non-Docker build locally.
2. Use CI runner image build results as source of truth for containerized frontend validation.
3. Avoid aggressive builder cache prune as a routine step.

## Recommended Next Actions

1. Open Docker support ticket (or GitHub issue if no paid support).
2. Include:
   - diagnostics ID
   - exact repro steps
   - observed stall points
   - note that backend succeeds while frontend hangs
3. Track Docker Desktop version-specific fix guidance from support.

## Deferred Next Steps Checklist

Use this when resuming work later.

1. Run local quality checks before further changes:

- `npm run precommit`

2. Open a Docker support ticket (or Docker Desktop GitHub issue) using this document as source context.
3. Include diagnostics ID exactly as uploaded:

- `4FA003CD-21FD-4E55-A32E-7585E4CB357A/20260418033035`

4. Continue local app validation with non-Docker frontend build while Docker Desktop remains unstable.
5. Treat CI Docker image builds as source of truth for containerized frontend validation until host runtime stability is restored.

## Reusable Support Brief

Use this brief when requesting a second opinion or a support action plan:

---

I need help analyzing a Docker Desktop on macOS build hang issue.

Context:

- Monorepo with frontend and backend Docker images.
- Original frontend code error (`Cannot find module 'fs/promises'`) was fixed in `frontend/src/data/ProjectData.ts` using runtime import fallback (`fs/promises` -> `fs.promises`).
- Non-Docker frontend build succeeds.
- Backend Docker image build succeeds consistently.
- Frontend Docker image build intermittently hangs during Docker/BuildKit execution (dependency/build stages), often with idle CPU.
- This persists after prune/cleanup, `npm run docker:maintenance`, Docker Desktop restart, and full machine reboot.

Evidence:

- Similar issue report: https://github.com/docker/for-mac/issues/7369
- Related reports: https://github.com/docker/for-mac/issues/6940 and https://github.com/docker/for-mac/issues/7069
- Docker troubleshooting docs: https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/
- Diagnostics uploaded: 4FA003CD-21FD-4E55-A32E-7585E4CB357A/20260418033035

Please provide:

1. A likely root-cause tree ranked by probability.
2. A minimal-risk mitigation plan I can use immediately.
3. A high-confidence isolation matrix (what to toggle/test first) to distinguish BuildKit bug vs file-sharing/virtiofs issue vs architecture emulation issue.
4. A short Docker support ticket draft using the details above.

---

## Notes for Internal Team Handoff

- The code-level blocker appears solved.
- Remaining blocker is host/container runtime stability.
- Keep app-level changes minimal until Docker issue is resolved to avoid mixing concerns.
