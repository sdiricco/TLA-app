import cors from 'cors'
import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { openApiSpec } from './docs/openapi'
import { authRouter } from './routes/auth'
import { healthRouter } from './routes/health'
import { matchesRouter } from './routes/matches'
import { playersRouter } from './routes/players'
import { tournamentsRouter } from './routes/tournaments'
import { organizationsRouter } from './routes/organizations'
import { requestsRouter } from './routes/requests'

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
  app.use('/api/docs', swaggerUi.serve)
  app.get(
    '/api/docs',
    swaggerUi.setup(openApiSpec, {
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    }),
  )
  app.get('/api/docs.json', (_req, res) => {
    res.json(openApiSpec)
  })
  app.use('/api/auth', authRouter)
  app.use('/api/organizations', organizationsRouter)
  app.use('/api/requests', requestsRouter)
  app.use('/api/players', playersRouter)
  app.use('/api/tournaments', tournamentsRouter)
  app.use('/api/matches', matchesRouter)

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
