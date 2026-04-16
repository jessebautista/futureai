<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>DevAgent</title>
</svelte:head>

<div class="min-h-screen bg-[#0a0a0a] text-gray-200">
	<nav class="border-b border-[#2e2e2e] bg-[#111111] px-6 py-3 flex items-center gap-8">
		<a href="/" class="text-amber-500 font-mono font-bold tracking-widest text-sm uppercase">DevAgent</a>
		<a href="/" class="text-xs text-zinc-400 hover:text-gray-200 transition-colors">Dashboard</a>
		<a href="/settings" class="text-xs text-zinc-400 hover:text-gray-200 transition-colors">Settings</a>
	</nav>
	{@render children()}
</div>
