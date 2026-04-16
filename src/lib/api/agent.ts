export async function* streamTask(task: string, repoPath: string, repoId?: string) {
  const response = await fetch('/api/agent/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, repo_path: repoPath, repo_id: repoId })
  });

  if (!response.ok) throw new Error(`Failed: ${response.statusText}`);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) {
        try { yield JSON.parse(line); } catch {}
      }
    }
  }
}

export async function abortTask(sessionId: string) {
  return fetch(`/api/agent/abort/${sessionId}`, { method: 'DELETE' });
}

export async function getTaskMessages(taskId: string) {
  const res = await fetch(`/api/agent/sessions/${taskId}`);
  return res.ok ? res.json() : null;
}
