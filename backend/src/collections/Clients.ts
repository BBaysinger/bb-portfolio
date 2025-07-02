import type { CollectionConfig } from "payload";

export const Clients: CollectionConfig = {
  slug: "clients",
  admin: {
    useAsTitle: "name",
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
    },
    {
      name: "logo",
      type: "upload",
      relationTo: "media", // Optional: must exist if you use it
    },
    {
      name: "website",
      type: "text",
    },
  ],
};
