import { CollectionConfig } from 'payload'

export const ClientLogos: CollectionConfig = {
  slug: 'clientLogos',
  labels: {
    singular: 'Client Logo',
    plural: 'Client Logos',
  },
  upload: {
    staticDir: 'client-logos', // This will resolve to <projectRoot>/client-logos
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
      name: 'usageNote',
      type: 'text',
      required: false,
      admin: {
        position: 'sidebar',
        description: 'Optional: Describe usage (e.g., “for light backgrounds”, “used for both”).',
      },
    },
    {
      name: 'logoType',
      label: 'Logo Type',
      type: 'select',
      options: [
        { label: 'For Light Background', value: 'light' },
        { label: 'For Dark Background', value: 'dark' },
        { label: 'Works on Both', value: 'both' },
      ],
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Choose the background type this logo is intended for.',
      },
    },
  ],
}

export default ClientLogos
