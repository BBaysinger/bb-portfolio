import type { CollectionConfig, Where } from 'payload'

import { canReadNdaBrandAsset } from '../access/nda'

export const Clients: CollectionConfig = {
  slug: 'brands',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'nda'],
  },
  access: {
    read: ({ req }) => {
      if (req.user?.role === 'admin') return true
      if (req.user) return true
      return {
        nda: {
          equals: false,
        },
      } as Where
    },
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
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
      access: {
        read: canReadNdaBrandAsset,
      },
    },
    {
      name: 'logoDark',
      label: 'Logo for Dark Background',
      type: 'upload',
      relationTo: 'brandLogos',
      required: false,
      access: {
        read: canReadNdaBrandAsset,
      },
    },
    {
      name: 'website',
      type: 'text',
    },
  ],
}
