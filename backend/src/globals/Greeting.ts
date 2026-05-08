import type { GlobalConfig } from 'payload'

import { triggerFrontendProjectRevalidate } from '../utils/triggerFrontendProjectRevalidate'

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
  "Hi, I'm Bradley — a **UI and front-end developer** in Spokane, WA. I build **expressive, reliable interfaces** with a strong emphasis on **JavaScript, interaction, behavior, and detail**.",
]

const bodyParagraphsDefault = [
  'My work combines **front-end development with design-informed implementation**: structure, styling, responsive layout, visual polish, and the careful execution needed to make digital experiences feel finished.',
  "This portfolio combines **recent projects with selected earlier work** to show range, continuity, and the **creative/technical foundation** behind my current direction. I'm currently available for **freelance, contract, and production support** where thoughtful front-end implementation is needed.",
]

const toParagraphRows = (paragraphs: string[]) => paragraphs.map((text) => ({ text }))

export const Greeting: GlobalConfig = {
  slug: 'greeting',
  label: 'Greeting',
  hooks: {
    afterChange: [
      async () => {
        await triggerFrontendProjectRevalidate('greeting.afterChange', {
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
  ],
}
