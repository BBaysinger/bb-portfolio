# Backend Ops Scripts

This folder is for explicit, high-impact operational scripts (especially environment writes).

Naming convention:

- `ops-db-*.ts`: database mutation/export/recovery runners.
- `ops-s3-*.ts`: S3-focused runners that do not mutate DB state.
- `*-dev.sh` / `*-prod.sh`: guarded environment wrappers requiring explicit confirmation.

Current scripts:

- `ops-db-migrate-media-urls-to-s3.ts`: rewrites media document URLs to S3-backed paths.
- `ops-db-rename-brands-to-project-brands.ts`: one-time Mongo collection rename for the Project Brands slug migration, with copy-and-drop fallback when `project-brands` already exists empty.
- `ops-db-export-local-database.ts`: exports selected local collections for controlled import.
- `ops-db-rebuild-media-records-from-s3.ts`: reconstructs media records from S3 listings.
- `import-cv-content-dev.sh`: guarded development run for external CV content import.
- `import-cv-content-prod.sh`: guarded production run for external CV content import.
- `import-project-descriptions-dev.sh`: guarded development run for external project description import.
- `import-project-descriptions-prod.sh`: guarded production run for external project description import.
- `rename-project-brands-dev.sh`: guarded development run for the one-time Project Brands collection rename.
- `rename-project-brands-prod.sh`: guarded production run for the one-time Project Brands collection rename.
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

Environment sync now routes through the repo-level canonical script:

- `scripts/migrate-database.sh` is the only supported database mirror path for local/dev/prod migrations.
- Root alias: `npm run data:sync -- <source> <target> [flags]`.
- The migration script handles backup creation, scoped collection syncs, destructive-write confirmations, and post-migration frontend revalidation.
