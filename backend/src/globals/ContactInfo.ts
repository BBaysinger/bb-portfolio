import type { GlobalConfig } from 'payload'

// Site-wide contact info stored in CMS instead of secrets
// We only store public-safe values here (phone), not sensitive secrets.
export const ContactInfo: GlobalConfig = {
  slug: 'contactInfo',
  label: 'Contact Info',
  access: {
    // Do NOT expose raw values publicly; restrict admin API/UI access to admin role.
    // Public consumers must use the obfuscated API route instead.
    read: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'contactEmail',
          label: 'Contact Email',
          type: 'email',
          admin: {
            description:
              'Public contact email to display on site and use for security.txt. This should be safe to publish.',
            width: '50%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'phoneE164',
          label: 'Phone (E.164)',
          type: 'text',
          admin: {
            description: 'Canonical phone number in E.164 format, e.g., +12065551234',
            width: '50%',
          },
          validate: (val: unknown) => {
            if (!val) return true
            const s = String(val)
            return /^\+\d{7,15}$/.test(s) || 'Must be in E.164 format (e.g., +12065551234)'
          },
        },
        {
          name: 'phoneDisplay',
          label: 'Phone (Display)',
          type: 'text',
          admin: {
            description: 'Optional formatted display version, e.g., (206) 555-1234',
            width: '50%',
          },
        },
      ],
    },
  ],
}
