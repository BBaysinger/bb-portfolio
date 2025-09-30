import type { CollectionConfig } from 'payload'

export const Clients: CollectionConfig = {
  slug: 'brands',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'nda'],
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    afterRead: [
      ({ doc, req }) => {
        // Hide logo relations from unauthenticated viewers for NDA brands
        const isAuthenticated = !!req.user
        if (doc?.nda && !isAuthenticated) {
          return {
            ...doc,
            logoLight: null,
            logoDark: null,
          }
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'nda',
      label: 'NDA (Hide public logo exposure)',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'logoLight',
      label: 'Logo for Light Background',
      type: 'upload',
      relationTo: 'brandLogos', // Ensure this collection exists for brand logos
      required: false,
    },
    {
      name: 'logoDark',
      label: 'Logo for Dark Background',
      type: 'upload',
      relationTo: 'brandLogos',
      required: false,
    },
    {
      name: 'website',
      type: 'text',
    },
  ],
}
