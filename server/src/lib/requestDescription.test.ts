import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sanitizeRequestDescription } from './requestDescription'

// @req-covered REQ-007
// @req-partial REQ-001

test('removes scripts, event handlers and unsafe URLs from request descriptions', () => {
  const result = sanitizeRequestDescription(
    '<p onclick="alert(1)">Test</p><script>alert(2)</script><a href="javascript:alert(3)">link</a>',
  )

  assert.equal(result?.includes('<script'), false)
  assert.equal(result?.includes('onclick'), false)
  assert.equal(result?.includes('javascript:'), false)
  assert.match(result ?? '', /rel="noopener noreferrer"/)
})

test('preserves plain-text line breaks without allowing markup execution', () => {
  assert.equal(sanitizeRequestDescription('Prima riga\nSeconda riga'), 'Prima riga<br>Seconda riga')
})

test('rejects descriptions longer than the configured maximum', () => {
  assert.throws(() => sanitizeRequestDescription('a'.repeat(50_001)), /troppo lunga/)
})
