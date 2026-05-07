# Portfolio Backend (Payload CMS)

This directory contains the backend service for the BB-Portfolio portfolio system, built with Payload CMS and Next.js.

> See also: [Engineering Standards](../docs/engineering-standards.md) for conventions on env vars, Docker images, and operational guardrails used across this repo.

## Service Scope

- Owns the Payload CMS application, collection schemas, generated types, auth flows, and server-side content gating for public versus NDA-aware delivery.
- Provides backend APIs and delivery paths for projects, contact flows, health checks, media/static asset access, and app-facing content reads.
- Encapsulates environment-profiled runtime behavior, including local filesystem media, S3-backed storage, and operational scripts tied to migration and recovery workflows.
- Defers the full feature inventory to the root [README](../README.md) and the flat list in [docs/main-features-list.md](../docs/main-features-list.md).

## Local Development

The backend runs as part of the Docker Compose development environment. From the repository root:

1. Configure environment variables (see root README for setup)
2. Start the full development stack: `npm run caddy:up`
3. Access the admin panel at `http://localhost/admin`

The Docker setup includes:

- Backend service with hot reload
- Frontend service
- Caddy reverse proxy
- Local file storage for media

### Alternative: Standalone Development

For backend-only development:

1. Copy environment variables: `cp .env.local.example .env.local`
2. Configure MongoDB URI and any needed credentials in `.env.local`
3. Install dependencies: `npm install`
4. Start development server: `npm run dev`
5. Access admin panel at `http://localhost:3001`

## Service Notes

Keep the full feature narrative in the root [README](../README.md) and the flat inventory in [docs/main-features-list.md](../docs/main-features-list.md).

This README stays focused on backend-local concerns:

- how to run the Payload service by itself or under Docker Compose
- which environment profiles exist and how they change storage/runtime behavior
- where the main maintenance and migration scripts live
- the small set of URLs and admin entrypoints you need during backend work

Useful root sections:

- [Backend / Content Systems](../README.md#backend-platform-systems)
- [Deployment conveniences catalog](../README.md#-deployment-conveniences-catalog)
- [Secrets & Environment Management](../README.md#-secrets--environment-management)

## Environment Configuration

The backend supports multiple environment profiles:

- `local` - Local development with filesystem storage
- `dev` - Development environment with S3 storage
- `prod` - Production environment with S3 storage

Set `ENV_PROFILE` in your `.env` file to switch between configurations.

Note for local Docker Compose:

- The compose service `bb-portfolio-backend-local` sets `ENV_PROFILE=local` via environment.
- Dev scripts should not hardcode a different profile. The `package.json` dev scripts are configured to respect the environment so that the shared variables (`MONGODB_URI`, `PAYLOAD_SECRET`, `FRONTEND_URL`, etc.) are used correctly for whichever profile is active.
- If you see 500 errors like "Missing required DEV\*MONGODB_URI for ENV_PROFILE=dev" while running local, double-check that no script is forcing `ENV_PROFILE=dev` and that your `backend/.env` (or `.env.local`) contains the shared variables listed above.

## Frequently Used URLs

- `/admin` - Payload CMS admin interface
- `/api/health` - Health check endpoint

For the broader API/security surface, content model, and delivery behavior, use the root [README](../README.md) as the main reference.

## Maintenance Scripts

The backend has a small set of scripts under `backend/scripts/`.

- **Media + S3 bootstrap/migration runbook:** see [docs/uploads-and-migration.md](../docs/uploads-and-migration.md)
- **Migration:** `backend/scripts/ops/ops-db-migrate-media-urls-to-s3.ts` (invoked by root `npm run migrate:media-urls:*`)
- **Export:** `backend/scripts/ops/ops-db-export-local-database.ts` (manual dump helper for select collections)
- **Recovery:** `backend/scripts/ops/ops-db-rebuild-media-records-from-s3.ts` (reconstruct media docs from S3; review assumptions before running)

Some one-off migration/backfill scripts may be removed over time after the relevant migrations complete.
