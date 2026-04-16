-- Repositories
create table futureai_repos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path text not null,
  github_url text,
  detected_stack text,
  has_claude_md boolean default false,
  created_at timestamptz default now()
);

-- Tasks
create table futureai_tasks (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid references futureai_repos(id) on delete cascade,
  description text not null,
  status text default 'pending' check (status in ('pending','running','done','failed')),
  session_id text,
  pr_url text,
  system_prompt_snapshot text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Task stream messages
create table futureai_task_messages (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references futureai_tasks(id) on delete cascade,
  type text not null,
  content text,
  agent_id text,
  created_at timestamptz default now()
);

-- Guardrails
create table futureai_guardrails (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rule text not null,
  severity text default 'error' check (severity in ('error', 'warning')),
  enabled boolean default true,
  scope text default 'global' check (scope in ('global', 'repo')),
  repo_id uuid references futureai_repos(id) on delete cascade,
  is_builtin boolean default false,
  created_at timestamptz default now()
);

-- Behavior rules
create table futureai_behavior_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text default 'custom' check (category in ('code-style','communication','workflow','testing','custom')),
  instruction text not null,
  enabled boolean default true,
  scope text default 'global' check (scope in ('global', 'repo')),
  repo_id uuid references futureai_repos(id) on delete cascade,
  priority integer default 100,
  created_at timestamptz default now()
);

-- Skills
create table futureai_agent_skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  description text not null,
  content text not null,
  trigger_keywords text[] default '{}',
  enabled boolean default true,
  scope text default 'global' check (scope in ('global', 'repo')),
  repo_id uuid references futureai_repos(id) on delete cascade,
  is_builtin boolean default false,
  created_at timestamptz default now()
);

-- Subagent configs
create table futureai_subagent_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  description text not null,
  system_prompt text not null,
  allowed_tools text[] default '{}',
  model text default 'sonnet' check (model in ('sonnet','opus','haiku')),
  enabled boolean default true,
  is_builtin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed: default guardrails
insert into futureai_guardrails (name, rule, severity, is_builtin) values
  ('No force push', 'Never force-push to main or master branches', 'error', true),
  ('No file deletion without confirmation', 'Never delete files without explicit user confirmation in the task description', 'error', true),
  ('No secrets in commits', 'Never commit secrets, API keys, tokens, or credentials of any kind', 'error', true),
  ('No lockfile edits', 'Never directly edit package-lock.json, yarn.lock, or pnpm-lock.yaml', 'warning', true),
  ('Tests must pass before PR', 'Always run the full test suite before creating a PR. Abort and report if any tests fail.', 'error', true),
  ('No migration edits', 'Never edit database migration files that have already been applied to production', 'error', true),
  ('Sandbox bash commands', 'Limit all Bash command execution to the project directory and its subdirectories only', 'error', true);

-- Seed: default behavior rules
insert into futureai_behavior_rules (name, category, instruction, priority) values
  ('Match existing style', 'code-style', 'Match the indentation, formatting, and naming style already present in each file. Do not run formatters or linters unless the task explicitly asks for it.', 10),
  ('Plain language explanations', 'communication', 'When explaining a fix or decision, use plain language. Avoid jargon. Assume the reader may not be the original author of the code.', 20),
  ('Plan before editing', 'workflow', 'Before editing any file, output a brief one-paragraph plan of what you intend to change and why.', 30),
  ('Prefer editing existing tests', 'testing', 'Prefer editing existing tests over writing new ones when the behavior change is minor. Only create new test files when no relevant test file exists.', 40),
  ('Ask when ambiguous', 'workflow', 'If a task description is ambiguous or could be interpreted multiple ways, output a numbered list of clarifying questions instead of guessing at intent.', 50);
