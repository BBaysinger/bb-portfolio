/**
 * Frontend API endpoint for `GET /api/branding-lockup`.
 *
 * Returns normalized shared branding lockup data for client consumers.
 */
import { getServerBrandingLockup } from "@/data/BrandingLockup";

export async function GET() {
  return Response.json(await getServerBrandingLockup());
}

export async function POST() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
