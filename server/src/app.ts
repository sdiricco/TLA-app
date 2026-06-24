import cors from 'cors'
import express from 'express'
import { authRouter } from './routes/auth'
import { healthRouter } from './routes/health'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  )
  app.use(express.json())

  app.use('/api', healthRouter)
  app.use('/api/auth', authRouter)

  app.get('/', (_req, res) => {
    res.json({
      name: 'tla-api',
      status: 'running',
    })
  })

  app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' })
  })

  return app
}
