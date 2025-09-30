// Utility to verify auth token (SSR, Node.js only)
// This is a stub. Replace with your actual JWT/session validation logic.
// Ensures this module can only be used on the server and lazily loads jsonwebtoken
// to avoid bundling issues in edge/client runtimes.

import "server-only";

const SECRET = process.env.AUTH_SECRET || "your-secret-key";

export async function verifyAuthToken(token: string): Promise<boolean> {
  try {
    // Dynamically import jsonwebtoken only at runtime in Node
    const { default: jwt } = await import("jsonwebtoken");
    const decoded = jwt.verify(token, SECRET);
    return !!decoded;
  } catch {
    // If jsonwebtoken isn't installed or token invalid, treat as unauthenticated
    return false;
  }
}
