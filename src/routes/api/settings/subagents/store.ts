interface Subagent {
  id: string;
  name: string;
  display_name: string;
  model: string;
  system_prompt: string;
  allowed_tools: string[];
  enabled: boolean;
}

const DEFAULTS: Subagent[] = [
  {
    id: '1',
    name: 'bug-analyzer',
    display_name: 'Bug Analyzer',
    model: 'claude-sonnet-4-6',
    system_prompt: 'You are an expert bug analyzer. Your job is to analyze bug reports, reproduce issues, identify root causes, and produce a detailed analysis report. Be thorough and methodical. Use Read, Grep, and Glob tools to explore the codebase.',
    allowed_tools: ['Read', 'Grep', 'Glob', 'Bash'],
    enabled: true
  },
  {
    id: '2',
    name: 'bug-fixer',
    display_name: 'Bug Fixer',
    model: 'claude-sonnet-4-6',
    system_prompt: 'You are an expert software engineer. Based on the analysis provided, implement a targeted fix for the bug. Make minimal, focused changes. Follow existing code patterns and conventions.',
    allowed_tools: ['Read', 'Edit', 'Bash', 'Glob', 'Grep'],
    enabled: true
  },
  {
    id: '3',
    name: 'qa-agent',
    display_name: 'QA Agent',
    model: 'claude-sonnet-4-6',
    system_prompt: 'You are a QA engineer. Review the changes made by the bug fixer, run tests, and verify the fix is correct and complete. Write additional tests if needed.',
    allowed_tools: ['Read', 'Bash', 'Edit', 'Grep'],
    enabled: true
  },
  {
    id: '4',
    name: 'pr-agent',
    display_name: 'PR Agent',
    model: 'claude-sonnet-4-6',
    system_prompt: 'You are responsible for creating well-structured pull requests. Write a clear PR title and description explaining the problem, root cause, and solution. Follow conventional commit standards.',
    allowed_tools: ['Read', 'Bash', 'Glob'],
    enabled: true
  }
];

let items: Subagent[] = [...DEFAULTS];

export const subagentsStore = {
  getAll: () => items,
  patch: (id: string, updates: Partial<Subagent>) => {
    const idx = items.findIndex(x => x.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    return items[idx];
  }
};
