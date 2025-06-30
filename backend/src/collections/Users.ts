import type { CollectionConfig } from "payload";

const Users: CollectionConfig = {
  slug: "users",
  auth: true, // 🔑 This makes it valid for admin login
  admin: {
    useAsTitle: "email",
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
  ],
};

export default Users;
