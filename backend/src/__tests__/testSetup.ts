import dotenv from "dotenv";

import { connectDB, disconnectDB } from "connect/database";

// Load environment variables from .env.test or similar
dotenv.config({ path: ".env.test" });

// Establish a database connection before any tests run
beforeAll(async () => {
  await connectDB();
});

// Close the database connection after all tests complete
afterAll(async () => {
  await disconnectDB();
});

// Export other global mocks or helpers if needed
export {};
