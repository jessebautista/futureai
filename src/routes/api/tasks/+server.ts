import type { RequestHandler } from '@sveltejs/kit';

const AGENT_URL = process.env.AGENT_SERVICE_URL ?? 'http://localhost:8000';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const repoId = url.searchParams.get('repo_id');
    const query = repoId ? `?repo_id=${repoId}` : '';
    const res = await fetch(`${AGENT_URL}/tasks${query}`);
    const data = res.ok ? await res.json() : [];
    return Response.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    return Response.json([], { status: 200 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  try {
    const res = await fetch(`${AGENT_URL}/tasks`, {
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
