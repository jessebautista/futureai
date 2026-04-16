interface Skill {
  id: string;
  name: string;
  display_name: string;
  description: string;
  trigger_keywords: string[];
  content: string;
  scope: string;
  enabled: boolean;
}

const DEFAULTS: Skill[] = [
  {
    id: '1',
    name: 'bug-fix',
    display_name: 'Bug Fix',
    description: 'Analyzes a bug report, identifies root cause, and applies a targeted fix with tests.',
    trigger_keywords: ['fix', 'bug', 'error', 'broken', 'failing'],
    content: '# Bug Fix Skill\n\nAnalyze the bug report carefully. Reproduce the issue, identify root cause, apply minimal fix, and add a regression test.',
    scope: 'global',
    enabled: true
  },
  {
    id: '2',
    name: 'feature-add',
    display_name: 'Feature Addition',
    description: 'Implements a new feature following existing patterns and conventions.',
    trigger_keywords: ['add', 'implement', 'feature', 'create', 'new'],
    content: '# Feature Addition Skill\n\nImplement the requested feature following the codebase patterns. Include tests and update documentation if needed.',
    scope: 'global',
    enabled: true
  },
  {
    id: '3',
    name: 'refactor',
    display_name: 'Refactor',
    description: 'Improves code structure without changing external behavior.',
    trigger_keywords: ['refactor', 'clean', 'improve', 'restructure'],
    content: '# Refactor Skill\n\nImprove the internal structure of the code without changing its observable behavior. Ensure all tests still pass.',
    scope: 'global',
    enabled: true
  },
  {
    id: '4',
    name: 'test-write',
    display_name: 'Write Tests',
    description: 'Writes comprehensive unit and integration tests for existing code.',
    trigger_keywords: ['test', 'coverage', 'spec', 'unit test'],
    content: '# Write Tests Skill\n\nWrite comprehensive tests covering happy paths, edge cases, and error conditions.',
    scope: 'global',
    enabled: true
  },
  {
    id: '5',
    name: 'pr-review',
    display_name: 'PR Review',
    description: 'Reviews a pull request for correctness, style, and potential issues.',
    trigger_keywords: ['review', 'pr', 'pull request', 'check'],
    content: '# PR Review Skill\n\nReview the pull request for correctness, adherence to coding standards, potential bugs, and test coverage.',
    scope: 'global',
    enabled: false
  }
];

let items: Skill[] = [...DEFAULTS];

export const skillsStore = {
  getAll: () => items,
  add: (s: Skill) => { items.push(s); return s; },
  patch: (id: string, updates: Partial<Skill>) => {
    const idx = items.findIndex(x => x.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    return items[idx];
  },
  delete: (id: string) => { items = items.filter(x => x.id !== id); }
};
