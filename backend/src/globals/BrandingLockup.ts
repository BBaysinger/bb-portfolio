import type { GlobalConfig } from 'payload'

import { triggerFrontendProjectRevalidate } from '../utils/triggerFrontendProjectRevalidate'

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

const greetingIntroHtmlDefault = `<p>Hi, I'm Bradley — a <strong>UI</strong> and <strong>front-end developer</strong> in Spokane, WA. I specialize in building polished, custom interfaces with a strong emphasis on interaction, behavior, and detail.</p>`

const greetingBodyHtmlDefault = `<p>I build <strong>front-end systems</strong> for <strong>reliable, polished product UI</strong> — with a focus on structure, styling, behavior, and interaction. This portfolio combines recent projects with selected earlier work to show range, continuity, and the <strong>creative/technical foundation</strong> behind my current direction.</p><p>I'm currently available for <strong>freelance, contract, and production support</strong> where polished front-end execution is needed.</p>`

export const BrandingLockup: GlobalConfig = {
  slug: 'heroBranding',
  label: 'Site Branding',
  hooks: {
    afterChange: [
      async () => {
        await triggerFrontendProjectRevalidate('brandingLockup.afterChange', {
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
      name: 'greetingIntroHtml',
      label: 'Greeting Intro HTML',
      type: 'textarea',
      required: true,
      defaultValue: greetingIntroHtmlDefault,
      admin: {
        rows: 6,
        description: 'Paste raw HTML like <p>...</p>. This field supports multiple paragraphs.',
      },
    },
    {
      name: 'greetingBodyHtml',
      label: 'Greeting Body HTML',
      type: 'textarea',
      required: true,
      defaultValue: greetingBodyHtmlDefault,
      admin: {
        rows: 10,
        description: 'Paste raw HTML like <p>...</p>. This field supports multiple paragraphs.',
      },
    },
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