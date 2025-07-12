import express from 'express'
import payload from 'payload'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

const start = async () => {
  console.log('Before dynamic import')

  const config = (await import('./payload.config')).default
  console.log('Payload module loaded')

  console.log('Config loaded')
  console.log('Calling init...')

  await payload.init({
    config,
  })

  console.log('✅ Payload initialized')

  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`🚀 Payload Admin URL: http://localhost:${port}/admin`)
  })
}

start()
