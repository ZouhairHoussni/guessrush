import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  webServer: [
    {
      command:
        "powershell -NoProfile -Command \"$env:BACKEND_DATABASE_URL='sqlite:///./e2e_guessrush.db'; $env:CORS_ALLOWED_ORIGINS='http://127.0.0.1:5174,http://localhost:5174'; $env:PUBLIC_APP_URL='http://127.0.0.1:5174'; alembic upgrade head; python -m uvicorn app.main:app --host 127.0.0.1 --port 8011\"",
      cwd: "../backend",
      url: "http://127.0.0.1:8011/health",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command:
        "powershell -NoProfile -Command \"$env:VITE_API_BASE_URL='http://127.0.0.1:8011'; $env:VITE_PUBLIC_APP_URL='http://127.0.0.1:5174'; & 'C:\\Program Files\\nodejs\\node.exe' '.\\node_modules\\vite\\bin\\vite.js' --host 127.0.0.1 --port 5174 --configLoader native\"",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
