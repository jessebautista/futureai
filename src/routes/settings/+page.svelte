<script lang="ts">
  import { onMount } from 'svelte';

  // ---- Types ----
  interface Guardrail {
    id: string;
    name: string;
    rule: string;
    severity: 'error' | 'warning';
    enabled: boolean;
    scope: string;
  }
  interface Rule {
    id: string;
    name: string;
    instruction: string;
    category: string;
    enabled: boolean;
  }
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
  interface Subagent {
    id: string;
    name: string;
    display_name: string;
    model: string;
    system_prompt: string;
    allowed_tools: string[];
    enabled: boolean;
  }

  let activeTab = $state<'guardrails' | 'rules' | 'skills' | 'subagents'>('guardrails');

  // ---- Guardrails ----
  let guardrails = $state<Guardrail[]>([]);
  let newGuardrail = $state({ name: '', rule: '', severity: 'error' as 'error' | 'warning', scope: 'global' });
  let addingGuardrail = $state(false);

  // ---- Rules ----
  let rules = $state<Rule[]>([]);
  let newRule = $state({ name: '', instruction: '', category: 'general' });
  let addingRule = $state(false);

  // ---- Skills ----
  let skills = $state<Skill[]>([]);
  let newSkillExpanded = $state(false);
  let newSkill = $state({ name: '', display_name: '', description: '', trigger_keywords: '', content: '', scope: 'global' });

  // ---- Subagents ----
  let subagents = $state<Subagent[]>([]);
  let expandedSubagent = $state<string | null>(null);
  let TOOL_OPTIONS = ['Read', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'Write', 'Git'];

  onMount(async () => {
    await Promise.all([loadGuardrails(), loadRules(), loadSkills(), loadSubagents()]);
  });

  async function loadGuardrails() {
    const res = await fetch('/api/settings/guardrails');
    if (res.ok) guardrails = await res.json();
  }
  async function loadRules() {
    const res = await fetch('/api/settings/rules');
    if (res.ok) rules = await res.json();
  }
  async function loadSkills() {
    const res = await fetch('/api/settings/skills');
    if (res.ok) skills = await res.json();
  }
  async function loadSubagents() {
    const res = await fetch('/api/settings/subagents');
    if (res.ok) subagents = await res.json();
  }

  // --- Guardrail actions ---
  async function toggleGuardrail(g: Guardrail) {
    const updated = { ...g, enabled: !g.enabled };
    await fetch(`/api/settings/guardrails/${g.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: updated.enabled })
    });
    guardrails = guardrails.map(x => x.id === g.id ? updated : x);
  }
  async function deleteGuardrail(id: string) {
    await fetch(`/api/settings/guardrails/${id}`, { method: 'DELETE' });
    guardrails = guardrails.filter(g => g.id !== id);
  }
  async function submitGuardrail(e: SubmitEvent) {
    e.preventDefault();
    const res = await fetch('/api/settings/guardrails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newGuardrail, enabled: true })
    });
    if (res.ok) {
      guardrails = [await res.json(), ...guardrails];
      newGuardrail = { name: '', rule: '', severity: 'error', scope: 'global' };
      addingGuardrail = false;
    }
  }
  async function resetGuardrails() {
    const res = await fetch('/api/settings/guardrails/reset', { method: 'POST' });
    if (res.ok) loadGuardrails();
  }

  // --- Rule actions ---
  async function toggleRule(r: Rule) {
    const updated = { ...r, enabled: !r.enabled };
    await fetch(`/api/settings/rules/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: updated.enabled })
    });
    rules = rules.map(x => x.id === r.id ? updated : x);
  }
  async function deleteRule(id: string) {
    await fetch(`/api/settings/rules/${id}`, { method: 'DELETE' });
    rules = rules.filter(r => r.id !== id);
  }
  async function submitRule(e: SubmitEvent) {
    e.preventDefault();
    const res = await fetch('/api/settings/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newRule, enabled: true })
    });
    if (res.ok) {
      rules = [await res.json(), ...rules];
      newRule = { name: '', instruction: '', category: 'general' };
      addingRule = false;
    }
  }

  // Group rules by category
  let rulesByCategory = $derived(
    rules.reduce((acc: Record<string, Rule[]>, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    }, {})
  );

  // --- Skill actions ---
  async function toggleSkill(s: Skill) {
    const updated = { ...s, enabled: !s.enabled };
    await fetch(`/api/settings/skills/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: updated.enabled })
    });
    skills = skills.map(x => x.id === s.id ? updated : x);
  }
  async function deleteSkill(id: string) {
    await fetch(`/api/settings/skills/${id}`, { method: 'DELETE' });
    skills = skills.filter(s => s.id !== id);
  }
  async function submitSkill(e: SubmitEvent) {
    e.preventDefault();
    const payload = {
      ...newSkill,
      trigger_keywords: newSkill.trigger_keywords.split(',').map(k => k.trim()).filter(Boolean),
      enabled: true
    };
    const res = await fetch('/api/settings/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      skills = [await res.json(), ...skills];
      newSkill = { name: '', display_name: '', description: '', trigger_keywords: '', content: '', scope: 'global' };
      newSkillExpanded = false;
    }
  }

  // --- Subagent actions ---
  async function toggleSubagent(s: Subagent) {
    const updated = { ...s, enabled: !s.enabled };
    await fetch(`/api/settings/subagents/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: updated.enabled })
    });
    subagents = subagents.map(x => x.id === s.id ? updated : x);
  }
  async function saveSubagent(s: Subagent) {
    await fetch(`/api/settings/subagents/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s)
    });
    expandedSubagent = null;
  }
  function toggleSubagentTool(s: Subagent, tool: string) {
    const has = s.allowed_tools.includes(tool);
    subagents = subagents.map(x =>
      x.id === s.id
        ? { ...x, allowed_tools: has ? x.allowed_tools.filter(t => t !== tool) : [...x.allowed_tools, tool] }
        : x
    );
  }

  const MODELS = ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'];
</script>

<div class="px-6 py-8 max-w-5xl mx-auto">
  <div class="mb-6">
    <h1 class="text-xl font-mono font-bold text-gray-100 tracking-wide">Settings</h1>
    <p class="text-xs text-zinc-500 mt-1">Configure guardrails, rules, skills, and subagents</p>
  </div>

  <!-- Tabs -->
  <div class="flex border-b border-[#2e2e2e] mb-6 gap-0">
    {#each (['guardrails', 'rules', 'skills', 'subagents'] as const) as tab}
      <button
        onclick={() => (activeTab = tab)}
        class="px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors
          {activeTab === tab ? 'text-amber-400 border-b-2 border-amber-500 -mb-px' : 'text-zinc-500 hover:text-zinc-300'}"
      >
        {tab}
      </button>
    {/each}
  </div>

  <!-- GUARDRAILS TAB -->
  {#if activeTab === 'guardrails'}
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-mono uppercase tracking-widest text-zinc-500">Active Guardrails</h2>
        <div class="flex gap-2">
          <button
            onclick={() => (addingGuardrail = !addingGuardrail)}
            class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-mono text-xs font-bold uppercase tracking-wider transition-colors"
          >
            + Add Guardrail
          </button>
          <button
            onclick={resetGuardrails}
            class="px-3 py-1.5 border border-[#2e2e2e] text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      </div>

      {#if addingGuardrail}
        <form onsubmit={submitGuardrail} class="border border-amber-800 bg-amber-950/10 p-4 flex flex-col gap-3">
          <h3 class="text-xs font-mono text-amber-400 uppercase tracking-widest">New Guardrail</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-mono text-zinc-500">Name</label>
              <input bind:value={newGuardrail.name} required class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-xs px-2 py-1.5 focus:outline-none focus:border-amber-800" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-mono text-zinc-500">Scope</label>
              <select bind:value={newGuardrail.scope} class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-xs px-2 py-1.5 focus:outline-none">
                <option value="global">global</option>
                <option value="repo">repo</option>
              </select>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-mono text-zinc-500">Rule</label>
            <input bind:value={newGuardrail.rule} required class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-xs px-2 py-1.5 focus:outline-none focus:border-amber-800" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-mono text-zinc-500">Severity</label>
            <select bind:value={newGuardrail.severity} class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-xs px-2 py-1.5 focus:outline-none w-32">
              <option value="error">error</option>
              <option value="warning">warning</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button type="submit" class="px-3 py-1.5 bg-amber-500 text-black font-mono text-xs font-bold uppercase">Save</button>
            <button type="button" onclick={() => (addingGuardrail = false)} class="px-3 py-1.5 border border-[#2e2e2e] text-zinc-500 font-mono text-xs">Cancel</button>
          </div>
        </form>
      {/if}

      <div class="border border-[#2e2e2e]">
        <table class="w-full text-xs font-mono">
          <thead class="bg-[#1a1a1a]">
            <tr>
              <th class="text-left px-4 py-2 text-zinc-500 uppercase tracking-widest font-normal">Name</th>
              <th class="text-left px-4 py-2 text-zinc-500 uppercase tracking-widest font-normal">Severity</th>
              <th class="text-left px-4 py-2 text-zinc-500 uppercase tracking-widest font-normal">Scope</th>
              <th class="text-left px-4 py-2 text-zinc-500 uppercase tracking-widest font-normal">Enabled</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2e2e2e]">
            {#each guardrails as g (g.id)}
              <tr class="bg-[#111111] hover:bg-[#1a1a1a] transition-colors">
                <td class="px-4 py-3">
                  <p class="text-gray-300">{g.name}</p>
                  <p class="text-zinc-600 text-[10px] mt-0.5">{g.rule}</p>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex px-1.5 py-0.5 border text-[10px] uppercase tracking-wider
                    {g.severity === 'error' ? 'border-red-800 bg-red-950 text-red-400' : 'border-yellow-800 bg-yellow-950 text-yellow-400'}">
                    {g.severity}
                  </span>
                </td>
                <td class="px-4 py-3 text-zinc-500">{g.scope}</td>
                <td class="px-4 py-3">
                  <button
                    onclick={() => toggleGuardrail(g)}
                    class="w-10 h-5 border relative transition-colors
                      {g.enabled ? 'bg-amber-500 border-amber-600' : 'bg-zinc-800 border-zinc-700'}"
                  >
                    <span class="absolute top-0.5 transition-all w-4 h-4 bg-white
                      {g.enabled ? 'right-0.5' : 'left-0.5'}"></span>
                  </button>
                </td>
                <td class="px-4 py-3">
                  <button onclick={() => deleteGuardrail(g.id)} class="text-zinc-700 hover:text-red-400 transition-colors">✕</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

  <!-- RULES TAB -->
  {:else if activeTab === 'rules'}
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-mono uppercase tracking-widest text-zinc-500">Rules</h2>
        <button
          onclick={() => (addingRule = !addingRule)}
          class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-mono text-xs font-bold uppercase tracking-wider transition-colors"
        >
          + Add Rule
        </button>
      </div>

      {#if addingRule}
        <form onsubmit={submitRule} class="border border-amber-800 bg-amber-950/10 p-4 flex flex-col gap-3">
          <h3 class="text-xs font-mono text-amber-400 uppercase tracking-widest">New Rule</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-mono text-zinc-500">Name</label>
              <input bind:value={newRule.name} required class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-xs px-2 py-1.5 focus:outline-none focus:border-amber-800" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-mono text-zinc-500">Category</label>
              <input bind:value={newRule.category} class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-xs px-2 py-1.5 focus:outline-none focus:border-amber-800" />
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-mono text-zinc-500">Instruction</label>
            <textarea bind:value={newRule.instruction} required rows={3} class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-xs px-2 py-1.5 focus:outline-none focus:border-amber-800 resize-none"></textarea>
          </div>
          <div class="flex gap-2">
            <button type="submit" class="px-3 py-1.5 bg-amber-500 text-black font-mono text-xs font-bold uppercase">Save</button>
            <button type="button" onclick={() => (addingRule = false)} class="px-3 py-1.5 border border-[#2e2e2e] text-zinc-500 font-mono text-xs">Cancel</button>
          </div>
        </form>
      {/if}

      {#each Object.entries(rulesByCategory) as [category, catRules]}
        <div>
          <h3 class="text-[10px] font-mono uppercase tracking-widest text-zinc-600 mb-2 px-1">{category}</h3>
          <div class="border border-[#2e2e2e] divide-y divide-[#2e2e2e]">
            {#each catRules as r (r.id)}
              <div class="flex items-start gap-4 px-4 py-3 bg-[#111111] hover:bg-[#1a1a1a] transition-colors">
                <div class="flex-1">
                  <p class="text-xs font-mono text-gray-300">{r.name}</p>
                  <p class="text-[11px] font-mono text-zinc-600 mt-0.5 line-clamp-2">{r.instruction}</p>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                  <button
                    onclick={() => toggleRule(r)}
                    class="w-10 h-5 border relative transition-colors
                      {r.enabled ? 'bg-amber-500 border-amber-600' : 'bg-zinc-800 border-zinc-700'}"
                  >
                    <span class="absolute top-0.5 transition-all w-4 h-4 bg-white
                      {r.enabled ? 'right-0.5' : 'left-0.5'}"></span>
                  </button>
                  <button onclick={() => deleteRule(r.id)} class="text-zinc-700 hover:text-red-400 transition-colors text-xs">✕</button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>

  <!-- SKILLS TAB -->
  {:else if activeTab === 'skills'}
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-mono uppercase tracking-widest text-zinc-500">Skills</h2>
        <button
          onclick={() => (newSkillExpanded = !newSkillExpanded)}
          class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-mono text-xs font-bold uppercase tracking-wider transition-colors"
        >
          + New Skill
        </button>
      </div>

      {#if newSkillExpanded}
        <form onsubmit={submitSkill} class="border border-amber-800 bg-amber-950/10 p-4 flex flex-col gap-3">
          <h3 class="text-xs font-mono text-amber-400 uppercase tracking-widest">New Skill</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-mono text-zinc-500">ID (name)</label>
              <input bind:value={newSkill.name} required placeholder="my-skill" class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-xs px-2 py-1.5 focus:outline-none focus:border-amber-800" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-mono text-zinc-500">Display Name</label>
              <input bind:value={newSkill.display_name} required class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-xs px-2 py-1.5 focus:outline-none focus:border-amber-800" />
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-mono text-zinc-500">Description</label>
            <input bind:value={newSkill.description} class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-xs px-2 py-1.5 focus:outline-none focus:border-amber-800" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-mono text-zinc-500">Trigger Keywords (comma-separated)</label>
            <input bind:value={newSkill.trigger_keywords} placeholder="fix, repair, debug" class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-xs px-2 py-1.5 focus:outline-none focus:border-amber-800" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-mono text-zinc-500">Content (markdown)</label>
            <textarea bind:value={newSkill.content} rows={5} class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-xs px-2 py-1.5 focus:outline-none focus:border-amber-800 resize-none"></textarea>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-mono text-zinc-500">Scope</label>
            <select bind:value={newSkill.scope} class="bg-[#0a0a0a] border border-[#2e2e2e] text-gray-200 font-mono text-xs px-2 py-1.5 focus:outline-none w-32">
              <option value="global">global</option>
              <option value="repo">repo</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button type="submit" class="px-3 py-1.5 bg-amber-500 text-black font-mono text-xs font-bold uppercase">Save</button>
            <button type="button" onclick={() => (newSkillExpanded = false)} class="px-3 py-1.5 border border-[#2e2e2e] text-zinc-500 font-mono text-xs">Cancel</button>
          </div>
        </form>
      {/if}

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {#each skills as s (s.id)}
          <div class="border border-[#2e2e2e] bg-[#111111] p-4 flex flex-col gap-3">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm font-mono text-gray-200">{s.display_name}</p>
                <p class="text-[10px] font-mono text-zinc-600 mt-0.5">{s.name}</p>
              </div>
              <button
                onclick={() => toggleSkill(s)}
                class="w-10 h-5 border relative transition-colors shrink-0
                  {s.enabled ? 'bg-amber-500 border-amber-600' : 'bg-zinc-800 border-zinc-700'}"
              >
                <span class="absolute top-0.5 transition-all w-4 h-4 bg-white
                  {s.enabled ? 'right-0.5' : 'left-0.5'}"></span>
              </button>
            </div>
            {#if s.description}
              <p class="text-xs text-zinc-500 font-mono">{s.description}</p>
            {/if}
            {#if s.trigger_keywords.length > 0}
              <div class="flex flex-wrap gap-1">
                {#each s.trigger_keywords as kw}
                  <span class="px-1.5 py-0.5 border border-zinc-700 bg-zinc-800 text-zinc-400 text-[10px] font-mono">{kw}</span>
                {/each}
              </div>
            {/if}
            <button onclick={() => deleteSkill(s.id)} class="text-zinc-700 hover:text-red-400 text-[10px] font-mono text-left transition-colors">delete</button>
          </div>
        {/each}
      </div>
    </div>

  <!-- SUBAGENTS TAB -->
  {:else if activeTab === 'subagents'}
    <div class="flex flex-col gap-3">
      <h2 class="text-xs font-mono uppercase tracking-widest text-zinc-500">Subagents</h2>
      {#each subagents as s (s.id)}
        <div class="border border-[#2e2e2e] bg-[#111111]">
          <!-- Header row -->
          <div class="flex items-center gap-4 px-4 py-3">
            <button
              onclick={() => (expandedSubagent = expandedSubagent === s.id ? null : s.id)}
              class="flex-1 flex items-center gap-3 text-left"
            >
              <span class="text-sm font-mono text-gray-200">{s.display_name}</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 border border-zinc-700 bg-zinc-800 text-zinc-400">{s.model}</span>
              <span class="text-zinc-600 text-xs ml-auto">{expandedSubagent === s.id ? '▲' : '▼'}</span>
            </button>
            <button
              onclick={() => toggleSubagent(s)}
              class="w-10 h-5 border relative transition-colors shrink-0
                {s.enabled ? 'bg-amber-500 border-amber-600' : 'bg-zinc-800 border-zinc-700'}"
            >
              <span class="absolute top-0.5 transition-all w-4 h-4 bg-white
                {s.enabled ? 'right-0.5' : 'left-0.5'}"></span>
            </button>
          </div>

          <!-- Expanded editor -->
          {#if expandedSubagent === s.id}
            <div class="border-t border-[#2e2e2e] p-4 flex flex-col gap-4 bg-[#0a0a0a]">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-mono text-zinc-500 uppercase tracking-widest">Model</label>
                <select
                  value={s.model}
                  onchange={(e) => { subagents = subagents.map(x => x.id === s.id ? { ...x, model: (e.target as HTMLSelectElement).value } : x); }}
                  class="bg-[#111111] border border-[#2e2e2e] text-gray-200 font-mono text-xs px-2 py-1.5 focus:outline-none w-56"
                >
                  {#each MODELS as m}
                    <option value={m} selected={s.model === m}>{m}</option>
                  {/each}
                </select>
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-xs font-mono text-zinc-500 uppercase tracking-widest">System Prompt</label>
                <textarea
                  value={s.system_prompt}
                  oninput={(e) => { subagents = subagents.map(x => x.id === s.id ? { ...x, system_prompt: (e.target as HTMLTextAreaElement).value } : x); }}
                  rows={6}
                  class="bg-[#111111] border border-[#2e2e2e] text-gray-200 font-mono text-xs px-3 py-2 focus:outline-none focus:border-amber-800 resize-none"
                ></textarea>
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-xs font-mono text-zinc-500 uppercase tracking-widest">Allowed Tools</label>
                <div class="flex flex-wrap gap-2">
                  {#each TOOL_OPTIONS as tool}
                    <label class="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={s.allowed_tools.includes(tool)}
                        onchange={() => toggleSubagentTool(s, tool)}
                        class="accent-amber-500"
                      />
                      <span class="text-xs font-mono text-zinc-400">{tool}</span>
                    </label>
                  {/each}
                </div>
              </div>

              <div class="flex gap-2">
                <button
                  onclick={() => saveSubagent(s)}
                  class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-mono text-xs font-bold uppercase transition-colors"
                >
                  Save
                </button>
                <button
                  onclick={() => alert('Coming soon')}
                  class="px-3 py-1.5 border border-[#2e2e2e] text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-colors"
                >
                  Test subagent
                </button>
                <button
                  onclick={() => (expandedSubagent = null)}
                  class="px-3 py-1.5 border border-[#2e2e2e] text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
