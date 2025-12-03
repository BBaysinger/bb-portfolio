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

## Blue-Green promotion via GitHub Actions (optional)

When there’s time, expose promotion and retention parameters in a dedicated workflow so you can promote a candidate and prune old instances from the GitHub UI without SSH.

- Scope
  - New workflow (e.g., `.github/workflows/promote.yml`) or extend `redeploy.yml` with additional inputs.
  - Invoke existing orchestrator on EC2: `deploy/scripts/deployment-orchestrator.sh`.

- Inputs to expose (map to orchestrator flags)
  - target_role: candidate|active → `--target`
  - promote: true|false → `--promote`
  - prune_after_promotion: true|false → `--prune-after-promotion`
  - retention_count: integer → `--retention-count <N>`
  - retention_days: integer (optional) → `--retention-days <D>`
  - handover_snapshot: true|false → `--handover-snapshot`
  - handover_no_rollback: true|false → `--handover-no-rollback`

- Minimal steps
  1. Prepare SSH key (already in redeploy workflows)
  2. Validate inputs (e.g., if promote=true then target_role must be candidate)
  3. SSH run: `bash deploy/scripts/deployment-orchestrator.sh $FLAGS`
  4. Capture output for audit (promotion result, pruned IDs)

- Safety defaults
  - Default `target_role=candidate`
  - Default `prune_after_promotion=true`, `retention_count=3`, `retention_days=14`
  - Leave `handover_snapshot=false` by default; toggle on for riskier releases
  - Keep rollback enabled by default (do not set `--handover-no-rollback`)

- Why later
  - Requires end-to-end testing against candidate/active hosts
  - Nice convenience but not critical for daily ops
