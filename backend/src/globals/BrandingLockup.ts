import type { GlobalConfig } from 'payload'

import { scheduleFrontendProjectRevalidate } from '../utils/triggerFrontendProjectRevalidate'

const roleTitleClassNameField = (defaultValue: string) => ({
  name: 'roleTitleClassName',
  label: 'Lockup Style',
  type: 'select' as const,
  required: true,
  ...(defaultValue ? { defaultValue } : {}),
  options: [
    {
      label: 'FEDev',
      value: 'FEDev',
    },
    {
      label: 'UIDev',
      value: 'UIDev',
    },
    {
      label: 'FEUIDev',
      value: 'FEUIDev',
    },
  ],
  admin: {
    width: '30%',
    description: 'Select the semantic lockup style to apply. Spacing rules live in code.',
  },
})

export const BrandingLockup: GlobalConfig = {
  slug: 'heroBranding',
  label: 'Site Branding',
  hooks: {
    afterChange: [
      async () => {
        await scheduleFrontendProjectRevalidate('brandingLockup.afterChange', {
          warmPaths: ['/'],
        })
      },
    ],
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'roleVariants',
      label: 'Role Variants',
      type: 'array',
      required: true,
      minRows: 1,
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
            description: 'Displayed in site title areas (hero and nav).',
          },
        },
        {
          name: 'isActive',
          label: 'Active',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            width: '20%',
            description: 'Use this role on the live site.',
          },
        },
        roleTitleClassNameField(''),
      ],
    },
  ],
}
