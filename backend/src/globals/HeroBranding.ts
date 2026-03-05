import type { GlobalConfig } from 'payload'

const LETTER_SPACING_TOKEN_REGEX = /^\s*(-?(?:\d+|\d*\.\d+))\s*(em|rem|px)\s*$/i

const letterSpacingField = (defaultValue: string) => ({
  name: 'letterSpacing',
  label: 'Letter Spacing',
  type: 'text' as const,
  required: true,
  defaultValue,
  admin: {
    width: '30%',
    description: 'Use a CSS length token, e.g. 0.12em, 1px, or 0.08rem.',
  },
  validate: (val: unknown) => {
    if (typeof val !== 'string' || !val.trim()) {
      return 'Must be a string like 0.12em, 1px, or 0.08rem.'
    }

    const match = val.match(LETTER_SPACING_TOKEN_REGEX)
    if (!match) {
      return 'Use format: <number><unit>, where unit is em, rem, or px.'
    }

    const numeric = Number.parseFloat(match[1])
    const unit = match[2].toLowerCase()

    if (unit === 'px') {
      if (numeric < -4 || numeric > 8) {
        return 'Use a value between -4 and 8 for px.'
      }
      return true
    }

    if (numeric < -0.2 || numeric > 0.4) {
      return 'Use a value between -0.2 and 0.4 for em/rem.'
    }

    return true
  },
})

export const HeroBranding: GlobalConfig = {
  slug: 'heroBranding',
  label: 'Hero Branding',
  access: {
    read: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
  },
  fields: [
    {
      name: 'roleVariants',
      label: 'Role Variants',
      type: 'array',
      required: true,
      minRows: 1,
      defaultValue: [
        {
          presetLabel: 'Agency / Interactive roles',
          title: 'Interactive UI Developer',
          letterSpacing: '0.12em',
          isActive: false,
        },
        {
          presetLabel: 'Standard frontend roles',
          title: 'Front-End Developer',
          letterSpacing: '0.12em',
          isActive: false,
        },
        {
          presetLabel: 'Hybrid product roles',
          title: 'Front-End / UI Developer',
          letterSpacing: '0.12em',
          isActive: true,
        },
      ],
      admin: {
        description: 'Add as many roles as you want. Mark one row active to use it on the site.',
      },
      fields: [
        {
          name: 'presetLabel',
          label: 'Preset Label',
          type: 'text',
          required: true,
          admin: {
            width: '40%',
            description: 'Internal/admin label to identify this role variation.',
          },
        },
        {
          name: 'title',
          label: 'Role Title',
          type: 'text',
          required: true,
          admin: {
            width: '40%',
            description: 'Displayed in the hero title area.',
          },
        },
        {
          name: 'isActive',
          label: 'Active',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            width: '20%',
            description: 'Use this role on the live hero.',
          },
        },
        letterSpacingField('0.12em'),
      ],
    },
  ],
}
