import { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    depth: 0,
    verify: false,
    maxLoginAttempts: 5,
    lockTime: 600 * 1000, // 10 minutes
  },
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'username', 'email', 'organization', 'role'], // List view columns
  },
  access: {
    create: ({ req }) => req.user?.role === 'admin',
    read: ({ req }) => {
      // Block unauthenticated reads to avoid building a query with an undefined ID
      if (!req.user) return false
      // Users can read their own data, admins can read all
      if (req.user.role === 'admin') return true
      return {
        id: {
          equals: req.user.id,
        },
      }
    },
    update: ({ req }) => {
      // Block unauthenticated updates to avoid building a query with an undefined ID
      if (!req.user) return false
      // Users can update their own data, admins can update all
      if (req.user.role === 'admin') return true
      return {
        id: {
          equals: req.user.id,
        },
      }
    },
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (typeof data?.username === 'string') {
          const trimmed = data.username.trim()
          data.username = trimmed.length > 0 ? trimmed : undefined
          const normalized = trimmed.toLowerCase()
          data.usernameNormalized = normalized.length > 0 ? normalized : undefined
        }
        if (data?.firstName && data?.lastName && data?.email) {
          data.fullName = `${data.firstName} ${data.lastName} <${data.email}>`
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      options: ['admin', 'user'],
      defaultValue: 'user',
      required: true,
    },
    {
      name: 'username',
      type: 'text',
      required: false,
      admin: {
        description: 'Login identifier (alternative to email). Should be unique.',
      },
    },
    {
      name: 'usernameNormalized',
      type: 'text',
      unique: true,
      index: true,
      required: false,
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'organization',
      label: 'Organization / Company',
      type: 'text',
      required: false,
    },
    {
      name: 'fullName',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar', // optional
      },
    },
  ],
}
