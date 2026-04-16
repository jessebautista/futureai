export async function load({ params, fetch }: { params: { id: string }; fetch: typeof window.fetch }) {
  const res = await fetch(`/api/tasks/${params.id}`);
  if (!res.ok) return { task: null };
  return { task: await res.json() };
}
