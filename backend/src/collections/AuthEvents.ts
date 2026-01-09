import type { CollectionConfig } from 'payload'

export const AuthEvents: CollectionConfig = {
  slug: 'authEvents',
  labels: {
    singular: 'Auth Event',
    plural: 'Auth Events',
  },
  admin: {
    defaultColumns: ['createdAt', 'eventType', 'user', 'method', 'ip'],
  },
  access: {
    // These are written server-side (overrideAccess) from API routes.
    // Keep them admin-readable only.
    read: ({ req }) => req.user?.role === 'admin',
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'eventType',
      type: 'select',
      required: true,
      options: ['login', 'logout'],
      defaultValue: 'login',
    },
    {
      name: 'method',
      type: 'select',
      required: false,
      options: ['password', 'google'],
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'ip',
      type: 'text',
      required: false,
    },
    {
      name: 'userAgent',
      type: 'text',
      required: false,
    },
  ],
}
