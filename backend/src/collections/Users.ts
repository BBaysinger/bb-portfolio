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
        const makePlaceholderEmail = (rawUsername: string) => {
          const normalized = rawUsername.trim().toLowerCase()
          const safeLocalPart = normalized
            .replace(/[^a-z0-9._-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
          if (!safeLocalPart) return undefined
          return `no-email+${safeLocalPart}@example.invalid`
        }

        if (typeof data?.username === 'string') {
          const trimmed = data.username.trim()
          data.username = trimmed.length > 0 ? trimmed : undefined
          const normalized = trimmed.toLowerCase()
          data.usernameNormalized = normalized.length > 0 ? normalized : undefined

          // Auto-populate placeholder email for auth if email is still blank.
          // This enables username-first user creation in the admin UI.
          const email = typeof data?.email === 'string' ? data.email.trim() : ''
          if (!email) {
            const placeholder = makePlaceholderEmail(trimmed)
            if (placeholder) data.email = placeholder
          }
        }

        const firstName = typeof data?.firstName === 'string' ? data.firstName.trim() : ''
        const lastName = typeof data?.lastName === 'string' ? data.lastName.trim() : ''
        const username = typeof data?.username === 'string' ? data.username.trim() : ''
        const email = typeof data?.email === 'string' ? data.email.trim() : ''

        const displayName = [firstName, lastName].filter(Boolean).join(' ').trim()
        const base = displayName || username || email

        if (base) {
          data.fullName = displayName && email ? `${displayName} <${email}>` : base
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      admin: {
        description: [
          'Admin UI: if Email is empty OR currently an @example.invalid placeholder, it will auto-populate from Username as no-email+<username>@example.invalid and keep updating as Username changes.',
          'If you enter a real email (not @example.invalid), it will not be overwritten.',
          'Backend: if Email is missing on save and Username is set, a placeholder email is generated as a safety net for API/seed flows.',
        ].join(' '),
        components: {
          Field: '/components/payload/AutoEmailFromUsername#AutoEmailFromUsername',
        },
      },
    },
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
        description: [
          'Login identifier (alternative to email). Should be unique.',
          'If Email is empty (or still an @example.invalid placeholder), the Admin UI will generate and keep Email synced as no-email+<username>@example.invalid.',
          'The backend also generates this placeholder on save if Email is missing and Username is provided.',
        ].join(' '),
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
      required: false,
      admin: {
        description: 'Optional.',
      },
    },
    {
      name: 'lastName',
      type: 'text',
      required: false,
      admin: {
        description: 'Optional.',
      },
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
