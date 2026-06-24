import cors from 'cors'
import express from 'express'
import { env } from './config/env'
import { authRouter } from './routes/auth'
import { healthRouter } from './routes/health'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true)
          return
        }

        if (env.corsOrigins.includes(origin)) {
          callback(null, true)
          return
        }

        if (process.env.NODE_ENV !== 'production') {
          try {
            const parsed = new URL(origin)
            if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
              callback(null, true)
              return
            }
          } catch {
            // Ignore invalid origins and fall through to the rejection path.
          }
        }

        callback(new Error(`Origin not allowed by CORS: ${origin}`))
      },
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
