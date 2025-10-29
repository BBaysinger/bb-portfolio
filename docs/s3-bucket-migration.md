# S3 Bucket Structure Guide: Four-bucket Architecture

This guide covers the four-bucket S3 structure that separates media storage (Payload CMS) from project file storage.

## Overview

### Bucket Structure

**Media Buckets (Payload CMS uploads):**

- `bb-portfolio-media-dev` - Development environment media
- `bb-portfolio-media-prod` - Production environment media

**Project Buckets (Static project files):**

- `bb-portfolio-projects-public` - Public projects (no authentication required)
- `bb-portfolio-projects-nda` - NDA/protected projects (authentication required)

## Migration Steps

### 1. Update GitHub Secrets

Update your `.github-secrets.private.json5` file:

```json5
{
  strings: {
    // Media bucket variables (for Payload CMS)
    DEV_S3_BUCKET: "bb-portfolio-media-dev",
    PROD_S3_BUCKET: "bb-portfolio-media-prod",

    // Project bucket variables (for static files)
    PUBLIC_PROJECTS_BUCKET: "bb-portfolio-projects-public",
    NDA_PROJECTS_BUCKET: "bb-portfolio-projects-nda",

    // Update validation lists
    DEV_REQUIRED_ENVIRONMENT_VARIABLES: "AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|DEV_AWS_REGION|DEV_S3_BUCKET|PUBLIC_PROJECTS_BUCKET|NDA_PROJECTS_BUCKET|DEV_FRONTEND_URL|DEV_SES_FROM_EMAIL|DEV_SES_TO_EMAIL",
    PROD_REQUIRED_ENVIRONMENT_VARIABLES: "AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|PROD_AWS_REGION|PROD_S3_BUCKET|PUBLIC_PROJECTS_BUCKET|NDA_PROJECTS_BUCKET|PROD_FRONTEND_URL|PROD_SES_FROM_EMAIL|PROD_SES_TO_EMAIL",
  },
}
```

### 2. Apply Terraform Changes

```bash
cd infra
terraform plan
terraform apply
```

This will create all four buckets:

**Media buckets:**

- `bb-portfolio-media-dev`
- `bb-portfolio-media-prod`

**Project buckets:**

- `bb-portfolio-projects-public`
- `bb-portfolio-projects-nda`

### 3. Upload Content to Buckets

There are two separate workflows for different content types:

#### A. Media Upload (Payload CMS)

Upload media files that will be managed by Payload CMS:

```bash
# Upload to development media bucket
npm run media:upload -- --env dev

# Upload to production media bucket
npm run media:upload -- --env prod

# Upload to both environments
npm run media:upload -- --env both
```

#### B. Project Files Upload (Static files)

Upload static project files that will be served directly:

```bash
# Upload to public projects bucket
npm run projects:upload -- --env public

# Upload to NDA projects bucket
npm run projects:upload -- --env nda

# Upload to both access levels
npm run projects:upload -- --env both
```

### 4. Update Database Records

If your Payload CMS database has absolute URLs stored, update them:

```bash
# Update media URLs for development environment
cd backend
npm run migrate:update-media-urls -- --env dev

# Update media URLs for production environment
npm run migrate:update-media-urls -- --env prod
```

### 5. Deploy Updated Application

```bash
# Push secrets to GitHub
npm run sync:github-secrets

# Deploy updated application
./deploy/scripts/deployment-orchestrator.sh
```

### 6. Verify Upload

```bash
# Verify media buckets are accessible
npm run media:verify -- --env both

# Verify project buckets are accessible
npm run projects:verify -- --env both

# Test application functionality
# - Check that Payload CMS can access media in appropriate environment
# - Check that public projects load without authentication
# - Check that NDA projects require authentication
# - Verify all URLs are working correctly
```

### 7. Cleanup (Optional)

Once everything is working correctly, you can remove the old buckets:

```bash
# WARNING: This permanently deletes data!
aws s3 rm s3://bb-portfolio-media-dev --recursive
aws s3 rb s3://bb-portfolio-media-dev

aws s3 rm s3://bb-portfolio-media-prod --recursive
aws s3 rb s3://bb-portfolio-media-prod
```

## Key Configuration Changes

### Environment Variables

Each environment uses its own media bucket, while project buckets are shared:

**Production (.env.prod):**

```bash
# Payload CMS media storage
PROD_S3_BUCKET=bb-portfolio-media-prod

# Static project files (shared across environments)
PUBLIC_PROJECTS_BUCKET=bb-portfolio-projects-public
NDA_PROJECTS_BUCKET=bb-portfolio-projects-nda
```

**Development (.env.dev):**

```bash
# Payload CMS media storage
DEV_S3_BUCKET=bb-portfolio-media-dev

# Static project files (shared across environments)
PUBLIC_PROJECTS_BUCKET=bb-portfolio-projects-public
NDA_PROJECTS_BUCKET=bb-portfolio-projects-nda
```

### Payload Configuration

- Production uses `PROD_S3_BUCKET` for media storage
- Development uses `DEV_S3_BUCKET` for media storage
- Project files are managed separately from Payload CMS

### Script Usage

**Media uploads (Payload CMS):**

```bash
npm run media:upload -- --env dev     # Upload to dev media bucket
npm run media:upload -- --env prod    # Upload to prod media bucket
npm run media:upload -- --env both    # Upload to both environments
```

**Project file uploads (Static files):**

```bash
npm run projects:upload -- --env public  # Upload to public projects bucket
npm run projects:upload -- --env nda     # Upload to NDA projects bucket
npm run projects:upload -- --env both    # Upload to both access levels
```

### API Routes for Project Files

**Public projects:** `/api/projects/public/...` → `bb-portfolio-projects-public` bucket  
**Private projects:** `/api/projects/private/...` → `bb-portfolio-projects-nda` bucket

> **Note:** API routes use `/private` for user-facing URLs while internal configuration uses `nda` terminology. This avoids conflicts with the `/nda` Next.js page route.

## Benefits of Four-Bucket Structure

1. **Clear separation of concerns** - Media (Payload CMS) vs. Projects (static files)
2. **Environment isolation** - Dev/prod media buckets prevent cross-environment contamination
3. **Access-based organization** - Project files organized by access requirements (public/NDA)
4. **Better security** - NDA content isolated in dedicated bucket with appropriate policies
5. **Flexible deployment** - Media tied to environment, projects shared across environments

## Troubleshooting

### Missing Environment Variables

If you see errors about missing bucket variables, ensure your secrets are updated and synced to GitHub:

- `DEV_S3_BUCKET` and `PROD_S3_BUCKET` for media
- `PUBLIC_PROJECTS_BUCKET` and `NDA_PROJECTS_BUCKET` for projects

### Old Bucket References

If you find references to old bucket names, check:

- Terraform outputs: `terraform output -json`
- Environment files on EC2: `/home/ec2-user/portfolio/backend/.env.*`
- Database records with hardcoded URLs

### Access Issues

If you can't access buckets, verify:

- IAM policies include both new bucket ARNs
- EC2 instance role has necessary permissions
- AWS credentials are valid
