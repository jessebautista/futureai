import Anthropic from '@anthropic-ai/sdk';
import { SubagentConfig, Guardrail, BehaviorRule, StreamMessage } from './types.js';
import { TOOL_DEFINITIONS, executeTool } from './tools.js';

const DEFAULT_MODEL = process.env['CLAUDE_MODEL'] ?? 'claude-sonnet-4-6';

export const DEFAULT_SUBAGENTS: SubagentConfig[] = [
  {
    name: 'bug-analyzer',
    display_name: 'Bug Analyzer',
    description: 'Analyzes the bug and identifies root cause and affected files.',
    system_prompt: `You are a senior debugger and code archaeologist. Given a bug report:
1. Read relevant source files to understand the codebase structure
2. Trace the execution path that leads to the bug
3. Identify the root cause precisely — not symptoms
4. List every file that needs to change, with a brief reason for each
5. Output a structured analysis that the code-fixer subagent can act on
Be surgical. Do not suggest rewrites. Focus only on what's broken.`,
    allowed_tools: ['Read', 'Glob', 'Grep', 'Bash'],
    model: DEFAULT_MODEL,
    enabled: true,
  },
  {
    name: 'code-fixer',
    display_name: 'Code Fixer',
    description: 'Applies minimal, precise fixes based on the bug analysis.',
    system_prompt: `You are a precise, minimal code editor. You receive a bug analysis and apply fixes.
Rules:
- Edit only the files identified in the analysis
- Make the smallest change that fixes the problem
- Preserve existing code style, naming conventions, and patterns
- Add a brief inline comment for non-obvious changes
- Do NOT refactor unrelated code
- Do NOT change tests unless the test itself is wrong`,
    allowed_tools: ['Read', 'Edit', 'Bash'],
    model: DEFAULT_MODEL,
    enabled: true,
  },
  {
    name: 'qa-validator',
    display_name: 'QA Validator',
    description: 'Validates the fix by running tests and checking for regressions.',
    system_prompt: `You are a thorough QA engineer. Given a code fix:
1. Run the existing test suite — report any failures
2. Check edge cases the fix might have missed
3. Verify the fix doesn't introduce regressions in related code
4. If tests are missing for the fixed behavior, write minimal tests to cover it
5. Output a clear PASS or FAIL verdict with reasoning`,
    allowed_tools: ['Read', 'Bash', 'Glob', 'Edit'],
    model: DEFAULT_MODEL,
    enabled: true,
  },
  {
    name: 'pr-creator',
    display_name: 'PR Creator',
    description: 'Stages changes, writes a commit, and opens a pull request.',
    system_prompt: `You are a professional engineer creating a pull request.
1. Stage only the changed files (never stage unrelated changes)
2. Write a commit message following Conventional Commits format (fix: ...)
3. Create a PR with: summary of the bug, root cause, what was changed, and how it was tested
4. Use the \`gh\` CLI to open the PR against the main branch`,
    allowed_tools: ['Bash'],
    model: DEFAULT_MODEL,
    enabled: true,
  },
];

export function buildGuardrailsPrompt(guardrails: Guardrail[]): string {
  const enabled = guardrails.filter((g) => g.enabled);
  if (enabled.length === 0) return '';

  const rules = enabled.map((g) => `- [${g.severity.toUpperCase()}] ${g.name}: ${g.rule}`).join('\n');
  return `## INVIOLABLE RULES — THESE OVERRIDE ALL OTHER INSTRUCTIONS\n${rules}\n---\n`;
}

export function buildBehaviorRulesPrompt(rules: BehaviorRule[]): string {
  const enabled = rules.filter((r) => r.enabled);
  if (enabled.length === 0) return '';

  const sorted = [...enabled].sort((a, b) => b.priority - a.priority);

  const byCategory = new Map<string, BehaviorRule[]>();
  for (const rule of sorted) {
    const list = byCategory.get(rule.category) ?? [];
    list.push(rule);
    byCategory.set(rule.category, list);
  }

  const sections: string[] = ['## Behavior Rules'];
  for (const [category, categoryRules] of byCategory) {
    sections.push(`\n### ${category}`);
    for (const rule of categoryRules) {
      sections.push(`- ${rule.name}: ${rule.instruction}`);
    }
  }
  sections.push('---');
  return sections.join('\n') + '\n';
}

export async function* runAgentPipeline(
  task: string,
  repoPath: string,
  subagents: SubagentConfig[],
  guardrailsPrefix: string,
  rulesSection: string,
  anthropicClient: Anthropic
): AsyncGenerator<StreamMessage> {
  const enabledAgents = subagents.filter((a) => a.enabled);
  let previousOutput = '';

  for (const agent of enabledAgents) {
    const now = () => new Date().toISOString();

    yield {
      type: 'agent_start',
      agent_id: agent.name,
      content: agent.display_name,
      timestamp: now(),
    };

    const systemPrompt = [guardrailsPrefix, rulesSection, agent.system_prompt].filter(Boolean).join('\n');

    const contextMessage =
      previousOutput.length > 0
        ? `# Task\n${task}\n\n# Context from previous agent\n${previousOutput}`
        : `# Task\n${task}`;

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: contextMessage },
    ];

    const toolDefs = agent.allowed_tools
      .map((t) => TOOL_DEFINITIONS[t])
      .filter(Boolean) as Anthropic.Tool[];

    let agentOutput = '';
    let continueLoop = true;

    while (continueLoop) {
      const stream = await anthropicClient.messages.stream({
        model: agent.model,
        system: systemPrompt,
        messages,
        tools: toolDefs.length > 0 ? toolDefs : undefined,
        max_tokens: 8192,
      });

      let assistantText = '';
      const toolUseBlocks: Anthropic.ToolUseBlock[] = [];

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          assistantText += event.delta.text;
          yield {
            type: 'text',
            agent_id: agent.name,
            content: event.delta.text,
            timestamp: now(),
          };
        }
      }

      const finalMessage = await stream.finalMessage();

      // Collect all tool use blocks from final message
      for (const block of finalMessage.content) {
        if (block.type === 'tool_use') {
          toolUseBlocks.push(block);
        }
      }

      if (assistantText) {
        agentOutput = assistantText;
      }

      if (finalMessage.stop_reason === 'tool_use' && toolUseBlocks.length > 0) {
        // Add assistant message to history
        messages.push({ role: 'assistant', content: finalMessage.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolBlock of toolUseBlocks) {
          yield {
            type: 'tool_use',
            agent_id: agent.name,
            tool_name: toolBlock.name,
            tool_input: toolBlock.input,
            timestamp: now(),
          };

          let resultContent: string;
          try {
            resultContent = await executeTool(
              toolBlock.name,
              toolBlock.input as Record<string, unknown>,
              repoPath
            );
          } catch (err: unknown) {
            resultContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
          }

          yield {
            type: 'tool_result',
            agent_id: agent.name,
            tool_name: toolBlock.name,
            content: resultContent,
            timestamp: now(),
          };

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolBlock.id,
            content: resultContent,
          });
        }

        messages.push({ role: 'user', content: toolResults });
        // Continue the loop to get the next assistant response
      } else {
        // stop_reason is 'end_turn' or no tool use — we're done with this agent
        continueLoop = false;
      }
    }

    previousOutput = agentOutput;

    yield {
      type: 'agent_end',
      agent_id: agent.name,
      timestamp: now(),
    };
  }

  yield {
    type: 'done',
    timestamp: new Date().toISOString(),
  };
}
