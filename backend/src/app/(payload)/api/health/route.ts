// Robust health check for Docker Compose and SSR/SSG readiness
export const runtime = 'nodejs'

// Lightweight health endpoint: avoids DB handshake to become ready faster
// Orchestrator treats 2xx/3xx as healthy; trailingSlash redirect (308) acceptable.
export async function GET() {
  const body = {
    ok: true,
    status: 'healthy',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  }
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}
