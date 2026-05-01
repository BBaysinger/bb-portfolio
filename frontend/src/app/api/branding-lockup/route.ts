/**
 * Frontend API endpoint for `GET /api/branding-lockup`.
 *
 * Returns normalized shared branding lockup data for client consumers.
 */
import { getServerBrandingLockup } from "@/data/BrandingLockup";

export async function GET() {
  try {
    return Response.json(await getServerBrandingLockup());
  } catch (error) {
    console.error("Frontend branding-lockup proxy error:", error);
    return Response.json(
      {
        activeRoleTitle: "Front-End / UI Developer",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}