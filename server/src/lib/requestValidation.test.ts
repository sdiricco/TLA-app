import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  decodeRequestImage,
  parseRequestComment,
  parseRequestCreateInput,
  requestStatuses,
} from './requestValidation'

// @req-partial REQ-001 REQ-002 REQ-005 REQ-006

test('validates and normalizes a community request input', () => {
  assert.deepEqual(parseRequestCreateInput({
    title: '  Nuove luci  ',
    description: 'Campo 2',
    type: 'feature',
    priority: 'high',
  }), {
    title: 'Nuove luci',
    description: 'Campo 2',
    type: 'feature',
    priority: 'high',
  })
  assert.throws(() => parseRequestCreateInput({ title: 'No' }), /almeno 3 caratteri/)
})

test('recognizes every supported community request status', () => {
  assert.deepEqual([...requestStatuses], ['open', 'planned', 'in_progress', 'done', 'rejected'])
})

test('accepts comments from 1 to 2000 trimmed characters', () => {
  assert.equal(parseRequestComment('  Ottima idea  '), 'Ottima idea')
  assert.throws(() => parseRequestComment('  '), /1 a 2000/)
  assert.throws(() => parseRequestComment('a'.repeat(2001)), /1 a 2000/)
})

test('accepts supported request images and rejects unsafe formats', () => {
  const png = decodeRequestImage(`data:image/png;base64,${Buffer.from('png').toString('base64')}`)

  assert.equal(png?.contentType, 'image/png')
  assert.equal(png?.extension, 'png')
  assert.deepEqual(png?.buffer, Buffer.from('png'))
  assert.throws(
    () => decodeRequestImage(`data:application/pdf;base64,${Buffer.from('pdf').toString('base64')}`),
    /JPG, PNG, WEBP o GIF/,
  )
})

test('rejects request images larger than 5 MB', () => {
  const oversized = Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64')
  assert.throws(() => decodeRequestImage(`data:image/jpeg;base64,${oversized}`), /più piccola di 5 MB/)
})
