/**
 * Frontend API endpoint for `GET /api/hero-branding`.
 *
 * Returns normalized hero branding data for client consumers.
 */
import { getServerHeroBranding } from "@/data/HeroBranding";

export async function GET() {
  try {
    return Response.json(await getServerHeroBranding());
  } catch (error) {
    console.error("Frontend hero-branding proxy error:", error);
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
