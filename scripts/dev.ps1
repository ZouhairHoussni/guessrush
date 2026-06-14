$ErrorActionPreference = "Stop"

Write-Host "Starting GuessRush requires two terminals:"
Write-Host "1. cd backend; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
Write-Host "2. cd frontend; `$env:NPM_CONFIG_PREFIX='C:\Program Files\nodejs'; npm run dev -- --host 0.0.0.0"
