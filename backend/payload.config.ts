// backend/payload.config.ts
import { buildConfig } from "payload/config";

export default buildConfig({
  serverURL: "http://localhost:3000",
  admin: {
    user: "users",
  },
  collections: [
    // You'll add your first collection here shortly
  ],
});
