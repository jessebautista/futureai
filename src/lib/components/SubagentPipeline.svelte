<script lang="ts">
  let { activeAgent, completedAgents } = $props<{
    activeAgent: string | null;
    completedAgents: string[];
  }>();

  const stages = [
    { id: 'bug-analyzer', label: 'Analyze' },
    { id: 'bug-fixer', label: 'Fix' },
    { id: 'qa-agent', label: 'QA' },
    { id: 'pr-agent', label: 'PR' }
  ];

  function stageState(id: string): 'active' | 'completed' | 'pending' {
    if (activeAgent === id) return 'active';
    if (completedAgents.includes(id)) return 'completed';
    return 'pending';
  }
</script>

<div class="flex items-center gap-0">
  {#each stages as stage, i}
    {@const state = stageState(stage.id)}
    <div class="flex items-center gap-0">
      <div
        class="flex items-center gap-2 px-3 py-2 border text-xs font-mono uppercase tracking-wider
          {state === 'active' ? 'border-amber-600 bg-amber-950 text-amber-400' : ''}
          {state === 'completed' ? 'border-green-800 bg-green-950 text-green-400' : ''}
          {state === 'pending' ? 'border-[#2e2e2e] bg-[#111111] text-zinc-600' : ''}"
      >
        {#if state === 'active'}
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
        {:else if state === 'completed'}
          <span class="text-green-400 leading-none shrink-0">✓</span>
        {:else}
          <span class="w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0"></span>
        {/if}
        {stage.label}
      </div>
      {#if i < stages.length - 1}
        <div class="w-6 h-px bg-[#2e2e2e] shrink-0"></div>
        <div
          class="w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent
            {state === 'completed' ? 'border-l-green-800' : 'border-l-[#2e2e2e]'}"
        ></div>
      {/if}
    </div>
  {/each}
</div>
