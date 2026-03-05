# Backend Ops Scripts

This folder is for explicit, high-impact operational scripts (especially environment writes).

Naming convention:

- `ops-db-*.ts`: database mutation/export/recovery runners.
- `ops-s3-*.ts`: S3-focused runners that do not mutate DB state.
- `*-dev.sh` / `*-prod.sh`: guarded environment wrappers requiring explicit confirmation.

Current scripts:

- `ops-db-migrate-media-urls-to-s3.ts`: rewrites media document URLs to S3-backed paths.
- `ops-db-export-local-database.ts`: exports selected local collections for controlled import.
- `ops-db-rebuild-media-records-from-s3.ts`: reconstructs media records from S3 listings.
- `seed-cv-experience-dev.sh`: guarded development run for CV experience seeding.
- `seed-cv-experience-prod.sh`: guarded production run for CV experience seeding.
