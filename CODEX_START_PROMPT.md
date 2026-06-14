# Prompt to paste into Codex Desktop

You are starting a new project for me. Read `TIMESUP_CODEX_MASTER_SPEC.md` and `AGENTS.md` in the project root before making any change.

Build the application from scratch according to the specification. Begin with **Milestone 0**, then continue to **Milestone 1** only if Milestone 0 is running, tested and visually checked. Do not rush into gameplay before the foundation and join flow are reliable.

Important context:

- This replaces an earlier Flask/Jinja MVP whose useful ideas were local rooms, mobile join, teams, timer and three rounds, but whose design must not be copied blindly.
- Critical defects to avoid: only first players rotating, public IDs authorising commands, card leakage to spectators, and hidden/inferred game states.
- The new product must use React + TypeScript for the frontend, FastAPI + Python for the backend, and realtime room updates with REST recovery snapshots.
- The UI must be an original bright blue/yellow playful party-game design inspired by the energetic physical-game feel. Do not use official logos, artwork or copied card packs.
- I use Windows/PowerShell, so ensure run instructions work for that environment.

For this first execution:

1. Create the repository/monorepo skeleton described by the master spec.
2. Create `docs/DECISIONS.md`, `docs/TEST_MATRIX.md`, and `docs/UI_REVIEW.md`.
3. Implement Milestone 0 fully: backend health route/config/database foundation; frontend routing/theme/home/create-room wizard; lint/test configuration.
4. Implement Milestone 1 only after Milestone 0 passes: room creation, host token, QR invitation screen, player join and auto-balanced lobby with reconnectable player token and realtime roster updates.
5. Use migrations for stored entities and keep domain/auth boundaries clean.
6. Run tests and linting; run the UI and inspect it at 390×844 and 1440×900. Fix visible problems before reporting completion.
7. At the end, report exactly what works, files created, commands to run, tests executed/results, visual verification, decisions made, and what remains for Milestone 2.

Do not implement fake UI states that are not connected to backend behaviour, and do not leave security/permission placeholders in completed Milestone 1 work.
