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
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        try {
          type RelRecord = Record<string, unknown>
          type BrandDoc = { nda?: unknown; logoLight?: unknown; logoDark?: unknown }
          const brand = doc as unknown as BrandDoc

          const toId = (rel: unknown): string | undefined => {
            if (typeof rel === 'string') return rel
            if (!rel || typeof rel !== 'object') return undefined
            const rec = rel as RelRecord
            const id = rec.id
            if (typeof id === 'string') return id
            const value = rec.value
            if (typeof value === 'string') return value
            return undefined
          }

          const ids = [toId(brand.logoLight), toId(brand.logoDark)].filter((x): x is string => !!x)
          if (!ids.length) return

          const nda = Boolean(brand.nda)
          const updateUnsafe = req.payload.update as unknown as (args: {
            collection: string
            id: string
            data: Record<string, unknown>
            depth?: number
          }) => Promise<unknown>
          for (const id of ids) {
            await updateUnsafe({ collection: 'brandLogos', id, data: { nda }, depth: 0 })
          }
        } catch (e) {
          console.warn('[brands] failed to propagate NDA flag to brandLogos:', e)
        }
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
