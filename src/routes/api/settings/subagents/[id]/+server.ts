import type { RequestHandler } from '@sveltejs/kit';
import { subagentsStore } from '../store';

export const PATCH: RequestHandler = async ({ params, request }) => {
  const updates = await request.json();
  const item = subagentsStore.patch(params.id!, updates);
  if (!item) return new Response('Not found', { status: 404 });
  return Response.json(item);
};
