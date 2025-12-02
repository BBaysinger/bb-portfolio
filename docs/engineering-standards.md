## Base Images & Secrets Policy

- Base images:
  - Build stages use hardened Node images (Chainguard/Wolfi or standard Node via `NODE_IMAGE`) to retain full tooling while minimizing CVE noise.
  - Production runtimes use Distroless Node 22 (Debian 12) to reduce attack surface and produce clean security scan results.
  - Do not run full OS upgrades (`apk upgrade`, `apt upgrade`) in Docker layers; install only required packages to avoid transient CVEs.
  - Pin images by digest in CI for reproducibility (e.g., `nodejs22-debian12@sha256:<digest>`).

- Secrets:
  - Never bake secrets into images via `ARG`/`ENV` or committed `.env` files.
  - Inject secrets at build-time using Docker BuildKit secrets mounts (`--mount=type=secret,id=...`) and at runtime via orchestrator environment.
  - Remove repo `.env*` files during build to prevent overrides; keep only `*.example` templates in VCS.

- Scanning:
  - Gate only final runtime images on CRITICAL/HIGH findings.
  - Rebuild weekly with refreshed base digests; scan with Trivy/Grype/Scout.

# Engineering Standards

These standards keep this repo predictable, secure, and easy to operate across local, dev, and prod.
They reflect the current implementation in this repository (Next.js + Payload, Docker multi-stage builds, GitHub Actions, EC2 + Docker Compose).

---

## Global objective

Our global objective is to maintain standards and follow established conventions consistently across the codebase.
Code must be authored professionally with code review in mind: clear naming, small focused changes, strong typing, tests where appropriate, and documentation for non-obvious decisions.

Any deviation from standards, conventions, or best practices must be explicitly called out in code comments and/or PR descriptions with rationale and a plan for alignment.

**Collaborative note:** tools reviewing or generating code should also flag non-standard, non-conventional, or non-best-practice patterns when encountered, and recommend alignment — without referencing their nature as automated assistants.

---

## AI assistant workflow standards

When working with AI coding assistants:

- **Git operations**: AI _can_ stage files (`git add`) and prepare commits (`git commit`), but **must not execute `git push`**. The developer should review staged changes and push, merge, or PR manually after verification.
- **Terraform/Infrastructure changes**: AI can prepare and suggest `terraform plan` but should not automatically execute `terraform apply` without explicit user confirmation for each resource change.
- **Deployment operations**: AI should present deployment commands and wait for explicit approval rather than automatically triggering deployments.

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

- **Inline comments**: Use sparingly for complex logic, non-obvious decisions, or workarounds. Comment the "why" rather than the "what":

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
- Platform upgrades and tooling (linters, APM, frameworks) generally “just work” when we stay close to the happy path.

Scope of reuse:

- This codebase (Next.js + Payload + Docker + Compose) may be repurposed as a starter. Aim to keep key modules (API routes, auth, data fetching, rendering) boilerplate-friendly.
- Treat this document as the source of truth for “standard vs. pragmatic” choices so future projects can copy the conventional track without surprises.

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

### Legacy & duplication removal

We do not retain legacy or duplicated implementations once a newer conventional or refactored version is active. Redundant files (old workflows, scripts, abstractions) should be deleted in the same PR that introduces the replacement unless a documented transition plan exists. If a temporary coexistence is required, add an explicit comment with a removal date and tracking issue. Absence of such documentation implies immediate removal is expected.

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
  - Satisfy it with a short-lived export in the same RUN step (e.g., `REQUIRED_ENVIRONMENT_VARIABLES=DUMMY_OK` and `DUMMY_OK=1`).
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
  - Use unified names with optional profile prefix: `PROD_`, `DEV_`, `LOCAL_`.
  - Frontend-only variables that must reach the browser must be prefixed with `NEXT_PUBLIC_`.

- **Profiles**
  - Profiles in use: `local`, `dev`, `prod`. `stage` may be added later; its implementation should mirror `dev`.
  - Profile inference follows the backend guard heuristics (`scripts/check-required-env.ts`).

- **Required list (ANY-of groups supported)**
  - Use the unified `REQUIRED_ENVIRONMENT_VARIABLES` definition.
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
  - Prefer profile-prefixed `*_SES_FROM_EMAIL` and `*_SES_TO_EMAIL` for routing email per environment.
  - Contact email for obfuscation and `/.well-known/security.txt` is read from CMS (Global: ContactInfo); no env variable is used.
- API responses:
  - Return consistent JSON for internal and proxied routes; avoid raw HTML in error paths.
- Logging:
  - Use structured logs for external service errors (e.g., SES) and include relevant context keys.

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
  - Use Dependabot or Renovate to track and apply upstream security patches.
  - PRs must not disable or bypass automated security checks.

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

- `prod_mongodb_uri`, `dev_mongodb_uri`, `local_mongodb_uri`
- `prod_payload_secret`, `dev_payload_secret`
- `aws_access_key_id`, `aws_secret_access_key`
- `prod_ses_from_email`, `prod_ses_to_email`, `dev_ses_from_email`, `dev_ses_to_email`

### Required list examples

Use a single global list for all profiles. Reference prefixed variables using ANY-of groups (`|`) so each profile satisfies at least one entry per group.

- Example global list:

  ```bash
  REQUIRED_ENVIRONMENT_VARIABLES=\
  LOCAL_MONGODB_URI|DEV_MONGODB_URI|PROD_MONGODB_URI,\
  LOCAL_FRONTEND_URL|DEV_FRONTEND_URL|PROD_FRONTEND_URL,\
  LOCAL_AWS_REGION|DEV_AWS_REGION|PROD_AWS_REGION,\
  LOCAL_SES_FROM_EMAIL|DEV_SES_FROM_EMAIL|PROD_SES_FROM_EMAIL|LOCAL_SMTP_FROM_EMAIL|DEV_SMTP_FROM_EMAIL|PROD_SMTP_FROM_EMAIL,\
  LOCAL_SES_TO_EMAIL|DEV_SES_TO_EMAIL|PROD_SES_TO_EMAIL,\
  LOCAL_PAYLOAD_SECRET|DEV_PAYLOAD_SECRET|PROD_PAYLOAD_SECRET,\
  SECURITY_TXT_EXPIRES
  ```

### Naming examples

- `PROD_FRONTEND_URL`, `DEV_FRONTEND_URL`
- `PROD_AWS_REGION`, `DEV_AWS_REGION`
- `PROD_SES_FROM_EMAIL`, `DEV_SES_FROM_EMAIL`
<!-- Contact email now in CMS; no corresponding env variable required -->
