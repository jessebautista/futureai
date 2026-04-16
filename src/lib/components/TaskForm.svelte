<script lang="ts">
  import { streamTask } from '$lib/api/agent';

  let { repoId, repoPath, onSubmit } = $props<{
    repoId: string;
    repoPath: string;
    onSubmit: (taskId: string) => void;
  }>();

  let description = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    loading = true;
    error = '';

    try {
      const gen = streamTask(description.trim(), repoPath, repoId);
      // Get the first message to extract task_id
      const first = await gen.next();
      if (first.done || !first.value) {
        throw new Error('No response from agent');
      }
      const taskId: string = first.value.task_id ?? crypto.randomUUID();
      onSubmit(taskId);
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to start task';
      loading = false;
    }
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-3">
  <textarea
    bind:value={description}
    rows={5}
    placeholder="Describe the bug or feature request..."
    disabled={loading}
    class="w-full bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-sm px-3 py-2 resize-none
           placeholder-zinc-600 focus:outline-none focus:border-amber-800 disabled:opacity-50 transition-colors"
  ></textarea>

  {#if error}
    <p class="text-xs text-red-400 font-mono">{error}</p>
  {/if}

  <div class="flex items-center gap-3">
    <button
      type="submit"
      disabled={loading || !description.trim()}
      class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-mono text-xs font-bold uppercase tracking-wider
             disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? 'Starting...' : 'Run Agent'}
    </button>
    {#if loading}
      <span class="text-xs text-zinc-500 font-mono animate-pulse">Initializing session...</span>
    {/if}
  </div>
</form>
