import { error } from '@sveltejs/kit';

export async function load({ params, fetch }: { params: { id: string }; fetch: typeof window.fetch }) {
  const res = await fetch(`/api/repos/${params.id}`);
  if (!res.ok) throw error(404, 'Repo not found');
  return { repo: await res.json() };
}
