import assert from 'node:assert/strict'
import test from 'node:test'

test('signUpWithPassword sends profile metadata in the GoTrue REST data field', async () => {
  process.env.SUPABASE_URL = 'https://auth.test.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'publishable-test-key'
  process.env.SUPABASE_SECRET_KEY = 'secret-test-key'

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

test('deleteSupabaseUser uses the server secret only on the admin endpoint', async () => {
  const originalFetch = globalThis.fetch
  let requestUrl = ''
  let requestInit: RequestInit | undefined

  globalThis.fetch = async (input, init) => {
    requestUrl = String(input)
    requestInit = init
    return new Response(null, { status: 204 })
  }

  try {
    const { deleteSupabaseUser } = await import('./supabaseAuth')
    await deleteSupabaseUser('user/delete-test')

    assert.equal(requestUrl, 'https://auth.test.supabase.co/auth/v1/admin/users/user%2Fdelete-test')
    assert.equal(requestInit?.method, 'DELETE')
    assert.deepEqual(requestInit?.headers, {
      apikey: 'secret-test-key',
      Authorization: 'Bearer secret-test-key',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})
