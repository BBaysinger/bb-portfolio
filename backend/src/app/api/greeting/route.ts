import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { renderAuthoredParagraphsAsHtml } from '../../../utils/authoredText'

const DEFAULT_INTRO_PARAGRAPHS = [
  "Hi, I'm Bradley — a **UI and front-end developer** in Spokane, WA. I build **expressive, reliable interfaces** with a strong emphasis on **JavaScript, interaction, behavior, and detail**.",
]
const DEFAULT_BODY_PARAGRAPHS = [
  'My work combines **front-end development with design-informed implementation**: structure, styling, responsive layout, visual polish, and the careful execution needed to make digital experiences feel finished.',
  "This portfolio combines **recent projects with selected earlier work** to show range, continuity, and the **creative/technical foundation** behind my current direction. I'm currently available for **freelance, contract, and production support** where thoughtful front-end implementation is needed.",
]
const GREETING_GLOBAL_SLUG = 'greeting'

type ParagraphRow = {
  text?: unknown
}

const normalizeParagraphs = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) return fallback

  const paragraphs = value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object' && typeof (item as ParagraphRow).text === 'string') {
        const text = (item as ParagraphRow).text
        return typeof text === 'string' ? text.trim() : ''
      }

      return ''
    })
    .filter((paragraph) => paragraph.length > 0)

  return paragraphs.length > 0 ? paragraphs : fallback
}

export async function GET() {
  try {
    const payload = await getPayload({ config: configPromise })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const greeting = await (payload as any).findGlobal({
      slug: GREETING_GLOBAL_SLUG,
      depth: 0,
      overrideAccess: true,
    })

    const introParagraphs = normalizeParagraphs(greeting?.introParagraphs, DEFAULT_INTRO_PARAGRAPHS)
    const bodyParagraphs = normalizeParagraphs(greeting?.bodyParagraphs, DEFAULT_BODY_PARAGRAPHS)

    return NextResponse.json({
      success: true,
      data: {
        introHtml: renderAuthoredParagraphsAsHtml(introParagraphs),
        bodyHtml: renderAuthoredParagraphsAsHtml(bodyParagraphs),
      },
    })
  } catch (error) {
    console.error('Greeting API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve greeting',
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
