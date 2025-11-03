# Engineering Standards

These standards keep this repo predictable, secure, and easy to operate across local, dev, and prod. They reflect the current implementation in this repository (Next.js + Payload, Docker multi-stage builds, GitHub Actions, EC2 + Docker Compose).

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
- Use BuildKit secrets for sensitive inputs during build only. They must not persist in image layers.
  - Example (backend builder stage):
    - `--mount=type=secret,id=prod_mongodb_uri`
    - `--mount=type=secret,id=prod_payload_secret`
    - `--mount=type=secret,id=aws_access_key_id`, `aws_secret_access_key`
    - SES from/to email secrets for the active profile as needed
- Satisfy build-time guards transiently.
  - The backend prebuild guard (`scripts/check-required-env.js`) is strict during Docker build. We satisfy it with a short-lived export in the same RUN step (e.g., `REQUIRED_ENVIRONMENT_VARIABLES=DUMMY_OK` and `DUMMY_OK=1`).
  - Never bake configuration via Docker `ENV`; enforce real values at secrets-sync and runtime `prestart`.
- Security & hygiene in runtime images:
  - Run as non-root user.
  - Remove `.env*` files in the final image.
  - Expose only necessary ports.

---

## Environment variables & governance

- Naming
  - Avoid FE*/BE* prefixes. Use unified names with optional profile prefix: `PROD_`, `DEV_`, `LOCAL_`.
  - Frontend-only variables that must reach the browser must be prefixed with `NEXT_PUBLIC_`.
- Profiles
  - Profiles in use: `local`, `dev`, `prod`.
  - Profile inference follows the backend guard heuristics (see `scripts/check-required-env.js`).
- Required lists (ANY-of groups supported)
  - Use one of:
    - `<PROFILE>_REQUIRED_ENVIRONMENT_VARIABLES` (e.g., `PROD_REQUIRED_ENVIRONMENT_VARIABLES`)
    - `REQUIRED_ENVIRONMENT_VARIABLES` (global)
  - Comma-separated groups; within a group, `|` means ANY-of is acceptable.
  - Example: `MONGODB_URI, SES_FROM_EMAIL|SMTP_FROM_EMAIL, PAYLOAD_SECRET`
- Default criticals (CI/build/prod) include:
  - Mongo URI, Frontend URL, AWS region, SES from/to email (or SMTP from), Payload secret
  - `SECURITY_CONTACT_EMAIL` is explicitly required (used by contact-info and security.txt)
- Enforcement stages (in order)
  1. Secrets-sync preflight (preferred earliest failure point)
  2. CI build/test (guard runs in `prebuild` and `prestart`)
  3. Runtime `prestart` on the server (final safety net)
- When adding a new env var
  - Update `.env.local.example` (or appropriate template) with a placeholder.
  - Update CI workflows to pass or generate it where required.
  - Update EC2/compose env file generation if it must be present at runtime.
  - Consider if it belongs in the required list (and in which profile).

---

## Frontend conventions

- Only expose values to the browser via `NEXT_PUBLIC_*`.
- Use app router API routes to proxy the backend when you need consistent JSON or CORS handling (e.g., `frontend/src/app/api/contact/route.ts`).
  - Coerce non-JSON upstream responses to a stable JSON shape `{ error: string }`.
- Do not import server-only secrets into client components; use server actions or API routes.

---

## Backend conventions

- Use the env guard at build/start:
  - `scripts/check-required-env.js` validates required vars with support for ANY-of groups and profile inference.
  - In CI/build, provide a definition list or rely on defaults; in prod, a definition list is strongly encouraged.
- Email/SES configuration
  - Prefer profile-prefixed `*_SES_FROM_EMAIL` and `*_SES_TO_EMAIL` for routing email per environment.
  - `SECURITY_CONTACT_EMAIL` must be set for obfuscation and `/.well-known/security.txt`.
- API responses
  - Return consistent JSON for internal and proxied routes; avoid raw HTML in error paths.
- Logging
  - Use structured logs for external service errors (e.g., SES) and include relevant context keys.

---

## CI/CD & deployment

- CI builds and tests should not bake secrets or config into images.
  - Use BuildKit secrets for anything sensitive.
  - Do not add Docker build args for env config.
- Dev images to Docker Hub, prod images to ECR.
- Redeploy workflow (EC2) composes env files for each service; runtime `prestart` enforces required vars again.
- Keep Compose profiles explicit (e.g., `local`, `proxy`) and document exposed ports in `docs/ports.md`.

---

## Security basics

- Non-root containers in runtime.
- Minimal packages; avoid installing compilers/tools in runtime stage.
- Remove development env files from runtime images.
- Validate CORS/CSRF origins using environment variables; do not hardcode.

---

## PR checklist (use when opening changes)

- [ ] No non-standard ARG/ENV added to Dockerfiles; images remain environment-agnostic.
- [ ] New env vars added to appropriate `.env.*.example` and to required lists if applicable.
- [ ] CI and redeploy scripts updated to pass/generate required values when needed.
- [ ] Frontend: no secrets exposed without `NEXT_PUBLIC_` and a documented reason.
- [ ] Backend: guard passes locally and in CI; runtime `prestart` succeeds with generated env files.
- [ ] Docs updated when behavior or configuration changes (this file, `docs/environment-variables.md`, etc.).

---

## Appendix

### BuildKit secret IDs currently used in backend build

- `prod_mongodb_uri`, `dev_mongodb_uri`, `local_mongodb_uri`
- `prod_payload_secret`, `dev_payload_secret`
- `aws_access_key_id`, `aws_secret_access_key`
- `prod_ses_from_email`, `prod_ses_to_email`, `dev_ses_from_email`, `dev_ses_to_email`

### Required list examples

- Global: `REQUIRED_ENVIRONMENT_VARIABLES=MONGODB_URI,FRONTEND_URL,AWS_REGION,SES_FROM_EMAIL|SMTP_FROM_EMAIL,SES_TO_EMAIL,PAYLOAD_SECRET,SECURITY_CONTACT_EMAIL`
- Prod: `PROD_REQUIRED_ENVIRONMENT_VARIABLES=PROD_MONGODB_URI,PROD_FRONTEND_URL,PROD_AWS_REGION,PROD_SES_FROM_EMAIL|PROD_SMTP_FROM_EMAIL,PROD_SES_TO_EMAIL,PROD_PAYLOAD_SECRET,SECURITY_CONTACT_EMAIL`

### Naming examples

- `PROD_FRONTEND_URL`, `DEV_FRONTEND_URL`
- `PROD_AWS_REGION`, `DEV_AWS_REGION`
- `PROD_SES_FROM_EMAIL`, `DEV_SES_FROM_EMAIL`
- `SECURITY_CONTACT_EMAIL`
