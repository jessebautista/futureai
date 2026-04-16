<script lang="ts">
  interface DocSection {
    id: string;
    title: string;
    icon: string;
    content: DocBlock[];
  }

  interface DocBlock {
    type: 'heading' | 'paragraph' | 'steps' | 'code' | 'note' | 'warning' | 'table';
    text?: string;
    items?: string[];
    language?: string;
    rows?: string[][];
    headers?: string[];
  }

  const sections: DocSection[] = [
    {
      id: 'overview',
      title: 'Overview',
      icon: '◈',
      content: [
        { type: 'heading', text: 'DevAgent — Overview' },
        { type: 'paragraph', text: 'DevAgent is an AI-powered developer assistant that integrates with your repositories and external services (GitHub, Linear, Slack, and more) to autonomously complete coding tasks on your behalf.' },
        { type: 'paragraph', text: 'The system is built around four core concepts:' },
        {
          type: 'steps',
          items: [
            'Connections — bridges between external apps (e.g. GitHub) and the agent, carrying incoming tasks.',
            'Repositories — local or remote codebases the agent can read and modify.',
            'Settings — guardrails, rules, skills, and subagents that shape how the agent behaves.',
            'Agent Runs — individual execution sessions where the agent carries out a task end-to-end.',
          ],
        },
        { type: 'note', text: 'Start by adding at least one Repository, then create a Connection linked to it. Once a webhook event arrives, an Agent Run is automatically created.' },
      ],
    },
    {
      id: 'connections',
      title: 'Connections',
      icon: '⇄',
      content: [
        { type: 'heading', text: 'Connections' },
        { type: 'paragraph', text: 'A Connection is a named integration between an external service and the DevAgent. Each connection holds a unique webhook token that external services use to send tasks to the agent.' },
        { type: 'heading', text: 'Creating a Connection' },
        {
          type: 'steps',
          items: [
            'Navigate to Connections in the sidebar.',
            'Click "+ New Connection".',
            'Choose an App type (GitHub, Linear, Slack, Jira, Zapier, or Custom).',
            'Optionally link a Repository — this tells the agent which codebase to work in.',
            'Click "Create Connection". A webhook URL and token will be generated.',
          ],
        },
        { type: 'heading', text: 'Webhook URL format' },
        { type: 'code', language: 'bash', text: 'POST https://your-devagent.example.com/api/webhook/{token}' },
        { type: 'paragraph', text: 'Send a JSON payload with a "description" field (and optionally "repo_path") to trigger an agent run:' },
        { type: 'code', language: 'json', text: '{\n  "description": "Fix the login bug in auth.ts",\n  "repo_path": "/home/ci/my-app"\n}' },
        { type: 'heading', text: 'Rotating a token' },
        { type: 'paragraph', text: 'You can rotate the webhook secret at any time from the connection detail page. Rotating invalidates the old token immediately.' },
        { type: 'warning', text: 'Always store the webhook token in a secret manager — never commit it to source control.' },
      ],
    },
    {
      id: 'repositories',
      title: 'Repositories',
      icon: '⊟',
      content: [
        { type: 'heading', text: 'Repositories' },
        { type: 'paragraph', text: 'Repositories represent the codebases the agent can operate on. Adding a repository makes it available for selection when creating a connection or a manual run.' },
        { type: 'heading', text: 'Adding a Repository' },
        {
          type: 'steps',
          items: [
            'Go to the Repositories page.',
            'Click "+ Add Repository".',
            'Enter a name and the absolute local path to the repository (e.g. /home/user/projects/my-app).',
            'Click Save. The repository is now available in connection forms.',
          ],
        },
        { type: 'heading', text: 'Requirements' },
        {
          type: 'steps',
          items: [
            'The path must be accessible by the process running the agent service.',
            'The directory should be a valid Git repository (git init must have been run).',
            'The agent service user needs read/write permissions on the directory.',
          ],
        },
        { type: 'note', text: 'For cloud CI setups, mount the workspace as a volume and use the container path here.' },
      ],
    },
    {
      id: 'guardrails',
      title: 'Guardrails',
      icon: '⊘',
      content: [
        { type: 'heading', text: 'Guardrails' },
        { type: 'paragraph', text: 'Guardrails are safety rules that the agent checks before and after performing actions. They prevent the agent from doing things that could be harmful, irreversible, or outside your policy.' },
        { type: 'heading', text: 'How guardrails work' },
        { type: 'paragraph', text: 'Each guardrail has a rule (a plain-English instruction), a severity level, and a scope. When the agent is about to take an action, it checks the active guardrails and either blocks the action (error severity) or logs a warning (warning severity).' },
        { type: 'heading', text: 'Adding a Guardrail' },
        {
          type: 'steps',
          items: [
            'Go to Settings → Guardrails.',
            'Click "+ Add Guardrail".',
            'Enter a descriptive name and the rule text.',
            'Set the severity: "error" halts the action; "warning" allows it but logs it.',
            'Choose scope: "global" applies to all runs; "repo" applies only within a specific repository.',
            'Click Save. Toggle the switch to enable/disable the guardrail.',
          ],
        },
        {
          type: 'table',
          headers: ['Severity', 'Effect'],
          rows: [
            ['error', 'The agent refuses to perform the action and reports the violation.'],
            ['warning', 'The agent proceeds but records the guardrail hit in the run log.'],
          ],
        },
        { type: 'heading', text: 'Default guardrails' },
        { type: 'paragraph', text: 'Click "Reset to defaults" to restore the built-in set of guardrails. This will overwrite any custom guardrails you have added.' },
        { type: 'note', text: 'Example guardrail: "Do not delete files without creating a backup first." Severity: error.' },
      ],
    },
    {
      id: 'rules',
      title: 'Rules',
      icon: '≡',
      content: [
        { type: 'heading', text: 'Rules' },
        { type: 'paragraph', text: 'Rules are behavioural instructions injected into the agent\'s system prompt. Unlike guardrails (which are post-hoc checks), rules shape how the agent thinks and acts from the start.' },
        { type: 'heading', text: 'Adding a Rule' },
        {
          type: 'steps',
          items: [
            'Go to Settings → Rules.',
            'Click "+ Add Rule".',
            'Give the rule a name and assign a category (e.g. "code-style", "testing", "security").',
            'Write the instruction in plain English.',
            'Click Save. Toggle to enable/disable.',
          ],
        },
        { type: 'paragraph', text: 'Rules are grouped by category in the UI for clarity. Common categories:' },
        {
          type: 'steps',
          items: [
            'general — Overall agent behaviour.',
            'code-style — Formatting and naming conventions.',
            'testing — When and how to write tests.',
            'security — Handling secrets, inputs, and permissions.',
            'git — Commit message format, branching strategy.',
          ],
        },
        { type: 'note', text: 'Keep rule instructions concise. Long, ambiguous instructions may confuse the model. One clear sentence per rule is ideal.' },
      ],
    },
    {
      id: 'skills',
      title: 'Skills',
      icon: '⚡',
      content: [
        { type: 'heading', text: 'Skills' },
        { type: 'paragraph', text: 'Skills are reusable knowledge blocks the agent can draw on when handling tasks. A skill has trigger keywords — when those words appear in a task description, the skill\'s content is automatically included in the agent\'s context.' },
        { type: 'heading', text: 'Adding a Skill' },
        {
          type: 'steps',
          items: [
            'Go to Settings → Skills.',
            'Click "+ New Skill".',
            'Set a machine-readable ID (name) and a human-friendly display name.',
            'Write a description so you can identify the skill later.',
            'Add trigger keywords (comma-separated) — e.g. "test, spec, coverage".',
            'Write the skill content in Markdown. This will be injected into the agent\'s context.',
            'Choose a scope: "global" or "repo".',
            'Click Save.',
          ],
        },
        { type: 'heading', text: 'Example use cases' },
        {
          type: 'steps',
          items: [
            'A "testing" skill that explains your project\'s test framework and conventions.',
            'A "deployment" skill that describes how to build and deploy the app.',
            'A "database" skill that lists your schema conventions and migration steps.',
          ],
        },
        { type: 'note', text: 'Skills are not run as code — they are text injected into context. Keep them focused and under 500 words for best results.' },
      ],
    },
    {
      id: 'subagents',
      title: 'Subagents',
      icon: '⊕',
      content: [
        { type: 'heading', text: 'Subagents' },
        { type: 'paragraph', text: 'Subagents are specialised AI workers that the main agent can delegate to. Each subagent has its own model, system prompt, and set of allowed tools — allowing you to create purpose-built agents for specific tasks like code review, documentation, or testing.' },
        { type: 'heading', text: 'Configuring a Subagent' },
        {
          type: 'steps',
          items: [
            'Go to Settings → Subagents.',
            'Click the row of an existing subagent (or wait for default subagents to load).',
            'In the expanded editor, choose the model (e.g. claude-opus-4-5, claude-sonnet-4-5).',
            'Edit the system prompt to define the subagent\'s persona and focus.',
            'Check the tools the subagent is allowed to use.',
            'Click Save.',
          ],
        },
        {
          type: 'table',
          headers: ['Tool', 'Description'],
          rows: [
            ['Read', 'Read files from the repository.'],
            ['Edit', 'Make targeted edits to existing files.'],
            ['Bash', 'Run shell commands (use with caution).'],
            ['Glob', 'Find files matching a pattern.'],
            ['Grep', 'Search file contents with regex.'],
            ['WebSearch', 'Search the web for information.'],
            ['Write', 'Create or overwrite files.'],
            ['Git', 'Run git commands (commit, diff, etc.).'],
          ],
        },
        { type: 'warning', text: 'Enabling the Bash and Git tools gives the subagent significant power over the host system. Only enable these for trusted subagents.' },
        { type: 'heading', text: 'Subagent pipeline' },
        { type: 'paragraph', text: 'The main agent orchestrates subagents automatically. You can see the pipeline in action on the Agent Run detail page, where each subagent\'s contribution is shown in sequence.' },
      ],
    },
    {
      id: 'webhooks',
      title: 'Webhooks & Integrations',
      icon: '⊗',
      content: [
        { type: 'heading', text: 'Webhooks & Integrations' },
        { type: 'paragraph', text: 'DevAgent accepts incoming webhooks to trigger agent runs automatically. Here\'s how to set up common integrations.' },
        { type: 'heading', text: 'GitHub Issues / PRs' },
        {
          type: 'steps',
          items: [
            'Create a Connection with App = "GitHub".',
            'Copy the webhook URL from the connection detail page.',
            'In your GitHub repo, go to Settings → Webhooks → Add webhook.',
            'Paste the webhook URL, set Content type to application/json.',
            'Add the webhook secret (the token from DevAgent).',
            'Select the events you want to trigger the agent (e.g. Issues, Pull requests).',
            'Save. The agent will now run whenever a matching event fires.',
          ],
        },
        { type: 'heading', text: 'Linear Issues' },
        {
          type: 'steps',
          items: [
            'Create a Connection with App = "Linear".',
            'In Linear, go to Settings → API → Webhooks.',
            'Add a new webhook pointing to the DevAgent webhook URL.',
            'Select Issue events. DevAgent will pick up the issue body as the task description.',
          ],
        },
        { type: 'heading', text: 'Zapier / Make / n8n' },
        { type: 'paragraph', text: 'Use the "Custom" app type and send a POST request to the webhook URL with this payload:' },
        { type: 'code', language: 'json', text: '{\n  "description": "{{task description from your automation}}",\n  "repo_path": "/absolute/path/to/repo"\n}' },
        { type: 'heading', text: 'Manually triggering a run' },
        { type: 'paragraph', text: 'You can also trigger a run from the "Test Agent" page in the sidebar, without needing a webhook.' },
      ],
    },
    {
      id: 'agent-runs',
      title: 'Agent Runs',
      icon: '▷',
      content: [
        { type: 'heading', text: 'Agent Runs' },
        { type: 'paragraph', text: 'An Agent Run is a single execution session. It tracks everything the agent did — the messages, tool calls, file diffs, and final result.' },
        { type: 'heading', text: 'Run statuses' },
        {
          type: 'table',
          headers: ['Status', 'Meaning'],
          rows: [
            ['pending', 'The run is queued and hasn\'t started yet.'],
            ['running', 'The agent is actively working on the task.'],
            ['done', 'The agent completed the task successfully.'],
            ['failed', 'The agent encountered an error and stopped.'],
          ],
        },
        { type: 'heading', text: 'Reading a run\'s output' },
        { type: 'paragraph', text: 'Open a run by clicking it on the Agent Runs page. You\'ll see:' },
        {
          type: 'steps',
          items: [
            'The task description.',
            'A real-time terminal showing the agent\'s thinking and tool calls.',
            'The subagent pipeline timeline.',
            'A diff view of every file changed.',
          ],
        },
        { type: 'heading', text: 'Aborting a run' },
        { type: 'paragraph', text: 'While a run is in "running" state, an Abort button is available on the run detail page. Aborting stops the agent mid-task — partial changes may remain on disk.' },
        { type: 'warning', text: 'Aborting a run does not undo file changes. Always review the diff before accepting partial work.' },
      ],
    },
  ];

  let activeId = $state('overview');

  let activeSection = $derived(sections.find(s => s.id === activeId) ?? sections[0]);
</script>

<div class="flex h-full min-h-screen">
  <!-- Left sidebar -->
  <nav
    class="w-52 shrink-0 py-6 px-3 border-r overflow-y-auto"
    style="background-color: var(--bg-surface); border-color: var(--border-color);"
  >
    <p
      class="text-[10px] font-mono uppercase tracking-widest px-2 mb-3"
      style="color: var(--text-secondary);"
    >
      Documentation
    </p>
    {#each sections as section}
      {@const active = activeId === section.id}
      <button
        onclick={() => (activeId = section.id)}
        class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-xs font-medium text-left transition-colors mb-0.5"
        style="
          color: {active ? 'var(--text-primary)' : 'var(--text-secondary)'};
          background-color: {active ? 'var(--bg-raised)' : 'transparent'};
        "
        onmouseenter={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-raised)';
        }}
        onmouseleave={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
        }}
      >
        <span class="text-[11px]" style="color: {active ? 'var(--text-primary)' : 'var(--text-muted)'};">{section.icon}</span>
        {section.title}
      </button>
    {/each}
  </nav>

  <!-- Content area -->
  <main class="flex-1 min-w-0 py-10 px-12 overflow-y-auto max-w-3xl">
    {#key activeId}
      <article>
        {#each activeSection.content as block}
          {#if block.type === 'heading'}
            <h2
              class="text-base font-semibold mb-3 mt-8 first:mt-0"
              style="color: var(--text-primary);"
            >
              {block.text}
            </h2>

          {:else if block.type === 'paragraph'}
            <p
              class="text-sm leading-relaxed mb-4"
              style="color: var(--text-secondary);"
            >
              {block.text}
            </p>

          {:else if block.type === 'steps'}
            <ol class="flex flex-col gap-2 mb-4 pl-0">
              {#each (block.items ?? []) as item, i}
                <li class="flex gap-3 text-sm leading-relaxed" style="color: var(--text-secondary);">
                  <span
                    class="shrink-0 mt-px w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold"
                    style="background-color: var(--bg-raised); color: var(--text-primary); border: 1px solid var(--border-color);"
                  >
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </li>
              {/each}
            </ol>

          {:else if block.type === 'code'}
            <div
              class="rounded-lg border mb-4 overflow-x-auto"
              style="border-color: var(--border-color); background-color: var(--bg-raised);"
            >
              <div
                class="flex items-center gap-2 px-4 py-2 border-b text-[10px] font-mono"
                style="border-color: var(--border-color); color: var(--text-muted);"
              >
                <span
                  class="px-1.5 py-0.5 rounded"
                  style="background-color: var(--bg-overlay); color: var(--text-secondary);"
                >
                  {block.language ?? 'code'}
                </span>
              </div>
              <pre
                class="px-4 py-3 text-xs font-mono overflow-x-auto"
                style="color: var(--text-primary);"
              >{block.text}</pre>
            </div>

          {:else if block.type === 'note'}
            <div
              class="flex gap-3 rounded-lg border px-4 py-3 mb-4"
              style="border-color: var(--callout-note-border); background-color: var(--callout-note-bg);"
            >
              <span class="text-amber-400 text-sm shrink-0 mt-px">ℹ</span>
              <p class="text-xs leading-relaxed" style="color: var(--text-secondary);">{block.text}</p>
            </div>

          {:else if block.type === 'warning'}
            <div
              class="flex gap-3 rounded-lg border px-4 py-3 mb-4"
              style="border-color: var(--callout-warn-border); background-color: var(--callout-warn-bg);"
            >
              <span class="text-red-400 text-sm shrink-0 mt-px">⚠</span>
              <p class="text-xs leading-relaxed" style="color: var(--text-secondary);">{block.text}</p>
            </div>

          {:else if block.type === 'table'}
            <div
              class="rounded-lg border overflow-hidden mb-4"
              style="border-color: var(--border-color);"
            >
              <table class="w-full text-xs font-mono">
                <thead style="background-color: var(--bg-raised);">
                  <tr>
                    {#each (block.headers ?? []) as header}
                      <th
                        class="text-left px-4 py-2.5 font-medium uppercase tracking-widest text-[10px]"
                        style="color: var(--text-secondary); border-bottom: 1px solid var(--border-color);"
                      >
                        {header}
                      </th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  {#each (block.rows ?? []) as row, ri}
                    <tr
                      style="background-color: {ri % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)'}; border-bottom: 1px solid var(--border-color);"
                    >
                      {#each row as cell, ci}
                        <td
                          class="px-4 py-2.5"
                          style="color: {ci === 0 ? 'var(--text-primary)' : 'var(--text-secondary)'};"
                        >
                          {cell}
                        </td>
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        {/each}
      </article>
    {/key}
  </main>
</div>
