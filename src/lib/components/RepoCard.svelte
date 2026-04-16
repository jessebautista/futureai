<script lang="ts">
  import type { Repo } from '$lib/stores/repos';

  let { repo } = $props<{ repo: Repo }>();
</script>

<div class="border border-[#2e2e2e] bg-[#111111] p-4 flex flex-col gap-3 hover:border-zinc-600 transition-colors">
  <div class="flex items-start justify-between gap-2">
    <a
      href="/repos/{repo.id}"
      class="text-amber-500 hover:text-amber-400 font-mono font-semibold text-sm tracking-wide transition-colors truncate"
    >
      {repo.name}
    </a>
    {#if repo.has_claude_md}
      <span class="shrink-0 inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest border border-amber-800 bg-amber-950 text-amber-400">
        CLAUDE.md
      </span>
    {/if}
  </div>

  <p class="text-xs text-zinc-500 font-mono truncate" title={repo.path}>
    {repo.path}
  </p>

  <div class="flex items-center gap-2">
    {#if repo.detected_stack}
      <span class="inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border border-zinc-700 bg-zinc-800 text-zinc-400">
        {repo.detected_stack}
      </span>
    {/if}
    {#if repo.github_url}
      <a
        href={repo.github_url}
        target="_blank"
        rel="noopener noreferrer"
        class="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors truncate"
      >
        {repo.github_url.replace('https://github.com/', 'github/')}
      </a>
    {/if}
  </div>
</div>
