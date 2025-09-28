import { CollectionConfig } from 'payload'

export const BrandLogos: CollectionConfig = {
  slug: 'brandLogos',
  labels: {
    singular: 'Client Logo',
    plural: 'Client Logos',
  },
  upload: {
    staticDir: 'images/brand-logos', // This will resolve to <projectRoot>/images/brand-logos
    mimeTypes: ['image/webp', 'image/svg+xml'],
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
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
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        // Security: Validate file type on server side
        if (req.file && req.file.mimetype) {
          const allowedTypes = ['image/webp', 'image/svg+xml']
          if (!allowedTypes.includes(req.file.mimetype)) {
            throw new Error('Invalid file type. Only WebP and SVG files are allowed.')
          }
        }
        return data
      },
    ],
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
