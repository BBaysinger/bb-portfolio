import type { GlobalConfig } from 'payload'

const letterSpacingField = (
  name: string,
  label: string,
  description: string,
  defaultValue: number,
) => ({
  name,
  label,
  type: 'number' as const,
  required: true,
  defaultValue,
  admin: {
    width: '33%',
    step: 0.005,
    description,
  },
  validate: (val: unknown) => {
    if (typeof val !== 'number' || Number.isNaN(val)) {
      return 'Must be a number.'
    }

    if (val < -0.2 || val > 0.4) {
      return 'Use a value between -0.2 and 0.4 em.'
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
          letterSpacingEm: 0.12,
          isActive: false,
        },
        {
          presetLabel: 'Standard frontend roles',
          title: 'Front-End Developer',
          letterSpacingEm: 0.12,
          isActive: false,
        },
        {
          presetLabel: 'Hybrid product roles',
          title: 'Front-End / UI Developer',
          letterSpacingEm: 0.12,
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
        letterSpacingField(
          'letterSpacingEm',
          'Letter Spacing (em)',
          'Letter spacing for this specific role title.',
          0.12,
        ),
      ],
    },
  ],
}
