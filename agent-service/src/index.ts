import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import Fastify from 'fastify';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  createTask,
  updateTaskStatus,
  saveTaskMessage,
  getTaskMessages,
  getTask,
  listTasks,
  createRepo,
  getRepo,
  listRepos,
  updateRepo,
  getGuardrails,
  getBehaviorRules,
} from './db.js';
import {
  DEFAULT_SUBAGENTS,
  buildGuardrailsPrompt,
  buildBehaviorRulesPrompt,
  runAgentPipeline,
} from './agents.js';
import { StreamMessage } from './types.js';

const PORT = parseInt(process.env['PORT'] ?? '8000', 10);

const anthropic = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY'],
});

const app = Fastify({ logger: true });

// Manual CORS — @fastify/cors is not in dependencies
app.addHook('onSend', async (request, reply) => {
  reply.raw.setHeader('Access-Control-Allow-Origin', '*');
  reply.raw.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.raw.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
});

// Handle preflight OPTIONS requests
app.addHook('onRequest', async (request, reply) => {
  if (request.method === 'OPTIONS') {
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    reply.raw.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    reply.raw.writeHead(204);
    reply.raw.end();
  }
});

// Health check
app.get('/health', async () => {
  return { status: 'ok' };
});

// POST /run-agent
app.post('/run-agent', async (request, reply) => {
  const body = request.body as {
    task: string;
    repo_path: string;
    session_id?: string;
    repo_id?: string;
  };

  const { task, repo_path: repoPath, session_id: sessionId, repo_id: repoId } = body;

  if (!task || !repoPath) {
    reply.code(400);
    return { error: 'task and repo_path are required' };
  }

  const now = () => new Date().toISOString();

  // Fetch guardrails and behavior rules
  const [guardrails, behaviorRules] = await Promise.all([
    getGuardrails(repoId),
    getBehaviorRules(repoId),
  ]);

  const guardrailsPrefix = buildGuardrailsPrompt(guardrails);
  const rulesSection = buildBehaviorRulesPrompt(behaviorRules);
  const systemSnapshot = [guardrailsPrefix, rulesSection].filter(Boolean).join('\n');

  // Create task in DB
  const dbTask = await createTask(repoId ?? '', task, sessionId, systemSnapshot);
  const taskId = dbTask?.id ?? `local-${Date.now()}`;

  if (dbTask) {
    await updateTaskStatus(taskId, 'running');
  }

  // Set up streaming response
  reply.raw.setHeader('Content-Type', 'application/x-ndjson');
  reply.raw.setHeader('Transfer-Encoding', 'chunked');
  reply.raw.setHeader('Access-Control-Allow-Origin', '*');
  reply.raw.writeHead(200);

  const writeMessage = (msg: StreamMessage) => {
    reply.raw.write(JSON.stringify(msg) + '\n');
  };

  // Send session_start message
  const sessionStartMsg: StreamMessage & { task_id: string; session_id?: string } = {
    type: 'agent_start' as const,
    content: 'session_start',
    task_id: taskId,
    session_id: sessionId,
    timestamp: now(),
  };
  reply.raw.write(JSON.stringify({ type: 'session_start', task_id: taskId, session_id: sessionId, timestamp: now() }) + '\n');

  void sessionStartMsg; // suppress unused warning

  try {
    const pipeline = runAgentPipeline(
      task,
      repoPath,
      DEFAULT_SUBAGENTS,
      guardrailsPrefix,
      rulesSection,
      anthropic
    );

    for await (const msg of pipeline) {
      writeMessage(msg);
      if (dbTask) {
        await saveTaskMessage(taskId, msg);
      }
    }

    if (dbTask) {
      await updateTaskStatus(taskId, 'done');
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errorStreamMsg: StreamMessage = {
      type: 'error',
      content: errMsg,
      timestamp: now(),
    };
    writeMessage(errorStreamMsg);
    if (dbTask) {
      await saveTaskMessage(taskId, errorStreamMsg);
      await updateTaskStatus(taskId, 'failed');
    }
  }

  reply.raw.end();
});

// GET /sessions/:sessionId
app.get('/sessions/:sessionId', async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string };
  const messages = await getTaskMessages(sessionId);
  return { messages };
});

// POST /connect-repo
app.post('/connect-repo', async (request, reply) => {
  const body = request.body as {
    repo_path: string;
    name: string;
    github_url?: string;
  };

  const { repo_path: repoPath, name, github_url: githubUrl } = body;

  if (!repoPath || !name) {
    reply.code(400);
    return { error: 'repo_path and name are required' };
  }

  // Validate path exists
  try {
    await fs.access(repoPath);
  } catch {
    reply.code(400);
    return { error: `Path does not exist: ${repoPath}` };
  }

  // Detect stack
  const stackChecks: Array<{ file: string; stack: string }> = [
    { file: 'package.json', stack: 'Node' },
    { file: 'requirements.txt', stack: 'Python' },
    { file: 'pyproject.toml', stack: 'Python' },
    { file: 'go.mod', stack: 'Go' },
    { file: 'Cargo.toml', stack: 'Rust' },
  ];

  let detectedStack: string | undefined;
  for (const { file, stack } of stackChecks) {
    try {
      await fs.access(path.join(repoPath, file));
      detectedStack = stack;
      break;
    } catch {
      // not found, continue
    }
  }

  // Check for CLAUDE.md
  let hasCaudeMd = false;
  for (const claudePath of ['.claude/CLAUDE.md', 'CLAUDE.md']) {
    try {
      await fs.access(path.join(repoPath, claudePath));
      hasCaudeMd = true;
      break;
    } catch {
      // not found
    }
  }

  // Create repo in DB
  const repo = await createRepo(name, repoPath, githubUrl);

  if (repo) {
    await updateRepo(repo.id, {
      detected_stack: detectedStack,
      has_claude_md: hasCaudeMd,
    });

    return {
      id: repo.id,
      name: repo.name,
      detected_stack: detectedStack,
      has_claude_md: hasCaudeMd,
      path: repo.path,
    };
  }

  // No DB — return a local response
  return {
    id: `local-${Date.now()}`,
    name,
    detected_stack: detectedStack,
    has_claude_md: hasCaudeMd,
    path: repoPath,
  };
});

// GET /repos
app.get('/repos', async () => {
  const repos = await listRepos();
  return repos;
});

// GET /repos/:id
app.get('/repos/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const repo = await getRepo(id);
  if (!repo) {
    reply.code(404);
    return { error: 'Repo not found' };
  }
  return repo;
});

// GET /tasks
app.get('/tasks', async (request) => {
  const query = request.query as { repo_id?: string };
  const tasks = await listTasks(query.repo_id);
  return tasks;
});

// GET /tasks/:id
app.get('/tasks/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const task = await getTask(id);
  if (!task) {
    reply.code(404);
    return { error: 'Task not found' };
  }
  const messages = await getTaskMessages(id);
  return { ...task, messages };
});

// DELETE /run-agent/:sessionId (abort stub)
app.delete('/run-agent/:sessionId', async () => {
  return { aborted: true };
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Agent service running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
