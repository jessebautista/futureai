import type { RequestHandler } from '@sveltejs/kit';

const AGENT_URL = process.env.AGENT_SERVICE_URL ?? 'http://localhost:8000';

export const GET: RequestHandler = async () => {
  try {
    const res = await fetch(`${AGENT_URL}/repos`);
    const data = res.ok ? await res.json() : [];
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json([], { status: 200 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  try {
    const res = await fetch(`${AGENT_URL}/connect-repo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Agent service unavailable';
    return new Response(msg, { status: 502 });
  }
};
