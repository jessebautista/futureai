import type { RequestHandler } from '@sveltejs/kit';

// Re-import the shared in-memory store via the parent module pattern.
// Since SvelteKit runs server routes as modules, we use a module-level singleton here.
// For true sharing with the parent route's in-memory store, we use a separate shared module.
// For now, import from a shared store file.
import { guardrailsStore } from '../store';

export const PATCH: RequestHandler = async ({ params, request }) => {
  const updates = await request.json();
  const item = guardrailsStore.patch(params.id!, updates);
  if (!item) return new Response('Not found', { status: 404 });
  return Response.json(item);
};

export const DELETE: RequestHandler = async ({ params }) => {
  guardrailsStore.delete(params.id!);
  return new Response(null, { status: 204 });
};

export const POST: RequestHandler = async ({ params }) => {
  // Handle /reset as a special case if routed here — but we handle that in the parent.
  // This route matches /api/settings/guardrails/[id] so 'reset' would come here.
  if (params.id === 'reset') {
    guardrailsStore.reset();
    return Response.json(guardrailsStore.getAll());
  }
  return new Response('Method not allowed', { status: 405 });
};
