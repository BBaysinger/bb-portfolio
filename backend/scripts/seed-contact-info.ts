/*
  Seed ContactInfo global with phone values.
  Usage (run from repo root or backend dir with env vars set):
    ENV_PROFILE=dev DEV_MONGODB_URI=... DEV_PAYLOAD_SECRET=... DEV_S3_BUCKET=... DEV_AWS_REGION=... DEV_FRONTEND_URL=... \
      node --loader tsx ./backend/scripts/seed-contact-info.ts --e164 "+15092798603" --display "509-279-8603"

    ENV_PROFILE=prod PROD_MONGODB_URI=... PROD_PAYLOAD_SECRET=... PROD_S3_BUCKET=... PROD_AWS_REGION=... PROD_FRONTEND_URL=... \
      node --loader tsx ./backend/scripts/seed-contact-info.ts --e164 "+15092798603" --display "509-279-8603"
*/

import { getPayload } from 'payload'
import payloadConfig from '../src/payload.config'

type Args = { e164?: string; display?: string }

function parseArgs(argv: string[]): Args {
  const out: Args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--e164' && argv[i + 1]) {
      out.e164 = argv[++i]
    } else if (a === '--display' && argv[i + 1]) {
      out.display = argv[++i]
    }
  }
  return out
}

async function main() {
  const { e164, display } = parseArgs(process.argv.slice(2))
  const phoneE164 = e164 || '+15092798603'
  const phoneDisplay = display || '509-279-8603'

  const envProfile = process.env.ENV_PROFILE || 'local'
  // Minimal sanity to avoid accidentally using wrong profile without required vars
  const need = (key: string) => {
    if (!process.env[key]) throw new Error(`Missing required ${key} for ENV_PROFILE=${envProfile}`)
  }
  if (envProfile === 'dev') {
    need('DEV_MONGODB_URI')
    need('DEV_PAYLOAD_SECRET')
    need('DEV_FRONTEND_URL')
    need('DEV_S3_BUCKET')
    need('DEV_AWS_REGION')
  } else if (envProfile === 'prod') {
    need('PROD_MONGODB_URI')
    need('PROD_PAYLOAD_SECRET')
    need('PROD_FRONTEND_URL')
    need('PROD_S3_BUCKET')
    need('PROD_AWS_REGION')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = (await getPayload({ config: payloadConfig })) as any

  await payload.updateGlobal({
    slug: 'contactInfo',
    overrideAccess: true,
    data: { phoneE164, phoneDisplay },
    depth: 0,
  })

  console.log(`Seeded ContactInfo for ${envProfile} (e164/display set).`)
}

main().catch((err) => {
  console.error('[seed-contact-info] failed:', err)
  process.exit(1)
})
