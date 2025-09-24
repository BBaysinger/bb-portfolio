// Utility to verify auth token (SSR)
// This is a stub. Replace with your actual JWT/session validation logic.

import jwt from "jsonwebtoken";

const SECRET = process.env.AUTH_SECRET || "your-secret-key";

export async function verifyAuthToken(token: string): Promise<boolean> {
  try {
    // Replace with your actual verification logic
    const decoded = jwt.verify(token, SECRET);
    return !!decoded;
  } catch {
    return false;
  }
}
