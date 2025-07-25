import type { CollectionConfig } from 'payload'

export const ProjectScreenshots: CollectionConfig = {
  slug: 'projectScreenshots',
  labels: {
    singular: 'Project Screenshot',
    plural: 'Project Screenshots',
  },
  upload: {
    staticDir: 'project-screenshots',
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
      name: 'screenType',
      type: 'select',
      required: true,
      options: [
        { label: 'Laptop', value: 'laptop' },
        { label: 'Phone', value: 'phone' },
      ],
      admin: {
        description: 'Indicates whether the screenshot is for desktop or mobile view.',
      },
    },
    {
      name: 'orientation',
      type: 'select',
      required: true,
      options: [
        { label: 'Portrait', value: 'portrait' },
        { label: 'Landscape', value: 'landscape' },
      ],
    },
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects',
      required: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'alt',
      type: 'text',
      required: false,
      admin: {
        description: 'Optional alt text for accessibility or SEO.',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data) {
          if (!data.orientation && data.screenType) {
            data.orientation = data.screenType === 'phone' ? 'portrait' : 'landscape'
          }
        }
        return data
      },
    ],
  },
}

export default ProjectScreenshots
