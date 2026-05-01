# Backend Ops Scripts

This folder is for explicit, high-impact operational scripts (especially environment writes).

Naming convention:

- `ops-db-*.ts`: database mutation/export/recovery runners.
- `ops-s3-*.ts`: S3-focused runners that do not mutate DB state.
- `*-dev.sh` / `*-prod.sh`: guarded environment wrappers requiring explicit confirmation.

Current scripts:

- `ops-db-migrate-media-urls-to-s3.ts`: rewrites media document URLs to S3-backed paths.
- `ops-db-rename-brands-to-project-brands.ts`: one-time Mongo collection rename for the Project Brands slug migration, with copy-and-drop fallback when `project-brands` already exists empty.
- `ops-db-sync-env.ts`: snapshots the existing saved local-file subset, then can mirror the full source Mongo database into the target database.
- `ops-db-export-local-database.ts`: exports selected local collections for controlled import.
- `ops-db-rebuild-media-records-from-s3.ts`: reconstructs media records from S3 listings.
- `import-cv-content-dev.sh`: guarded development run for external CV content import.
- `import-cv-content-prod.sh`: guarded production run for external CV content import.
- `import-project-descriptions-dev.sh`: guarded development run for external project description import.
- `import-project-descriptions-prod.sh`: guarded production run for external project description import.
- `rename-project-brands-dev.sh`: guarded development run for the one-time Project Brands collection rename.
- `rename-project-brands-prod.sh`: guarded production run for the one-time Project Brands collection rename.
- `sync-env.sh`: guarded source-to-target overwrite wrapper for the full Mongo database mirror.
- `seed-cv-experience-dev.sh`: guarded development run for CV experience seeding.
- `seed-cv-experience-prod.sh`: guarded production run for CV experience seeding.

CV experience seeding wrappers:

- Pull backend env values directly from local `.github-secrets.private.json5` plus profile
  overrides (for example, `.github-secrets.private.dev.json5` /
  `.github-secrets.private.prod.json5`).
- Run seed with `USE_GITHUB_SECRETS=true` so no `.env` file swapping is required.
- Keep explicit write guards and typed confirmations (`seed-dev`, `seed-prod`).

External content import wrappers:

- Use the same `.github-secrets.private*.json5` loading pattern as the CV seed wrappers.
- Default to sibling private content repo `../cms-content-variants/_general-purpose`; prefer repo `.env.local` for `PORTFOLIO_CONTENT_DIR`, with shell override support for one-off runs.
- Keep explicit write guards and typed confirmations (`import-cv-dev`, `import-cv-prod`, `import-projects-dev`, `import-projects-prod`).

Environment sync:

- `ops-db-sync-env.ts` defaults to dry-run and always exports both `<source>-source/` and `<target>-before/` snapshots under `backend/dump/env-sync/<source>-to-<target>/<timestamp>/`.
- The live sync now mirrors all Mongo collections so the target database matches the source database state.
- Local dump artifacts remain intentionally limited to the existing saved collection subset: `projects`, `project-brands`, legacy `brands`, `cvExperienceLogos`, `brandLogos`, `projectScreenshots`, `projectThumbnails`, and `globals`.
- `sync-env.sh` is the guarded apply path for every direction. The flow is the same whether the source is local, dev, or prod: choose source, choose target, dry-run first, then rerun with `--apply`.
