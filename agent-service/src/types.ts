export type StreamMessageType =
  | 'agent_start'
  | 'agent_end'
  | 'text'
  | 'tool_use'
  | 'tool_result'
  | 'error'
  | 'done';

export interface StreamMessage {
  type: StreamMessageType;
  content?: string;
  agent_id?: string;
  tool_name?: string;
  tool_input?: unknown;
  timestamp: string;
}

export interface SubagentConfig {
  name: string;
  display_name: string;
  description: string;
  system_prompt: string;
  allowed_tools: string[];
  model: string;
  enabled: boolean;
}

export interface Guardrail {
  id: string;
  name: string;
  rule: string;
  severity: 'error' | 'warning';
  enabled: boolean;
  scope: 'global' | 'repo';
  repo_id?: string;
}

export interface BehaviorRule {
  id: string;
  name: string;
  category: string;
  instruction: string;
  enabled: boolean;
  scope: 'global' | 'repo';
  repo_id?: string;
  priority: number;
}

export interface AgentSkill {
  id: string;
  name: string;
  display_name: string;
  description: string;
  content: string;
  trigger_keywords: string[];
  enabled: boolean;
  scope: 'global' | 'repo';
  repo_id?: string;
}

export interface Repo {
  id: string;
  name: string;
  path: string;
  github_url?: string;
  detected_stack?: string;
  has_claude_md: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  repo_id: string;
  description: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  session_id?: string;
  pr_url?: string;
  system_prompt_snapshot?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskMessage {
  id: string;
  task_id: string;
  type: string;
  content?: string;
  agent_id?: string;
  created_at: string;
}
