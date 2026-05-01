# Private Content Workflow

This repo now supports importing authored CV content and project description content from a private sibling repo.

Default content source:

- `../cms-content-variants/_general-purpose` relative to this repo root.
- Preferred override: set `PORTFOLIO_CONTENT_DIR` once in repo `.env.local`.
- You can still override in the shell for a one-off run with `PORTFOLIO_CONTENT_DIR=/absolute/path/to/your/private/content`.
- `PORTFOLIO_CONTENT_DIR` is for authored content roots; `npm run media:seed` uses sibling `../cms-media-seedings` by default.

Recommended local setup:

```env
PORTFOLIO_CONTENT_DIR=../cms-content-variants/interactive-developer-abbvie
```

Expected structure:

```text
cms-content-variants/<target>/
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
This is intentional. Adding a YAML file alone does not import it; the slug must also be listed in `order.yaml`.
That explicit control is ideal here because it lets the developer decide exactly what enters Payload and in what order, instead of relying on rigid automatic file discovery.

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
- Each top-level HTML node in the file is imported as one item in the project's `desc` array.
- Example: two sibling `<p>` tags become two `desc` entries.
- The importer fails if a file does not match an existing project slug.

## Commands

From repo root:

- `npm run content:import:local:content-dir`
- `ALLOW_DEV_WRITE=true npm run content:import:dev:content-dir`
- `npm run content:pull:prod:all`
- `npm run content:pull:prod:all:dry`
- `npm run content:pull:prod:content-dir`
- `npm run content:pull:prod:content-dir:dry`

These root commands route through `scripts/content-workflow.sh`, which centralizes content-root resolution, greeting/hero sync, and aggregate authored-content validation.

Alternate directory examples:

- `PORTFOLIO_CONTENT_DIR=../cms-media-seedings npm run media:seed`
- `npm run media:seed -- --seedings-dir ../cms-media-seedings`
- `npm run media:pull:prod:cv-experience-logos -- --seedings-dir ../cms-media-seedings`
- `npm run media:pull:prod:project-brand-logos -- --seedings-dir ../cms-media-seedings`

If you switch variants often, either:

- change `PORTFOLIO_CONTENT_DIR` in `.env.local`, or
- set it inline for a single command.

Path-driven alias:

- `.env.local`:
  `PORTFOLIO_CONTENT_DIR=../cms-content-variants/interactive-developer-abbvie`
- `npm run content:import:local:content-dir`
- `ALLOW_DEV_WRITE=true npm run content:import:dev:content-dir`
- `npm run content:pull:prod:content-dir`
- `npm run content:pull:prod:content-dir:dry`
- These commands use the content root from `.env.local` by default.
- For a one-off run, you can still prefix a command with `PORTFOLIO_CONTENT_DIR=...`.
- The dev import alias also requires `ALLOW_DEV_WRITE=true` before it will write into the dev environment.

Notes:

- CV experience imports are intentionally controlled by `cv-experiences/order.yaml`, not by auto-importing every YAML file in the folder. This is the preferred workflow because it gives the developer explicit control over inclusion and ordering in Payload.
- The root pull commands are meant for copying authored production content back into sibling `../cms-content-variants/<target>` so local/dev imports can use the same content.
- Aggregate content import/export includes hero branding, project descriptions, and CV content in one pass. Image assets still sync separately through the media pull/seed commands.
- Use the root content workflow for aggregate imports/exports. The backend direct commands remain dataset-specific (`import:project-descriptions`, `import:cv-content`, `export:project-descriptions`, `export:cv-content`).
- A practical short-term path for targeted variants is to point these commands at different content roots, for example `../cms-content-variants/<target>`, while keeping Payload itself as a single effective site state.

## Possible future direction

If you later need targeted variants without turning Payload into a full branching CMS, the likely direction is:

- Keep `base/` content plus sparse `overrides/<variant>/` content in the private content repo.
- Let import scripts materialize `base + override` into the single effective Payload state.
- Keep lightweight lineage metadata in the CMS so pull/export scripts know which base and override set produced the current effective content.
- Keep merge and diff logic in scripts, not in Payload field definitions.

That preserves live CMS editing while avoiding a schema-level version matrix for every field.

Guarded write wrappers:

- `ALLOW_DEV_WRITE=true ./scripts/ops/import-cv-content-dev.sh`
- `ALLOW_PROD_WRITE=true ./scripts/ops/import-cv-content-prod.sh`
- `ALLOW_DEV_WRITE=true ./scripts/ops/import-project-descriptions-dev.sh`
- `ALLOW_PROD_WRITE=true ./scripts/ops/import-project-descriptions-prod.sh`

Direct prod imports are also guarded at the script level:

- `ALLOW_PROD_WRITE=true npm run import:cv-content -- --env prod --confirm-prod-write`
- `ALLOW_PROD_WRITE=true npm run import:project-descriptions -- --env prod --confirm-prod-write`
- Without both `ALLOW_PROD_WRITE=true` and `--confirm-prod-write`, direct `--env prod` imports fail before writing.

Project brand logo sync into private seedings:

- `npm run media:pull:prod:project-brand-logos:dry`
- `npm run media:pull:prod:project-brand-logos`
- This syncs the current production project-brand logo source into sibling `../cms-media-seedings/project-brand-logos/`.
- The pull script currently reads from the legacy prod S3 prefix `brand-logos/` and writes into the renamed local folder `project-brand-logos/` so the repo vocabulary is clear while the bucket naming catches up.

CV experience logo sync into private seedings:

- `npm run media:pull:prod:cv-experience-logos:dry`
- `npm run media:pull:prod:cv-experience-logos`
- This syncs `s3://<prod-bucket>/cv-experience-logos/` into sibling `../cms-media-seedings/cv-experience-logos/`.
