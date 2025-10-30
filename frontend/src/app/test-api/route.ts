export async function GET() {
  return Response.json({
    message: "Test API works!",
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PUBLIC_PROJECTS_BUCKET: process.env.PUBLIC_PROJECTS_BUCKET,
      NDA_PROJECTS_BUCKET: process.env.NDA_PROJECTS_BUCKET,
    }
  });
}