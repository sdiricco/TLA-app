import sanitizeHtml from 'sanitize-html'

const MAX_DESCRIPTION_LENGTH = 50_000

export function sanitizeRequestDescription(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const source = value.trim()
  if (!source) return null
  if (source.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error('La descrizione è troppo lunga')
  }

  const isPlainText = !/<\/?[a-z][\s\S]*>/i.test(source)
  if (isPlainText) {
    const escaped = sanitizeHtml(source, { allowedTags: [], allowedAttributes: {} })
    return escaped.replace(/\r?\n/g, '<br>')
  }

  const sanitized = sanitizeHtml(source, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 's', 'blockquote', 'pre', 'code',
      'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'a', 'img', 'span',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt'],
      li: ['data-list'],
      p: ['class'],
      span: ['class'],
    },
    allowedClasses: {
      p: ['ql-align-center', 'ql-align-right', 'ql-align-justify'],
      span: ['ql-ui'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
      }),
    },
  }).trim()

  return sanitized === '<p><br /></p>' || sanitized === '<p></p>' ? null : sanitized || null
}
