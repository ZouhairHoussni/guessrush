# GuessRush

GuessRush is a mobile-first, local party game built from the `TIMESUP_CODEX_MASTER_SPEC.md` plan. It uses a React + TypeScript frontend, a FastAPI + SQLAlchemy backend, REST recovery snapshots, and Socket.IO room updates.

## Prerequisites

- Python 3.11+
- Node.js 20+
- Windows PowerShell

For Raspberry Pi OS, use the one-command setup below; it checks and installs the needed system packages, Node.js, Python virtualenv dependencies, app env files, database migrations, and validation checks.

## Raspberry Pi OS Fresh Clone Setup

Recommended target: Raspberry Pi OS Bookworm, preferably 64-bit, with internet access and a user that can run `sudo`.

```bash
git clone https://github.com/ZouhairHoussni/guessrush.git
cd guessrush
bash scripts/setup-raspberry-pi.sh
```

The setup script:

- installs apt packages needed for Python, Node, native npm builds, Git and TLS;
- installs Node.js 22 from NodeSource if the system Node.js is missing or older than 20;
- creates `backend/.venv` and installs the FastAPI backend with dev/test tools;
- installs frontend dependencies with `npm ci`;
- creates phone-ready `backend/.env` and `frontend/.env.local` using the Pi's LAN IP;
- runs Alembic migrations and the backend/frontend validation checks.

Start the app after setup:

```bash
bash scripts/run-raspberry-pi.sh
```

Then open the printed LAN URL, usually `http://<pi-lan-ip>:5173`, from phones on the same Wi-Fi.

For a TV or Raspberry Pi display, launch Chromium in kiosk mode after the app is running:

```bash
chromium-browser --kiosk http://<pi-ip>:5173
```

If your image exposes Chromium as `chromium` instead, use:

```bash
chromium --kiosk http://<pi-ip>:5173
```

Useful options:

```bash
bash scripts/setup-raspberry-pi.sh --run
bash scripts/setup-raspberry-pi.sh --host 192.168.1.42
bash scripts/setup-raspberry-pi.sh --skip-checks
bash scripts/setup-raspberry-pi.sh --no-apt
```

Use `--host` when the Pi has more than one network interface and the detected LAN IP is not the one phones should use. Use `--skip-checks` on a slow Pi after a previous successful setup.

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend

Open a second PowerShell window:

```powershell
cd frontend
$env:NPM_CONFIG_PREFIX='C:\Program Files\nodejs'
npm install
npm run dev -- --host 0.0.0.0
```

Open `http://localhost:5173`.

## Docker Compose

Build both application images:

```powershell
docker compose build
```

Start the app:

```powershell
docker compose up
```

Open `http://localhost:8080`. The frontend container serves the built React app with nginx and proxies `/api` plus `/socket.io` to the FastAPI backend container. The backend runs Alembic migrations on startup and stores the default SQLite database in a named Docker volume.

For phone testing on the same Wi-Fi, open the app on the host computer using its LAN URL, for example `http://192.168.1.25:8080`, so QR links use that reachable origin. If you want backend-generated join URLs to match too:

```powershell
$env:PUBLIC_APP_URL='http://192.168.1.25:8080'
$env:CORS_ALLOWED_ORIGINS='http://localhost:8080,http://127.0.0.1:8080,http://192.168.1.25:8080'
docker compose up --build
```

Only the frontend is published by default on port `8080`; the backend stays inside the Compose network and is reached through nginx. This avoids local conflicts with a development backend already using port `8000`.

## Four Local Player Windows

After creating a room, open four isolated 9:16 browser windows side by side:

```powershell
.\scripts\open-four-players.ps1 -RoomCode ABC123
```

Useful options:

```powershell
.\scripts\open-four-players.ps1 -BaseUrl http://localhost:8080 -RoomCode ABC123 -ResetProfiles
.\scripts\open-four-players.ps1 -RoomCode ABC123 -Chrome
.\scripts\open-four-players.ps1 -RoomCode ABC123 -Width 360 -Height 640 -StartX 0 -StartY 0 -Gap 8
.\scripts\open-four-players.ps1 -RoomCode ABC123 -AppMode
.\scripts\open-four-players.ps1 -RoomCode ABC123 -DryRun
```

Each window gets its own browser profile under `.tmp\browser-players`, so player tokens do not collide.

## Same-Wi-Fi Phone Testing

1. Find your computer's LAN IPv4 address:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '169.254*' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object IPAddress, InterfaceAlias
```

2. Create `backend\.env` from `backend\.env.example` and set:

```powershell
PUBLIC_APP_URL=http://<LAN_IP>:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://<LAN_IP>:5173
```

3. Create `frontend\.env.local` and set:

```powershell
VITE_API_BASE_URL=http://<LAN_IP>:8000
VITE_PUBLIC_APP_URL=http://<LAN_IP>:5173
```

4. Start backend and frontend with `--host 0.0.0.0` as shown above. Allow Windows Firewall access if prompted.
5. On phones connected to the same Wi-Fi, open `http://<LAN_IP>:5173` or scan the host lobby QR code.

If the invite screen says the QR points at `localhost`, update `VITE_PUBLIC_APP_URL` before using phones.

## Tests

```powershell
cd backend
pytest
ruff check .

cd ..\frontend
$env:NPM_CONFIG_PREFIX='C:\Program Files\nodejs'
npm run test
npm run lint
npm run build
npm run e2e
```

The Playwright e2e command starts its own backend/frontend test servers on ports `8011` and `5174`.

## Installability

The frontend ships a web app manifest, original SVG icon, theme metadata, and a conservative production service worker. The service worker only handles app-shell navigation fallback and intentionally does not cache API or Socket.IO traffic.
