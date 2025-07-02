import { CollectionConfig } from "payload";

export const Projects: CollectionConfig = {
  slug: "projects",
  admin: {
    useAsTitle: "title",
  },
  fields: [
    {
      name: "title",
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
      name: "description",
      type: "textarea",
    },
    {
      name: "images",
      type: "array",
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media", // Make sure your Media collection exists
        },
        {
          name: "altText",
          type: "text",
        },
      ],
    },
    {
      name: "liveURL",
      type: "text",
    },
    {
      name: "repoURL",
      type: "text",
    },
    {
      name: "technologies",
      type: "array",
      fields: [
        {
          name: "tech",
          type: "text",
        },
      ],
    },
    {
      name: "published",
      type: "checkbox",
      defaultValue: false,
    },
  ],
};