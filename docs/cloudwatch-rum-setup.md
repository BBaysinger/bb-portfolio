# CloudWatch RUM Setup Guide

## Overview

CloudWatch RUM (Real User Monitoring) has been integrated to track visitor traffic and performance metrics for your portfolio site.

## What Was Done

### 1. Frontend Integration

- ✅ Installed `aws-rum-web` package
- ✅ Created `frontend/src/services/rum.ts` - RUM service with initialization and tracking functions
- ✅ Created `frontend/src/components/RUMInitializer.tsx` - Component to initialize RUM on app load
- ✅ Updated `frontend/src/app/layout.tsx` - Added RUMInitializer to root layout
- ✅ Updated `frontend/.env` and `.env.local` with RUM variable placeholders

### 2. Infrastructure (Terraform)

- ✅ Added Cognito Identity Pool for unauthenticated RUM access
- ✅ Added IAM role and policies for RUM data ingestion
- ✅ Added CloudWatch RUM App Monitor resource
- ✅ Added outputs for RUM configuration values

### 3. Deployment Scripts

- ✅ Updated `deploy/scripts/actions/generate-env-files.sh` to include RUM variables in generated .env files

## What You Need to Do

### Step 1: Apply Terraform Changes

```bash
cd infra
terraform plan
terraform apply
```

This will create:

- CloudWatch RUM App Monitor
- Cognito Identity Pool
- IAM roles and policies

### Step 2: Get Terraform Outputs

After applying, get the RUM configuration values:

````bash
terraform output rum_app_monitor_id
terraform output rum_identity_pool_id
terraform output rum_guest_role_arn
terraform output rum_region

IMPORTANT: `rum_app_monitor_id` must be the UUID app monitor ID (AppMonitor.Id). Using the monitor name
(for example `bb-portfolio`) will cause the browser `PutRumEvents` call to fail with 403.

You can also fetch the UUID directly:

```bash
AWS_PAGER="" aws rum get-app-monitor --name bb-portfolio --query 'AppMonitor.Id' --output text
````

````

### Step 3: Add Values to GitHub Secrets

Add these values to your `.github-secrets.private.json5` file:

```json5
{
  strings: {
    // ... existing secrets ...

    // CloudWatch RUM Configuration
    NEXT_PUBLIC_RUM_APP_MONITOR_ID: "your-app-monitor-id-from-terraform",
    NEXT_PUBLIC_RUM_IDENTITY_POOL_ID: "us-west-2:your-identity-pool-id",
    NEXT_PUBLIC_RUM_GUEST_ROLE_ARN: "arn:aws:iam::your-account:role/bb-portfolio-rum-unauth-role",
    NEXT_PUBLIC_RUM_REGION: "us-west-2",

    // Optional: if your App Monitor has a public resource-based policy, enable unsigned requests.
    // When true, the frontend does not require identity pool / guest role values.
    NEXT_PUBLIC_RUM_PUBLIC_RESOURCE_POLICY: "false",

    // Optional: enable extra RUM console logging (non-production only)
    // Use for debugging in dev/staging; ignored in production builds.
    NEXT_PUBLIC_RUM_DEBUG: "true",
  },
}
````

### Step 4: Deploy

The next deployment will automatically include RUM tracking:

```bash
# Redeploy to pick up the new environment variables
npm run deploy:prod
# or
npm run deploy:dev
```

## How It Works

### Strategy Alignment

Your project uses **GitHub Secrets → Generated .env files** strategy:

1. Secrets stored in `.github-secrets.private.json5` (not committed)
2. Deployment scripts read secrets and generate `.env.prod` and `.env.dev` files
3. Docker Compose uses `env_file:` directive to load these into containers
4. No hardcoded values in docker-compose.yml ✅

### RUM Initialization

1. `RUMInitializer` component mounts on initial page load
2. Checks for required environment variables (`NEXT_PUBLIC_RUM_*`)
3. If configured, initializes AWS RUM Web Client
4. If not configured, logs info message and skips (safe for local dev)

### What RUM Tracks

- **Performance**: Page load times, resource timing, web vitals
- **Errors**: JavaScript errors and exceptions
- **HTTP**: XHR/Fetch requests, response times, errors
- **User Sessions**: Session duration, page views, navigation patterns

### Data Privacy

- Uses **unauthenticated** Cognito Identity Pool (no user login required)
- Tracks anonymous visitor metrics only
- No PII collected by default
- Cookie-based session tracking (can be disabled)

## Viewing RUM Data

### CloudWatch Console

1. Go to AWS Console → CloudWatch → Application Monitoring → RUM
2. Select your app monitor: `bb-portfolio`
3. View dashboards for:
   - Page load performance
   - JavaScript errors
   - HTTP requests
   - User sessions
   - Geographic distribution

### CloudWatch Logs

RUM data is also written to CloudWatch Logs:

- Log Group: `/aws/vendedlogs/RUMService`
- Retention: 30 days (default)

### Sample Queries (Logs Insights)

```sql
-- Top 10 slowest pages
fields @timestamp, event_details.page_id, event_details.duration
| filter event_type = "com.amazon.rum.performance_navigation_event"
| sort event_details.duration desc
| limit 10

-- JavaScript errors
fields @timestamp, event_details.errorMessage, event_details.stackTrace
| filter event_type = "com.amazon.rum.error_event"
| limit 25
```

## Optional: Custom Tracking

The RUM service exports helper functions for custom tracking:

```typescript
import { recordPageView, recordEvent } from "@/services/rum";

// Custom page view tracking (if needed beyond automatic)
recordPageView("/special-page");

// Custom events
recordEvent("project_viewed", {
  projectId: "my-project",
  category: "portfolio",
});
```

## Cost Considerations

### Pricing

- **RUM Events**: $1.00 per 100,000 events
- **CloudWatch Logs**: $0.50 per GB ingested
- **Data Storage**: $0.03 per GB-month

### Expected Costs

- Low-traffic site (<1000 visitors/month): ~$1-2/month
- Medium traffic (10K visitors/month): ~$5-10/month
- Includes free tier: 100,000 events/month free

### Cost Optimization

- Session sample rate set to 100% (adjust to 0.5 for 50% sampling if needed)
- Only tracks errors, performance, and HTTP (minimal telemetry)
- X-Ray tracing disabled (can enable for deeper insights)

## Troubleshooting

### RUM Not Initializing

Check browser console for: `[RUM] CloudWatch RUM not configured - skipping initialization`

- Verify environment variables are set in deployed .env files
- Check Terraform outputs match values in GitHub secrets
- **Ensure RUM environment variables are passed as Docker build arguments** in `.github/workflows/ci-cd.yml`
  - The `NEXT_PUBLIC_*` variables must be available during the Next.js build process
  - Check that frontend Dockerfile accepts these build args

### CORS Errors

Ensure your domain is configured in the RUM App Monitor:

```hcl
domain = var.domain_name  # Should match your actual domain
```

### No Data in CloudWatch

- RUM requires HTTPS in production (HTTP only works for localhost)
- Verify IAM role has `rum:PutRumEvents` permission
- Check browser network tab for failed requests to RUM endpoint
- Verify the RUM client is loading by checking the page source for RUM-related JavaScript

## Next Steps (Optional)

1. **Create CloudWatch Dashboard** - Visualize key metrics
2. **Set up Alarms** - Alert on high error rates or slow page loads
3. **Custom Metrics** - Track business-specific events
4. **A/B Testing** - Use RUM metadata to track experiment variants
5. **Session Replay** - Enable CloudWatch Evidently for user session recordings

## References

- [AWS CloudWatch RUM Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM.html)
- [aws-rum-web SDK](https://github.com/aws-observability/aws-rum-web)
