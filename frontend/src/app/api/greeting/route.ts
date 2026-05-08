import { getServerGreeting } from "@/data/Greeting";

export async function GET() {
  return Response.json(await getServerGreeting());
}

export async function POST() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
