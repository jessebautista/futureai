import type { RequestHandler } from '@sveltejs/kit';
import { AGENT_URL } from '$lib/server/config';


export const GET: RequestHandler = async ({ params }) => {
  try {
    const res = await fetch(`${AGENT_URL}/repos/${params.id}`);
    if (!res.ok) return new Response('Not found', { status: 404 });
    return Response.json(await res.json());
  } catch {
    return new Response('Agent service unavailable', { status: 502 });
  }
};

export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const res = await fetch(`${AGENT_URL}/repos/${params.id}`, { method: 'DELETE' });
    if (res.status === 404) return new Response('Not found', { status: 404 });
    if (!res.ok) return new Response('Failed to delete repo', { status: res.status });
    return new Response(null, { status: 204 });
  } catch {
    return new Response('Agent service unavailable', { status: 502 });
  }
};
