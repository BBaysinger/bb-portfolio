import express from 'express'
import payload from 'payload'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

const start = async () => {
  const handler = await payload.init({
    express: app,
    onInit: () => {
      console.log('Payload is ready')
    },
  } as any) // 👈 suppress type error

  const port = process.env.PORT || 3001
  app.listen(port, () => {
    console.log(`🚀 Admin panel available at http://localhost:${port}/admin`)
  })
}

start()
