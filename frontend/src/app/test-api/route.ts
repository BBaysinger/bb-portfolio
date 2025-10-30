export async function GET() {
  return new Response(JSON.stringify({
    message: "Test API works! Git: 5fa74057",
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PUBLIC_PROJECTS_BUCKET: process.env.PUBLIC_PROJECTS_BUCKET,
      NDA_PROJECTS_BUCKET: process.env.NDA_PROJECTS_BUCKET,
    }
  }), {
    headers: {
      'Content-Type': 'application/json',
    }
  });
}