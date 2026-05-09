# TODO

These are low-risk follow-ups to improve CI coverage and stability once the site is live.

- Backend: CI job for integration tests
  - Add a GitHub Actions job that:
    - Runs on `push` to `main` (or nightly, or label-triggered on PRs)
    - Starts a MongoDB service (e.g., `mongo:7`) and waits for health
    - Sets backend env for local profile:
      - `RUN_INT_TESTS=1`
      - `ENV_PROFILE=local`
      - `MONGODB_URI=mongodb://127.0.0.1:27017/ci`
      - `PAYLOAD_SECRET=<random-long-string>`
      - `FRONTEND_URL=http://localhost:3000`
    - Runs integration tests: `npx vitest run tests/int/**/*.int.spec.ts`
  - Rationale: keep PR path fast (unit tests only) while retaining full integration coverage in a dedicated job.

- Vitest projects (optional)
  - Split config into projects if/when UI/jsdom tests are added:
    - `project: unit` (environment: node, fast, default)
    - `project: ui` (environment: jsdom)
    - `project: int` (environment: node, RUN_INT_TESTS gated)

- Documentation
  - Add a short note in `docs/engineering-standards.md` describing the test strategy:
    - Unit tests always run
    - Integration tests gated by `RUN_INT_TESTS` and executed in dedicated CI job

- Content migration UX
  - Tighten the local/dev/prod content migration workflow so destructive data replacement does not leave the projects list blank while frontend regeneration catches up.
  - Investigate why the final revalidation step is not consistently completing after database migration and media cache refresh.
  - Add a temporary frontend status for the home projects grid during regeneration, e.g. `Generating projects...`, instead of rendering a blank area when the SSR snapshot is empty and the client is still resolving projects.
  - Likely implementation surface:
    - `scripts/content-workflow.sh`
    - `frontend/src/components/home-page/HomePageClient.tsx`
    - `frontend/src/components/home-page/ProjectsList.tsx`
  - Rationale: reduce the visible post-migration outage window and make the temporary state understandable to users.

- Viewport route-return stability in Opera
  - Current status: deferred.
  - Repro still exists in local dev: home -> CV -> scroll CV -> return home can leave the home page on CSS `svh` instead of the managed stable-height path.
  - Likely contributing factor: Opera route changes are noticeably laggy, so the managed-height hook can sample while the page is still effectively in the pre-reset scroll state.
  - The Opera-specific route-settle and late-reseed experiments were reverted because they did not produce a durable win outside Opera debugging.
  - Resume by instrumenting the exact rejection reason for the first successful home-route sample after returning from `/cv`, rather than adding more generic retries.

- Dependency automation (optional)
  - Evaluate adding a conservative Dependabot config for automated dependency monitoring.
  - Scope a first pass to the three npm roots plus GitHub Actions; consider Docker and Terraform only if the PR volume stays manageable.
  - Keep `npm run update:deps` as the guarded/manual upgrade path for coordinated Next/React/Payload changes even if Dependabot is enabled.
  - Rationale: useful for visibility and security patch awareness, but not clearly high-value enough yet to prioritize over product and deployment work.

- Nice-to-have later
  - Optional E2E smoke path via Playwright against a running backend in CI
  - Consider mongodb-memory-server for fully ephemeral int tests (trade-offs: slower, sometimes flaky in CI)

---
