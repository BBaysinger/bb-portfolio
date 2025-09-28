# Media uploads, buckets, and migration

This doc captures how uploads are set up today, recommended S3 patterns per environment, and a simple runbook to migrate media and MongoDB together when you promote environments.

## Current state (from repo)

- Uploads are local filesystem based in Payload collections using `staticDir`:
  - `brand-logos/`, `project-screenshots/`, `project-thumbnails/`
- No S3 buckets defined in Terraform yet (`infra/main.tf` only provisions EC2/SG/EIP/SSM).
- `@payloadcms/storage-s3` is installed but not wired. `payload.config.ts` has a `// storage-adapter-placeholder` comment in `plugins`.
- MongoDB is used via `@payloadcms/db-mongodb` with env-profile specific URIs: `LOCAL_MONGODB_URI`, `DEV_MONGODB_URI`, `PROD_MONGODB_URI`.

### Local folder conventions and fresh clones

- Canonical upload root for local dev: `backend/media/`
  - Subfolders: `brand-logos/`, `project-screenshots/`, `project-thumbnails/`, `profile-pictures/`
- These folders are ignored by git (we keep only `.gitkeep` so directories exist after clone).
- To import assets from your external `../seedings` folder (or `../seedings/images/*`) into `backend/media/*`, use:

```
npm run seed:media
```

This script copies files into `backend/media/*` for local dev only. It won’t commit media to git.

### Importing from an external seedings folder

If you keep non-checked-in working assets outside the repo (recommended), place them under a sibling directory to this repo named `seedings` (or `seeding`). Supported layouts include either flat or under an `images/` folder. For example:

```
../seedings/
  brand-logos/
  project-screenshots/
  project-thumbnails/
  profile-pictures/
# or
../seedings/images/
  brand-logos/
  project-screenshots/
  project-thumbnails/
  profile-pictures/
# legacy names also supported:
../seedings/client-logos/            # → brand-logos
../seedings/project-carousel/        # → project-screenshots
../seedings/project-carousel/thumbs  # → project-thumbnails
```

Then run the same import:

```
npm run seed:media
```

## What you likely want

- Keep local filesystem uploads in local dev for convenience.
- Use S3 for dev/stage/prod deployments.
- Simple promotions of content (DB + media) between environments.

This is a very common pattern: separate resources per environment and promote data via snapshots/rsync-style copy rather than sharing a single bucket/DB across envs.

## Bucket strategy options

- Separate bucket per environment (recommended)
  - Example names: `bb-portfolio-media-dev`, `bb-portfolio-media-stg`, `bb-portfolio-media-prod`.
  - Pros: clean isolation, simpler IAM, safe delete/testing.
  - Cons: copying objects on promotion requires a sync step.
- Single bucket with per-env prefixes
  - Example: `bb-portfolio-media` with prefixes `dev/`, `stg/`, `prod/`.
  - Pros: fewer buckets to manage.
  - Cons: trickier IAM, risk of cross-env bleed, harder lifecycle policies.

Most teams choose one-bucket-per-env.

### Prefixes by collection

Regardless of bucket choice, keep stable, predictable prefixes so DB keys don’t change when you switch storage backends:

- `brand-logos/`
- `project-screenshots/`
- `project-thumbnails/`

If you later enable a CDN (CloudFront), use the same path layout so URLs don’t require DB rewrites.

## IAM, CORS, lifecycle

- IAM policy for the backend (per env): allow `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on `arn:aws:s3:::<bucket>/*`, plus `s3:ListBucket` on the bucket.
- CORS on the bucket: allow `GET` from your frontend origins (local/dev/prod), and optionally `HEAD`.
- Lifecycle: enable versioning and consider a rule to abort incomplete multipart uploads and transition older versions as needed.

## Wiring Payload to S3 (high level)

You have the dependency installed. You’ll need to add the S3 storage plugin and map each collection to a prefix in `payload.config.ts`. Use env-prefixed variables so each env is independent:

Environment variables (examples):

- `DEV_S3_BUCKET`, `STG_S3_BUCKET`, `PROD_S3_BUCKET`
- `DEV_AWS_REGION`, `STG_AWS_REGION`, `PROD_AWS_REGION`
- `DEV_AWS_ACCESS_KEY_ID`, `DEV_AWS_SECRET_ACCESS_KEY` (or use an instance role)
- `DEV_S3_BASE_URL` (optional, set to a CloudFront distribution in prod)

General approach in code:

- Continue using local `staticDir` when `ENV_PROFILE=local`.
- When `ENV_PROFILE` is `dev`/`stg`/`prod`, enable the S3 storage plugin and map:
  - `brandLogos` → `brand-logos/`
  - `projectScreenshots` → `project-screenshots/`
  - `projectThumbnails` → `project-thumbnails/`
- Prefer computing the public URL at read time from a base URL (e.g., `https://cdn.example.com/brand-logos/<key>`), so you don’t store hard-coded absolute URLs in Mongo. That way, promotions between buckets require no DB rewrites.

Note: If you want me to wire the plugin now, say the word and I’ll add a safe, env-driven configuration that still defaults to local for `ENV_PROFILE=local`.

## Promotion/migration runbook

Two common flows:

1. Top-down sync (prod → lower envs)
   - Treat prod as the source of truth and periodically sync down to dev/stage for testing.
2. Controlled promotion (stage → prod)
   - Create a content freeze window, snapshot stage, and restore into prod.

Both should move DB and media together to remain consistent.

### Media copy (S3)

- Promote entire bucket:

```zsh
# S3 → S3 (fast, server-side)
aws s3 sync s3://bb-portfolio-media-stg s3://bb-portfolio-media-prod \
  --delete \
  --exclude ".cache/*"
```

- Promote a single collection/prefix:

```zsh
aws s3 sync s3://bb-portfolio-media-stg/project-thumbnails/ \
             s3://bb-portfolio-media-prod/project-thumbnails/ \
  --delete
```

- From local filesystem (current setup) to S3 (first-time import):

```zsh
aws s3 sync backend/media/brand-logos/ s3://bb-portfolio-media-dev/brand-logos/
aws s3 sync backend/media/project-screenshots/ s3://bb-portfolio-media-dev/project-screenshots/
aws s3 sync backend/media/project-thumbnails/ s3://bb-portfolio-media-dev/project-thumbnails/
```

Tips:

- Run from the repo root so paths resolve cleanly.
- Use `--dryrun` first to verify.
- If using CloudFront, invalidate changed paths after promotion.

### MongoDB snapshot and restore

Freeze writes during the snapshot (short maintenance window), then:

```zsh
# Dump from source env
mongodump \
  --uri "$STG_MONGODB_URI" \
  --out dump/stg-$(date +%F-%H%M)

# Restore into target env (drop to replace existing)
mongorestore \
  --uri "$PROD_MONGODB_URI" \
  --drop \
  dump/stg-YYYY-MM-DD-HHMM
```

Notes:

- Ensure the user has dump/restore privileges.
- If you keep only relative file keys in docs and compute URLs at runtime, you don’t need to rewrite DB fields when buckets change.
- If you’ve previously stored absolute URLs in upload docs, add a small one-off script to rewrite the `url` field. I can generate that if needed.

### Roll-forward/back

- Always retain the source dump and a pre-restore dump of the target.
- Rolling back is just a restore of the previous dump plus re-syncing media from the corresponding bucket snapshot (or versioned state).

## Terraform sketch (optional)

Below is a minimal pattern if you want to add S3 via Terraform. This is a sketch; we can add the real code when you’re ready.

```hcl
variable "env" { type = string }

resource "aws_s3_bucket" "media" {
  bucket = "bb-portfolio-media-${var.env}"
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# (Optional) CORS and lifecycle resources here
```

## FAQ

- Do I need three buckets and three DBs?
  - It’s the most common setup. It isolates risk and simplifies access control. It also makes promotion explicit.
- Can I “move everything together”?
  - Yes. The runbook above does exactly that: snapshot DB + sync media. For many teams, that’s the standard content promotion process.
- What about local?
  - Stay on filesystem for `ENV_PROFILE=local`. When you’re ready, you can also point local at a dev bucket using an IAM user and a `DEV_*` .env.

---

If you want, I can:

- Wire the S3 plugin now (env-driven, no behavior change for local).
- Add Terraform to provision per-env buckets and an IAM role for the backend.
- Create a small script to rewrite historic absolute URLs, if any.
