import { Router } from 'express'
import { prisma } from '../db/prisma'
import { env } from '../config/env'

type HealthDependencies = {
  databaseUrl: string
  queryDatabase: () => Promise<unknown>
}

export function createHealthRouter(dependencies: HealthDependencies = {
  databaseUrl: env.databaseUrl,
  queryDatabase: () => prisma.$queryRaw`SELECT 1`,
}) {
  const healthRouter = Router()

  healthRouter.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'tla-api',
    })
  })

  healthRouter.get('/health/db', async (_req, res) => {
    if (!dependencies.databaseUrl) {
      res.status(503).json({
        ok: false,
        database: 'not-configured',
      })
      return
    }

    try {
      await dependencies.queryDatabase()
      res.json({
        ok: true,
        database: 'reachable',
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        database: 'unreachable',
        message: error instanceof Error ? error.message : 'Database check failed',
      })
    }
  })

  return healthRouter
}

export const healthRouter = createHealthRouter()
