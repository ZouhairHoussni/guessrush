#!/usr/bin/env sh
set -eu

echo "Start the backend and frontend in separate terminals:"
echo "  cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo "  cd frontend && npm run dev -- --host 0.0.0.0"
