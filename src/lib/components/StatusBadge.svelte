<script lang="ts">
  type Status = 'pending' | 'running' | 'done' | 'failed';
  let { status }: { status: Status } = $props();
  const classMap: Record<Status, string> = {
    pending: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    running: 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse',
    done: 'bg-green-950 text-green-400 border-green-800',
    failed: 'bg-red-950 text-red-400 border-red-800'
  };
  const cls = classMap[status] ?? classMap.pending;
</script>

<span class="inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border {cls}">
  {status}
</span>
