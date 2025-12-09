import type { CollectionConfig } from 'payload'
import type { PayloadRequest } from 'payload'

type AccessArgs = {
  req: PayloadRequest
  doc?: { nda?: boolean | null }
}

const canReadBrandAsset = ({ req, doc }: AccessArgs) => {
  if (!doc?.nda) return true
  return !!req.user
}

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
        read: canReadBrandAsset,
      },
    },
    {
      name: 'logoDark',
      label: 'Logo for Dark Background',
      type: 'upload',
      relationTo: 'brandLogos',
      required: false,
      access: {
        read: canReadBrandAsset,
      },
    },
    {
      name: 'website',
      type: 'text',
    },
  ],
}
