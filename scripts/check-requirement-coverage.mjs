import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const requirementsPath = path.join(root, 'docs/requiremnts/project-requirements.md')
const featuresPath = path.join(root, 'docs/requiremnts/features')
const executableRoots = [
  path.join(root, 'e2e'),
  path.join(root, 'server/src'),
  path.join(root, 'playwright.config.ts'),
]
const idPattern = /\b(?:AUTH|ORG|NOT|PLY|TRN|CMP|REQ|UX|DATA|NFR)-\d{3}\b/g
const annotationPattern = /@req-(covered|partial)\s+([^\n]+)/g
const minimumCovered = Number(process.argv.find(argument => argument.startsWith('--min-covered='))?.split('=')[1] ?? 0)
const minimumEvidence = Number(process.argv.find(argument => argument.startsWith('--min-evidence='))?.split('=')[1] ?? 0)

async function filesUnder(target) {
  const targetStat = await stat(target)
  if (targetStat.isFile()) return [target]
  const entries = await readdir(target, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const entryPath = path.join(target, entry.name)
    return entry.isDirectory() ? filesUnder(entryPath) : [entryPath]
  }))
  return nested.flat()
}

function idsIn(source) {
  return new Set(source.match(idPattern) ?? [])
}

const requirementSource = await readFile(requirementsPath, 'utf8')
const requirementIds = idsIn(requirementSource)
const featureFiles = (await filesUnder(featuresPath)).filter(file => file.endsWith('.feature'))
const featureIds = new Set()
for (const file of featureFiles) {
  const source = await readFile(file, 'utf8')
  for (const id of idsIn(source)) featureIds.add(id)
}

const evidence = new Map([...requirementIds].map(id => [id, { covered: [], partial: [] }]))
const executableFiles = (await Promise.all(executableRoots.map(filesUnder)))
  .flat()
  .filter(file => /\.(?:ts|tsx|js|mjs)$/.test(file))
const unknownIds = new Set()

for (const file of executableFiles) {
  const source = await readFile(file, 'utf8')
  for (const match of source.matchAll(annotationPattern)) {
    const level = match[1]
    for (const id of idsIn(match[2])) {
      if (!requirementIds.has(id)) {
        unknownIds.add(id)
        continue
      }
      evidence.get(id)[level].push(path.relative(root, file))
    }
  }
}

const missingGherkin = [...requirementIds].filter(id => !featureIds.has(id)).sort()
const covered = [...evidence]
  .filter(([, value]) => value.covered.length > 0)
  .map(([id]) => id)
  .sort()
const partial = [...evidence]
  .filter(([, value]) => value.covered.length === 0 && value.partial.length > 0)
  .map(([id]) => id)
  .sort()
const uncovered = [...evidence]
  .filter(([, value]) => value.covered.length === 0 && value.partial.length === 0)
  .map(([id]) => id)
  .sort()

console.log(`Requisiti: ${requirementIds.size}`)
console.log(`Gherkin: ${featureIds.size}/${requirementIds.size}`)
console.log(`Copertura completa dichiarata: ${covered.length}/${requirementIds.size}`)
console.log(`Copertura parziale dichiarata: ${partial.length}/${requirementIds.size}`)
console.log(`Senza test eseguibile: ${uncovered.length}/${requirementIds.size}`)
if (uncovered.length) console.log(`Non coperti: ${uncovered.join(', ')}`)

const belowCoveredBaseline = covered.length < minimumCovered
const belowEvidenceBaseline = covered.length + partial.length < minimumEvidence

if (missingGherkin.length || unknownIds.size || belowCoveredBaseline || belowEvidenceBaseline) {
  if (missingGherkin.length) console.error(`ID senza scenario Gherkin: ${missingGherkin.join(', ')}`)
  if (unknownIds.size) console.error(`ID sconosciuti nelle annotazioni: ${[...unknownIds].sort().join(', ')}`)
  if (belowCoveredBaseline) {
    console.error(`Copertura completa sotto la baseline: ${covered.length} < ${minimumCovered}`)
  }
  if (belowEvidenceBaseline) {
    console.error(`Requisiti con evidenza sotto la baseline: ${covered.length + partial.length} < ${minimumEvidence}`)
  }
  process.exitCode = 1
}
