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

- Nice-to-have later
  - Optional E2E smoke path via Playwright against a running backend in CI
  - Consider mongodb-memory-server for fully ephemeral int tests (trade-offs: slower, sometimes flaky in CI)

---
