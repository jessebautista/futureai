import type { RequestHandler } from '@sveltejs/kit';
import { skillsStore } from '../store';

export const PATCH: RequestHandler = async ({ params, request }) => {
  const updates = await request.json();
  const item = skillsStore.patch(params.id!, updates);
  if (!item) return new Response('Not found', { status: 404 });
  return Response.json(item);
};

export const DELETE: RequestHandler = async ({ params }) => {
  skillsStore.delete(params.id!);
  return new Response(null, { status: 204 });
};
