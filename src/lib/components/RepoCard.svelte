<script lang="ts">
  import type { Repo } from '$lib/stores/repos';
  import { deleteRepo } from '$lib/stores/repos';

  let { repo } = $props<{ repo: Repo }>();

  let deleting = $state(false);

  async function handleDelete(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete repository "${repo.name}"? This cannot be undone.`)) return;
    deleting = true;
    try {
      await deleteRepo(repo.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete repository');
      deleting = false;
    }
  }
</script>

<div class="border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 flex flex-col gap-3 hover:border-[var(--text-muted)] transition-colors">
  <div class="flex items-start justify-between gap-2">
    <a
      href="/repos/{repo.id}"
      class="text-amber-500 hover:text-amber-400 font-mono font-semibold text-sm tracking-wide transition-colors truncate"
    >
      {repo.name}
    </a>
    <div class="flex items-center gap-1.5 shrink-0">
      {#if repo.has_claude_md}
        <span class="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest border border-amber-800 bg-amber-950 text-amber-400">
          CLAUDE.md
        </span>
      {/if}
      <button
        onclick={handleDelete}
        disabled={deleting}
        title="Delete repository"
        class="text-zinc-600 hover:text-red-400 font-mono text-xs leading-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed px-1"
        aria-label="Delete {repo.name}"
      >
        {deleting ? '…' : '✕'}
      </button>
    </div>
  </div>

  <p class="text-xs text-[var(--text-muted)] font-mono truncate" title={repo.path}>
    {repo.path}
  </p>

  <div class="flex items-center gap-2">
    {#if repo.detected_stack}
      <span class="inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border border-[var(--border-color)] bg-[var(--bg-raised)] text-[var(--text-secondary)]">
        {repo.detected_stack}
      </span>
    {/if}
    {#if repo.github_url}
      <a
        href={repo.github_url}
        target="_blank"
        rel="noopener noreferrer"
        class="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors truncate"
      >
        {repo.github_url.replace('https://github.com/', 'github/')}
      </a>
    {/if}
  </div>
</div>
