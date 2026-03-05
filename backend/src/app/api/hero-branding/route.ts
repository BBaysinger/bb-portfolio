/**
 * Hero branding API route.
 *
 * Exposes public-safe active role title + spacing settings for the homepage title.
 */
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

const DEFAULT_TITLE = 'Front-End / UI Developer'
const DEFAULT_SPACING = 0.12

const coerceSpacing = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(-0.2, Math.min(0.4, value))
}

type RoleVariant = {
  presetLabel?: unknown
  title?: unknown
  letterSpacingEm?: unknown
  isActive?: unknown
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

export async function GET() {
  try {
    const payload = await getPayload({ config: configPromise })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const branding = await (payload as any).findGlobal({
      slug: 'heroBranding',
      depth: 0,
      overrideAccess: true,
    })

    const variants = getRoleVariants(branding?.roleVariants)
    const active = getActiveVariant(variants)
    const activeTitle =
      typeof active?.title === 'string' && active.title.trim() ? active.title.trim() : DEFAULT_TITLE
    const activePresetLabel =
      typeof active?.presetLabel === 'string' && active.presetLabel.trim()
        ? active.presetLabel.trim()
        : 'Default'

    return NextResponse.json({
      success: true,
      data: {
        activeRoleTitle: activeTitle,
        activeRoleLetterSpacingEm: coerceSpacing(active?.letterSpacingEm, DEFAULT_SPACING),
        activeRolePresetLabel: activePresetLabel,
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
              letterSpacingEm: coerceSpacing(item?.letterSpacingEm, DEFAULT_SPACING),
              isActive: item?.isActive === true,
            }
          })
          .filter(Boolean),
      },
    })
  } catch (error) {
    console.error('Hero branding API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve hero branding',
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
