import express from 'express'
import payload from 'payload'
import dotenv from 'dotenv'
import { AnyCaaRecord } from 'dns'

dotenv.config()

const app = express()

const start = async () => {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET,
    mongoURL: process.env.MONGODB_URI,
    express: app,
  } as any)

  const port = process.env.PORT || 3001
  app.listen(port, () => {
    console.info(`🚀 Payload Admin panel available at http://localhost:${port}/admin`)
  })
}

start()
