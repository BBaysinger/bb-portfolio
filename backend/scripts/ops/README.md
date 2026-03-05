# Backend Ops Scripts

This folder is for explicit, high-impact operational scripts (especially production writes).

Guidelines:

Current scripts:
Naming convention:

- `ops-db-*.ts`: database mutation/export/recovery runners.
- `ops-s3-*.ts`: S3-focused runners that do not mutate DB state.
- `*-prod.sh`: guarded production wrappers requiring explicit confirmation.

Current scripts:

- `ops-db-migrate-media-urls-to-s3.ts`: rewrites media document URLs to S3-backed paths.
- `ops-db-export-local-database.ts`: exports selected local collections for controlled import.
- `ops-db-rebuild-media-records-from-s3.ts`: reconstructs media records from S3 listings.
- `seed-cv-experience-prod.sh`: guarded production run for CV experience seeding.

Compatibility note:

- Legacy paths under `backend/scripts/*.ts` currently forward to canonical `backend/scripts/ops/*` scripts with a deprecation warning.
- `seed-cv-experience-prod.sh`: guarded production run for CV experience seeding.
