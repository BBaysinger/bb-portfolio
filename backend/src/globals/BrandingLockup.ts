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

const paragraphField = (label: string, rows: number) => ({
  name: 'text',
  label,
  type: 'textarea' as const,
  required: true,
  admin: {
    rows,
    description:
      'One paragraph per row. Use **bold**, *emphasis*, and [links](https://example.com); the app controls paragraph wrappers.',
  },
})

const introParagraphsDefault = [
  "Hi, I'm Bradley — a **UI** and **front-end developer** in Spokane, WA. I specialize in building polished, custom interfaces with a strong emphasis on interaction, behavior, and detail.",
]

const bodyParagraphsDefault = [
  'I build **front-end systems** for **reliable, polished product UI** — with a focus on structure, styling, behavior, and interaction. This portfolio combines recent projects with selected earlier work to show range, continuity, and the **creative/technical foundation** behind my current direction.',
  "I'm currently available for **freelance, contract, and production support** where polished front-end execution is needed.",
]

const toParagraphRows = (paragraphs: string[]) => paragraphs.map((text) => ({ text }))

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
      name: 'introParagraphs',
      label: 'Intro Paragraphs',
      type: 'array',
      required: true,
      minRows: 1,
      defaultValue: toParagraphRows(introParagraphsDefault),
      admin: {
        description:
          'List of intro paragraphs. The app wraps each row in its own paragraph element.',
      },
      fields: [paragraphField('Intro Paragraph', 4)],
    },
    {
      name: 'bodyParagraphs',
      label: 'Body Paragraphs',
      type: 'array',
      required: true,
      minRows: 1,
      defaultValue: toParagraphRows(bodyParagraphsDefault),
      admin: {
        description:
          'List of body paragraphs. The app wraps each row in its own paragraph element.',
      },
      fields: [paragraphField('Body Paragraph', 5)],
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
