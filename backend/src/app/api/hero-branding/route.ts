/**
 * Hero branding API route.
 *
 * Exposes public-safe active role title + spacing settings for the homepage title.
 */
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

const DEFAULT_TITLE = 'Front-End / UI Developer'
const LETTER_SPACING_TOKEN_REGEX = /^\s*(-?(?:\d+|\d*\.\d+))\s*(em|rem|px)?\s*$/i

const clampSpacingByUnit = (value: number, unit: string): number => {
  if (unit === 'px') {
    return Math.max(-4, Math.min(8, value))
  }

  return Math.max(-0.2, Math.min(0.4, value))
}

const toSpacingToken = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null

  const match = value.match(LETTER_SPACING_TOKEN_REGEX)
  if (!match) return null

  const numeric = Number.parseFloat(match[1])
  const unit = (match[2] || 'em').toLowerCase()
  const clamped = clampSpacingByUnit(numeric, unit)

  return `${clamped}${unit}`
}

const spacingTokenFromLegacyFields = (
  spacingValue: unknown,
  spacingUnit: unknown,
  spacingEm: unknown,
): string | null => {
  if (typeof spacingValue === 'number' && !Number.isNaN(spacingValue)) {
    const unit =
      spacingUnit === 'em' || spacingUnit === 'rem' || spacingUnit === 'px' ? spacingUnit : 'em'
    const clamped = clampSpacingByUnit(spacingValue, unit)
    return `${clamped}${unit}`
  }

  if (typeof spacingEm === 'number' && !Number.isNaN(spacingEm)) {
    const clamped = clampSpacingByUnit(spacingEm, 'em')
    return `${clamped}em`
  }

  return null
}

type RoleVariant = {
  presetLabel?: unknown
  title?: unknown
  letterSpacing?: unknown
  letterSpacingValue?: unknown
  letterSpacingEm?: unknown
  letterSpacingUnit?: unknown
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
    const activeSpacingToken =
      toSpacingToken(active?.letterSpacing) ||
      spacingTokenFromLegacyFields(
        active?.letterSpacingValue,
        active?.letterSpacingUnit,
        active?.letterSpacingEm,
      )
    const activePresetLabel =
      typeof active?.presetLabel === 'string' && active.presetLabel.trim()
        ? active.presetLabel.trim()
        : 'Default'

    return NextResponse.json({
      success: true,
      data: {
        activeRoleTitle: activeTitle,
        activeRoleLetterSpacing: activeSpacingToken || null,
        // Keep split values only as compatibility output.
        activeRoleLetterSpacingValue: activeSpacingToken
          ? Number.parseFloat(activeSpacingToken)
          : null,
        activeRoleLetterSpacingUnit: activeSpacingToken
          ? activeSpacingToken.replace(/^-?(?:\d*\.\d+|\d+)/, '')
          : null,
        // Backward compatibility for existing frontend consumers.
        activeRoleLetterSpacingEm: activeSpacingToken
          ? Number.parseFloat(activeSpacingToken)
          : null,
        activeRolePresetLabel: activePresetLabel,
        roleVariants: variants
          .map((item) => {
            const title = typeof item?.title === 'string' ? item.title.trim() : ''
            if (!title) return null

            const spacingToken =
              toSpacingToken(item?.letterSpacing) ||
              spacingTokenFromLegacyFields(
                item?.letterSpacingValue,
                item?.letterSpacingUnit,
                item?.letterSpacingEm,
              )

            return {
              presetLabel:
                typeof item?.presetLabel === 'string' && item.presetLabel.trim()
                  ? item.presetLabel.trim()
                  : 'Role',
              title,
              letterSpacing: spacingToken || null,
              letterSpacingValue: spacingToken ? Number.parseFloat(spacingToken) : null,
              letterSpacingUnit: spacingToken
                ? spacingToken.replace(/^-?(?:\d*\.\d+|\d+)/, '')
                : null,
              // Backward compatibility for existing frontend consumers.
              letterSpacingEm: spacingToken ? Number.parseFloat(spacingToken) : null,
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
