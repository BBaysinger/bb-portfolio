import { normalizeLegacyInlineHtmlToAuthorText } from '../../src/utils/authoredText'

const indentBlock = (value: string, spaces: number) => {
  const indent = ' '.repeat(spaces)
  return value
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n')
}

export const serializeParagraphArrayYaml = (fieldName: string, paragraphs: string[]) => {
  const normalized = paragraphs.map((paragraph) => normalizeLegacyInlineHtmlToAuthorText(paragraph))
  const body = normalized.map((paragraph) => `  - >-\n${indentBlock(paragraph, 4)}`).join('\n')

  return `${fieldName}:\n${body}\n`
}
