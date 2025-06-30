import { buildConfig } from "payload";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import Projects from "collections/Projects";

export default buildConfig({
  serverURL: "http://localhost:3000",
  admin: {
    user: "users",
  },
  collections: [Projects],
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || "mongodb://localhost/portfolio",
  }),
  secret: process.env.PAYLOAD_SECRET || "dev-secret",
});
