# MoltClaw Sprite Stack

Dockerized deployment bundle for:

- Spawn Operator Console frontend
- OpenClaw
- Paperclip AI
- MoltClaw (OpenClaw + GoHighLevel bridge)
- Caddy reverse proxy

## Local usage

```bash
cp docker/moltclaw-stack/.env.example docker/moltclaw-stack/.env
# edit docker/moltclaw-stack/.env
cd docker/moltclaw-stack
docker compose up -d --build
```

## One-click Sprite deployment

```bash
OPENROUTER_API_KEY=sk-or-v1-... \
GHL_API_KEY=... \
GHL_LOCATION_ID=... \
SPRITE_NAME=moltclaw-stack \
bash sh/sprite/moltclaw-stack.sh
```

The Sprite script will:

1. Validate the `sprite` CLI is installed and authenticated.
2. Create the Sprite VM if it does not already exist.
3. Install Docker + Docker Compose on the remote host.
4. Upload the Docker Compose bundle and generated `.env` file.
5. Start the full stack in one command.
