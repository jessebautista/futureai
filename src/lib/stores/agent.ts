import { writable } from 'svelte/store';

export interface StreamMessage {
  type: string;
  content?: string;
  agent_id?: string;
  tool_name?: string;
  task_id?: string;
  timestamp: string;
}

export const activeTaskId = writable<string | null>(null);
export const streamMessages = writable<StreamMessage[]>([]);
export const activeSubagent = writable<string | null>(null);
export const isStreaming = writable(false);

export function resetSession() {
  streamMessages.set([]);
  activeSubagent.set(null);
  isStreaming.set(false);
}
