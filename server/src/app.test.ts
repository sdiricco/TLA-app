import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'
import type { Server } from 'node:http'
import { createApp } from './app'
import { createHealthRouter } from './routes/health'

// @req-covered NFR-008 NFR-012

let server: Server
let baseUrl = ''

before(async () => {
  const healthRouter = createHealthRouter({
    databaseUrl: '',
    queryDatabase: async () => undefined,
  })
  server = createApp({ healthRouter }).listen(0, '127.0.0.1')
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
  })
})

test('application health check exposes availability without sensitive data', async () => {
  const response = await fetch(`${baseUrl}/api/health`)
  const body = await response.json() as Record<string, unknown>

  assert.equal(response.status, 200)
  assert.deepEqual(body, { ok: true, service: 'tla-api' })
  assert.equal(JSON.stringify(body).includes('SUPABASE'), false)
})

test('database health check reports an unconfigured database', async () => {
  const response = await fetch(`${baseUrl}/api/health/db`)

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { ok: false, database: 'not-configured' })
})

test('OpenAPI document declares bearer authentication', async () => {
  const response = await fetch(`${baseUrl}/api/docs.json`)
  const body = await response.json() as {
    info: { title: string }
    components?: { securitySchemes?: Record<string, { type?: string; scheme?: string }> }
  }
  const schemes = Object.values(body.components?.securitySchemes ?? {})

  assert.equal(response.status, 200)
  assert.match(body.info.title, /TLA/i)
  assert.equal(schemes.some(scheme => scheme.type === 'http' && scheme.scheme === 'bearer'), true)
})
