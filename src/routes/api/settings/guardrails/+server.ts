import type { RequestHandler } from '@sveltejs/kit';
import { guardrailsStore } from './store';

export const GET: RequestHandler = async () => {
  return Response.json(guardrailsStore.getAll());
};

export const POST: RequestHandler = async ({ request }) => {
  const g = await request.json();
  g.id = crypto.randomUUID();
  guardrailsStore.add(g);
  return Response.json(g, { status: 201 });
};
