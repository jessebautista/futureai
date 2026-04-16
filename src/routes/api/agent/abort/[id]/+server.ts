import type { RequestHandler } from '@sveltejs/kit';

const AGENT_URL = process.env.AGENT_SERVICE_URL ?? 'http://localhost:8000';

export const DELETE: RequestHandler = async ({ params }) => {
  const res = await fetch(`${AGENT_URL}/run-agent/${params.id}`, { method: 'DELETE' });
  return new Response(null, { status: res.status });
};
