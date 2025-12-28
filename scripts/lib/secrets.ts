export type SecretProfile = string;

export type SecretMap = Record<string, string>;

export interface SecretBundle {
  strings: SecretMap;
  files: SecretMap;
}

export const canonicalEnvKeys = [
  "AWS_REGION",
  "S3_BUCKET",
  "MONGODB_URI",
  "PAYLOAD_SECRET",
  "FRONTEND_URL",
  "PUBLIC_SERVER_URL",
  "BACKEND_INTERNAL_URL",
  "PUBLIC_PROJECTS_BUCKET",
  "PUBLIC_PROJECTS_PREFIX",
  "NDA_PROJECTS_BUCKET",
  "NDA_PROJECTS_PREFIX",
  "SES_FROM_EMAIL",
  "SES_TO_EMAIL",
  "SMTP_FROM_EMAIL",
  "SECURITY_TXT_EXPIRES",
  "REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND",
  "REQUIRED_ENVIRONMENT_VARIABLES_BACKEND",
  "NEXT_PUBLIC_ENV_PROFILE",
  "NEXT_PUBLIC_RUM_APP_MONITOR_ID",
  "NEXT_PUBLIC_RUM_IDENTITY_POOL_ID",
  "NEXT_PUBLIC_RUM_GUEST_ROLE_ARN",
  "NEXT_PUBLIC_RUM_REGION",
  "NEXT_PUBLIC_RUM_DEBUG",
  "PAYLOAD_PUBLIC_SERVER_URL",
] as const;

export type CanonicalEnvKey = (typeof canonicalEnvKeys)[number];
