import type { RequestHandler } from '@sveltejs/kit';
import { skillsStore } from './store';

export const GET: RequestHandler = async () => {
  return Response.json(skillsStore.getAll());
};

export const POST: RequestHandler = async ({ request }) => {
  const s = await request.json();
  s.id = crypto.randomUUID();
  skillsStore.add(s);
  return Response.json(s, { status: 201 });
};
