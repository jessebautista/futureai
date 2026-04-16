<script lang="ts">
  import { onMount } from 'svelte';
  import { repos, loadRepos, addRepo } from '$lib/stores/repos';
  import RepoCard from '$lib/components/RepoCard.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';

  interface Task {
    id: string;
    description: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    created_at: string;
    repo_id?: string;
    repo_name?: string;
  }

  let tasks = $state<Task[]>([]);
  let showModal = $state(false);
  let modalError = $state('');
  let submitting = $state(false);

  // Form fields
  let newName = $state('');
  let newPath = $state('');
  let newGithub = $state('');

  let isRunning = $derived(tasks.some(t => t.status === 'running'));

  onMount(async () => {
    await loadRepos();
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const all: Task[] = await res.json();
        tasks = all.slice(0, 10);
      }
    } catch {}
  });

  async function handleAddRepo(e: SubmitEvent) {
    e.preventDefault();
    submitting = true;
    modalError = '';
    try {
      await addRepo(newName.trim(), newPath.trim(), newGithub.trim() || undefined);
      showModal = false;
      newName = '';
      newPath = '';
      newGithub = '';
    } catch (err: unknown) {
      modalError = err instanceof Error ? err.message : 'Failed to connect repository';
    } finally {
      submitting = false;
    }
  }

  function closeModal() {
    showModal = false;
    modalError = '';
  }
</script>

<div class="px-6 py-8 max-w-7xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-xl font-mono font-bold text-gray-100 tracking-wide">Mission Control</h1>
      <p class="text-xs text-zinc-500 mt-1">Monitor and dispatch developer agents across your repositories</p>
    </div>
    <div class="flex items-center gap-4">
      <!-- Global status -->
      <div class="flex items-center gap-2 text-xs font-mono">
        {#if isRunning}
          <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span class="text-amber-400">Agent running</span>
        {:else}
          <span class="w-2 h-2 rounded-full bg-zinc-600"></span>
          <span class="text-zinc-500">Idle</span>
        {/if}
      </div>
      <button
        onclick={() => (showModal = true)}
        class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-mono text-xs font-bold uppercase tracking-wider transition-colors"
      >
        + Connect Repo
      </button>
    </div>
  </div>

  <!-- Repos grid -->
  <section class="mb-10">
    <h2 class="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4 border-b border-[#2e2e2e] pb-2">
      Repositories ({$repos.length})
    </h2>
    {#if $repos.length === 0}
      <div class="border border-dashed border-[#2e2e2e] p-8 text-center">
        <p class="text-zinc-600 font-mono text-sm">No repositories connected.</p>
        <p class="text-zinc-700 font-mono text-xs mt-1">Click "Connect Repo" to get started.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {#each $repos as repo (repo.id)}
          <RepoCard {repo} />
        {/each}
      </div>
    {/if}
  </section>

  <!-- Recent tasks -->
  <section>
    <h2 class="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4 border-b border-[#2e2e2e] pb-2">
      Recent Tasks
    </h2>
    {#if tasks.length === 0}
      <div class="border border-dashed border-[#2e2e2e] p-8 text-center">
        <p class="text-zinc-600 font-mono text-sm">No tasks yet.</p>
      </div>
    {:else}
      <div class="border border-[#2e2e2e] divide-y divide-[#2e2e2e]">
        {#each tasks as task (task.id)}
          <a
            href="/tasks/{task.id}"
            class="flex items-center gap-4 px-4 py-3 bg-[#111111] hover:bg-[#1a1a1a] transition-colors"
          >
            <StatusBadge status={task.status} />
            <span class="text-sm text-gray-300 flex-1 truncate font-mono">{task.description}</span>
            {#if task.repo_name}
              <span class="text-xs text-zinc-600 font-mono shrink-0">{task.repo_name}</span>
            {/if}
            <span class="text-xs text-zinc-700 font-mono shrink-0">
              {new Date(task.created_at).toLocaleDateString()}
            </span>
          </a>
        {/each}
      </div>
    {/if}
  </section>
</div>

<!-- Connect Repo Modal -->
{#if showModal}
  <div
    class="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
    role="dialog"
    aria-modal="true"
    aria-label="Connect Repository"
  >
    <div class="bg-[#111111] border border-[#2e2e2e] w-full max-w-md p-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-sm font-mono font-bold text-gray-100 uppercase tracking-wider">Connect Repository</h2>
        <button onclick={closeModal} class="text-zinc-600 hover:text-gray-300 font-mono text-lg leading-none">✕</button>
      </div>

      <form onsubmit={handleAddRepo} class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-mono text-zinc-500 uppercase tracking-widest" for="repo-name">Name</label>
          <input
            id="repo-name"
            type="text"
            bind:value={newName}
            placeholder="my-project"
            required
            class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-sm px-3 py-2
                   focus:outline-none focus:border-amber-800 transition-colors"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-mono text-zinc-500 uppercase tracking-widest" for="repo-path">Local Path</label>
          <input
            id="repo-path"
            type="text"
            bind:value={newPath}
            placeholder="/home/user/projects/my-project"
            required
            class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-sm px-3 py-2
                   focus:outline-none focus:border-amber-800 transition-colors"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-mono text-zinc-500 uppercase tracking-widest" for="repo-github">
            GitHub URL <span class="text-zinc-700">(optional)</span>
          </label>
          <input
            id="repo-github"
            type="url"
            bind:value={newGithub}
            placeholder="https://github.com/org/repo"
            class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-sm px-3 py-2
                   focus:outline-none focus:border-amber-800 transition-colors"
          />
        </div>

        {#if modalError}
          <p class="text-xs text-red-400 font-mono">{modalError}</p>
        {/if}

        <div class="flex gap-3 mt-1">
          <button
            type="submit"
            disabled={submitting}
            class="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-black font-mono text-xs font-bold uppercase tracking-wider
                   disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Connecting...' : 'Connect'}
          </button>
          <button
            type="button"
            onclick={closeModal}
            class="px-4 py-2 border border-[#2e2e2e] text-zinc-400 hover:text-gray-200 font-mono text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
