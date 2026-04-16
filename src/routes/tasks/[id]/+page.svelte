<script lang="ts">
  import { onMount } from 'svelte';
  import type { StreamMessage } from '$lib/stores/agent';
  import AgentTerminal from '$lib/components/AgentTerminal.svelte';
  import SubagentPipeline from '$lib/components/SubagentPipeline.svelte';
  import FileDiff from '$lib/components/FileDiff.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { streamTask, abortTask, getTaskMessages } from '$lib/api/agent';

  interface Task {
    id: string;
    description: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    created_at: string;
    repo_id?: string;
    repo_path?: string;
    pr_url?: string;
    error?: string;
  }

  interface FileDiffEntry {
    file: string;
    before: string;
    after: string;
  }

  let { data } = $props<{ data: { task: Task | null } }>();

  let task: Task | null = $state(data.task);
  let messages = $state<StreamMessage[]>([]);
  let activeAgent = $state<string | null>(null);
  let completedAgents = $state<string[]>([]);
  let diffs = $state<FileDiffEntry[]>([]);
  let streaming = $state(false);
  let aborting = $state(false);

  const SUBAGENT_ORDER = ['bug-analyzer', 'bug-fixer', 'qa-agent', 'pr-agent'];

  onMount(async () => {
    if (!task) return;

    if (task.status === 'done' || task.status === 'failed') {
      // Load historical messages
      const historical = await getTaskMessages(task.id);
      if (historical && Array.isArray(historical)) {
        messages = historical;
        // Replay to reconstruct pipeline state
        for (const msg of historical) {
          processMessage(msg);
        }
      }
    } else {
      // Stream live
      await startStreaming();
    }
  });

  function processMessage(msg: StreamMessage) {
    if (msg.type === 'agent_start' && msg.agent_id) {
      activeAgent = msg.agent_id;
    }
    if (msg.type === 'agent_end' && msg.agent_id) {
      if (!completedAgents.includes(msg.agent_id)) {
        completedAgents = [...completedAgents, msg.agent_id];
      }
      // Set next agent as active if pipeline continues
      const idx = SUBAGENT_ORDER.indexOf(msg.agent_id);
      if (idx !== -1 && idx < SUBAGENT_ORDER.length - 1) {
        // Will be set when the next agent_start arrives
      } else {
        activeAgent = null;
      }
    }
    if (msg.type === 'tool_use' && msg.tool_name === 'Edit' && msg.content) {
      // Try to parse file and content from tool use
      try {
        const parsed = JSON.parse(msg.content);
        if (parsed.file_path) {
          diffs = [...diffs, {
            file: parsed.file_path,
            before: parsed.old_string ?? '',
            after: parsed.new_string ?? ''
          }];
        }
      } catch {
        // Not JSON, skip
      }
    }
    if (msg.task_id && task && !task.status) {
      // noop
    }
  }

  async function startStreaming() {
    if (!task?.repo_path) return;
    streaming = true;
    try {
      for await (const msg of streamTask(task.description, task.repo_path, task.repo_id)) {
        messages = [...messages, msg];
        processMessage(msg);

        // Update task status from stream
        if (msg.type === 'done' || msg.type === 'task_done') {
          if (task) task = { ...task, status: 'done', pr_url: msg.content };
        }
        if (msg.type === 'error') {
          if (task) task = { ...task, status: 'failed', error: msg.content };
        }
      }
      // Stream ended
      if (task && task.status !== 'failed') {
        task = { ...task, status: 'done' };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Stream error';
      messages = [...messages, {
        type: 'error',
        content: errMsg,
        timestamp: new Date().toISOString()
      }];
      if (task) task = { ...task, status: 'failed', error: errMsg };
    } finally {
      streaming = false;
      activeAgent = null;
    }
  }

  async function handleAbort() {
    if (!task || aborting) return;
    aborting = true;
    try {
      await abortTask(task.id);
      task = { ...task, status: 'failed', error: 'Aborted by user' };
      streaming = false;
      activeAgent = null;
    } catch {
      // ignore
    } finally {
      aborting = false;
    }
  }
</script>

<div class="px-6 py-6 max-w-7xl mx-auto flex flex-col gap-6">
  <!-- Breadcrumb -->
  <div class="flex items-center gap-2 text-xs font-mono text-zinc-600">
    <a href="/" class="hover:text-zinc-400 transition-colors">Dashboard</a>
    <span>/</span>
    <span class="text-zinc-400">Task {task?.id?.slice(0, 8) ?? '...'}</span>
  </div>

  {#if !task}
    <div class="border border-[#2e2e2e] p-8 text-center">
      <p class="text-zinc-500 font-mono">Task not found.</p>
    </div>
  {:else}
    <!-- Task header -->
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <div class="flex items-center gap-3 mb-2">
          <StatusBadge status={task.status} />
          <span class="text-xs text-zinc-600 font-mono">
            {new Date(task.created_at).toLocaleString()}
          </span>
        </div>
        <p class="font-mono text-sm text-gray-200 leading-relaxed">{task.description}</p>
      </div>
      {#if task.status === 'running' || streaming}
        <button
          onclick={handleAbort}
          disabled={aborting}
          class="shrink-0 px-3 py-1.5 border border-red-800 text-red-400 hover:bg-red-950 font-mono text-xs uppercase tracking-wider
                 disabled:opacity-40 transition-colors"
        >
          {aborting ? 'Aborting...' : 'Abort'}
        </button>
      {/if}
    </div>

    <!-- Pipeline -->
    <div class="flex flex-col gap-2">
      <h3 class="text-xs font-mono uppercase tracking-widest text-zinc-600">Pipeline</h3>
      <SubagentPipeline {activeAgent} {completedAgents} />
    </div>

    <!-- Main content: terminal + sidebar -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4" style="min-height: 400px;">
      <!-- Terminal (60%) -->
      <div class="lg:col-span-3 flex flex-col gap-2">
        <h3 class="text-xs font-mono uppercase tracking-widest text-zinc-600">Agent Output</h3>
        <div class="flex-1" style="height: 500px;">
          <AgentTerminal {messages} />
        </div>
      </div>

      <!-- Sidebar (40%) -->
      <div class="lg:col-span-2 flex flex-col gap-4">
        <!-- File diffs -->
        {#if diffs.length > 0}
          <div>
            <h3 class="text-xs font-mono uppercase tracking-widest text-zinc-600 mb-2">
              File Changes ({diffs.length})
            </h3>
            <div class="overflow-auto max-h-96">
              <FileDiff {diffs} />
            </div>
          </div>
        {:else}
          <div class="border border-dashed border-[#2e2e2e] p-4 text-center">
            <p class="text-zinc-700 font-mono text-xs">No file changes yet.</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Final output -->
    {#if task.status === 'done'}
      <div class="border border-green-800 bg-green-950/20 p-4">
        <h3 class="text-xs font-mono uppercase tracking-widest text-green-600 mb-2">Completed</h3>
        {#if task.pr_url}
          <p class="text-sm font-mono text-green-300">
            Pull request created:
            <a href={task.pr_url} target="_blank" rel="noopener noreferrer" class="text-amber-400 hover:text-amber-300 underline ml-1">
              {task.pr_url}
            </a>
          </p>
        {:else}
          <p class="text-sm font-mono text-green-300">Task completed successfully.</p>
        {/if}
      </div>
    {:else if task.status === 'failed'}
      <div class="border border-red-800 bg-red-950/20 p-4">
        <h3 class="text-xs font-mono uppercase tracking-widest text-red-600 mb-2">Failed</h3>
        <p class="text-sm font-mono text-red-300">{task.error ?? 'An error occurred.'}</p>
      </div>
    {/if}
  {/if}
</div>
