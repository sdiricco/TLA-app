import assert from 'node:assert/strict'
import test from 'node:test'

test('signUpWithPassword sends profile metadata in the GoTrue REST data field', async () => {
  process.env.SUPABASE_URL = 'https://auth.test.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'publishable-test-key'

  const originalFetch = globalThis.fetch
  let requestBody: Record<string, unknown> | undefined

  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
    return new Response(JSON.stringify({
      user: {
        id: 'user-registration-test',
        email: 'mario@example.com',
        user_metadata: { name: 'Mario Rossi' },
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { signUpWithPassword } = await import('./supabaseAuth')
    await signUpWithPassword(' mario@example.com ', 'Password123!', '  Mario Rossi  ')

    assert.deepEqual(requestBody, {
      email: 'mario@example.com',
      password: 'Password123!',
      data: { name: 'Mario Rossi' },
    })
    assert.equal('options' in (requestBody ?? {}), false)
  } finally {
    globalThis.fetch = originalFetch
  }
})
