interface Guardrail {
  id: string;
  name: string;
  rule: string;
  severity: 'error' | 'warning';
  enabled: boolean;
  scope: string;
}

const DEFAULTS: Guardrail[] = [
  { id: '1', name: 'No force push', rule: 'Never force-push to main or master branches', severity: 'error', enabled: true, scope: 'global' },
  { id: '2', name: 'No credentials in code', rule: 'Never commit API keys, secrets, or credentials to the repository', severity: 'error', enabled: true, scope: 'global' },
  { id: '3', name: 'No delete production data', rule: 'Never execute DELETE statements on production databases without explicit confirmation', severity: 'error', enabled: true, scope: 'global' },
  { id: '4', name: 'Test coverage required', rule: 'All new features must include corresponding unit tests', severity: 'warning', enabled: true, scope: 'global' },
  { id: '5', name: 'No breaking API changes', rule: 'Do not make breaking changes to public APIs without version bump', severity: 'warning', enabled: true, scope: 'global' },
  { id: '6', name: 'Dependency audit', rule: 'New dependencies must be reviewed for security vulnerabilities', severity: 'warning', enabled: true, scope: 'global' },
  { id: '7', name: 'No direct main commits', rule: 'All changes to main must go through a pull request', severity: 'error', enabled: true, scope: 'global' }
];

let items: Guardrail[] = [...DEFAULTS];

export const guardrailsStore = {
  getAll: () => items,
  add: (g: Guardrail) => { items.push(g); return g; },
  patch: (id: string, updates: Partial<Guardrail>) => {
    const idx = items.findIndex(x => x.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    return items[idx];
  },
  delete: (id: string) => { items = items.filter(x => x.id !== id); },
  reset: () => { items = [...DEFAULTS]; }
};
