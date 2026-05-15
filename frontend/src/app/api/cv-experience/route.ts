import { getCvExperienceData } from "@/data/CvExperience";

export async function GET() {
  return Response.json(await getCvExperienceData(), {
    headers: {
      "cache-control": "no-store",
    },
  });
}

export async function POST() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
