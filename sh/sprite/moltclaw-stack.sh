#!/bin/bash
set -eo pipefail

# One-click Sprite deployer for the MoltClaw stack.
# Provisions a Sprite VM, installs Docker/Compose, uploads the stack bundle,
# and starts the frontend + OpenClaw + Paperclip + MoltClaw services.

if ! command -v sprite >/dev/null 2>&1; then
  echo "error: sprite CLI is required. Install it first and run 'sprite auth login'." >&2
  exit 1
fi

if ! sprite org list >/dev/null 2>&1; then
  echo "error: sprite CLI is not authenticated. Run 'sprite auth login'." >&2
  exit 1
fi

: "${OPENROUTER_API_KEY:?Set OPENROUTER_API_KEY before running this script.}"
: "${GHL_API_KEY:?Set GHL_API_KEY before running this script.}"
: "${GHL_LOCATION_ID:?Set GHL_LOCATION_ID before running this script.}"

SPRITE_NAME="${SPRITE_NAME:-moltclaw-stack}"
STACK_DOMAIN="${STACK_DOMAIN:-localhost}"
OPENCLAW_IMAGE="${OPENCLAW_IMAGE:-ghcr.io/openclaw/openclaw:latest}"
PAPERCLIP_IMAGE="${PAPERCLIP_IMAGE:-ghcr.io/paperclipai/paperclip:latest}"
MOLTCLAW_IMAGE="${MOLTCLAW_IMAGE:-ghcr.io/moltclawos/moltclaw:latest}"
OPENCLAW_COMMAND="${OPENCLAW_COMMAND:-openclaw gateway}"
PAPERCLIP_COMMAND="${PAPERCLIP_COMMAND:-server}"
MOLTCLAW_COMMAND="${MOLTCLAW_COMMAND:-start}"
OPENCLAW_MODEL="${OPENCLAW_MODEL:-openrouter/auto}"
PAPERCLIP_MODEL="${PAPERCLIP_MODEL:-openrouter/auto}"
PAPERCLIP_PUBLIC_URL="${PAPERCLIP_PUBLIC_URL:-https://${STACK_DOMAIN}/paperclip}"
MOLTCLAW_PUBLIC_URL="${MOLTCLAW_PUBLIC_URL:-https://${STACK_DOMAIN}/moltclaw}"
OPENCLAW_BASE_URL="${OPENCLAW_BASE_URL:-http://openclaw:3000}"
PAPERCLIP_BASE_URL="${PAPERCLIP_BASE_URL:-http://paperclip:8000}"
GHL_AGENCY_ID="${GHL_AGENCY_ID:-}"
SPRITE_ORG="${SPRITE_ORG:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
STACK_DIR="${REPO_ROOT}/docker/moltclaw-stack"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

ORG_ARGS=()
if [ -n "${SPRITE_ORG}" ]; then
  ORG_ARGS+=("-o" "${SPRITE_ORG}")
fi

remote_exec() {
  local cmd="$1"
  printf '%s' "${cmd}" | sprite "${ORG_ARGS[@]}" exec -s "${SPRITE_NAME}" -- bash
}

upload_file() {
  local local_path="$1"
  local remote_path="$2"
  local encoded
  encoded=$(base64 -w 0 < "${local_path}")
  remote_exec "mkdir -p \"$(dirname "${remote_path}")\" && printf '%s' '${encoded}' | base64 -d > '${remote_path}'"
}

cat > "${TMP_DIR}/.env" <<ENVEOF
OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
GHL_API_KEY=${GHL_API_KEY}
GHL_LOCATION_ID=${GHL_LOCATION_ID}
GHL_AGENCY_ID=${GHL_AGENCY_ID}
STACK_DOMAIN=${STACK_DOMAIN}
OPENCLAW_IMAGE=${OPENCLAW_IMAGE}
PAPERCLIP_IMAGE=${PAPERCLIP_IMAGE}
MOLTCLAW_IMAGE=${MOLTCLAW_IMAGE}
OPENCLAW_COMMAND=${OPENCLAW_COMMAND}
PAPERCLIP_COMMAND=${PAPERCLIP_COMMAND}
MOLTCLAW_COMMAND=${MOLTCLAW_COMMAND}
OPENCLAW_MODEL=${OPENCLAW_MODEL}
PAPERCLIP_MODEL=${PAPERCLIP_MODEL}
PAPERCLIP_PUBLIC_URL=${PAPERCLIP_PUBLIC_URL}
MOLTCLAW_PUBLIC_URL=${MOLTCLAW_PUBLIC_URL}
OPENCLAW_BASE_URL=${OPENCLAW_BASE_URL}
PAPERCLIP_BASE_URL=${PAPERCLIP_BASE_URL}
ENVEOF

if ! sprite "${ORG_ARGS[@]}" list 2>/dev/null | grep -q "${SPRITE_NAME}"; then
  echo "Creating Sprite VM '${SPRITE_NAME}'..." >&2
  sprite "${ORG_ARGS[@]}" create "${SPRITE_NAME}"
else
  echo "Using existing Sprite VM '${SPRITE_NAME}'." >&2
fi

echo "Installing Docker and Docker Compose on Sprite..." >&2
remote_exec 'set -eo pipefail
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
if ! docker compose version >/dev/null 2>&1; then
  apt-get update
  apt-get install -y docker-compose-plugin
fi
mkdir -p /opt/moltclaw-stack'

echo "Uploading stack bundle..." >&2
upload_file "${STACK_DIR}/docker-compose.yml" "/opt/moltclaw-stack/docker-compose.yml"
upload_file "${STACK_DIR}/Caddyfile" "/opt/moltclaw-stack/Caddyfile"
upload_file "${TMP_DIR}/.env" "/opt/moltclaw-stack/.env"
echo "Cloning or updating Spawn on Sprite..." >&2
remote_exec 'set -eo pipefail
if [ ! -d /opt/spawn/.git ]; then
  git clone https://github.com/MoltclawOS/spawn.git /opt/spawn
else
  git -C /opt/spawn pull --ff-only
fi'

echo "Starting the MoltClaw stack..." >&2
remote_exec 'set -eo pipefail
cd /opt/moltclaw-stack
ln -sf /opt/spawn /opt/moltclaw-stack/repo
docker compose up -d --build'

echo "Deployment complete." >&2
echo "Sprite: ${SPRITE_NAME}" >&2
echo "Open the operator console at: https://${STACK_DOMAIN}" >&2
