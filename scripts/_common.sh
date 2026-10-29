#!/usr/bin/env bash
# Shared helpers: run lncli inside Polar's Docker containers.
# Container names come from env vars (check yours with: docker ps --format '{{.Names}}').
set -euo pipefail
export MSYS_NO_PATHCONV=1   # stop Git Bash on Windows from rewriting arguments as paths

ALICE_CONTAINER="${ALICE_CONTAINER:-polar-n1-alice}"
BOB_CONTAINER="${BOB_CONTAINER:-polar-n1-bob}"

# Usage: lncli_on <container> <lncli args...>
lncli_on() {
  local c="$1"; shift
  docker exec "$c" lncli --network regtest "$@"
}
alice() { lncli_on "$ALICE_CONTAINER" "$@"; }
bob()   { lncli_on "$BOB_CONTAINER" "$@"; }

step() { printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }
