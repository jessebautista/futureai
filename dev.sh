#!/bin/bash
# Start both services concurrently

echo "Starting DevAgent..."

# Start TypeScript agent service
cd agent-service
npm run dev &
AGENT_PID=$!

# Start SvelteKit
cd ..
npm run dev &
SVELTE_PID=$!

echo "Agent service: http://localhost:8000"
echo "UI: http://localhost:5173"

# Kill both on Ctrl+C
trap "kill $AGENT_PID $SVELTE_PID 2>/dev/null" EXIT
wait
