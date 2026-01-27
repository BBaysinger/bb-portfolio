# Media uploads, buckets, and migration

This doc captures how uploads are set up today, recommended S3 patterns per environment, and a simple runbook to migrate media and MongoDB together when you promote environments.

## Current state (from repo)

- Uploads use the local filesystem in development via `staticDir`:
  - `brand-logos/`, `project-screenshots/`, `project-thumbnails/`
- S3 buckets are now defined and managed by Terraform under `infra/` (one bucket per env, e.g., `dev` and `prod`).
- `@payloadcms/storage-s3` is wired in `backend/src/payload.config.ts` and enabled when `ENV_PROFILE` is `dev` or `prod`. For `ENV_PROFILE=local`, filesystem storage is used.
- MongoDB now relies on the canonical `MONGODB_URI` key per profile (local uses the same key and prefixed variants are no longer supported).

### CLI uploads and verification: authentication

The media scripts (`scripts/upload-media-to-s3.ts` and `scripts/verify-media-s3.ts`) call the AWS CLI under the hood. They require credentials available to the CLI via one of these paths:

- Preferred: an AWS profile in `~/.aws/credentials` and passing `--profile <name>` (or setting `AWS_PROFILE`).
- Alternative: export static keys as env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (and optional `AWS_SESSION_TOKEN`).
- SSO: authenticate first (`aws sso login --profile <name>`) and set `AWS_PROFILE`.

If a profile is provided (via `--profile` or `AWS_PROFILE`), the scripts will fail fast if `~/.aws/credentials` is missing or the profile section is not found. If no profile is provided and no credentials are detected, the scripts will exit with a clear error explaining how to configure credentials.

Examples (zsh):

```zsh
# Using a profile stored in ~/.aws/credentials
npm run migrate:media:dev -- --profile myprofile --region us-west-2

# Verifying with a profile
npm run media:verify -- --env both --profile myprofile --region us-west-2

# Using static env keys instead of a profile
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-west-2
npm run migrate:media:dev -- --region "$AWS_REGION"
```

Note on older scripts: previously some package scripts inlined environment variables like `AWS_ACCOUNT_ID=...` or `COMPOSE_PROFILES=local-ssg`. Those are no longer required for media uploads. Use the flags above to direct the scripts and keep credentials in your standard AWS CLI locations.

Note on `:dry` scripts: `migrate:all:<env>:dry` and `migrate:media:<env>:dry` now run uploads in AWS CLI `--dryrun` mode (no writes). They may still fail if your AWS principal lacks permission to list the bucket.

### Local folder conventions and fresh clones

- Canonical upload root for local dev: `backend/media/`
  - Subfolders: `brand-logos/`, `project-screenshots/`, `project-thumbnails/`
- These folders are ignored by git (we keep only `.gitkeep` so directories exist after clone).
- To import assets from your external `../cms-seedings` folder (or `../cms-seedings/images/*`) into `backend/media/*`, use:

```
npm run media:seed
```

This script copies files into `backend/media/*` for local dev only. It won't commit media to git.

### Bootstrap vs migration vs recovery (what to run when)

Most of the time you want one of these flows:

- **Fresh local clone (filesystem uploads only)**
  - Seed local media from your external seedings folder: `npm run media:seed`
  - Start the stack (Docker or bare metal) and upload media through Payload as usual.

- **First-time S3 setup for an environment (dev/prod)**
  - Provision the bucket(s) via Terraform (see “S3 with Terraform”).
  - Upload the current local `backend/media/*` contents into the target bucket:
    - `npm run migrate:media:dev` (alias: `npm run media:upload:dev`)
    - `npm run migrate:media:prod` (alias: `npm run media:upload:prod`)
    - Dry run (no writes): `npm run migrate:media:dev:dry` / `npm run migrate:media:prod:dry`
  - Verify S3 contains what you expect:
    - `npm run media:verify -- --env dev` (or `--env prod`, `--env both`)

- **Migration: rewrite existing DB media URLs to point at S3**
  - Only needed if you already have Payload media records with filesystem URLs and you’re switching that environment to S3.
  - Dry run first:
    - `npm run migrate:media-urls:dev:dry` (or `:prod:dry`)
  - Apply:
    - `npm run migrate:media-urls:dev` (or `:prod`)

If you're missing S3 permissions locally, you can run the upload step from the EC2 host using its instance role (Terraform grants the instance role S3 access), or attach the S3 policy to your local IAM user and re-auth.

Advanced / recovery scripts (manual, use with care):

- `backend/scripts/export-local-database.ts`: dumps a subset of local collections to `dump/local-export/*` for manual import workflows.
- `backend/scripts/rebuild-media-records.ts`: attempts to reconstruct Payload media documents from S3 object listings.
  - This is intended for disaster recovery / reconstruction scenarios.
  - It currently has some hard-coded assumptions (bucket name, secrets loading) and should be reviewed/updated before use.

### Importing from an external seedings folder

If you keep non-checked-in working assets outside the repo (recommended), place them under a sibling directory to this repo named `seedings`. Supported layouts include either flat or under an `images/` folder. For example:

```
../cms-seedings/
  brand-logos/
  project-screenshots/
  project-thumbnails/
# or
../cms-seedings/images/
  brand-logos/
  project-screenshots/
  project-thumbnails/
# Deprecated names also supported:
../cms-seedings/brand-logos/            # → brand-logos
../cms-seedings/project-carousel/        # → project-screenshots
../cms-seedings/project-carousel/thumbs  # → project-thumbnails
```

Then run the same import:

```
npm run media:seed
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

Regardless of bucket choice, keep stable, predictable prefixes so DB keys don't change when you switch storage backends:

- `brand-logos/`
- `project-screenshots/`
- `project-thumbnails/`

If you later enable a CDN (CloudFront), use the same path layout so URLs don't require DB rewrites.

## S3 with Terraform (now live)

- Terraform provisions per-environment media buckets and the IAM access policy for the backend EC2 role.
- Buckets are created from `infra/main.tf` using `var.media_envs` (defaults to `["dev", "prod"]`).
- Outputs include `media_bucket_names` and `media_bucket_arns` so you can set application env vars easily.

To initialize/apply (requires valid AWS credentials in your shell):

```zsh
# From the repo root (preferred):
terraform -chdir=infra init
terraform -chdir=infra apply

# If your repo path has spaces and you're not in the repo root, quote the absolute path:
terraform -chdir="/Users/<you>/.../Portfolio Site/bb-portfolio-2025/infra" init
terraform -chdir="/Users/<you>/.../Portfolio Site/bb-portfolio-2025/infra" apply
```

If you see an AWS credentials error, configure your AWS CLI or export `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` (and optional `AWS_SESSION_TOKEN`) or set `AWS_PROFILE` to an authenticated profile.

### Backend env vars for S3

Each profile’s env bundle exposes the same canonical keys, so you only need to set the values inside `.github-secrets.private.<profile>.json5` (or via Terraform outputs) once per profile.

Required environment variables (per profile):

- `S3_BUCKET` — bucket name from Terraform `media_bucket_names`
- `AWS_REGION` — typically matches `var.region` in Terraform (`us-west-2` by default)

Populate the secrets overlay using Terraform outputs:

```zsh
# Get outputs as JSON
terraform -chdir=infra output -json > tf-outputs.json

# Using jq to extract bucket names
bucket_dev=$(jq -r '.media_bucket_names.value.dev' tf-outputs.json)
bucket_prod=$(jq -r '.media_bucket_names.value.prod' tf-outputs.json)

# Set regions to match your Terraform var.region
REGION=$(jq -r '.region.value // empty' tf-outputs.json 2>/dev/null || echo "us-west-2")

cat <<EOF > .github-secrets.private.prod.json5
{
  "strings": {
    "S3_BUCKET": "$bucket_prod",
    "AWS_REGION": "$REGION"
  }
}
EOF

cat <<EOF > .github-secrets.private.dev.json5
{
  "strings": {
    "S3_BUCKET": "$bucket_dev",
    "AWS_REGION": "$REGION"
  }
}
EOF

# Repeat for stage or other overlays, each using the same key names but different values.
```

Notes:

- The backend keeps using the local filesystem when `ENV_PROFILE=local`.
- When `ENV_PROFILE` is `dev` or `prod`, the S3 storage plugin is enabled and reads `S3_BUCKET`/`AWS_REGION` from the generated env file. If the app runs on EC2 with the instance role created by Terraform, explicit AWS access keys are not required.
- CORS for GET/HEAD is applied at the bucket level; tighten `var.media_cors_allowed_origins` as needed in `infra/variables.tf`.

## IAM, CORS, lifecycle

- IAM policy for the backend (per env): allow `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on `arn:aws:s3:::<bucket>/*`, plus `s3:ListBucket` on the bucket.
- CORS on the bucket: allow `GET` from your frontend origins (local/dev/prod), and optionally `HEAD`.
- Lifecycle: enable versioning and consider a rule to abort incomplete multipart uploads and transition older versions as needed.

## Wiring Payload to S3 (high level)

You have the dependency installed. You'll need to add the S3 storage plugin and map each collection to a prefix in `payload.config.ts`. Stick to the canonical key names (`S3_BUCKET`, `AWS_REGION`, etc.) and let the env generator supply per-profile values.

Environment variables (per profile):

- `S3_BUCKET`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (optional when using instance roles)
- `S3_BASE_URL` (optional CDN override)

General approach in code:

- Continue using local `staticDir` when `ENV_PROFILE=local`.
- When `ENV_PROFILE` is `dev`/`stg`/`prod`, enable the S3 storage plugin and map:
  - `brandLogos` → `brand-logos/`
  - `projectScreenshots` → `project-screenshots/`
  - `projectThumbnails` → `project-thumbnails/`
- Prefer computing the public URL at read time from a base URL (e.g., `https://cdn.example.com/brand-logos/<key>`), so you don't store hard-coded absolute URLs in Mongo. That way, promotions between buckets require no DB rewrites.

Note: If you want me to wire the plugin now, say the word and I'll add a safe, env-driven configuration that still defaults to local for `ENV_PROFILE=local`.

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
  --uri "$SOURCE_MONGODB_URI" \
  --out dump/stg-$(date +%F-%H%M)

# Restore into target env (drop to replace existing)
mongorestore \
  --uri "$TARGET_MONGODB_URI" \
  --drop \
  dump/stg-YYYY-MM-DD-HHMM
```

Notes:

- Ensure the user has dump/restore privileges.
- If you keep only relative file keys in docs and compute URLs at runtime, you don't need to rewrite DB fields when buckets change.
- If you've previously stored absolute URLs in upload docs, add a small one-off script to rewrite the `url` field.

### Roll-forward/back

- Always retain the source dump and a pre-restore dump of the target.
- Rolling back is a restore of the previous dump plus re-syncing media from the corresponding bucket snapshot (or versioned state).

## Terraform sketch (optional)

Below is a minimal pattern if you want to add S3 via Terraform. This is a sketch; expand as needed.

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
  - It's the most common setup. It isolates risk and simplifies access control. It also makes promotion explicit.
- Can I “move everything together”?
  - Yes. The runbook above does exactly that: snapshot DB + sync media. For many teams, that's the standard content promotion process.
- What about local?
  - Stay on filesystem for `ENV_PROFILE=local`. When you're ready, you can also point local at the dev bucket by sourcing the generated `backend.env.dev` file (which already uses canonical keys) or by exporting ad-hoc AWS credentials.

---

If you want, I can:

- Wire the S3 plugin now (env-driven, no behavior change for local).
- Add Terraform to provision per-env buckets and an IAM role for the backend.
- Create a small script to rewrite historic absolute URLs, if any.

## Caveats and future considerations

This project intentionally overwrites media when a new upload has the same filename (env-gated). That's convenient during authoring, but there are implications:

- Client/CDN caching: Media endpoints and S3/CDN typically serve long-lived, immutable caches. Always change the URL when content changes. We do this by appending a version query param (e.g., `?v=updatedAt`) to rendered URLs. If your CDN ignores query strings for cache keys, enable forwarding/including query strings to make busting effective.
- Safety and auditability: Overwriting by filename erases the prior object. If you need history, enable S3 versioning and/or switch to “new filenames per change” in the future. You can also add a Payload versioned field to keep a reference to older doc metadata.
- Scope: Overwrite-on-create hooks are currently implemented for Brand Logos, Project Screenshots, and Project Thumbnails. If you introduce new upload collections, consider copying the same hook pattern or extracting a shared helper.
- Environment gating: Behavior defaults to enabled for `local`/`dev` and disabled for `prod`. You can force-enable with `OVERWRITE_MEDIA_ON_CREATE=true`. Treat production enables as a conscious decision.
- Local dev suffixing: The hooks attempt to remove pre-existing files in `backend/media/*` to prevent Payload's local adapter from suffixing filenames (e.g., "-1"). If you see suffixes, check for residual files on disk and ensure the normalized filename path is cleaned.
- Filenames and normalization: Hooks strip trailing `-N` counters from incoming names so repeated re-uploads keep a stable key. If you truly need filenames with `-1` in them, you'll want to adjust the normalization logic.
- S3 ACLs and headers: We haven't explicitly set Cache-Control headers on S3 objects yet; the frontend relies on versioned URLs. You may set `Cache-Control: public, max-age=31536000, immutable` on objects via the storage adapter for consistency with the local media route.
- CloudFront/CDN invalidations: With versioned URLs you generally don't need invalidations. If you move away from query-string versioning, you'll need to invalidate changed paths on promotions.

Future improvements

- Extract a shared overwrite utility to reduce duplication across collections (normalize filename, delete collisions, preserve metadata, unlink local).
- Add update-time overwrite behavior (currently focused on create). Carefully ensure metadata preservation still works as intended.
- Provide an admin UI toggle or per-collection setting to temporarily disable overwrites.
- Add automated tests around filename normalization and metadata carryover on replacement.
- Optional: Emit webhooks or audit logs when an overwrite occurs (capture who replaced which key and when).
