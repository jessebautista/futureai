<script lang="ts">
  let { diffs } = $props<{ diffs: Array<{ file: string; before: string; after: string }> }>();
</script>

{#if diffs.length > 0}
  <div class="flex flex-col gap-4">
    {#each diffs as diff}
      <div class="border border-[#2e2e2e]">
        <div class="px-3 py-2 bg-[#1a1a1a] border-b border-[#2e2e2e] font-mono text-xs text-zinc-400">
          {diff.file}
        </div>
        <div class="grid grid-cols-2 divide-x divide-[#2e2e2e] overflow-auto">
          <div class="bg-red-950/20 p-3">
            <div class="text-[10px] font-mono text-zinc-600 mb-2 uppercase tracking-widest">Before</div>
            <pre class="font-mono text-xs text-red-300 whitespace-pre-wrap break-words leading-relaxed">{diff.before}</pre>
          </div>
          <div class="bg-green-950/20 p-3">
            <div class="text-[10px] font-mono text-zinc-600 mb-2 uppercase tracking-widest">After</div>
            <pre class="font-mono text-xs text-green-300 whitespace-pre-wrap break-words leading-relaxed">{diff.after}</pre>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}
