import type { CollectionConfig } from 'payload'

export const ProjectThumbnails: CollectionConfig = {
  slug: 'projectThumbnails',
  labels: {
    singular: 'Project Thumbnail',
    plural: 'Project Thumbnails',
  },
  upload: {
    staticDir: 'media/project-thumbnails', // saved to backend/media/project-thumbnails
    mimeTypes: ['image/webp'],
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
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
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        // Security: Validate file type on server side
        if (req.file && req.file.mimetype) {
          const allowedTypes = ['image/webp']
          if (!allowedTypes.includes(req.file.mimetype)) {
            throw new Error('Invalid file type. Only WebP files are allowed.')
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects',
      required: false,
    },
    {
      name: 'alt',
      type: 'text',
      required: false,
      admin: {
        description: 'Accessible text for screen readers and SEO.',
      },
    },
  ],
}
