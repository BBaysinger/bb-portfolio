#!/usr/bin/env node
// Generate minimal prod & dev env files for backend/frontend for remote candidate deployment.
// Usage: node scripts/generate-env-files-candidate.js /absolute/output/dir
// Reads .github-secrets.private.json5 (JSON5) at repo root.

const fs = require('fs');
const path = require('path');
const JSON5 = require('json5');

function main() {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error('Output directory argument required');
    process.exit(1);
  }
  const secretsPath = path.resolve('.github-secrets.private.json5');
  if (!fs.existsSync(secretsPath)) {
    console.error('Secrets file missing:', secretsPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(secretsPath, 'utf8');
  const parsed = JSON5.parse(raw);
  const s = parsed.strings || parsed;
  const v = (k, d='') => (s[k] !== undefined ? String(s[k]) : d);

  const beProd = [
    'NODE_ENV=production',
    'ENV_PROFILE=prod',
    `PROD_AWS_REGION=${v('PROD_AWS_REGION', v('S3_REGION','us-west-2'))}`,
    `PROD_MONGODB_URI=${v('PROD_MONGODB_URI')}`,
    `PROD_PAYLOAD_SECRET=${v('PROD_PAYLOAD_SECRET')}`,
    `PROD_S3_BUCKET=${v('PROD_S3_BUCKET')}`,
    `PUBLIC_PROJECTS_BUCKET=${v('PUBLIC_PROJECTS_BUCKET')}`,
    `NDA_PROJECTS_BUCKET=${v('NDA_PROJECTS_BUCKET')}`,
    `S3_REGION=${v('S3_REGION', v('PROD_AWS_REGION','us-west-2'))}`,
    `PROD_FRONTEND_URL=${v('PROD_FRONTEND_URL')}`,
    `PROD_BACKEND_INTERNAL_URL=${v('PROD_BACKEND_INTERNAL_URL','http://bb-portfolio-backend-prod:3000')}`,
    `SECURITY_TXT_EXPIRES=${v('SECURITY_TXT_EXPIRES')}`,
    `PROD_REQUIRED_ENVIRONMENT_VARIABLES=${v('PROD_REQUIRED_ENVIRONMENT_VARIABLES')}`,
    `PROD_SES_FROM_EMAIL=${v('PROD_SES_FROM_EMAIL')}`,
    `PROD_SES_TO_EMAIL=${v('PROD_SES_TO_EMAIL')}`,
  ].join('\n') + '\n';

  const beDev = [
    'NODE_ENV=development',
    'ENV_PROFILE=dev',
    'PORT=3000',
    `DEV_AWS_REGION=${v('DEV_AWS_REGION', v('S3_REGION','us-west-2'))}`,
    `DEV_MONGODB_URI=${v('DEV_MONGODB_URI')}`,
    `DEV_PAYLOAD_SECRET=${v('DEV_PAYLOAD_SECRET')}`,
    `DEV_S3_BUCKET=${v('DEV_S3_BUCKET')}`,
    `PUBLIC_PROJECTS_BUCKET=${v('PUBLIC_PROJECTS_BUCKET')}`,
    `NDA_PROJECTS_BUCKET=${v('NDA_PROJECTS_BUCKET')}`,
    `S3_REGION=${v('S3_REGION', v('DEV_AWS_REGION','us-west-2'))}`,
    `DEV_FRONTEND_URL=${v('DEV_FRONTEND_URL')}`,
    `DEV_BACKEND_INTERNAL_URL=${v('DEV_BACKEND_INTERNAL_URL','http://bb-portfolio-backend-dev:3000')}`,
    `SECURITY_TXT_EXPIRES=${v('SECURITY_TXT_EXPIRES')}`,
    `DEV_REQUIRED_ENVIRONMENT_VARIABLES=${v('DEV_REQUIRED_ENVIRONMENT_VARIABLES')}`,
    `DEV_SES_FROM_EMAIL=${v('DEV_SES_FROM_EMAIL')}`,
    `DEV_SES_TO_EMAIL=${v('DEV_SES_TO_EMAIL')}`,
  ].join('\n') + '\n';

  const feProd = [
    'NODE_ENV=production',
    'ENV_PROFILE=prod',
    `PROD_BACKEND_INTERNAL_URL=${v('PROD_BACKEND_INTERNAL_URL','http://bb-portfolio-backend-prod:3000')}`,
  ].join('\n') + '\n';

  const feDev = [
    'NODE_ENV=development',
    'ENV_PROFILE=dev',
    `DEV_BACKEND_INTERNAL_URL=${v('DEV_BACKEND_INTERNAL_URL','http://bb-portfolio-backend-dev:3000')}`,
  ].join('\n') + '\n';

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir,'backend.env.prod'), beProd);
  fs.writeFileSync(path.join(outDir,'backend.env.dev'), beDev);
  fs.writeFileSync(path.join(outDir,'frontend.env.prod'), feProd);
  fs.writeFileSync(path.join(outDir,'frontend.env.dev'), feDev);
  process.stdout.write(outDir + '\n');
}

main();