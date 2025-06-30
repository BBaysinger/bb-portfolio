import { buildConfig } from "payload";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import * as dotenv from "dotenv";

import Projects from "./src/collections/Projects";
import Users from "./src/collections/Users";

dotenv.config();

export default buildConfig({
  serverURL: "http://localhost:3000",
  admin: {
    user: "users",
  },
  collections: [Projects, Users],
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || "mongodb://localhost/portfolio",
  }),
  secret: process.env.PAYLOAD_SECRET || "dev-secret",
});
