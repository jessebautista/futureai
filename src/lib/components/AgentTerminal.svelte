<script lang="ts">
  import type { StreamMessage } from '$lib/stores/agent';

  let { messages } = $props<{ messages: StreamMessage[] }>();

  let terminalEl: HTMLDivElement;

  $effect(() => {
    // Re-run when messages change
    const _ = messages.length;
    if (terminalEl) {
      terminalEl.scrollTop = terminalEl.scrollHeight;
    }
  });

  function truncate(s: string, max = 200): string {
    return s.length > max ? s.slice(0, max) + '...' : s;
  }
</script>

<div
  bind:this={terminalEl}
  class="h-full overflow-y-auto bg-[#111111] border border-[#2e2e2e] p-4 font-mono text-xs leading-relaxed"
  style="min-height: 300px;"
>
  {#if messages.length === 0}
    <p class="text-zinc-700 italic">Waiting for agent output...</p>
  {/if}

  {#each messages as msg}
    {#if msg.type === 'text'}
      <div class="text-green-300 whitespace-pre-wrap break-words">{msg.content}</div>
    {:else if msg.type === 'agent_start'}
      <div class="mt-3 mb-1 text-amber-400 font-bold">[AGENT: {msg.agent_id ?? 'unknown'}]</div>
    {:else if msg.type === 'agent_end'}
      <div class="my-2 border-t border-[#2e2e2e]"></div>
    {:else if msg.type === 'tool_use'}
      <div class="text-zinc-500">&gt; TOOL: {msg.tool_name}({msg.content ? truncate(msg.content) : ''})</div>
    {:else if msg.type === 'tool_result'}
      <div class="text-zinc-600 pl-4 border-l border-zinc-800">{msg.content ? truncate(msg.content) : ''}</div>
    {:else if msg.type === 'error'}
      <div class="text-red-400">[ERROR] {msg.content}</div>
    {:else}
      <div class="text-zinc-600">{JSON.stringify(msg)}</div>
    {/if}
  {/each}
</div>
