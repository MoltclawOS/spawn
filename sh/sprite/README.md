# Sprite

Sprites.dev managed VMs with CLI. [Sprite](https://sprites.dev)

## Agents

#### Claude Code

```bash
bash <(curl -fsSL https://openrouter.ai/labs/spawn/sprite/claude.sh)
```

#### OpenClaw

```bash
bash <(curl -fsSL https://openrouter.ai/labs/spawn/sprite/openclaw.sh)
```

#### ZeroClaw

```bash
bash <(curl -fsSL https://openrouter.ai/labs/spawn/sprite/zeroclaw.sh)
```

#### Codex CLI

```bash
bash <(curl -fsSL https://openrouter.ai/labs/spawn/sprite/codex.sh)
```

#### OpenCode

```bash
bash <(curl -fsSL https://openrouter.ai/labs/spawn/sprite/opencode.sh)
```

#### Kilo Code

```bash
bash <(curl -fsSL https://openrouter.ai/labs/spawn/sprite/kilocode.sh)
```

#### Hermes

```bash
bash <(curl -fsSL https://openrouter.ai/labs/spawn/sprite/hermes.sh)
```

#### Junie

```bash
bash <(curl -fsSL https://openrouter.ai/labs/spawn/sprite/junie.sh)
```

#### MoltClaw Stack

```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxx \
GHL_API_KEY=xxxxx \
GHL_LOCATION_ID=xxxxx \
SPRITE_NAME=moltclaw-stack \
  bash sh/sprite/moltclaw-stack.sh
```

Deploys the Spawn Operator Console frontend, OpenClaw, Paperclip AI, and MoltClaw to a Sprite VM using Docker Compose.

## Non-Interactive Mode

```bash
SPRITE_NAME=dev-mk1 \
OPENROUTER_API_KEY=sk-or-v1-xxxxx \
  bash <(curl -fsSL https://openrouter.ai/labs/spawn/sprite/claude.sh)
```
