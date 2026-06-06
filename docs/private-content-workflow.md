# Private Content Workflow

This repo supports two distinct private-content workflows:

- Authored pull/import workflows rooted at `PORTFOLIO_CONTENT_DIR`
- `content:migrate`, which migrates the full CMS database directly between environments and stages the supported media collections separately

Authority model:

- Runtime authority and authoring origin are different concepts in this repo.
- Runtime authority: each environment should render CMS-managed content from that same environment's live CMS/API unless a route is explicitly documented as snapshot-published.
- Authoring origin: the team may choose `local`, `dev`, or `prod` as the current source for the next intended content change before promotion.
- Preferred operational pattern for media: pull the chosen source environment into `local` first, then snapshot from `local` into the `cms-snapshot` root, then import `backend/media` from that snapshot root. This is the preferred normalization path, not a hard requirement that every snapshot root must always be derived from `local`.
- Local CMS state is authoritative for `content:migrate` when the source is `local`, but only as the migration source for that operation. It does not make local the runtime authority for `dev` or `prod`.
- Direct edits made in an environment are expected to appear immediately in that same environment. Later promotions from the current authoring origin may intentionally overwrite those edits.
- Canonical local YAML snapshots live at the configured `PORTFOLIO_CONTENT_DIR`; non-local pull/export runs must target an explicit alternate directory and cannot overwrite that canonical local snapshot.
- In this repo, `CMS_SNAPSHOT_ROOT` names the external, versionable `cms-snapshot` root. In normal operation the team usually normalizes through `local` first, even when `dev` or `prod` was the original upstream source, but the snapshot root is conceptually environment-agnostic. `media:import` copies asset collections from that snapshot root into local `backend/media`.

Default content source:

- `../cms-content-variants/_general-purpose` relative to this repo root.
- Preferred override: set `PORTFOLIO_CONTENT_DIR` once in repo `.env.local`.
- `PORTFOLIO_CONTENT_DIR` is for authored content roots.
- `CMS_SNAPSHOT_ROOT` is for the external snapshot root when media hydration should read from a versioned snapshot directory.
- `npm run media:import` requires `CMS_SNAPSHOT_ROOT`, unless you pass `--snapshot-root` for a one-off run.

Recommended local setup:

```env
PORTFOLIO_CONTENT_DIR=../cms-content-variants/example-cms-content-variant
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
  project-screenshots/
    some-project-shot.webp
  project-thumbnails/
    some-project-thumb.webp
  cv-experiences/
    order.yaml
    experience/
      epsilon.yaml
      bb-interactive.yaml
    independent-rd/
      current.yaml
  project-descriptions/
    my-project-slug.yaml
    another-project-slug.yaml
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
- The current starter CV YAML is expected to use the files already present in `backend/media/cv-experience-logos/` and the mirrored snapshot-root collection `cv-experience-logos/`.
- `bulletPoints` can use either the object form above or a plain string shorthand.

## Project description files

Each file name must match an existing Payload project slug.

Example: `project-descriptions/golden-1-credit-union.yaml`

Imports fail fast when a project is missing its expected slug-named YAML file.
Extra YAML files that do not match any current project slug are ignored with a warning.

```yaml
descParagraphs:
  - >-
    I built responsive marketing pages and interactive components for Golden 1 Credit Union.
  - >-
    The work focused on frontend implementation quality, CMS integration, and practical delivery under agency constraints.
```

Rules:

- One `.yaml` file per project slug.
- `descParagraphs` is a list of paragraph strings.
- Use markdown-like inline syntax inside a paragraph: `**bold**`, `*emphasis*`, and `[label](https://example.com)`.
- To control the rendered link target, append `{target=_self}` or `{target=_blank}` after the link, for example `[label](/projects){target=_self}`.
- The importer fails if a file does not match an existing project slug.

## Commands

From repo root:

- `ALLOW_DEV_WRITE=true npm run content:migrate -- --source local --target dev`
- `npm run content:migrate -- --source dev --target prod --confirm-prod-write`
- `npm run content:migrate -- --source prod --target local`
- `npm run content:apply-authored:local:content-dir`
- `ALLOW_DEV_WRITE=true npm run content:apply-authored:dev:content-dir`
- `ALLOW_PROD_WRITE=true npm run content:apply-authored:prod:content-dir -- --confirm-prod-write`
- `npm run content:pull:local:content-dir`
- `PORTFOLIO_CONTENT_DIR=../cms-snapshots/_dev-compare npm run content:pull:dev:content-dir`
- `npm run content:pull:prod:all`
- `npm run content:pull:prod:all:dry`
- `PORTFOLIO_CONTENT_DIR=../cms-snapshots/_prod-compare npm run content:pull:prod:content-dir`
- `PORTFOLIO_CONTENT_DIR=../cms-snapshots/_prod-compare npm run content:pull:prod:content-dir:dry`

These root commands route through `scripts/content-workflow.sh`, which centralizes content-root resolution, media staging/import sequencing, full-database migration for `content:migrate`, and production overwrite confirmation.

`content:migrate` and `content:import:*` are intentionally different workflows in this repo. Migration means database migration plus supported media staging/application between environments. Import means applying authored content from `PORTFOLIO_CONTENT_DIR`. Do not treat migrate as shorthand for import.

For operator-facing commands, prefer the `content:apply-authored:*:content-dir` aliases when you intend the authored-content apply/import workflow. The older `content:import:*` names remain as compatibility aliases.

The `ALLOW_DEV_WRITE=true` and `ALLOW_PROD_WRITE=true` prefixes satisfy the required write guards for remote targets. They do not disable other safety checks. Production writes still require the separate production confirmation step.

`content:migrate` uses an internal temporary staging directory. It does not depend on your configured `PORTFOLIO_CONTENT_DIR` target and it does not automatically run authored-content imports. `PORTFOLIO_CONTENT_DIR` remains the canonical root for explicit pull/import workflows and local `cms-snapshot` export tasks.

When `content:migrate` stages local media, it copies from `backend/media` and treats that local media state as authoritative. If the resolved snapshot root exists and overlapping files have different hashes, the migrate run stops before writing so local runtime media and snapshot-root assets can be reconciled intentionally.

`media:import` now also guards the local `cms-snapshot` import path. When the resolved snapshot root contains an older file than the existing `backend/media` copy and the hashes differ, the import stops and fails loudly instead of overwriting the newer local file.

`media:upload` performs the complementary guard in the opposite direction. Before syncing `backend/media` to S3, it checks the resolved `cms-snapshot` root for overlapping files. If a snapshot-root file is newer than the local `backend/media` copy and the hashes differ, the upload stops and fails loudly instead of letting an older local file overwrite a newer snapshot asset.

Treat snapshot-root media as full collection state, not passive reference material. If it is newer than `backend/media`, reconcile intentionally first by importing/pulling the newer state rather than bulk-uploading from stale local files.

Alternate directory examples:

- `npm run media:import -- --snapshot-root ../cms-snapshots/local`
- `npm run media:pull:prod:cv-experience-logos -- --snapshot-root ../cms-snapshots/_prod-compare`
- `npm run media:pull:prod:project-brand-logos -- --snapshot-root ../cms-snapshots/_prod-compare`

If you switch variants often, change `PORTFOLIO_CONTENT_DIR` in `.env.local`.

Path-driven alias:

- `.env.local`:
  `PORTFOLIO_CONTENT_DIR=../cms-content-variants/example-cms-content-variant`
- `ALLOW_DEV_WRITE=true npm run content:migrate -- --source local --target dev`
- `ALLOW_PROD_WRITE=true npm run content:migrate -- --source dev --target prod --confirm-prod-write`
- `PORTFOLIO_CONTENT_DIR=../cms-snapshots/_prod-compare npm run content:pull:prod:content-dir`
- `PORTFOLIO_CONTENT_DIR=../cms-snapshots/_prod-compare npm run content:pull:prod:content-dir:dry`
- The pull/import commands use the content root from `.env.local` by default.
- `content:migrate` does not use the configured content root; it stages internally and applies directly to the target environment.
- `pull-local` may write to the canonical configured content root. `pull-dev` and `pull-prod` require an explicit `PORTFOLIO_CONTENT_DIR` override and refuse to overwrite the canonical configured root.
- Any target of `dev` requires `ALLOW_DEV_WRITE=true` before it will write into the dev environment.
- Any target of `prod` requires `ALLOW_PROD_WRITE=true`; that env var satisfies the write guard, but aggregate migrations and prod imports still require a separate production confirmation step.

Notes:

- CV experience imports are intentionally controlled by `cv-experiences/order.yaml`, not by auto-importing every YAML file in the folder. This is the preferred workflow because it gives the developer explicit control over inclusion and ordering in Payload.
- The root pull commands copy the current authored-content subset plus the supported media collections for an environment back into the configured staging root.
- The root pull commands use the canonical configured staging root only for `pull-local`. Remote pulls are comparison/reconciliation exports and must use an explicit alternate destination.
- Aggregate migration now means: stage the supported media collections into an internal temporary directory, migrate the full CMS database directly from source to target, then revalidate frontend project routes.
- The backend direct commands remain dataset-specific (`import:project-descriptions`, `import:cv-content`, `export:project-descriptions`, `export:cv-content`), but the intended operator workflow is the aggregate wrapper.
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

Project brand logo sync into the snapshot root:

- `npm run media:pull:prod:project-brand-logos:dry`
- `npm run media:pull:prod:project-brand-logos`
- This syncs the current production project-brand logo source into `project-brand-logos/` under the resolved snapshot root.
- The pull script currently reads from the legacy prod S3 prefix `brand-logos/` and writes into the renamed local folder `project-brand-logos/` so the repo vocabulary is clear while the bucket naming catches up.

CV experience logo sync into the snapshot root:

- `npm run media:pull:prod:cv-experience-logos:dry`
- `npm run media:pull:prod:cv-experience-logos`
- This syncs `s3://<prod-bucket>/cv-experience-logos/` into `cv-experience-logos/` under the resolved snapshot root.
