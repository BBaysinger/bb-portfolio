# Private Content Workflow

This repo now supports importing authored CV content and project description content from a private sibling repo.

Default content source:

- `../cms-seedings` relative to this repo root.
- Override with `PORTFOLIO_CONTENT_DIR=/absolute/path/to/your/private/content`.

Expected structure:

```text
cms-seedings/
  cv-experience-logos/
    epsilon.svg
    bb.svg
    s2.svg
  project-brand-logos/
    bbi.svg
    seven2.svg
    golden1.svg
    exas.svg
  cv-experiences/
    order.yaml
    experience/
      epsilon.yaml
      bb-interactive.yaml
    independent-rd/
      current.yaml
  project-descriptions/
    my-project-slug.html
    another-project-slug.html
```

## CV order file

`cv-experiences/order.yaml` controls which files are imported and the render order used in Payload.

```yaml
experience:
  - epsilon
  - bb-interactive
  - seven2

independentRd:
  - current
```

## CV entry files

Each CV entry lives in its own YAML file.

Example: `cv-experiences/experience/epsilon.yaml`

```yaml
slug: epsilon
logo:
  file: epsilon.svg
  alt: Epsilon logo
company: Epsilon
location: Irving, TX | Remote | W2
title: Front-end Developer
description: Built interactive, responsive web experiences for Fortune 500 clients.
technicalScope: Figma, ES6, TypeScript, jQuery, Sitecore, Salesforce
date: 05.2021 - 09.2024
bulletPoints:
  - text: Implemented dynamic UI components and data-driven informational grids.
    enabled: true
  - text: Built reusable email components in Salesforce Marketing Cloud.
  - text: Legacy bullet kept for history but disabled.
    enabled: false
```

Rules:

- File name must match the slug listed in `order.yaml`.
- `slug`, `company`, `location`, `title`, `description`, `technicalScope`, and `date` are required.
- `logo.file` is optional, but if present it must exist in `cv-experience-logos/`.
- CV experience logos are intentionally separate from project/client brand logos. Do not point CV YAML at `project-brand-logos/`.
- The current starter CV YAML is expected to use the files already present in `backend/media/cv-experience-logos/` and the mirrored private seedings folder `cv-experience-logos/`.
- `bulletPoints` can use either the object form above or a plain string shorthand.

## Project description files

Each file name must match an existing Payload project slug.

Example: `project-descriptions/golden-1-credit-union.html`

```html
<p>
  I built responsive marketing pages and interactive components for Golden 1
  Credit Union.
</p>
<p>
  The work focused on frontend implementation quality, CMS integration, and
  practical delivery under agency constraints.
</p>
```

Rules:

- One `.html` file per project slug.
- The entire file is imported into the project's `desc` field as a single HTML block.
- The importer fails if a file does not match an existing project slug.

## Commands

From `backend/`:

- `npm run import:cv-content:local`
- `npm run import:cv-content:dev`
- `npm run import:project-descriptions:local`
- `npm run import:project-descriptions:dev`
- `npm run export:cv-content -- --env prod`
- `npm run export:project-descriptions -- --env prod`

From repo root:

- `npm run content:pull:prod:project-descriptions`
- `npm run content:pull:prod:project-descriptions:dry`
- `npm run content:pull:prod:cv-experiences`
- `npm run content:pull:prod:cv-experiences:dry`
- `npm run content:pull:prod:all`
- `npm run content:pull:prod:all:dry`

Notes:

- The root pull commands are meant for copying authored production content back into sibling `../cms-seedings` so local/dev imports can use the same content.
- `content:pull:prod:cv-experiences` also syncs production CV logos into `../cms-seedings/cv-experience-logos/` before exporting YAML so the seedings stay importable.
- Use `USE_GITHUB_SECRETS=true` or equivalent prod env access when invoking the backend export scripts directly.

Guarded write wrappers:

- `ALLOW_DEV_WRITE=true ./scripts/ops/import-cv-content-dev.sh`
- `ALLOW_PROD_WRITE=true ./scripts/ops/import-cv-content-prod.sh`
- `ALLOW_DEV_WRITE=true ./scripts/ops/import-project-descriptions-dev.sh`
- `ALLOW_PROD_WRITE=true ./scripts/ops/import-project-descriptions-prod.sh`

Project brand logo sync into private seedings:

- `npm run media:pull:prod:project-brand-logos:dry`
- `npm run media:pull:prod:project-brand-logos`
- This syncs the current production project-brand logo source into sibling `../cms-seedings/project-brand-logos/`.
- The pull script currently reads from the legacy prod S3 prefix `brand-logos/` and writes into the renamed local folder `project-brand-logos/` so the repo vocabulary is clear while the bucket naming catches up.

CV experience logo sync into private seedings:

- `npm run media:pull:prod:cv-experience-logos:dry`
- `npm run media:pull:prod:cv-experience-logos`
- This syncs `s3://<prod-bucket>/cv-experience-logos/` into sibling `../cms-seedings/cv-experience-logos/`.
