# Spawn Operator Console

A real browser-based frontend for Spawn that connects to the local repository manifest and CLI.

## Run locally

```bash
bun run platform/server.ts
```

Then open <http://localhost:4173>.

## What it does

- Loads agents and clouds from `manifest.json`
- Restricts cloud choices to implemented Spawn pairs
- Runs real `spawn --dry-run` previews through the local CLI
- Can submit headless launches with `spawn --output json` when credentials are configured
