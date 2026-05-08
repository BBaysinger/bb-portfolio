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
    const brandingLockup = await (payload as any).findGlobal({
      slug: BRANDING_LOCKUP_GLOBAL_SLUG,
      depth: 0,
      overrideAccess: true,
    })

    const variants = getRoleVariants(brandingLockup?.roleVariants)
    const active = getActiveVariant(variants)
    const activeTitle =
      typeof active?.title === 'string' && active.title.trim() ? active.title.trim() : DEFAULT_TITLE
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
