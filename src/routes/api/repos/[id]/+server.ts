import type { RequestHandler } from '@sveltejs/kit';

const AGENT_URL = process.env.AGENT_SERVICE_URL ?? 'http://localhost:8000';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const res = await fetch(`${AGENT_URL}/repos/${params.id}`);
    if (!res.ok) return new Response('Not found', { status: 404 });
    return Response.json(await res.json());
  } catch {
    return new Response('Agent service unavailable', { status: 502 });
  }
};
