interface Rule {
  id: string;
  name: string;
  instruction: string;
  category: string;
  enabled: boolean;
}

const DEFAULTS: Rule[] = [
  { id: '1', name: 'Prefer existing patterns', instruction: 'When writing new code, follow the existing patterns, conventions, and style already present in the codebase.', category: 'code-style', enabled: true },
  { id: '2', name: 'Minimal diffs', instruction: 'Make the smallest possible change to accomplish the task. Do not refactor unrelated code or fix unrelated issues.', category: 'code-style', enabled: true },
  { id: '3', name: 'Explain before editing', instruction: 'Before making changes to complex or critical files, explain what you are about to do and why.', category: 'communication', enabled: true },
  { id: '4', name: 'Run tests after changes', instruction: 'After making code changes, run the relevant test suite to verify nothing is broken.', category: 'validation', enabled: true },
  { id: '5', name: 'Check for side effects', instruction: 'Before deleting or modifying shared utilities, check all usages to assess potential side effects.', category: 'validation', enabled: true }
];

let items: Rule[] = [...DEFAULTS];

export const rulesStore = {
  getAll: () => items,
  add: (r: Rule) => { items.push(r); return r; },
  patch: (id: string, updates: Partial<Rule>) => {
    const idx = items.findIndex(x => x.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    return items[idx];
  },
  delete: (id: string) => { items = items.filter(x => x.id !== id); }
};
