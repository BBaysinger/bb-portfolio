import type { CollectionConfig } from 'payload'

export const Clients: CollectionConfig = {
  slug: 'clients',
  admin: {
    useAsTitle: 'name',
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
      name: 'logoLight',
      label: 'Logo for Light Background',
      type: 'upload',
      relationTo: 'clientLogos', // Ensure this collection exists for client logos
      required: false,
    },
    {
      name: 'logoDark',
      label: 'Logo for Dark Background',
      type: 'upload',
      relationTo: 'clientLogos',
      required: false,
    },
    {
      name: 'website',
      type: 'text',
    },
  ],
}
