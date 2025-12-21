# Portfolio Backend (Payload CMS)

This is the backend service for the BB-Portfolio website, built with Payload CMS and Next.js.

> See also: [Engineering Standards](../docs/engineering-standards.md) for conventions on env vars, Docker images, and operational guardrails used across this repo.

## Features

- Type-safe CMS with generated TypeScript types
- Project and media collections
- NDA-aware content filtering
- AWS S3 integration for media storage
- Contact form with AWS SES email
- Environment-specific configurations

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

## Collections

### Projects

- Portfolio projects with rich metadata (brand, tags, role, year, awards)
- NDA filtering for confidential content
- Automatic slug generation and sorting

### Media Collections

- **Project Screenshots**: Full-size project images
- **Project Thumbnails**: Carousel thumbnail images
- **Brand Logos**: Client brand assets

### Users

- Admin authentication and role-based access control

## Environment Configuration

The backend supports multiple environment profiles:

- `local` - Local development with filesystem storage
- `dev` - Development environment with S3 storage
- `prod` - Production environment with S3 storage

Set `ENV_PROFILE` in your `.env` file to switch between configurations.

Note for local Docker Compose:

- The compose service `bb-portfolio-backend-local` sets `ENV_PROFILE=local` via environment.
- Dev scripts should not hardcode a different profile. The `package.json` dev scripts are configured to respect the environment so that the canonical variables (`MONGODB_URI`, `PAYLOAD_SECRET`, `FRONTEND_URL`, etc.) are used correctly for whichever profile is active.
- If you see 500 errors like "Missing required DEV\*MONGODB_URI for ENV_PROFILE=dev" while running local, double-check that no script is forcing `ENV_PROFILE=dev` and that your `backend/.env` (or `.env.local`) contains the canonical variables listed above.

## API Endpoints

- `/api/projects` - Project collection API
- `/api/health` - Health check endpoint
- `/api/contact` - Contact form submission (SES email)
- `/admin` - Payload CMS admin interface

## Maintenance Scripts

### NDA Media Backfill

These scripts ensure upload collections have a correct computed `nda` flag so public reads can safely filter `nda=false`.

- Preferred (no Payload boot / no `sharp`): `npm run backfill:nda-media:mongo`
	- Implemented in `backend/scripts/backfill-nda-media.mongo.ts`.
	- Connects directly to MongoDB and updates `brandLogos`, `projectScreenshots`, and `projectThumbnails`.

- Alternative (Payload API): `npm run backfill:nda-media`
	- Implemented in `backend/scripts/backfill-nda-media.ts`.
	- **What’s left to get it working locally:** this path boots the full Payload config, which can fail on macOS if `sharp`/`libvips` can’t load.
		- If you hit a `sharp` / `libvips` load error, either run the Mongo script instead, or run the Payload script in a Linux container where `sharp` is known-good.
