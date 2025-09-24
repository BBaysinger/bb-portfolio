// Robust health check for Docker Compose and SSR/SSG readiness
import payload from 'payload';

export const GET = async (_: Request) => {
  try {
    // Try a simple DB query to confirm Payload and DB readiness
    await payload.find({
      collection: 'users',
      limit: 1,
    });

    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ status: 'not ready', error: String(err) }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
