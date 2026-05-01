# Migration Cleanup

Track temporary artifacts, one-off scripts, and environment states that can be removed once the current migration work is fully validated.

## Do not remove yet

- [ ] Keep `backend/dump/env-sync/` until prod, dev, and local are fully reconciled and you no longer need rollback snapshots.
- [ ] Keep dev in its current backup role until production is confirmed stable and you no longer need the pre-rename fallback state.
- [ ] Keep the one-time brand rename/sync scripts until the migration is complete across all environments.

## Repository artifacts to remove later

- [ ] Remove `backend/dump/env-sync/` snapshots after final validation.
- [ ] Re-evaluate whether these one-off ops scripts should stay in the repo:
  - `backend/scripts/ops/ops-db-rename-brands-to-project-brands.ts`
  - `backend/scripts/ops/rename-project-brands-dev.sh`
  - `backend/scripts/ops/rename-project-brands-prod.sh`
  - `backend/scripts/ops/ops-db-sync-env.ts`
  - `backend/scripts/ops/sync-env.sh`

## Current sync scope

- [ ] Treat `ops-db-sync-env.ts` as a full Mongo database mirror for live source-to-target syncs.
- [ ] Keep local dump artifacts intentionally narrower than the live mirror; the dump directories are still only for the existing saved collection subset.

## Environment cleanup to do later

- [ ] Rename dev `brands` to `project-brands` when the backup window is over.
- [ ] Reconcile local so it no longer has mixed `brands` / `project-brands` state.
- [ ] Delete any empty or stale Mongo collections that were only useful during migration validation.

## Validation gate before cleanup

- [ ] Production admin reflects `Project Brands` / `Project Brand Logos`.
- [ ] Production data is confirmed healthy after deploy.
- [ ] Dev no longer needs to act as rollback backup.
- [ ] Local is no longer considered a risky source of truth.

Add to this file whenever we create another temporary migration-only artifact.
