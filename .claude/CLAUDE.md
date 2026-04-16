# DevAgent — Project Context

This is the DevAgent platform itself. A SvelteKit + TypeScript/Fastify application that hosts Claude-powered developer agents.

## Architecture

- `src/` — SvelteKit 5 frontend (TypeScript, Tailwind CSS v4)
- `agent-service/` — Fastify TypeScript service that runs the Anthropic SDK agentic loop
- `supabase/migrations/` — Database schema
- `static/` — Static assets

## Key patterns

- Agent output is streamed as NDJSON from Fastify → SvelteKit API route (`/api/agent/run`) → browser
- Subagents are defined in `agent-service/src/agents.ts` (and eventually loaded from the DB `subagent_configs` table)
- The `SubagentPipeline` component tracks which subagent is active based on `agent_id` in stream messages
- Guardrails are prepended to the system prompt before every task run
- Behavior rules are injected after guardrails, grouped by category
- Skills are activated by keyword matching against the task text
- The agentic tool-use loop is in `agent-service/src/agents.ts` → `runAgentPipeline()`
- Tools (Read, Edit, Bash, Glob, Grep) are implemented in `agent-service/src/tools.ts`

## Agent Service

The agent service (`agent-service/`) is a standalone Fastify server on port 8000. It:
1. Receives tasks via `POST /run-agent`
2. Runs the 4-subagent pipeline: bug-analyzer → code-fixer → qa-validator → pr-creator
3. Streams NDJSON messages back in real time
4. Optionally persists to Supabase (works fine without DB configured)

## Configuration system

The agent's behavior is controlled through four layers loaded from Supabase at runtime:
1. Guardrails → inviolable rules, prepended first in system prompt
2. Behavior rules → soft guidelines, injected after guardrails
3. Skills → on-demand specialist knowledge, keyword-activated
4. Subagent configs → per-subagent system prompts, tools, and model

All of these are editable via the `/settings` UI without touching code.
In-memory defaults are used when Supabase is not configured.

## When fixing bugs in this project

- The agent service is the most sensitive part — test streaming with `curl -N -X POST http://localhost:8000/run-agent -H 'Content-Type: application/json' -d '{"task":"test","repo_path":"/tmp"}'`
- The streaming pipeline is fragile around NDJSON parsing — always emit complete JSON lines followed by `\n`
- The system prompt snapshot is stored in the `tasks` table for every run — use it to debug unexpected agent behavior
- Never modify `allowed_tools` on subagents without considering privilege escalation
- All file tool operations are sandboxed to `repo_path` via path prefix checks in `tools.ts`

## Stack versions

- SvelteKit: 2.x (Svelte 5)
- Tailwind: v4
- @anthropic-ai/sdk: 0.39.x
- Fastify: 5.x
- Node.js: 22+
