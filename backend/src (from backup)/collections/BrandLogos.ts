import { CollectionConfig } from 'payload'

export const BrandLogos: CollectionConfig = {
  slug: 'brandLogos',
  labels: {
    singular: 'Client Logo',
    plural: 'Client Logos',
  },
  upload: {
    staticDir: 'brand-logos', // This will resolve to <projectRoot>/brand-logos
    mimeTypes: ['image/webp', 'image/svg+xml'],
  },
  admin: {
    useAsTitle: 'filename',
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: false,
      admin: {
        description: 'Accessible description of the logo (used for alt text).',
      },
    },
    {
      name: 'logoType',
      label: 'Logo Type',
      type: 'select',
      options: [
        { label: 'For Light Background', value: 'light-mode' },
        { label: 'For Dark Background', value: 'dark-mode' },
        { label: 'Works on Both', value: 'both-modes' },
      ],
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Choose the background type this logo is intended for.',
      },
    },
  ],
}

export default BrandLogos
