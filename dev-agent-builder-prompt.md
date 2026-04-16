# DevAgent Builder — LLM Implementation Prompt

> **What this is:** A prompt you paste into any capable LLM agent (Claude Code, Cursor, OpenHands, etc.) to bootstrap a self-contained AI Developer Agent platform — a mini-OpenHands built on the Claude Agent SDK, with a UI that lets it build itself and eventually connect to any codebase you have access to.

---

## THE PROMPT

Paste everything below the `---` line into your LLM agent:

---

You are building **DevAgent** — a self-hosted AI developer agent platform built on the **Claude Agent SDK**. This is a greenfield SvelteKit project. Your job is to scaffold the full application: the UI, the backend API routes, and the agent runtime wiring. The system should be capable of receiving bug reports or feature tasks, spinning up a Claude agent to work on them, and streaming the agent's progress back to the UI in real time.

This is a **self-building system** — the agent you are implementing will later be used to work on this very codebase and any other project the user connects to it.

---

## PHASE 1 — Project Bootstrap

Initialize a new SvelteKit project with the following stack:

- **Framework:** SvelteKit (latest, with TypeScript)
- **Styling:** Tailwind CSS v4
- **Database/Auth:** Supabase (JS client only for now — schema will come later)
- **Agent Runtime:** `claude-agent-sdk` (Python) exposed via a FastAPI microservice
- **Package manager:** npm

Run the following to bootstrap:

```bash
npm create svelte@latest devagent -- --template skeleton --types typescript
cd devagent
npm install
npx svelte-add@latest tailwindcss
npm install @supabase/supabase-js
```

For the Python agent service:

```bash
mkdir agent-service && cd agent-service
python -m venv venv && source venv/bin/activate
pip install claude-agent-sdk fastapi uvicorn python-dotenv
```

---

## PHASE 2 — The Agent Service (FastAPI + Claude Agent SDK)

Create `agent-service/main.py`. This is the brain of the system.

### Requirements:

**POST `/run-agent`**
- Accepts: `{ task: string, repo_path: string, session_id?: string }`
- Streams back NDJSON (newline-delimited JSON) messages as the agent works
- Uses `claude-agent-sdk`'s async `query()` function with the following subagent architecture:

```
Main Orchestrator
├── bug-analyzer     → identifies root cause, affected files
├── code-fixer       → applies targeted edits
├── qa-validator     → runs tests, checks for regressions
└── pr-creator       → generates commit message + opens GitHub PR
```

Each subagent should have:
- Its own focused `prompt` (system instruction)
- Restricted `tools` list (principle of least privilege)
- `model: "sonnet"` unless specified otherwise

**GET `/sessions/{session_id}`**
- Returns the message history for a given session

**POST `/connect-repo`**
- Accepts: `{ repo_path: string, name: string }`
- Validates the path exists and has a recognizable project structure
- Returns: `{ id, name, detected_stack, has_claude_md }`

### Agent configuration:

```python
agents = {
    "bug-analyzer": AgentDefinition(
        description="Use FIRST to analyze any bug report or task. Identifies root cause, traces call paths, and lists files that need changing.",
        prompt="""You are a senior debugger and code archaeologist. Given a bug report:
1. Read relevant source files to understand the codebase structure
2. Trace the execution path that leads to the bug
3. Identify the root cause precisely — not symptoms
4. List every file that needs to change, with a brief reason for each
5. Output a structured analysis that the code-fixer subagent can act on

Be surgical. Do not suggest rewrites. Focus only on what's broken.""",
        tools=["Read", "Glob", "Grep", "Bash"]
    ),
    "code-fixer": AgentDefinition(
        description="Use AFTER bug-analyzer has identified the root cause and files to change. Applies targeted fixes only.",
        prompt="""You are a precise, minimal code editor. You receive a bug analysis and apply fixes.
Rules:
- Edit only the files identified in the analysis
- Make the smallest change that fixes the problem
- Preserve existing code style, naming conventions, and patterns
- Add a brief inline comment for non-obvious changes
- Do NOT refactor unrelated code
- Do NOT change tests unless the test itself is wrong""",
        tools=["Read", "Edit", "Bash"]
    ),
    "qa-validator": AgentDefinition(
        description="Use AFTER code-fixer has applied changes. Validates the fix by running tests and checking edge cases.",
        prompt="""You are a thorough QA engineer. Given a code fix:
1. Run the existing test suite — report any failures
2. Check edge cases the fix might have missed
3. Verify the fix doesn't introduce regressions in related code
4. If tests are missing for the fixed behavior, write minimal tests to cover it
5. Output a clear PASS or FAIL verdict with reasoning""",
        tools=["Read", "Bash", "Glob", "Edit"]
    ),
    "pr-creator": AgentDefinition(
        description="Use AFTER qa-validator confirms PASS. Creates a git commit and opens a GitHub pull request.",
        prompt="""You are a professional engineer creating a pull request.
1. Stage only the changed files (never stage unrelated changes)
2. Write a commit message following Conventional Commits format (fix: ...)
3. Create a PR with: summary of the bug, root cause, what was changed, and how it was tested
4. Use the `gh` CLI to open the PR against the main branch""",
        tools=["Bash"]
    )
}
```

The `allowedTools` for the main orchestrator must include `"Task"` to enable subagent spawning.

Use `permission_mode="acceptEdits"` and `permission_mode="bypassPermissions"` only for the agent service, never expose that to the UI without a confirmation step.

Stream each message from the async iterator back to the client as NDJSON. Include `type`, `content`, `agent_id` (if from a subagent), and `timestamp` in each message.

---

## PHASE 3 — SvelteKit Frontend

Build the UI in `src/`. This is the interface through which users manage repos, submit tasks, and watch agents work.

### Design direction:

Industrial-utilitarian dark theme. Think a terminal crossed with a mission control dashboard. Use a monospace font for agent output, a clean sans-serif for UI chrome. Color palette: near-black background (`#0a0a0a`), muted zinc grays for surfaces, electric amber (`#f59e0b`) as the single accent. No purple gradients. No rounded cards. Sharp borders, intentional density.

### Pages / Routes:

**`/` — Dashboard**
- List of connected repositories (name, detected stack, last task, status badge)
- "Connect Repository" button → opens a modal to input a local path or GitHub URL
- Recent tasks feed (last 10 tasks across all repos, with status: pending / running / done / failed)
- Global agent status indicator (idle / active / how many subagents are running)

**`/repos/[id]` — Repository View**
- Repo metadata: name, path, detected stack, CLAUDE.md status
- Task input form: textarea for bug report / feature request, submit button
- Task history list for this repo

**`/tasks/[id]` — Task View (the main event)**
- Task description at the top
- **Live agent terminal** — streams the agent's output in real time via `EventSource` or `fetch` with a `ReadableStream`
- Subagent activity panel: shows which subagent is currently active (bug-analyzer / code-fixer / qa-validator / pr-creator) with a visual pipeline stepper
- File diff panel: as the code-fixer edits files, show the diffs as they happen
- Final output: PR link, test results summary, or error message
- Abort button (calls DELETE `/run-agent/{session_id}`)

### Components to build:

```
src/
  lib/
    components/
      AgentTerminal.svelte     ← streaming log output with typewriter feel
      SubagentPipeline.svelte  ← visual stepper (Analyze → Fix → QA → PR)
      FileDiff.svelte          ← before/after diff viewer
      RepoCard.svelte          ← repo summary card
      TaskForm.svelte          ← bug report input
      StatusBadge.svelte       ← pending/running/done/failed
    stores/
      agent.ts                 ← writable store for active session state
      repos.ts                 ← repo list store
    api/
      agent.ts                 ← fetch wrappers for the FastAPI service
  routes/
    +page.svelte               ← Dashboard
    repos/[id]/+page.svelte    ← Repo view
    tasks/[id]/+page.svelte    ← Task view
    api/
      agent/+server.ts         ← proxy to FastAPI service (keeps API key server-side)
```

### Streaming implementation:

In `AgentTerminal.svelte`, consume the NDJSON stream like this:

```typescript
async function streamTask(taskId: string) {
    const response = await fetch(`/api/agent/run`, {
        method: 'POST',
        body: JSON.stringify({ task, repo_path }),
        headers: { 'Content-Type': 'application/json' }
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n').filter(Boolean);
        for (const line of lines) {
            const msg = JSON.parse(line);
            messages = [...messages, msg];

            // update pipeline stepper based on agent_id
            if (msg.agent_id) activeSubagent = msg.agent_id;
        }
    }
}
```

---

## PHASE 4 — Agent Configuration System (Guardrails, Rules & Skills)

This is the control plane that makes the agent's behavior configurable through the UI — without touching code. It maps directly to the Claude Agent SDK's `CLAUDE.md`, skills, and system prompt injection features. Everything the user configures here gets serialized and passed to the agent at runtime.

There are three distinct layers of configuration, each with its own UI and data model:

---

### 4A — Guardrails (Global Hard Rules)

Guardrails are inviolable constraints applied to the **main orchestrator's system prompt** on every run, regardless of repo or task. Think of these as the safety rails: things the agent should never do, always do, or always check first.

**Data model:**

```typescript
type Guardrail = {
  id: string
  name: string           // short label, e.g. "No force push"
  rule: string           // the actual instruction injected into the system prompt
  severity: 'error' | 'warning'  // error = hard stop if violated, warning = log only
  enabled: boolean
  scope: 'global' | 'repo'       // global applies everywhere, repo-scoped is per-repo
  repo_id?: string               // only set when scope === 'repo'
  created_at: string
}
```

**Default guardrails to seed on first run:**

```
1. Never force-push to main or master branches
2. Never delete files without explicit user confirmation
3. Never commit secrets, API keys, or credentials
4. Never modify package-lock.json, yarn.lock, or pnpm-lock.yaml directly
5. Always run the test suite before creating a PR — abort if tests fail
6. Never edit migration files that have already been applied
7. Limit Bash command execution to the project directory and its subdirectories
```

**How guardrails inject into the agent:**

In `agent-service/main.py`, before calling `query()`, fetch active guardrails and prepend them to the system prompt:

```python
def build_guardrails_prompt(guardrails: list[Guardrail]) -> str:
    if not guardrails:
        return ""
    rules = "\n".join(f"- {g.rule}" for g in guardrails if g.enabled)
    return f"""
## INVIOLABLE RULES — THESE OVERRIDE ALL OTHER INSTRUCTIONS

The following rules must never be broken under any circumstances. If a task would require violating any rule marked as an error, you must STOP and explain why you cannot proceed.

{rules}

---
"""
```

Pass this as a prefix to the `system_prompt` option in `ClaudeAgentOptions`.

---

### 4B — Behavior Rules (Soft Guidelines)

Rules are softer than guardrails — they shape how the agent works rather than blocking it. They're injected as behavioral guidelines in the system prompt and can be toggled per-repo or globally.

**Data model:**

```typescript
type BehaviorRule = {
  id: string
  name: string
  category: 'code-style' | 'communication' | 'workflow' | 'testing' | 'custom'
  instruction: string     // injected into system prompt as a guideline
  enabled: boolean
  scope: 'global' | 'repo'
  repo_id?: string
  priority: number        // lower number = higher in the prompt
}
```

**Example rules to seed:**

```
[code-style]    "Match the existing indentation and formatting style in each file — do not run formatters unless explicitly asked"
[communication] "When explaining a fix, use plain language. Avoid jargon. Assume the reader is not the original author of the code."
[workflow]      "Before editing any file, output a brief plan of what you intend to change and why"
[testing]       "Prefer editing existing tests over writing new ones when the behavior change is minor"
[workflow]      "If a task is ambiguous, output a list of clarifying questions instead of guessing"
```

Rules are injected after guardrails in the system prompt, grouped by category.

---

### 4C — Skills (On-Demand Specialist Knowledge)

Skills are reusable markdown documents the agent can invoke when it detects it needs specialized knowledge. This maps directly to the Claude Agent SDK's skills system — each skill is a `.md` file placed in `.claude/skills/` that the agent loads into context when triggered.

**Data model:**

```typescript
type AgentSkill = {
  id: string
  name: string           // slug, e.g. "supabase-rls"
  display_name: string   // e.g. "Supabase Row Level Security"
  description: string    // when should the agent use this? (shown in UI + used as trigger description)
  content: string        // the full markdown skill document
  trigger_keywords: string[]  // e.g. ["supabase", "rls", "policy", "auth"]
  enabled: boolean
  scope: 'global' | 'repo'
  repo_id?: string
}
```

**How skills work at runtime:**

Skills are passed to `ClaudeAgentOptions` as the `skills` parameter (or written to `.claude/skills/` before the agent runs). The agent SDK automatically activates them based on keyword matching in the user's task.

In the agent service, before running a task:

```python
async def prepare_skills(task: str, repo_id: str) -> list[SkillDefinition]:
    """Load enabled skills whose trigger_keywords appear in the task."""
    all_skills = await db.get_skills(repo_id=repo_id, scope_includes_global=True)
    task_lower = task.lower()
    active = [
        s for s in all_skills
        if s.enabled and any(kw in task_lower for kw in s.trigger_keywords)
    ]
    return [SkillDefinition(name=s.name, prompt=s.content) for s in active]
```

**Pre-built skills to ship with the app (stored in the DB, editable via UI):**

```
skill: "sveltekit-patterns"
trigger: ["svelte", "sveltekit", "load function", "server route", "+page"]
content: Best practices for SvelteKit — how to use load functions, form actions,
         +server.ts API routes, and the $lib alias correctly.

skill: "supabase-rls"
trigger: ["supabase", "rls", "row level security", "policy", "auth.uid"]
content: Guide to Supabase RLS policies — common patterns, how to test them,
         and pitfalls that cause data to silently return empty.

skill: "typescript-strict"
trigger: ["typescript", "type error", "ts", "any type"]
content: How to fix TypeScript strict mode errors without using `any` or casting.

skill: "conventional-commits"
trigger: ["commit", "pr", "pull request", "changelog"]
content: Conventional Commits spec — fix/feat/chore prefixes, breaking changes,
         scope formatting, and PR description templates.

skill: "playwright-testing"
trigger: ["playwright", "e2e", "test", "browser test"]
content: How to write reliable Playwright tests — locator strategy, waiting for
         network idle, avoiding flaky selectors.
```

Users can create custom skills from the UI — e.g., a skill for their internal API conventions, their team's error handling patterns, or how their specific monorepo is structured.

---

### 4D — Subagent Editor

The four built-in subagents (bug-analyzer, code-fixer, qa-validator, pr-creator) should be editable from the UI. Users may want to tune the system prompts, change which tools are allowed, or adjust the model.

**Data model:**

```typescript
type SubagentConfig = {
  id: string
  name: string                  // slug, e.g. "bug-analyzer"
  display_name: string
  description: string           // when does the orchestrator invoke this?
  system_prompt: string         // the agent's core instruction
  allowed_tools: string[]       // subset of: Read, Edit, Glob, Grep, Bash, WebSearch
  model: 'sonnet' | 'opus' | 'haiku'
  enabled: boolean
  is_builtin: boolean           // built-ins can be edited but not deleted
}
```

The agent service should load subagent configs from the DB at runtime (with a hot-reload mechanism or per-request DB read), so changes in the UI take effect on the next task run without a service restart.

---

### 4E — UI Pages for Configuration

Add a **`/settings`** section to the app with four tabs:

**Tab 1: Guardrails**
- Table of all guardrails (name, severity badge, scope, enabled toggle)
- Add new guardrail form: name, rule text (textarea), severity selector, scope selector
- Inline edit on click
- Danger zone: "Reset to defaults" button

**Tab 2: Behavior Rules**
- Grouped by category (code-style / communication / workflow / testing / custom)
- Each rule shows: name, instruction preview (truncated), enabled toggle
- Add rule form: name, category, full instruction textarea, scope, priority
- Drag-to-reorder within category (priority determines prompt injection order)

**Tab 3: Skills**
- Card grid: skill name, description, trigger keywords as chips, enabled toggle
- "New Skill" → full-page editor with:
  - Name, display name, description fields
  - Trigger keywords input (tag-style input, comma-separated)
  - Markdown editor for skill content (with preview toggle)
  - Scope selector (global or specific repo)
- Each built-in skill has a "View Source" → Edit flow

**Tab 4: Subagents**
- List of subagents with name, model badge, enabled toggle
- Click to expand → inline editor for:
  - System prompt (large textarea)
  - Allowed tools (multi-select checkbox group)
  - Model selector
  - Description (used by orchestrator for routing)
- "Test this subagent" button → opens a modal to send a test message and see raw output
- "Add custom subagent" → creates a new entry that the orchestrator can route to

---

### 4F — Per-Repo Configuration Override

On the `/repos/[id]` page, add a **"Agent Config"** tab alongside the task history. This shows:

- Which global guardrails are active (read-only list, with toggle to exempt this repo from specific ones)
- Repo-scoped rules (rules that only apply when working on this repo)
- Repo-scoped skills (skills only available for this repo — e.g., internal API conventions)
- A live preview of the **full system prompt** that would be sent on the next task: guardrails + rules + active skills stitched together, in a read-only code block

This preview is critical — it makes the configuration system transparent and debuggable.

---

## PHASE 5 — Supabase Schema

Create `supabase/migrations/001_initial.sql`:

```sql
-- Repositories
create table repos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path text not null,
  github_url text,
  detected_stack text,
  has_claude_md boolean default false,
  created_at timestamptz default now()
);

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid references repos(id) on delete cascade,
  description text not null,
  status text default 'pending' check (status in ('pending','running','done','failed')),
  session_id text,
  pr_url text,
  system_prompt_snapshot text,  -- the full resolved prompt used for this run (for debugging)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Task stream messages
create table task_messages (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  type text not null,
  content text,
  agent_id text,
  created_at timestamptz default now()
);

-- Guardrails
create table guardrails (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rule text not null,
  severity text default 'error' check (severity in ('error', 'warning')),
  enabled boolean default true,
  scope text default 'global' check (scope in ('global', 'repo')),
  repo_id uuid references repos(id) on delete cascade,
  is_builtin boolean default false,
  created_at timestamptz default now()
);

-- Behavior rules
create table behavior_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text default 'custom' check (category in ('code-style','communication','workflow','testing','custom')),
  instruction text not null,
  enabled boolean default true,
  scope text default 'global' check (scope in ('global', 'repo')),
  repo_id uuid references repos(id) on delete cascade,
  priority integer default 100,
  created_at timestamptz default now()
);

-- Skills
create table agent_skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  description text not null,
  content text not null,            -- full markdown skill document
  trigger_keywords text[] default '{}',
  enabled boolean default true,
  scope text default 'global' check (scope in ('global', 'repo')),
  repo_id uuid references repos(id) on delete cascade,
  is_builtin boolean default false,
  created_at timestamptz default now()
);

-- Subagent configs
create table subagent_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,        -- slug: "bug-analyzer"
  display_name text not null,
  description text not null,        -- routing description for orchestrator
  system_prompt text not null,
  allowed_tools text[] default '{}',
  model text default 'sonnet' check (model in ('sonnet','opus','haiku')),
  enabled boolean default true,
  is_builtin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed: default guardrails
insert into guardrails (name, rule, severity, is_builtin) values
  ('No force push', 'Never force-push to main or master branches', 'error', true),
  ('No file deletion without confirmation', 'Never delete files without explicit user confirmation in the task description', 'error', true),
  ('No secrets in commits', 'Never commit secrets, API keys, tokens, or credentials of any kind', 'error', true),
  ('No lockfile edits', 'Never directly edit package-lock.json, yarn.lock, or pnpm-lock.yaml', 'warning', true),
  ('Tests must pass before PR', 'Always run the full test suite before creating a PR. Abort and report if any tests fail.', 'error', true),
  ('No migration edits', 'Never edit database migration files that have already been applied to production', 'error', true),
  ('Sandbox bash commands', 'Limit all Bash command execution to the project directory and its subdirectories only', 'error', true);

-- Seed: default behavior rules
insert into behavior_rules (name, category, instruction, priority) values
  ('Match existing style', 'code-style', 'Match the indentation, formatting, and naming style already present in each file. Do not run formatters or linters unless the task explicitly asks for it.', 10),
  ('Plain language explanations', 'communication', 'When explaining a fix or decision, use plain language. Avoid jargon. Assume the reader may not be the original author of the code.', 20),
  ('Plan before editing', 'workflow', 'Before editing any file, output a brief one-paragraph plan of what you intend to change and why.', 30),
  ('Prefer editing existing tests', 'testing', 'Prefer editing existing tests over writing new ones when the behavior change is minor. Only create new test files when no relevant test file exists.', 40),
  ('Ask when ambiguous', 'workflow', 'If a task description is ambiguous or could be interpreted multiple ways, output a numbered list of clarifying questions instead of guessing at intent.', 50);
```

---

## PHASE 6 — Configuration & Environment

Create `.env.example`:

```env
# Anthropic
ANTHROPIC_API_KEY=your_key_here

# Supabase
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Agent Service
AGENT_SERVICE_URL=http://localhost:8000

# GitHub (for PR creation)
GITHUB_TOKEN=your_github_token
```

Create `agent-service/.env.example` with the same ANTHROPIC_API_KEY and GITHUB_TOKEN.

---

## PHASE 7 — Dev Startup Scripts

Create `dev.sh` at the root:

```bash
#!/bin/bash
# Start both services concurrently

echo "Starting DevAgent..."

# Start Python agent service
cd agent-service
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
AGENT_PID=$!

# Start SvelteKit
cd ..
npm run dev &
SVELTE_PID=$!

echo "Agent service: http://localhost:8000"
echo "UI: http://localhost:5173"

# Kill both on Ctrl+C
trap "kill $AGENT_PID $SVELTE_PID" EXIT
wait
```

---

## PHASE 8 — CLAUDE.md for Self-Improvement

Create `.claude/CLAUDE.md` at the project root. This file gives the agent context when it works on this very codebase:

```markdown
# DevAgent — Project Context

This is the DevAgent platform itself. A SvelteKit + FastAPI application that hosts Claude Agent SDK-powered developer agents.

## Architecture

- `src/` — SvelteKit frontend
- `agent-service/` — FastAPI Python service that runs claude-agent-sdk
- `supabase/` — Database migrations

## Key patterns

- Agent output is streamed as NDJSON from FastAPI → SvelteKit API route → browser
- Subagents are defined in the DB (`subagent_configs` table) and loaded at runtime in `agent-service/main.py`
- The `SubagentPipeline` component tracks which subagent is active based on `agent_id` in stream messages
- Guardrails are prepended to the system prompt before every task run
- Behavior rules are injected after guardrails, grouped by category
- Skills are activated by keyword matching against the task text

## Configuration system

The agent's behavior is controlled through four layers loaded from Supabase at runtime:
1. Guardrails → inviolable rules, prepended first in system prompt
2. Behavior rules → soft guidelines, injected after guardrails
3. Skills → on-demand specialist knowledge, keyword-activated
4. Subagent configs → per-subagent system prompts, tools, and model

All of these are editable via the `/settings` UI without touching code.

## When fixing bugs in this project

- The agent service is the most sensitive part — test changes with `pytest agent-service/tests/`
- Never modify `allowedTools` on subagents without considering privilege escalation
- The streaming pipeline is fragile around NDJSON parsing — always emit complete JSON lines
- The system prompt snapshot is stored in the `tasks` table for every run — use it to debug unexpected agent behavior

## Stack versions

- SvelteKit: latest
- Tailwind: v4
- claude-agent-sdk: latest (Python)
- FastAPI: latest
```

---

## IMPLEMENTATION ORDER

Build in this sequence. Each phase should be committed before moving to the next:

1. `git init` + project bootstrap (Phase 1)
2. FastAPI agent service with hardcoded subagents and streaming (Phase 2) — test with `curl` before touching the UI
3. Supabase schema + seed data (Phase 5)
4. SvelteKit routes and stores — no streaming yet, use mock data (Phase 3 partial)
5. Wire streaming from agent service to `AgentTerminal` component
6. `SubagentPipeline` and `FileDiff` components
7. `/settings` UI — all four tabs (Phase 4E)
8. Agent service reads guardrails, rules, skills, and subagent configs from DB at runtime (Phase 4A–4D)
9. Per-repo config override tab on `/repos/[id]` with live system prompt preview (Phase 4F)
10. `CLAUDE.md` + dev scripts (Phases 7–8)

**Critical order note:** Steps 2 and 7–8 are deliberately separated. Get the agent working with hardcoded config first. Only connect it to the DB-driven config system (step 8) once the streaming pipeline is stable. This keeps debugging simple.

---

## SUCCESS CRITERIA

The implementation is complete when:

- [ ] `./dev.sh` starts both services with no errors
- [ ] A user can add a local repository path via the UI
- [ ] A user can submit a bug report and watch the subagent pipeline advance live
- [ ] Agent log output streams into `AgentTerminal` in real time
- [ ] On completion, a PR URL appears (or a clear error message)
- [ ] All task messages are persisted in Supabase, including a `system_prompt_snapshot`
- [ ] `/settings` → Guardrails tab: user can add/edit/toggle guardrails and they affect the next task run
- [ ] `/settings` → Rules tab: user can reorder and toggle behavior rules
- [ ] `/settings` → Skills tab: user can create a custom skill with trigger keywords and it activates when those keywords appear in a task
- [ ] `/settings` → Subagents tab: user can edit a subagent's system prompt and the next task uses the new prompt
- [ ] `/repos/[id]` → Agent Config tab: shows live system prompt preview for this repo
- [ ] The agent can be pointed at its own codebase (`devagent/`) to fix bugs in itself
