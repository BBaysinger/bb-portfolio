# AWS SES Configuration Guide

This guide will help you set up AWS Simple Email Service (SES) for your portfolio contact form.

## Prerequisites

1. An AWS account
2. A verified domain or email address in AWS SES
3. AWS CLI installed (optional but recommended)

## Step 1: Set up AWS SES

### 1.1 Sign in to AWS Console

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **SES (Simple Email Service)**

### 1.2 Verify Your Email Domain/Address

1. In SES Console, go to **Verified identities**
2. Click **Create identity**
3. Choose **Domain** (recommended) or **Email address**
4. For domain: Enter your domain (e.g., `bbaysinger.com`).
5. For email: Enter your email address
6. Follow the verification process

### 1.3 Request Production Access (if needed)

By default, SES starts in sandbox mode (can only send to verified addresses):

1. In SES Console, go to **Account dashboard**
2. If in sandbox mode, click **Request production access**
3. Fill out the form explaining your use case
4. Wait for approval (usually 24-48 hours)

### 1.4 Create IAM User for SES

1. Go to **IAM Console**
2. Create a new user with programmatic access
3. Attach the policy `AmazonSESFullAccess` or create a custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    }
  ]
}
```

4. Save the **Access Key ID** and **Secret Access Key**

## Step 2: Configure Environment Variables

### 2.1 Create .env.local file in backend/

Copy `backend/.env.local.example` to `backend/.env.local` and configure:

```bash
# Copy the example file
cp backend/.env.local.example backend/.env.local
```

### 2.2 Update the AWS SES configuration in .env.local:

```bash
# AWS SES Email Configuration (for contact form)
LOCAL_AWS_REGION=us-east-1                    # Your AWS region
LOCAL_AWS_ACCESS_KEY_ID=AKIA...               # Your IAM user access key
LOCAL_AWS_SECRET_ACCESS_KEY=xyz...            # Your IAM user secret key
LOCAL_SES_FROM_EMAIL=noreply@some-domain.com   # Verified sender email
LOCAL_SES_TO_EMAIL=your-email@some-domain.com  # Your email to receive messages
```

**Important Notes:**

- `SES_FROM_EMAIL` must be a verified email/domain in SES
- `SES_TO_EMAIL` is where you'll receive contact form submissions
- Use the same region where you set up SES
- Never commit `.env.local` to version control

## Step 3: Production Configuration

For production, populate the canonical keys inside `.github-secrets.private.prod.json5` (or the matching secret store) so the env generator emits the right values:

```json5
{
  strings: {
    AWS_REGION: "us-west-2",
    AWS_ACCESS_KEY_ID: "your-prod-access-key",
    AWS_SECRET_ACCESS_KEY: "your-prod-secret-key",
    SES_FROM_EMAIL: "noreply@some-domain.com",
    SES_TO_EMAIL: "your-email@some-domain.com",
  },
}
```

The same key names (`AWS_REGION`, `SES_FROM_EMAIL`, etc.) are used for dev/stage overlays; only the values differ.

## Step 4: Test the Setup

1. Start your backend server:

   ```bash
   cd backend && npm run dev
   ```

2. Start your frontend:

   ```bash
   cd frontend && npm run dev
   ```

3. Navigate to your contact page and submit a test message

## Troubleshooting

### Common Issues:

1. **"Email address not verified"**
   - Ensure your `SES_FROM_EMAIL` identity is verified in SES Console
   - Verify in the SAME REGION your app uses (identities are regional). For this project, production uses `us-west-2`.
   - You can verify either a single email address (you'll receive a verification email to click) or verify your domain and enable DKIM.

2. **"AccessDenied" errors**
   - Check IAM permissions for your user
   - Ensure user has SES send permissions

3. **Rate limiting errors**
   - You may be hitting SES sending limits
   - Check SES Console for your sending statistics

4. **Sandbox mode restrictions**
   - Request production access if you need to send to unverified addresses

### SES Regions and Endpoints:

- US East (N. Virginia): `us-east-1`
- US West (Oregon): `us-west-2`
- Europe (Ireland): `eu-west-1`

### Monitoring:

- Check SES Console → **Sending statistics** for delivery rates
- CloudWatch logs for detailed error information
- Enable SES event publishing for advanced monitoring

## Security Best Practices

1. **Use IAM roles** instead of access keys when possible
2. **Rotate access keys** regularly
3. **Use least privilege** - only grant necessary SES permissions
4. **Monitor usage** to detect any unusual activity
5. **Set up billing alerts** to avoid unexpected charges

## Cost Considerations

AWS SES pricing (as of 2024):

- First 62,000 emails per month: Free
- After that: $0.10 per 1,000 emails
- Data transfer costs may apply

For a portfolio contact form, you'll likely stay within the free tier.

## Reason codes from the app and how to fix them

The backend surfaces SES failures as stable reason codes to help triage quickly:

- `SES_IDENTITY_NOT_VERIFIED`
  - The "from" identity is not verified in SES. Verify the email address (or entire domain) in the correct region used by the app (prod: `us-west-2`).
  - If your SES account is still in sandbox, you must also verify the recipient address or request production access.

- `SES_ACCESS_DENIED`
  - The principal (instance role or configured access keys) lacks `ses:SendEmail` permissions. Attach a policy allowing `ses:SendEmail` (and optionally `ses:SendRawEmail`) to the role/user.

- `SES_MESSAGE_REJECTED`
  - SES rejected the message content or recipient. Check that the from domain has proper authentication (SPF/DKIM), and that the account is out of sandbox if sending to unverified recipients.

- `SES_THROTTLED`
  - You've hit SES sending limits. Check sending statistics and request higher limits if needed.

- `SES_BAD_CREDENTIALS` / `SES_BAD_SIGNATURE`
  - The configured AWS credentials are invalid or signed for the wrong region. Ensure the region matches your SES setup.

Tip: The non-sensitive status endpoint `/api/contact/status/` returns which env keys are present and current profile; the admin diagnostics endpoint returns the last SES result (requires a bearer token).

## Quick path: Verify domain DKIM and request production access (now)

Use this checklist to finish setup for `bbaysinger.com` in region `us-west-2` and lift sandbox limits.

### A) Verify domain with DKIM (Cloudflare DNS)

1. Open AWS Console → SES v2 → Region selector: choose `US West (Oregon) us-west-2`.
2. Identities → Create identity → Domain → enter `bbaysinger.com`.
3. Leave “Easy DKIM” enabled (recommended) and create. SES will show 3 CNAME records:

- Names look like `<random>._domainkey.bbaysinger.com.`
- Values point to `dkim.amazonses.com.` targets.

4. In Cloudflare → DNS for `bbaysinger.com`:

- Add the 3 CNAMEs exactly as shown by SES.
- Set Proxy status to DNS only (gray cloud), not proxied.
- TTL Auto is fine.

5. Back in SES, keep the identity page open; verification typically completes within minutes but may take up to an hour. Status should change to “Verified”.

Optional: Configure custom MAIL FROM for SPF alignment

6. In the identity → “Set MAIL FROM domain” → e.g., `mail.bbaysinger.com`.
7. Add the required DNS records Cloudflare prompts for:

- MX for `mail.bbaysinger.com` pointing to the MAIL FROM hosts Amazon provides (priority 10).
- TXT for SPF: `v=spf1 include:amazonses.com -all` on `mail.bbaysinger.com` (not the root).

8. Wait for MAIL FROM to show as “Verified” (optional but recommended for DMARC alignment).

### B) Request SES production access (lift sandbox)

1. SES → Account dashboard → Sending options → “Edit your account details” (or “Request production access”). Make sure region is `us-west-2`.
2. Complete the form. Example answers for this project:

- Mail type: Transactional
- Website URL: https://bbaysinger.com
- Use case: Low-volume contact form notifications from portfolio site; no marketing; user-initiated only.
- Expected sending volume: 50–200/month
- Additional info: Bounces/complaints handled by SES; DMARC aligned sender (noreply@bbaysinger.com) with DKIM; SPF/MAIL FROM configured; no third-party lists.

3. Submit. Typical turnaround is from minutes to 24–48 hours. You’ll receive an email with the decision.

### C) Update app config and test

1. On the server, set the backend env (or secrets overlay) to use the verified sender:

- `AWS_REGION=us-west-2`
- `SES_FROM_EMAIL=noreply@bbaysinger.com`
- `SES_TO_EMAIL=<your recipient>` (can be unverified after production access)

2. Restart the backend container so the env is reloaded.
3. Test the contact form. If it fails, check `/api/contact/status/` and the admin diagnostics endpoint for a reason code (e.g., `SES_IDENTITY_NOT_VERIFIED`, `SES_MESSAGE_REJECTED`).

Notes

- Identities are regional: verify and request production access in `us-west-2` to match production.
- In Cloudflare, DKIM CNAMEs must be DNS only; orange proxy breaks DKIM.
- If still in sandbox, you must verify the recipient address or the domain until production access is granted.

### Optional: Customize email subject/heading

You can change the subject line and the heading shown in the email body via environment variables (profile-aware through the overlays, but still using the canonical names):

- `CONTACT_EMAIL_SUBJECT_PREFIX` — default: `"New Contact Form Submission"`
- `CONTACT_EMAIL_HEADING` — default: falls back to the subject prefix

Examples:

```bash
# Production (in the prod secrets overlay)
CONTACT_EMAIL_SUBJECT_PREFIX="New Portfolio Message"
CONTACT_EMAIL_HEADING="New Portfolio Message"

# Local/dev overrides live in .env.local or the dev overlay without prefixes
CONTACT_EMAIL_SUBJECT_PREFIX="Local Contact"
CONTACT_EMAIL_HEADING="Local Contact"
```

The final subject will append the sender name automatically, e.g., `New Portfolio Message from Jane Doe`.
