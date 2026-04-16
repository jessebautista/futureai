<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { Repo } from '$lib/stores/repos';
  import TaskForm from '$lib/components/TaskForm.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';

  let { data } = $props<{ data: { repo: Repo } }>();

  interface Task {
    id: string;
    description: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    created_at: string;
  }

  interface Guardrail {
    id: string;
    name: string;
    rule: string;
    severity: string;
    enabled: boolean;
    scope: string;
  }

  let activeTab = $state<'tasks' | 'config'>('tasks');
  let tasks = $state<Task[]>([]);
  let guardrails = $state<Guardrail[]>([]);
  let systemPrompt = $state('');

  const repo = $derived(data.repo);

  onMount(async () => {
    // Load tasks for this repo
    try {
      const res = await fetch(`/api/tasks?repo_id=${repo.id}`);
      if (res.ok) tasks = await res.json();
    } catch {}

    // Load guardrails
    try {
      const res = await fetch('/api/settings/guardrails');
      if (res.ok) guardrails = await res.json();
    } catch {}

    // Build a system prompt preview
    systemPrompt = buildSystemPrompt();
  });

  function buildSystemPrompt(): string {
    const lines: string[] = [
      `# DevAgent System Prompt`,
      `## Repository: ${repo.name}`,
      `Path: ${repo.path}`,
      repo.detected_stack ? `Stack: ${repo.detected_stack}` : '',
      '',
      '## Global Guardrails',
      ...guardrails.filter(g => g.enabled).map(g => `- [${g.severity.toUpperCase()}] ${g.name}: ${g.rule}`),
    ];
    return lines.filter(l => l !== undefined).join('\n');
  }

  function handleTaskSubmit(taskId: string) {
    goto(`/tasks/${taskId}`);
  }
</script>

<div class="px-6 py-8 max-w-5xl mx-auto">
  <!-- Repo header -->
  <div class="mb-6">
    <div class="flex items-center gap-3 mb-1">
      <a href="/" class="text-xs text-zinc-600 hover:text-zinc-400 font-mono transition-colors">← Dashboard</a>
    </div>
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-xl font-mono font-bold text-amber-500">{repo.name}</h1>
        <p class="text-xs text-zinc-500 font-mono mt-0.5">{repo.path}</p>
      </div>
      <div class="flex items-center gap-2 mt-1">
        {#if repo.detected_stack}
          <span class="inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border border-zinc-700 bg-zinc-800 text-zinc-400">
            {repo.detected_stack}
          </span>
        {/if}
        {#if repo.has_claude_md}
          <span class="inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest border border-amber-800 bg-amber-950 text-amber-400">
            CLAUDE.md
          </span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="flex border-b border-[#2e2e2e] mb-6">
    <button
      onclick={() => (activeTab = 'tasks')}
      class="px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors
        {activeTab === 'tasks' ? 'text-amber-400 border-b-2 border-amber-500 -mb-px' : 'text-zinc-500 hover:text-zinc-300'}"
    >
      Tasks
    </button>
    <button
      onclick={() => (activeTab = 'config')}
      class="px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors
        {activeTab === 'config' ? 'text-amber-400 border-b-2 border-amber-500 -mb-px' : 'text-zinc-500 hover:text-zinc-300'}"
    >
      Agent Config
    </button>
  </div>

  <!-- Tasks tab -->
  {#if activeTab === 'tasks'}
    <div class="flex flex-col gap-6">
      <div>
        <h2 class="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">New Task</h2>
        <TaskForm repoId={repo.id} repoPath={repo.path} onSubmit={handleTaskSubmit} />
      </div>

      <div>
        <h2 class="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3 border-b border-[#2e2e2e] pb-2">
          Past Tasks ({tasks.length})
        </h2>
        {#if tasks.length === 0}
          <div class="border border-dashed border-[#2e2e2e] p-6 text-center">
            <p class="text-zinc-600 font-mono text-sm">No tasks for this repo yet.</p>
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
                <span class="text-xs text-zinc-700 font-mono shrink-0">
                  {new Date(task.created_at).toLocaleDateString()}
                </span>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </div>

  <!-- Config tab -->
  {:else if activeTab === 'config'}
    <div class="flex flex-col gap-6">
      <div>
        <h2 class="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">Active Guardrails (Global)</h2>
        {#if guardrails.length === 0}
          <p class="text-zinc-600 font-mono text-xs">No guardrails loaded.</p>
        {:else}
          <div class="border border-[#2e2e2e] divide-y divide-[#2e2e2e]">
            {#each guardrails.filter(g => g.scope === 'global') as g (g.id)}
              <div class="flex items-start gap-3 px-4 py-3 bg-[#111111]">
                <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 border
                  {g.severity === 'error' ? 'border-red-800 bg-red-950 text-red-400' : 'border-yellow-800 bg-yellow-950 text-yellow-400'}">
                  {g.severity}
                </span>
                <div class="flex-1">
                  <p class="text-xs font-mono text-gray-300">{g.name}</p>
                  <p class="text-xs font-mono text-zinc-600 mt-0.5">{g.rule}</p>
                </div>
                <span class="text-[10px] font-mono {g.enabled ? 'text-green-500' : 'text-zinc-600'}">
                  {g.enabled ? 'ON' : 'OFF'}
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div>
        <h2 class="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">Repo-Scoped Rules</h2>
        <div class="border border-dashed border-[#2e2e2e] p-4 text-center">
          <p class="text-zinc-600 font-mono text-xs">No repo-specific rules configured.</p>
          <a href="/settings" class="text-amber-600 hover:text-amber-500 font-mono text-xs mt-1 inline-block transition-colors">
            Manage in Settings →
          </a>
        </div>
      </div>

      <div>
        <h2 class="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">System Prompt Preview</h2>
        <pre class="bg-[#0a0a0a] border border-[#2e2e2e] p-4 font-mono text-xs text-zinc-400 overflow-auto whitespace-pre-wrap">{systemPrompt || 'Loading...'}</pre>
      </div>
    </div>
  {/if}
</div>
