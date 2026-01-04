# Portfolio Frontend (Next.js)

This is the frontend service for the BB-Portfolio website, built with Next.js, React, and TypeScript.

> See also: [Engineering Standards](../docs/engineering-standards.md) for shared conventions (naming, env exposure via `NEXT_PUBLIC_*`, and CI/CD expectations).

## Features

- Interactive parallax project carousel
- Animated sprite system and kinetic orb
- Clamped Linear Interpolation (Lerp) fluid responsive system
- SSR/SSG portfolio rendering
- NDA-aware content routing
- Mobile-first responsive design

## Development

The frontend runs as part of the Docker Compose development environment. From the repository root:

```bash
npm run caddy:up
```

Open [http://localhost](http://localhost) with your browser to see the result.

### Alternative: Standalone Development

For frontend-only development:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - note that backend features will require the backend service to be running.

## Key Components

### Interactive Systems

- **Parallax Carousel**: Multi-layer synchronized scrolling with touch/swipe support
- **Fluxel Grid**: Animated pixel grid with simulated 3D depth effects
- **Kinetic Orb**: Physics-based interactive animation

### Responsive Design

- **Clamped Linear Interpolation (LERP) Fluid Scaling**: SCSS mixins that interpolate values across viewport ranges (layout with px precision; text/UI with rem-safe scaling) to avoid breakpoint jumps
- **SCSS Mixins**: `remRange`, `lerpRange`, and `scaleRange` for different scaling needs
- **Mobile-First**: Progressive enhancement approach

### Routing & Data

- **SSR Projects List**: Server-side rendered project listings
- **SSG Project Pages**: Static generation with ISR for performance
- **NDA Segmentation**: Separate `/project/` and `/nda/` routes for content safety

## Environment Configuration

The frontend reads environment variables from files in `frontend/` (it does not automatically use the monorepo root `.env`).

For local development:

```bash
cp .env.local.example .env.local
```

Key variables commonly needed:

- `BACKEND_INTERNAL_URL` (server-side requests to the backend)
- `PUBLIC_PROJECTS_BUCKET` / `NDA_PROJECTS_BUCKET` (S3 project bundle streaming routes)
- `AWS_REGION` (region for the S3 client)

The frontend adapts to different environments:

- Backend health check optimization for CI/CD vs runtime
- Environment-aware API endpoints
- Dynamic route generation based on available projects

## Deployment

This application is deployed using Docker containers on AWS EC2 with Nginx reverse proxy. See the main README and deployment documentation for infrastructure details.
