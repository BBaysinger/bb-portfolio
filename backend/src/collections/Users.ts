import { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'email', 'role'], // List view columns
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
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
      name: 'fullName',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar', // optional
      },
    },
  ],
}
