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
4. For domain: Enter your domain (e.g., `bbinteractive.io`)
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
LOCAL_SES_FROM_EMAIL=noreply@bbinteractive.io   # Verified sender email
LOCAL_SES_TO_EMAIL=your-email@bbinteractive.io  # Your email to receive messages
```

**Important Notes:**

- `SES_FROM_EMAIL` must be a verified email/domain in SES
- `SES_TO_EMAIL` is where you'll receive contact form submissions
- Use the same region where you set up SES
- Never commit `.env.local` to version control

## Step 3: Production Configuration

For production, update your environment variables with `PROD_` prefix:

```bash
PROD_AWS_REGION=us-east-1
PROD_AWS_ACCESS_KEY_ID=your-prod-access-key
PROD_AWS_SECRET_ACCESS_KEY=your-prod-secret-key
PROD_SES_FROM_EMAIL=noreply@bbinteractive.io
PROD_SES_TO_EMAIL=your-email@bbinteractive.io
```

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
   - Ensure your `SES_FROM_EMAIL` is verified in SES Console

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
