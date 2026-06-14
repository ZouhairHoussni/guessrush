#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BIND_HOST="${BIND_HOST:-0.0.0.0}"
HOST_OVERRIDE=""

usage() {
  cat <<'USAGE'
Usage: bash scripts/run-raspberry-pi.sh [options]

Starts GuessRush backend and frontend dev servers on Raspberry Pi OS.

Options:
  --host <ip-or-hostname>  Use this LAN host for runtime URLs and phone access.
  -h, --help              Show this help.

Environment:
  BACKEND_PORT=8000       Backend port override.
  FRONTEND_PORT=5173      Frontend port override.
  BIND_HOST=0.0.0.0       Server bind address override.
  PUBLIC_HOST=<host>      Same effect as --host.
USAGE
}

log() {
  printf '\n[guessrush] %s\n' "$*"
}

fail() {
  printf '\n[guessrush:error] %s\n' "$*" >&2
  exit 1
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --host)
      [ "${2:-}" ] || fail "--host requires an IP address or hostname"
      HOST_OVERRIDE="$2"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

detect_lan_host() {
  local detected=""
  if command -v hostname >/dev/null 2>&1; then
    detected="$(
      hostname -I 2>/dev/null |
        tr ' ' '\n' |
        grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' |
        grep -Ev '^(127|169\.254)\.' |
        head -n 1 || true
    )"
  fi
  if [ -z "$detected" ] && command -v ip >/dev/null 2>&1; then
    detected="$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p' | head -n 1 || true)"
  fi
  printf '%s\n' "${detected:-localhost}"
}

[ -x backend/.venv/bin/python ] || fail "Backend virtualenv not found. Run: bash scripts/setup-raspberry-pi.sh"
[ -d frontend/node_modules ] || fail "Frontend dependencies not found. Run: bash scripts/setup-raspberry-pi.sh"

LAN_HOST="${PUBLIC_HOST:-${HOST_OVERRIDE:-$(detect_lan_host)}}"
PUBLIC_URL="http://${LAN_HOST}:${FRONTEND_PORT}"
API_URL="http://${LAN_HOST}:${BACKEND_PORT}"

export FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-$PUBLIC_URL}"
export PUBLIC_APP_URL="${PUBLIC_APP_URL:-$PUBLIC_URL}"
export CORS_ALLOWED_ORIGINS="${CORS_ALLOWED_ORIGINS:-http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT},${PUBLIC_URL}}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-$API_URL}"
export VITE_PUBLIC_APP_URL="${VITE_PUBLIC_APP_URL:-$PUBLIC_URL}"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  log "Stopping GuessRush."
  if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

log "Applying backend migrations."
(
  cd backend
  # shellcheck disable=SC1091
  . .venv/bin/activate
  alembic upgrade head
)

log "Starting backend on ${BIND_HOST}:${BACKEND_PORT}."
(
  cd backend
  # shellcheck disable=SC1091
  . .venv/bin/activate
  uvicorn app.main:app --host "$BIND_HOST" --port "$BACKEND_PORT"
) &
BACKEND_PID="$!"

log "Starting frontend on ${BIND_HOST}:${FRONTEND_PORT}."
(
  cd frontend
  npm run dev -- --host "$BIND_HOST" --port "$FRONTEND_PORT"
) &
FRONTEND_PID="$!"

log "GuessRush is starting."
printf '%s\n' "Open on this Raspberry Pi: http://localhost:${FRONTEND_PORT}"
printf '%s\n' "Open from phones on the same Wi-Fi: ${PUBLIC_URL}"
printf '%s\n' "Press Ctrl+C to stop both servers."

wait -n "$BACKEND_PID" "$FRONTEND_PID"
