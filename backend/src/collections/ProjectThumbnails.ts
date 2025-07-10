import type { CollectionConfig } from 'payload'

export const ProjectThumbnails: CollectionConfig = {
  slug: 'projectThumbnails',
  labels: {
    singular: 'Project Thumbnail',
    plural: 'Project Thumbnails',
  },
  upload: {
    staticDir: 'project-thumbnails', // saved to backend/project-thumbnails
    mimeTypes: ['image/webp'],
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
  fields: [
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects',
      required: true,
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
