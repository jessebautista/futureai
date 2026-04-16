import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Task, TaskMessage, Repo, Guardrail, BehaviorRule, AgentSkill, SubagentConfig, StreamMessage } from './types.js';

let _db: SupabaseClient | null = null;
let _initialized = false;

export function getDb(): SupabaseClient | null {
  if (_initialized) return _db;
  _initialized = true;

  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_KEY'];

  if (!url || !key) {
    console.warn('SUPABASE_URL or SUPABASE_SERVICE_KEY not set — running without database.');
    _db = null;
    return null;
  }

  _db = createClient(url, key);
  return _db;
}

export async function createTask(
  repoId: string,
  description: string,
  sessionId?: string,
  systemPromptSnapshot?: string
): Promise<Task | null> {
  const db = getDb();
  if (!db) return null;

  const { data, error } = await db
    .from('futureai_tasks')
    .insert({
      repo_id: repoId,
      description,
      status: 'pending',
      session_id: sessionId ?? null,
      system_prompt_snapshot: systemPromptSnapshot ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('createTask error:', error);
    return null;
  }
  return data as Task;
}

export async function updateTaskStatus(taskId: string, status: Task['status'], prUrl?: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  const updates: Partial<Task> & { updated_at?: string } = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (prUrl !== undefined) {
    updates.pr_url = prUrl;
  }

  const { error } = await db.from('futureai_tasks').update(updates).eq('id', taskId);
  if (error) {
    console.error('updateTaskStatus error:', error);
  }
}

export async function saveTaskMessage(taskId: string, msg: StreamMessage): Promise<void> {
  const db = getDb();
  if (!db) return;

  const { error } = await db.from('futureai_task_messages').insert({
    task_id: taskId,
    type: msg.type,
    content: msg.content ?? null,
    agent_id: msg.agent_id ?? null,
  });

  if (error) {
    console.error('saveTaskMessage error:', error);
  }
}

export async function getTaskMessages(taskId: string): Promise<TaskMessage[]> {
  const db = getDb();
  if (!db) return [];

  const { data, error } = await db
    .from('futureai_task_messages')
    .select()
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getTaskMessages error:', error);
    return [];
  }
  return (data ?? []) as TaskMessage[];
}

export async function getTask(taskId: string): Promise<Task | null> {
  const db = getDb();
  if (!db) return null;

  const { data, error } = await db.from('futureai_tasks').select().eq('id', taskId).single();
  if (error) {
    console.error('getTask error:', error);
    return null;
  }
  return data as Task;
}

export async function listTasks(repoId?: string): Promise<Task[]> {
  const db = getDb();
  if (!db) return [];

  let query = db.from('futureai_tasks').select().order('created_at', { ascending: false });
  if (repoId) {
    query = query.eq('repo_id', repoId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('listTasks error:', error);
    return [];
  }
  return (data ?? []) as Task[];
}

export async function createRepo(name: string, repoPath: string, githubUrl?: string): Promise<Repo | null> {
  const db = getDb();
  if (!db) return null;

  const { data, error } = await db
    .from('futureai_repos')
    .insert({
      name,
      path: repoPath,
      github_url: githubUrl ?? null,
      has_claude_md: false,
    })
    .select()
    .single();

  if (error) {
    console.error('createRepo error:', error);
    return null;
  }
  return data as Repo;
}

export async function getRepo(repoId: string): Promise<Repo | null> {
  const db = getDb();
  if (!db) return null;

  const { data, error } = await db.from('futureai_repos').select().eq('id', repoId).single();
  if (error) {
    console.error('getRepo error:', error);
    return null;
  }
  return data as Repo;
}

export async function listRepos(): Promise<Repo[]> {
  const db = getDb();
  if (!db) return [];

  const { data, error } = await db.from('futureai_repos').select().order('created_at', { ascending: false });
  if (error) {
    console.error('listRepos error:', error);
    return [];
  }
  return (data ?? []) as Repo[];
}

export async function updateRepo(repoId: string, updates: Partial<Repo>): Promise<void> {
  const db = getDb();
  if (!db) return;

  const { error } = await db.from('futureai_repos').update(updates).eq('id', repoId);
  if (error) {
    console.error('updateRepo error:', error);
  }
}

export async function getGuardrails(repoId?: string): Promise<Guardrail[]> {
  const db = getDb();
  if (!db) return [];

  let query = db.from('futureai_guardrails').select().eq('enabled', true);
  if (repoId) {
    query = query.or(`scope.eq.global,and(scope.eq.repo,repo_id.eq.${repoId})`);
  } else {
    query = query.eq('scope', 'global');
  }

  const { data, error } = await query;
  if (error) {
    console.error('getGuardrails error:', error);
    return [];
  }
  return (data ?? []) as Guardrail[];
}

export async function getBehaviorRules(repoId?: string): Promise<BehaviorRule[]> {
  const db = getDb();
  if (!db) return [];

  let query = db.from('futureai_behavior_rules').select().eq('enabled', true);
  if (repoId) {
    query = query.or(`scope.eq.global,and(scope.eq.repo,repo_id.eq.${repoId})`);
  } else {
    query = query.eq('scope', 'global');
  }

  const { data, error } = await query;
  if (error) {
    console.error('getBehaviorRules error:', error);
    return [];
  }
  return (data ?? []) as BehaviorRule[];
}

export async function getSkills(repoId?: string): Promise<AgentSkill[]> {
  const db = getDb();
  if (!db) return [];

  let query = db.from('futureai_agent_skills').select().eq('enabled', true);
  if (repoId) {
    query = query.or(`scope.eq.global,and(scope.eq.repo,repo_id.eq.${repoId})`);
  } else {
    query = query.eq('scope', 'global');
  }

  const { data, error } = await query;
  if (error) {
    console.error('getSkills error:', error);
    return [];
  }
  return (data ?? []) as AgentSkill[];
}

export async function getSubagentConfigs(): Promise<SubagentConfig[]> {
  const db = getDb();
  if (!db) return [];

  const { data, error } = await db.from('futureai_subagent_configs').select();
  if (error) {
    console.error('getSubagentConfigs error:', error);
    return [];
  }
  return (data ?? []) as SubagentConfig[];
}
