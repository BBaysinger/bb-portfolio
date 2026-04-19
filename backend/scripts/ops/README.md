# Backend Ops Scripts

This folder is for explicit, high-impact operational scripts (especially environment writes).

Naming convention:

- `ops-db-*.ts`: database mutation/export/recovery runners.
- `ops-s3-*.ts`: S3-focused runners that do not mutate DB state.
- `*-dev.sh` / `*-prod.sh`: guarded environment wrappers requiring explicit confirmation.

Current scripts:

- `ops-db-migrate-media-urls-to-s3.ts`: rewrites media document URLs to S3-backed paths.
- `ops-db-rename-brands-to-project-brands.ts`: one-time Mongo collection rename for the Project Brands slug migration, with copy-and-drop fallback when `project-brands` already exists empty.
- `ops-db-sync-prod-to-dev.ts`: snapshots prod and dev, then can replace selected dev collections with current prod data.
- `ops-db-export-local-database.ts`: exports selected local collections for controlled import.
- `ops-db-rebuild-media-records-from-s3.ts`: reconstructs media records from S3 listings.
- `import-cv-content-dev.sh`: guarded development run for external CV content import.
- `import-cv-content-prod.sh`: guarded production run for external CV content import.
- `import-project-descriptions-dev.sh`: guarded development run for external project description import.
- `import-project-descriptions-prod.sh`: guarded production run for external project description import.
- `rename-project-brands-dev.sh`: guarded development run for the one-time Project Brands collection rename.
- `rename-project-brands-prod.sh`: guarded production run for the one-time Project Brands collection rename.
- `sync-prod-to-dev.sh`: guarded development overwrite that snapshots dev first, then copies current prod portfolio collections into dev.
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
- Default to sibling private content repo `../cms-seedings`; prefer repo `.env.local` for `PORTFOLIO_CONTENT_DIR`, with shell override support for one-off runs.
- Keep explicit write guards and typed confirmations (`import-cv-dev`, `import-cv-prod`, `import-projects-dev`, `import-projects-prod`).

Prod to dev sync:

- `ops-db-sync-prod-to-dev.ts` defaults to dry-run and always exports both `prod-source/` and `dev-before/` snapshots under `backend/dump/env-sync/<timestamp>/`.
- The sync script treats project brands as an alias-aware migration case: it reads from `project-brands` when present, otherwise falls back to legacy Mongo collection `brands`, writes into canonical `project-brands`, and clears legacy `brands` in dev after syncing.
- `sync-prod-to-dev.sh` is the guarded apply path and should be used when dev needs to become a working backup/mirror of prod before further migrations.
