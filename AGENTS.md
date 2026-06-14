# AGENTS.md — GuessRush Implementation Rules for Codex

## Mission

Build the application specified in `TIMESUP_CODEX_MASTER_SPEC.md`: an original, mobile-first blue/yellow three-round party game using React + TypeScript frontend and FastAPI + Python backend.

## Before editing

1. Read `TIMESUP_CODEX_MASTER_SPEC.md` fully.
2. Inspect the repository structure and existing files before making changes.
3. Create or update `docs/DECISIONS.md`, `docs/TEST_MATRIX.md` and `docs/UI_REVIEW.md`.
4. Identify the current milestone and limit work to a coherent vertical slice unless asked to continue.

## Engineering constraints

- Frontend: React, TypeScript, Vite, Tailwind compiled build, typed API/event boundaries.
- Backend: FastAPI, Pydantic, SQLAlchemy, Alembic, typed domain services, pytest.
- Realtime: Socket.IO or a documented equivalent; REST snapshots remain available for recovery.
- No Tailwind CDN in the final application.
- No official Time's Up logo, artwork or copied commercial card content.
- No authentication-by-public-ID. Protect host actions with host token and player actions with player token.
- Never expose live card text to spectators, shared display or non-active players.
- Game rules belong in backend domain/services, not frontend components.
- All game phase transitions must be explicit and validated.
- All score/timer/rotation mutations must be transactional and idempotent where repeated requests are possible.

## Critical gameplay invariant

Fair rotation is mandatory. For two teams `[A1, A2]` and `[B1, B2]`, turns must rotate `A1 -> B1 -> A2 -> B2 -> A1`, not continually choose the first player in each team.

## Workflow

For each milestone:

1. Update implementation plan/checklist.
2. Implement the smallest complete slice.
3. Add/update tests before declaring success.
4. Run formatting/lint/tests relevant to changed code.
5. Launch UI and visually inspect at `390x844` and `1440x900`; record observations in `docs/UI_REVIEW.md`.
6. Provide a concise summary of changes, run commands, test output, screenshots/visual findings, and remaining limitations.

## UI quality bar

- Bright original blue/yellow party-game-inspired interface.
- Yellow CTAs use dark text for contrast.
- One clear main action per screen.
- Active gameplay fits on phone without scrolling.
- Buttons are thumb-friendly and protected from double submission.
- Errors appear inline and are useful.
- Mobile connection/reconnect status is visible but unobtrusive.

## Test gates

Do not mark gameplay complete without automated tests for:

- fair multi-player clue-giver rotation;
- score, skip, undo and round completion;
- timer expiry and late-action rejection;
- host/player token permissions;
- no live card leakage;
- multi-context Playwright happy path and recovery flow.
