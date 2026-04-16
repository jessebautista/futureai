import type { RequestHandler } from '@sveltejs/kit';

const AGENT_URL = process.env.AGENT_SERVICE_URL ?? 'http://localhost:8000';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const res = await fetch(`${AGENT_URL}/run-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache'
    }
  });
};
