import type { CollectionConfig } from 'payload'

const ProfilePictures: CollectionConfig = {
  slug: 'profilePictures',
  labels: {
    singular: 'Profile Picture',
    plural: 'Profile Pictures',
  },
  upload: {
    staticDir: 'media/profile-pictures',
    mimeTypes: ['image/webp', 'image/png', 'image/jpeg'],
  },
  admin: {
    useAsTitle: 'filename',
  },
  access: {
    read: ({ req }) => {
      // Users can read their own profile pictures
      if (!req.user) return false
      return {
        user: {
          equals: req.user.id,
        },
      }
    },
    create: ({ req }) => !!req.user,
    update: ({ req }) => {
      // Assume users can only update their own picture by ID
      if (!req.user) return false
      return {
        user: {
          equals: req.user.id,
        },
      }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return {
        user: {
          equals: req.user.id,
        },
      }
    },
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      access: {
        // Prevent users from setting this manually
        create: () => false,
        update: () => false,
      },
      admin: {
        condition: () => false,
      },
    },
    {
      name: 'alt',
      type: 'text',
      required: false,
      admin: {
        description: 'Optional alt text for accessibility.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        if (operation === 'create' && req.user) {
          return {
            ...data,
            user: req.user.id,
          }
        }
        return data
      },
    ],
  },
}

export default ProfilePictures
