import dotenv from 'dotenv'
import express from 'express'
import payload from 'payload'

dotenv.config()

const app = express()

const start = async () => {
  console.info('Before dynamic import')

  const config = (await import('./payload.config')).default
  console.info('Payload module loaded')

  console.info('Config loaded')
  console.info('Calling init...')

  await payload.init({
    config,
  })

  console.info('✅ Payload initialized')

  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.info(`🚀 Payload Admin URL: http://localhost:${port}/admin`)
  })
}

start()
