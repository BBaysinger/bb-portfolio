# Backend Ops Scripts

This folder is for explicit, high-impact operational scripts (especially production writes).

Guidelines:

- Keep production runners here, not in `package.json`.
- Require explicit safety guards (confirmation prompt and env flags).
- Keep one script per operation so steps are auditable.

Current scripts:

- `seed-cv-experience-prod.sh`: guarded production run for CV experience seeding.
