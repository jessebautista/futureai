import type { RequestHandler } from '@sveltejs/kit';

const AGENT_URL = process.env.AGENT_SERVICE_URL ?? 'http://localhost:8000';

export const GET: RequestHandler = async ({ params }) => {
  const res = await fetch(`${AGENT_URL}/sessions/${params.id}`);
  const data = res.ok ? await res.json() : null;
  return Response.json(data, { status: res.status });
};
