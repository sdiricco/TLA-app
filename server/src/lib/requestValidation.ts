import { sanitizeRequestDescription } from './requestDescription'

export const requestTypes = new Set(['feature', 'improvement', 'bug'])
export const requestPriorities = new Set(['low', 'medium', 'high'])
export const requestStatuses = new Set(['open', 'planned', 'in_progress', 'done', 'rejected'])

export function parseRequestTitle(value: unknown): string {
  const title = typeof value === 'string' ? value.trim() : ''
  if (title.length < 3) throw new Error('Inserisci un titolo di almeno 3 caratteri')
  return title
}

export function parseRequestType(value: unknown): string {
  return requestTypes.has(value as string) ? value as string : 'improvement'
}

export function parseRequestPriority(value: unknown): string {
  return requestPriorities.has(value as string) ? value as string : 'medium'
}

export function parseRequestComment(value: unknown): string {
  const body = typeof value === 'string' ? value.trim() : ''
  if (!body || body.length > 2000) {
    throw new Error('Il commento deve contenere da 1 a 2000 caratteri')
  }
  return body
}

export function parseRequestCreateInput(body: Record<string, unknown> | undefined) {
  return {
    title: parseRequestTitle(body?.title),
    description: sanitizeRequestDescription(body?.description),
    type: parseRequestType(body?.type),
    priority: parseRequestPriority(body?.priority),
  }
}

export function decodeRequestImage(value: unknown): {
  contentType: string
  extension: string
  buffer: Buffer
} | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') throw new Error('Immagine non valida')
  const match = value.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/)
  if (!match) throw new Error('Usa un’immagine JPG, PNG, WEBP o GIF')
  const contentType = match[1]!
  const buffer = Buffer.from(match[2]!, 'base64')
  if (buffer.length > 5 * 1024 * 1024) throw new Error('L’immagine deve essere più piccola di 5 MB')
  return {
    contentType,
    extension: contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1]!,
    buffer,
  }
}
