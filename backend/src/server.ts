import express from 'express'
import dotenv from 'dotenv'
import { Router } from 'express'

dotenv.config()

const app = express()

async function main() {
  console.log('Before dynamic import')

  const payloadModule = await import('payload')
  console.log('Payload module loaded')

  const configModule = await import('./payload.config')
  console.log('Config loaded')

  const payload = payloadModule.default
  const config = configModule.default

  console.log('Calling init...')
  await payload.init({ config })
  console.log('✅ Payload initialized')

  // 👇 Safely check if `.router` exists
  // if ('router' in payload && payload.router) {
  //   app.use(payload.router as Router)
  // } else {
  //   throw new Error('❌ Payload did not expose a router. Is the admin.user config valid?')
  // }

  app.get('/', (_, res) => {
    res.redirect(payload.getAdminURL())
  })

  const port = Number(process.env.PORT || 3000)
  app.listen(port, () => {
    console.log(`🚀 Payload Admin URL: ${payload.getAdminURL()}`)
  })
}

main().catch((err) => {
  console.error('❌ Top-level error:', err)
  process.exit(1)
})
