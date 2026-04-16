import type { RequestHandler } from '@sveltejs/kit';
import { rulesStore } from './store';

export const GET: RequestHandler = async () => {
  return Response.json(rulesStore.getAll());
};

export const POST: RequestHandler = async ({ request }) => {
  const r = await request.json();
  r.id = crypto.randomUUID();
  rulesStore.add(r);
  return Response.json(r, { status: 201 });
};
