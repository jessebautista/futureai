import type { RequestHandler } from '@sveltejs/kit';
import { subagentsStore } from './store';

export const GET: RequestHandler = async () => {
  return Response.json(subagentsStore.getAll());
};
