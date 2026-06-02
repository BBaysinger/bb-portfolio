## Base Images & Secrets Policy

- Base images:
  - Build stages use hardened Node images (Chainguard/Wolfi or standard Node via `NODE_IMAGE`) to retain full tooling while minimizing CVE noise.
  - Production runtimes use Distroless Node 22 (Debian 12) to reduce attack surface and produce clean security scan results.
  - Do not run full OS upgrades (`apk upgrade`, `apt upgrade`) in Docker layers; install only required packages to avoid transient CVEs.
  - Pin images by digest in CI for reproducibility (e.g., `nodejs22-debian12@sha256:<digest>`).

- Secrets:
  - Never bake secrets into images via `ARG`/`ENV` or committed `.env` files.
  - Inject secrets at build-time using Docker BuildKit secrets mounts (`--mount=type=secret,id=...`) and at runtime via deployment runner environment.
  - Remove repo `.env*` files during build to prevent overrides; keep only `*.example` templates in VCS.

- Scanning:
  - Gate only final runtime images on CRITICAL/HIGH findings.
  - Rebuild weekly with refreshed base digests; scan with Trivy/Grype/Scout.

# Engineering Standards

These standards keep this repo predictable, secure, and easy to operate across local, dev, and prod.
They reflect the current implementation in this repository (Next.js + Payload, Docker multi-stage builds, GitHub Actions, EC2 + Docker Compose).

---

## Quick reference (TL;DR)

- **Source control**: no `git push`/`terraform apply`/production deploys without explicit human approval. Stage + commit is fine; pushing is not. Commit messages must include a concise summary line _and_ a bulleted list detailing every task completed so a reviewer can map each change to an explicit entry.
- **Testing gate**: before every PR/merge run `npm run lint`, `npm test`, and service-specific builds (`npm run build:frontend`, `npm run build:backend`). Do not ship failing lint/tests.
- **Documentation**: every file/function follows the JSDoc-style rules below; shell scripts include shebang + usage + env var docs.
- **Environment config**: one canonical key per concept (e.g., `FRONTEND_URL`), no env baked in Docker images, env guards enforced via `scripts/check-required-env.ts`.
- **AI instructions**: when requesting help, specify scope, success criteria, disallowed commands, required tests, and what to do on ambiguity (template below).
- **Boilerplate mindset**: prefer conventional Next.js/Payload approaches; deviations require comments + removal plan.

---

## Global objective

Our global objective is to maintain standards and follow established conventions consistently across the codebase.
Code must be authored professionally with code review in mind: clear naming, small focused changes, strong typing, tests where appropriate, and documentation for non-obvious decisions.

Any deviation from standards, conventions, or best practices must be explicitly called out in code comments and/or PR descriptions with rationale and a plan for alignment.

If code or configuration is unconventional, convoluted, or otherwise difficult to justify, and that choice is not already explained in a nearby comment or the PR description, it must be surfaced to the developer immediately rather than passed over silently.

Tools reviewing or generating code should flag non-standard or hard-to-justify patterns that are not already clearly explained in comments or PR context, and should recommend alignment without drawing attention to the tool itself.

This repository is intentionally not an enterprise multi-service platform. It is a single-owner portfolio project, so infrastructure and deployment choices should stay proportional to that scope. Patterns such as rolling deploy orchestration, blue/green environments, canary rollout control, dedicated load balancers, connection draining, multi-instance cutover, and other always-on zero-downtime machinery should be treated as overkill here unless a concrete operational need appears. Prefer the simplest design that is conventional, observable, and easy to recover: explicit maintenance mode when needed, clear error states, health checks, reproducible builds, and straightforward deploy/restart paths.

---

## Failure handling and fallback policy

Correctness failures must be visible by default. Do not hide broken configuration, missing backend data, stale contracts, or upstream errors behind convenience defaults.

Rules:

- **Fail fast on data/contract errors**: if required backend data is missing, malformed, or structurally incompatible with the current frontend contract, throw or return the real failure. Do not substitute default content just to keep rendering.
- **No silent fetch fallbacks for correctness**: do not catch fetch/data errors and replace them with placeholder content, empty arrays, generic success-like values, or alternate fake UI states. If a recovery path is intentionally required, document why and make the behavior explicit in code comments.
- **Proxy routes forward upstream truth**: frontend proxy routes should preserve upstream status codes and response bodies unless a documented normalization requirement exists. Do not rewrite upstream failures into generic local JSON messages like “Failed to fetch...” unless that translation is itself the intended product behavior.
- **Placeholders are loading-only**: placeholder text such as `Loading...` may represent a genuine in-flight state, but must not become the fallback result of a failed fetch, decode error, or integrity check.
- **Catch blocks must justify themselves**: catch blocks should either add actionable context and rethrow, or implement a deliberate, documented recovery path. Silent catches, no-op catches, and “log then continue as if valid” behavior are not acceptable for content/data correctness paths.
- **Default values must be limited to presentation or platform compatibility**: visual defaults and browser/platform fallbacks are acceptable when they do not hide missing business data or broken contracts. Data-bearing defaults must be treated as suspect and documented if they remain.
- **Backwards compatibility is not a reason to keep masking failures**: because this repository does not preserve backwards compatibility guarantees, prefer deleting compatibility fallbacks over retaining them.

Review guidance:

- If code introduces a new fallback, ask whether it protects presentation only or whether it hides a correctness problem.
- If a route, hook, or loader can return something that looks valid after an upstream failure, treat that as a review issue unless the recovery behavior is explicitly documented and approved.

---

## AI assistant workflow standards

For AI coding assistants:

- **Git operations**: AI _can_ stage files (`git add`) and prepare commits (`git commit`), and may offer to do so when work reaches a natural stopping point. AI should assume the developer will handle push, merge, and PR steps. `npm run precommit` should be run before every commit so formatting side effects are visible to the human reviewer each time, and the assistant may run that command any time it is deemed useful. AI must not offer to run `git push`; it may do so only when the developer explicitly asks.
- **Command expectation**: when commit-ready work is complete, the assistant may ask whether the developer wants a commit. Only execute `git add`/`git commit` when explicitly instructed to run them.
- **Confirmation required**: when providing any git command (including `git add`/`git commit`), the assistant must present the exact command(s) and require an explicit human **Approve/Execute** confirmation step via **command preview card**, as opposed to providing it in plain text.
- **Local checks**: local checks like `npm run precommit`, `npm run lint`, and `npm test` should be run intentionally. Assume `npm run precommit` is run before every commit, and the assistant may run `npm run precommit` any time it is deemed useful. Other local checks should not be run unless explicitly asked.
- **No linting required by the assistant**: do not require the assistant to run `npm run lint` as part of a task; request it only when you explicitly want the assistant to execute a lint pass.
- **Builds**: do **not** run builds (e.g., `pnpm run build`, `npm run build:*`) by default. In most cases a build is already running; **ask the developer to run the build** and paste results unless the user explicitly asked you to run it or you need it to unblock a diagnosis.
- **Build/watch behavior**: do **not** watch, poll, or tail GitHub Actions runs, remote deploys, or long-running builds by default. Assume the developer is already watching them in GitHub or another dashboard. Only monitor progress when the developer explicitly asks you to, or when watching is required to complete the task you were asked to perform.
- **Running the project**: assume the project is already running locally with hot reload. Do **not** start/stop dev servers, Docker Compose stacks, or “run the app to verify” by default. Only run the project when you explicitly need runtime output (logs, HTTP responses, console errors) to confirm behavior or diagnose a problem, or when the user asks you to.
- **Terraform/Infrastructure changes**: AI can prepare and suggest `terraform plan` but should not automatically execute `terraform apply` without explicit user confirmation for each resource change.
- **Deployment operations**: AI should present deployment commands and wait for explicit approval rather than automatically triggering deployments.
- **Explain before staging**: AI must summarize intended file changes and rationale before running `git add`, so the human knows what will be staged.

**Request template for AI work** (include this in issues/PRs or chat prompts):

1. **Scope** – e.g., “Touch only `frontend/src/components/foo/**`.”
2. **Goal** – “Eliminate React hook lint warnings; behavior must stay identical.”
3. **Forbidden actions** – “Never run `terraform apply` or rotate secrets. Do not offer to push; only push if I explicitly instruct it.”
4. **Required checks** – “Run `npm test` and summarize output; stop on failure.” (If you want the assistant to execute local checks, list the exact commands here. Otherwise assume `npm run precommit` should run before every commit, and the assistant may run it whenever useful.)
5. **Ambiguity rule** – “If requirements conflict or files are missing, stop and ask instead of guessing.”
6. **Logging** – “Summarize long-running commands; don’t dump pages of logs unless requested.”

Requests that omit any of the above are incomplete. Assistants should pause and ask for clarification.

---

## Code documentation standards

All files must include appropriate comments following industry best practices:

- **File-level documentation**: Every source file should include a header comment describing its purpose, key exports, and any non-obvious usage patterns. Use JSDoc-style block comments for consistency:

  ````typescript
  /**
   * Short description of the file's purpose.
   *
   * Longer explanation if needed, including:
   * - Key exports or components
   * - Important usage patterns
   * - Related files or dependencies
   * - Any non-obvious implementation details
   *
   * @example
   * ```typescript
   * // Usage example if helpful
   * ```
   */
  ````

- **Function/method documentation**: Public APIs and exported functions should include JSDoc comments with parameter types, return types, and descriptions:

  ````typescript
  /**
   * Brief description of what the function does.
   *
   * @param paramName - Description of parameter
   * @param options - Configuration options
   * @returns Description of return value
   * @throws Description of any errors thrown
   *
   * @example
   * ```typescript
   * const result = myFunction("input", { option: true });
   * ```
   */
  ````

- **Inline comments**: Use for complex logic, non-obvious decisions, or workarounds. Comment the "why" rather than the "what":

  ```typescript
  // Using manual cookie parsing here because Next.js middleware
  // doesn't have access to Payload's session validation
  const token = cookies().get("payload-token");
  ```

- **Configuration files**: Include comments explaining purpose, valid values, and relationships to other config:

  ```typescript
  // Payload CMS configuration for production environment.
  // Must align with frontend API routes in src/app/api/
  ```

- **Shell scripts**: Include shebang, description, usage examples, and document any environment variables or dependencies:
  ```bash
  #!/usr/bin/env bash
  # generate-env-files.sh
  # Generates environment files for Docker Compose deployments.
  # Usage: bash deploy/scripts/actions/generate-env-files.sh
  # Requires: GitHub secrets available via environment
  ```

Shell script checklist (required for every new/edited script):

- `set -euo pipefail` (or defensive equivalent) at the top.
- Commented description + usage + dependency/env var notes.
- Input validation with clear error messages when required env vars/args are missing.
- Idempotent behavior where possible; scripts should be safely re-runnable.
- Prefer `bash` over `sh` when arrays/globs are required; document shell expectations.

## Code style & tooling

- **Formatting**: Prettier (`npm run format`) is the source of truth. Never hand-edit formatting to fight the formatter.
- **Linting**: ESLint config lives at the repo root plus per-app overrides. All code must pass `npm run lint` with zero warnings; suppressions require inline rationale.
- **TypeScript**: Strict mode is enabled. Do not ignore type errors with `any`/`@ts-ignore` unless there is a linked issue and a removal date.
- **Naming**: CamelCase for variables/functions, PascalCase for components/classes, SCREAMING_SNAKE_CASE for env constants. Follow file naming conventions already in each package.
- **Testing tools**: Vitest for unit/integration, Playwright for E2E, Next.js `app/` conventions for route handlers. Favor existing helpers before writing new ones.

## Testing expectations

Minimum bar before merging any change:

0. `npm run lint`
1. `npm test` (runs Vitest + Playwright smoke paths)
2. `npm run build:backend` and `npm run build:frontend` when touching those areas

If a command is intentionally skipped (e.g., Playwright on CI smoke jobs), document the reason in the PR and re-run locally as soon as feasible. New features should include or update tests; lack of coverage must be justified explicitly.

Enforcement:

- Document deviations from these standards in code comments with justification
- Prefer comprehensive documentation over minimal comments
- Update documentation when refactoring or changing behavior

---

## Boilerplate and reuse

Parts of this repository may become a learning reference or future boilerplate. Favor conventional, broadly adopted patterns over cleverness. Where pragmatism requires a deviation, document it in code and in this file, and provide a straightforward “conventional path” alternative.

Guidelines for boilerplate readiness:

- Prefer framework defaults and common patterns (Next.js App Router, server/route handlers, HttpOnly cookies) over bespoke abstractions.
- Keep cross-cutting concerns (auth, logging, errors) minimal and well-documented; avoid app-specific shortcuts in shared layers.
- Provide short comments where a choice differs from the norm and link back to this document for rationale and a removal path.
- When in doubt, choose the simpler, more conventional implementation that is easier to remember and explain.

Why this matters operationally:

- Conventional patterns are easier to inspect and reason about; fewer bespoke layers reduce the number of places a bug can hide.
- Failures tend to be familiar and well-documented, which speeds up diagnosis and recovery (search results and community knowledge match what we do).
- Onboarding and handoffs go faster because engineers can apply prior experience rather than learning custom abstractions.
- Platform upgrades and tooling (linters, APM, frameworks) are more likely to work smoothly when we stay close to the happy path.

Scope of reuse:

- This codebase (Next.js + Payload + Docker + Compose) may be repurposed as a starter. Aim to keep key modules (API routes, auth, data fetching, rendering) boilerplate-friendly.
- Treat this document as the source of truth for “standard vs. pragmatic” choices so future projects can copy the conventional track without surprises.

---

## Content authority and publishing conventions

These standards should define decision principles, not incident-specific fixes. They do not need to describe every content bug we encounter, but they must be specific enough that an engineer can tell which architecture is conventional and which one is a temporary deviation.

Rules:

- **Distinguish runtime authority from authoring origin**: every content domain must name both (a) the runtime authority that production renders from and (b) the current authoring origin used for promotion workflows. These are different roles. Runtime authority answers "what does this environment render right now?" Authoring origin answers "where do we make the next intended edit before promotion?"
- **One runtime authority per content domain**: each user-facing content surface must have a clearly named authority at runtime. For CMS-managed content, that authority should normally be the CMS-backed API or database-backed server read path for that same environment, not a second exported copy.
- **Authoring origin is a workflow choice, not a runtime override**: teams may choose `local`, `dev`, or `prod` as the current authoring origin for a content domain. That choice governs promotion direction and overwrite expectations; it must not change which system is authoritative at runtime for the target environment.
- **Snapshots are a build input or an explicit publish artifact, not an implicit second database**: generated JSON/YAML snapshots may be used to unblock builds, support local development, or intentionally publish static content. If a snapshot is used in production runtime reads, that choice must be explicit, documented, and justified as the primary publishing model.
- **Build fallback must not silently become runtime authority**: a fallback introduced so builds can succeed before another service is ready must remain scoped to build/bootstrap paths. Runtime code must not prefer that fallback over live authoritative content unless this document explicitly says that surface is snapshot-published.
- **Publishing path must match the editing model**: if content is intended to be editable in production via admin/CMS workflows, the standard path must allow those edits to reach production without requiring a rebuild. Cache invalidation or revalidation is acceptable; rebuilding the application is not the default publishing mechanism for CMS-managed content.
- **Edits must be visible in the environment where they are made**: if an operator edits CMS-managed content directly in `prod`, `dev`, or `local`, that environment should reflect the change through its normal runtime authority without waiting for a later promotion from another environment. Later promotions may intentionally overwrite those edits, but visibility inside the edited environment must be immediate.
- **Promotion policy may overwrite downstream environments**: promotion flows may intentionally replace content in downstream environments with the state from the current authoring origin. That overwrite behavior is a workflow policy and must not be implemented by making downstream runtimes read from some other environment's snapshot or export.
- **Static publishing must be declared intentionally**: if a route is intentionally static-from-snapshot, document that the snapshot is the publishing artifact, who refreshes it, and what invalidation or redeploy step makes changes visible.
- **Revalidation must refresh the real authority**: cache invalidation should re-render from the authoritative source of truth. Revalidation is not a substitute for syncing a stale snapshot or other secondary store.
- **Avoid split authority for the same rendered field**: do not mix live CMS reads, exported snapshots, hardcoded fallbacks, and transformed mirrors for the same content field unless there is a documented precedence order and a strong operational reason.
- **Deviations need a removal path**: if a route temporarily uses a less conventional authority model, document why, what risk it introduces, and what condition or follow-up change removes the deviation.

Review guidance:

- Ask what system is authoritative for this content in production.
- Ask which environment is the current authoring origin and whether that affects only promotion workflow or is incorrectly leaking into runtime reads.
- Ask whether the runtime path matches how editors are expected to publish changes.
- Treat “import succeeded but page stayed stale until rebuild” as a design smell unless the route is explicitly documented as snapshot-published.

---

## Evolving standards

These standards evolve with the codebase.
If a new pattern, dependency, or architectural choice requires an adjustment, update this document in the same PR with a short rationale and a link to the supporting ADR, issue, or commit.

---

## Backwards compatibility policy

This project intentionally does not maintain backwards compatibility guarantees.

Rationale:

- Scope: small, personal portfolio project maintained by a single owner.
- Impact: no broad external consumer base and no public API commitments.
- Velocity: prioritizing clarity and simplicity over deprecation cycles.

Implications:

- Script names, CLI flags, environment variable names, and internal module paths may be renamed or removed without deprecation shims.
- Breaking changes may land directly on the active development branch when they simplify maintenance.
- When behavior changes, prefer updating docs and commit messages over compatibility layers.

### Deprecation & duplication removal

We do not retain deprecated or duplicated implementations once a newer conventional or refactored version is active. Redundant files (old workflows, scripts, abstractions) should be deleted in the same PR that introduces the replacement unless a documented transition plan exists. If a temporary coexistence is required, add an explicit comment with a removal date and tracking issue. Absence of such documentation implies immediate removal is expected.

Operator guidance for removals:

- Prefer deletion over deactivation (avoid accumulating `.old`, `.bak`, or `*-manual` files).
- Consolidate to a single source of truth per operational concern (e.g., one redeploy workflow, one env guard script).
- After removal, update references in docs and scripts; do not leave stale instructions pointing to deleted assets.
  Operator guidance:

- Always refer to the current README and scripts in `package.json` for supported commands.
- If a command fails because it no longer exists, search the repo for the new alias or see recent commits/PRs.

---

## Goals

- Environment-agnostic images: no baked config, secrets, or per-env assumptions.
- Strict, early validation of required environment variables.
- One set of naming conventions across frontend and backend.
- Least privilege and minimal attack surface in containers and CI.
- Clear operational paths: local, dev, prod.

---

## Dockerfiles

- Keep Dockerfiles minimal and environment-agnostic.
  - Do not add ARG/ENV for configuration (URLs, regions, emails, buckets, etc.).
  - The only environment set in runtime should be `NODE_ENV=production`.
- Use BuildKit secrets for sensitive inputs during build only; they must not persist in image layers.
  - Example (backend builder stage):
    ```bash
    --mount=type=secret,id=prod_mongodb_uri
    --mount=type=secret,id=prod_payload_secret
    --mount=type=secret,id=aws_access_key_id
    --mount=type=secret,id=aws_secret_access_key
    ```
    Include SES from/to secrets as required by the active profile.
- Satisfy build-time guards transiently.
  - The backend prebuild guard (`scripts/check-required-env.ts`) runs strictly during Docker build.
  - Satisfy it with a short-lived export in the same RUN step (e.g., `REQUIRED_ENVIRONMENT_VARIABLES_BACKEND=DUMMY_OK` and `DUMMY_OK=1`).
  - Never bake configuration via Docker `ENV`; enforce real values at secrets-sync and runtime `prestart`.
- Security & hygiene in runtime images:
  - Run as a non-root user.
  - Remove `.env*` files in the final image.
  - Expose only necessary ports.
- Base image preference:
  - Use **Debian Slim** unless a lightweight Alpine variant is justified. Avoid Alpine for Node builds that require native dependencies.
- Tagging convention:
  - Use consistent image tagging:
    - Dev builds: `dev-latest`
    - Production builds: `prod-<gitsha>`
    - Avoid mutable `latest` tags in production registries.

---

## Environment variables & governance

- **Naming**
  - Use canonical key names (e.g., `FRONTEND_URL`, `BACKEND_INTERNAL_URL`, `AWS_REGION`) across every profile. Store per-profile values in `.github-secrets.private.<profile>.json5` instead of inventing prefixed variants.
  - Local overrides use the same canonical keys as every other profile to keep configuration consistent everywhere.
  - Frontend-only variables that must reach the browser remain `NEXT_PUBLIC_*`.

- **Profiles**
  - Profiles in use: `local`, `dev`, `prod`. `stage` may be added later; its implementation should mirror `dev`.
  - Profile inference follows the backend guard heuristics (`scripts/check-required-env.ts`).

- **Required list (ANY-of groups supported)**
  - Use split required lists:
    - `REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND`
    - `REQUIRED_ENVIRONMENT_VARIABLES_BACKEND`
  - Comma-separated groups; within a group, `|` means ANY-of is acceptable.
  - Example:
    ```bash
    MONGODB_URI,SES_FROM_EMAIL|SMTP_FROM_EMAIL,PAYLOAD_SECRET
    ```

- **Default criticals (CI/build/prod)** include:
  - Mongo URI, Frontend URL, AWS region, SES from/to email (or SMTP from), Payload secret.
  - `SECURITY_TXT_EXPIRES` is required when serving `/.well-known/security.txt`.

- **Enforcement stages (in order)**
  1. Secrets-sync preflight (preferred earliest failure point).
  2. CI build/test (`prebuild` and `prestart`).
  3. Runtime `prestart` on the server (final safety net).

- **When adding a new env var**
  - Update `.env.local.example` (or appropriate template) with a placeholder.
  - Update CI workflows to pass or generate it where required.
  - Update EC2/Compose env file generation if it must be present at runtime.
  - Consider whether it belongs in the required list (and which profile).

---

## Frontend conventions

- Only expose values to the browser via `NEXT_PUBLIC_*`.
- Use App Router API routes to proxy the backend when you need consistent JSON or CORS handling (e.g., `frontend/src/app/api/contact/route.ts`).
  - Coerce non-JSON upstream responses to a stable JSON shape: `{ error: string }`.
- Do not import server-only secrets into client components; use server actions or API routes.
- Prefer server actions where possible for backend interactions; use API routes when isolation or custom response handling is required.

### Authentication (Next.js + Payload) — conventional track

Goal: Server-only gating for protected/NDA fields. Client code should not need to “scrub” sensitive data.

- Session model: single HttpOnly session cookie (Payload’s `payload-token`).
- Server enforcement: Payload access rules and collection hooks must prevent NDA data exposure to unauthenticated requests.
- SSR behavior: after login, perform a navigation that re-runs server components so the cookie is included and protected data renders. Two common options:
  - Server-side 302 redirect to `/` after login; or
  - Client: `router.replace("/")` then `router.refresh()`.
- Cross-tab login (e.g., login in admin tab): on the site tab, listen for `visibilitychange`/`focus`, call `/api/users/me`, and if authenticated call `router.refresh()` to synchronize SSR state.
- Client fetches: use `credentials: 'include'`. Avoid client-side “NDA scrubbing” logic—let the server decide.

Note: For local development behind a single origin (e.g., Caddy reverse proxy), ensure both admin and site share the same cookie scope.

### Authentication — note on historical deviation

Earlier iterations used a small client-side fallback to reduce UX flicker (an `assumeAuthenticated` code path). This has been removed in favor of the conventional model above (server-only gating + redirect/refresh). Boilerplate consumers should follow the conventional track.

---

## Backend conventions

- Use the env guard at build/start:
  - `scripts/check-required-env.ts` validates required vars with support for ANY-of groups and profile inference.
  - In CI/build, provide a definition list or rely on defaults; in prod, a definition list is strongly encouraged.
- Email/SES configuration:
  - Declare `SES_FROM_EMAIL`, `SES_TO_EMAIL`, and `SMTP_FROM_EMAIL` in each secrets overlay so the runtime always reads the same key name regardless of profile.
  - Contact email for obfuscation and `/.well-known/security.txt` is read from CMS (Global: ContactInfo); no env variable is used.
- API responses:
  - Return consistent JSON for internal and proxied routes; avoid raw HTML in error paths.
- Logging:
  - Use structured logs for external service errors (e.g., SES) and include relevant context keys.
  - For permanent repository-owned console output, use `console.info` rather than `console(dot)log`.
    This is an intentional cleanup convention: `console(dot)log` is reserved as the search target for temporary debugging so it can be found and removed quickly before merge. If a console statement is meant to remain, prefer `console.info`; if it is temporary debugging scaffolding, use `console(dot)log` and delete it before shipping.

---

## CI/CD & deployment

- CI builds and tests should not bake secrets or config into images.
  - Use BuildKit secrets for anything sensitive.
  - Do not add Docker build args for env config.
- Dev images to Docker Hub, prod images to ECR.
- Redeploy workflow (EC2) composes env files for each service; runtime `prestart` enforces required vars again.
- Keep Compose profiles explicit (e.g., `local`, `proxy`) and document exposed ports in `docs/ports.md`.
- Local testing uses the Caddy reverse proxy for single-origin behavior and HTTPS locally.
  - Start the full local stack (frontend, backend, proxy) with:
    ```bash
    npm run caddy:up
    ```
  - Stop the proxy stack with:
    ```bash
    npm run caddy:down
    ```
  - View proxy logs with:
    ```bash
    npm run caddy:logs
    ```

---

## Security basics

- Non-root containers in runtime.
- Minimal packages; avoid installing compilers/tools in runtime stage.
- Remove development env files from runtime images.
- Validate CORS/CSRF origins using environment variables; do not hardcode.
- Dependency updates:
  - Use `npm run update:deps:dry` to review routine dependency updates safely before changing manifests.
  - Use `npm run update:deps` for standard refreshes so the repo guardrails, per-package installs, lockfile refresh, and `package.json5` sync all stay in one path.
  - Use `npm run update:deps:raw` only for intentional investigation; do not use it as the default upgrade path.
  - Refresh dependencies on a regular cadence, such as weekly or before a release, rather than letting upgrades pile up.
  - Validate dependency update PRs with the normal repo checks; PRs must not disable or bypass automated security checks.

---

## PR checklist

Use this checklist when opening any PR:

- [ ] No non-standard ARG/ENV added to Dockerfiles; images remain environment-agnostic.
- [ ] New env vars added to appropriate `.env.*.example` and to required lists if applicable.
- [ ] CI and redeploy scripts updated to pass/generate required values when needed.
- [ ] Frontend: no secrets exposed without `NEXT_PUBLIC_` and a documented reason.
- [ ] Backend: guard passes locally and in CI; runtime `prestart` succeeds with generated env files.
- [ ] Docs updated when behavior or configuration changes (this file, `docs/environment-variables.md`, etc.).
- [ ] ADRs updated if new technical decisions were introduced.
- [ ] Build passes `scripts/check-required-env.ts` locally before commit.
- [ ] Boilerplate readiness: non-standard deviations (if any) are documented with a clear removal path; conventional alternatives are noted.

---

## Appendix

### BuildKit secret IDs currently used in backend build

- `mongodb_uri`
- `payload_secret`
- `frontend_url`
- `s3_bucket`
- `aws_region`
- `ses_from_email`
- `ses_to_email`
- `smtp_from_email`
- `backend_internal_url`
- `public_server_url`
- `aws_access_key_id`
- `aws_secret_access_key`

### Required list examples

Use split lists for all profiles. Each profile’s secrets overlay must populate the canonical keys referenced in each list.

- Example backend list:

  ```bash
  REQUIRED_ENVIRONMENT_VARIABLES_BACKEND=\
  MONGODB_URI,\
  BACKEND_INTERNAL_URL,\
  FRONTEND_URL|PUBLIC_SERVER_URL,\
  AWS_REGION,\
  SES_FROM_EMAIL|SMTP_FROM_EMAIL,\
  SES_TO_EMAIL,\
  PAYLOAD_SECRET,\
  SECURITY_TXT_EXPIRES
  ```

- Example frontend list:

  ```bash
  REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND=\
  BACKEND_INTERNAL_URL,\
  PUBLIC_PROJECTS_BUCKET,\
  NDA_PROJECTS_BUCKET
  ```

### Naming examples

- `FRONTEND_URL`, `BACKEND_INTERNAL_URL`
- `AWS_REGION`, `S3_BUCKET`
- `SES_FROM_EMAIL`, `SES_TO_EMAIL`, `SMTP_FROM_EMAIL`
<!-- Contact email now in CMS; no corresponding env variable required -->
