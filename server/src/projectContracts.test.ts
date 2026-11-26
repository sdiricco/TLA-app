import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { changelogEntries } from '../../src/data/changelog'
import { pwaOptions } from '../../src/config/pwa'

// @req-covered UX-005 UX-006 NFR-010 NFR-011

test('changelog entries are newest-first and use the supported classifications', () => {
  const dates = changelogEntries.map(entry => entry.date)
  const sortedDates = [...dates].sort((left, right) => right.localeCompare(left))

  assert.deepEqual(dates, sortedDates)
  assert.equal(changelogEntries.length > 0, true)
  assert.equal(changelogEntries.every(entry => ['feature', 'improvement', 'fix'].includes(entry.kind)), true)
  assert.equal(changelogEntries.every(entry => entry.title.length > 0 && entry.description.length > 0), true)
})

test('PWA manifest is installable in Italian with standard and maskable icons', () => {
  const manifest = pwaOptions.manifest

  assert.equal(manifest.lang, 'it')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.orientation, 'portrait-primary')
  assert.equal(manifest.icons.some(icon => icon.sizes === '192x192'), true)
  assert.equal(manifest.icons.some(icon => icon.sizes === '512x512'), true)
  assert.equal(manifest.icons.some(icon => icon.purpose === 'maskable'), true)
  assert.equal(pwaOptions.registerType, 'autoUpdate')
  assert.match(pwaOptions.workbox.globPatterns[0] ?? '', /js,css,html/)
})

test('frontend and backend TypeScript configurations enforce strict checks', async () => {
  const frontend = JSON.parse(await readFile('tsconfig.app.json', 'utf8'))
  const backend = JSON.parse(await readFile('server/tsconfig.json', 'utf8'))

  for (const config of [frontend, backend]) {
    assert.equal(config.compilerOptions.strict, true)
    assert.equal(config.compilerOptions.noUnusedLocals, true)
    assert.equal(config.compilerOptions.noUnusedParameters, true)
  }
})
