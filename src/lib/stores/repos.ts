import { writable } from 'svelte/store';

export interface Repo {
  id: string;
  name: string;
  path: string;
  github_url?: string;
  detected_stack?: string;
  has_claude_md: boolean;
  created_at: string;
}

export const repos = writable<Repo[]>([]);

export async function loadRepos() {
  const res = await fetch('/api/repos');
  if (res.ok) repos.set(await res.json());
}

export async function addRepo(name: string, path: string, github_url?: string) {
  const res = await fetch('/api/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, path, github_url })
  });
  if (!res.ok) throw new Error(await res.text());
  const repo = await res.json();
  repos.update(r => [repo, ...r]);
  return repo;
}

export async function deleteRepo(id: string) {
  const res = await fetch(`/api/repos/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  repos.update(r => r.filter(repo => repo.id !== id));
}
