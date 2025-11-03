# Portfolio Backend (Payload CMS)

This is the backend service for the BB Portfolio website, built with Payload CMS and Next.js.

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

1. Copy environment variables: `cp .env.local.example .env`
2. Configure MongoDB URI and AWS credentials in `.env`
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

## API Endpoints

- `/api/projects` - Project collection API
- `/api/health` - Health check endpoint
- `/api/contact` - Contact form submission (SES email)
- `/admin` - Payload CMS admin interface
