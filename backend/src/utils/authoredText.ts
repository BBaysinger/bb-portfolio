const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const escapeHtmlAttribute = (value: string) => escapeHtml(value)

const decodeHtmlEntities = (value: string) =>
  value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")

const sanitizeHref = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
    return trimmed
  }

  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed
  }

  return null
}

const ALLOWED_LINK_TARGETS = new Set(['_blank', '_self', '_parent', '_top'])

const sanitizeLinkTarget = (value: string | undefined) => {
  if (!value) return null

  const trimmed = value.trim()
  return ALLOWED_LINK_TARGETS.has(trimmed) ? trimmed : null
}

const renderStyledText = (value: string): string => {
  const escaped = escapeHtml(value)

  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

export const renderAuthoredInlineTextToHtml = (value: string) => {
  let html = ''
  let lastIndex = 0
  const linkPattern = /\[([^\]]+)\]\(([^)\s]+)\)(?:\{target=([^}]+)\})?/g

  for (const match of value.matchAll(linkPattern)) {
    const [fullMatch, label, href, targetValue] = match
    const matchIndex = match.index ?? 0

    html += renderStyledText(value.slice(lastIndex, matchIndex))

    const sanitizedHref = sanitizeHref(href)
    if (!sanitizedHref) {
      html += renderStyledText(fullMatch)
    } else {
      const externalLink = /^(https?:|mailto:|tel:)/i.test(sanitizedHref)
      const explicitTarget = sanitizeLinkTarget(targetValue)
      const linkTarget = explicitTarget ?? (externalLink ? '_blank' : null)
      const targetAttribute = linkTarget ? ` target="${escapeHtmlAttribute(linkTarget)}"` : ''
      const relAttribute = linkTarget === '_blank' ? ' rel="noopener noreferrer"' : ''
      html += `<a href="${escapeHtmlAttribute(sanitizedHref)}"${targetAttribute}${relAttribute}>${renderStyledText(label)}</a>`
    }

    lastIndex = matchIndex + fullMatch.length
  }

  html += renderStyledText(value.slice(lastIndex))
  return html
}

export const renderAuthoredParagraphsAsHtml = (paragraphs: string[]) =>
  paragraphs.map((paragraph) => `<p>${renderAuthoredInlineTextToHtml(paragraph)}</p>`).join('')

export const normalizeLegacyInlineHtmlToAuthorText = (value: string) => {
  const normalized = value
    .trim()
    .replace(/<\/?p[^>]*>/gi, '')
    .replace(
      /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*)>(.*?)<\/a>/gis,
      (_match, preAttrs, href, postAttrs, label) => {
        const attrs = `${String(preAttrs)} ${String(postAttrs)}`
        const targetMatch = attrs.match(/target=["']([^"']+)["']/i)
        const target = sanitizeLinkTarget(targetMatch?.[1])
        const text = decodeHtmlEntities(
          String(label)
            .replace(/<[^>]+>/g, '')
            .trim(),
        )
        const targetSuffix = target ? `{target=${target}}` : ''
        return `[${text}](${String(href).trim()})${targetSuffix}`
      },
    )
    .replace(/<(strong|b)>(.*?)<\/(strong|b)>/gis, (_match, _open, text) => {
      return `**${decodeHtmlEntities(
        String(text)
          .replace(/<[^>]+>/g, '')
          .trim(),
      )}**`
    })
    .replace(/<(em|i)>(.*?)<\/(em|i)>/gis, (_match, _open, text) => {
      return `*${decodeHtmlEntities(
        String(text)
          .replace(/<[^>]+>/g, '')
          .trim(),
      )}*`
    })
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')

  return decodeHtmlEntities(normalized).replace(/\s+/g, ' ').trim()
}
