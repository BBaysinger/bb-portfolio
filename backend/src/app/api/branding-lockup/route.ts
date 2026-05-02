/**
 * Branding lockup API route.
 *
 * Exposes public-safe shared branding data used by both the nav/social lockup and the hero.
 */
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { renderAuthoredParagraphsAsHtml } from '../../../utils/authoredText'

const DEFAULT_TITLE = 'Front-End / UI Developer'
const DEFAULT_INTRO_PARAGRAPHS = [
  "Hi, I'm Bradley — a **UI** and **front-end developer** in Spokane, WA. I specialize in building polished, custom interfaces with a strong emphasis on interaction, behavior, and detail.",
]
const DEFAULT_BODY_PARAGRAPHS = [
  'I build **front-end systems** for **reliable, polished product UI** — with a focus on structure, styling, behavior, and interaction. This portfolio combines recent projects with selected earlier work to show range, continuity, and the **creative/technical foundation** behind my current direction.',
  "I'm currently available for **freelance, contract, and production support** where polished front-end execution is needed.",
]
const LOCKUP_ROLE_TITLE_CLASS_NAMES = new Set(['FEDev', 'UIDev', 'FEUIDev'])
const DEFAULT_ROLE_TITLE_CLASS_NAME = 'FEUIDev'
const BRANDING_LOCKUP_GLOBAL_SLUG = 'heroBranding'

const toRoleTitleClassName = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null
  return LOCKUP_ROLE_TITLE_CLASS_NAMES.has(value) ? value : null
}

type RoleVariant = {
  presetLabel?: unknown
  title?: unknown
  roleTitleClassName?: unknown
  isActive?: unknown
}

type ParagraphRow = {
  text?: unknown
}

const getRoleVariants = (value: unknown): RoleVariant[] => {
  if (!Array.isArray(value)) return []
  return value as RoleVariant[]
}

const getActiveVariant = (variants: RoleVariant[]): RoleVariant | null => {
  if (!variants.length) return null
  const active = variants.find((item) => item?.isActive === true)
  return active || variants[0] || null
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
    const brandingLockup = await (payload as any).findGlobal({
      slug: BRANDING_LOCKUP_GLOBAL_SLUG,
      depth: 0,
      overrideAccess: true,
    })

    const variants = getRoleVariants(brandingLockup?.roleVariants)
    const active = getActiveVariant(variants)
    const activeTitle =
      typeof active?.title === 'string' && active.title.trim() ? active.title.trim() : DEFAULT_TITLE
    const introParagraphs = normalizeParagraphs(
      brandingLockup?.introParagraphs,
      DEFAULT_INTRO_PARAGRAPHS,
    )
    const bodyParagraphs = normalizeParagraphs(
      brandingLockup?.bodyParagraphs,
      DEFAULT_BODY_PARAGRAPHS,
    )
    const greetingIntroHtml = renderAuthoredParagraphsAsHtml(introParagraphs)
    const greetingBodyHtml = renderAuthoredParagraphsAsHtml(bodyParagraphs)
    const activeRoleTitleClassName =
      toRoleTitleClassName(active?.roleTitleClassName) || DEFAULT_ROLE_TITLE_CLASS_NAME
    const activePresetLabel =
      typeof active?.presetLabel === 'string' && active.presetLabel.trim()
        ? active.presetLabel.trim()
        : 'Default'

    return NextResponse.json({
      success: true,
      data: {
        activeRoleTitle: activeTitle,
        activeRoleTitleClassName,
        activeRolePresetLabel: activePresetLabel,
        greetingIntroHtml,
        greetingBodyHtml,
        roleVariants: variants
          .map((item) => {
            const title = typeof item?.title === 'string' ? item.title.trim() : ''
            if (!title) return null

            return {
              presetLabel:
                typeof item?.presetLabel === 'string' && item.presetLabel.trim()
                  ? item.presetLabel.trim()
                  : 'Role',
              title,
              roleTitleClassName:
                toRoleTitleClassName(item?.roleTitleClassName) || DEFAULT_ROLE_TITLE_CLASS_NAME,
              isActive: item?.isActive === true,
            }
          })
          .filter(Boolean),
      },
    })
  } catch (error) {
    console.error('Branding lockup API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve branding lockup',
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
