# Decisions

## 2026-05-25 - Milestone 0/1 foundation

- Use `GuessRush` as the original app identity and keep the visual language blue/yellow without official Time's Up marks, artwork, or card content.
- Use REST commands plus Socket.IO broadcasts. REST remains the source for create/join/snapshot recovery, and sockets carry safe lobby snapshot updates after commits.
- Store only HMAC-SHA256 token hashes for host and player authority. Public room codes and member IDs never authorize commands.
- Use synchronous SQLAlchemy sessions for the initial FastAPI foundation with a database URL that accepts local SQLite and can move to Postgres. This keeps Milestone 0/1 reliable on Windows while preserving the service boundaries needed for later gameplay transactions.
- Use server-owned auto-balance on join: each new player is assigned to the smallest team, with team order as the tie-breaker.
- Leave ready flow, personal-card submission, team editing, and gameplay transitions for Milestone 2+. Milestone 1 screens only show backend-connected lobby state.
- Use Playwright `webServer` for repeatable UI verification. The e2e config runs temporary backend/frontend ports (`8011` and `5174`) to avoid colliding with any existing local development servers.

## 2026-05-26 - Milestone 2 deck and ready flow

- Quick Play cards are seeded from an original local JSON deck only when the host successfully starts setup. The planned count is 30 cards for up to 6 players and 40 above that.
- Personal-card rooms remain in `CARD_SUBMISSION` until every current player has submitted the required card count; joining a new player returns the room to card submission if needed.
- Players may mark ready only after their required deck work is complete. Editing personal cards resets that player's ready state.
- Host start moves a validated setup room to `ROUND_INTRO` and locks cards, but Milestone 2 intentionally does not implement turn selection, timers or scoring.
- Lobby snapshots expose only safe card metadata: counts, readiness and submission status. Personal card text is returned only through the authenticated player's own card-status endpoint.
- Host team arrangement is implemented as tap-to-move controls before gameplay; drag-and-drop remains unnecessary for the MVP slice.

## 2026-05-26 - Milestone 3 game engine and fair rotation

- Gameplay commands now live in a backend `game_engine` service. The frontend can request transitions, but phases, turn selection, deadlines, scoring and card visibility are decided server-side.
- Team rotation uses the turn sequence; member rotation uses each team's `next_member_cursor`. The cursor advances only when a completed turn is confirmed, and it continues across round boundaries.
- The host can start a round only from `ROUND_INTRO`; the active player starts the timer from `TURN_READY`; scoring is accepted only during `TURN_LIVE` before the stored deadline.
- Room snapshots include a public-safe `turn` object, while `currentCardText` is populated only for the authenticated active player. Public, host and non-active player snapshots remain card-blind during live turns.
- SQLite reloads timezone-aware datetimes as naive values, so gameplay snapshots normalise turn timestamps back to UTC before serialising them for browser countdowns.
- Start validation now blocks gameplay if any configured team has no players. This avoids creating impossible rotations in 3- or 4-team rooms.
- A minimal `advance-round` backend command exists so round-boundary cursor behaviour is testable; full round summary/results UX remains for Milestone 5.

## 2026-05-26 - Milestone 4 active gameplay and realtime UX

- Correct and skip commands accept an `Idempotency-Key` header. Repeated requests with the same key return without applying the same score/skip mutation twice.
- Skip records a `SKIP` guess event and moves the current unresolved round card behind the other pending cards without changing score.
- The shared display uses the same public REST snapshot and socket recovery path as spectators. It never receives `currentCardText`.
- Countdown UI computes time from server-provided `deadlineAt` and `serverTime`, so browser clock skew and SQLite datetime reloads do not make the timer appear expired early.
- Active turns request screen wake lock when supported and vibrate once at the urgent five-second threshold. These are progressive enhancements only; gameplay does not depend on them.
- Snapshot recovery now refetches on socket events, browser focus, visibility changes and `online`, keeping refreshed or reconnected clients aligned with backend state.

## 2026-05-26 - Milestone 5 recaps, results and rematch

- Undo is available only during `TURN_RECAP` and only to the active clue-giver or host. It records `UNDO_CORRECT`, decrements turn/team score and restores the card to the front of the pending queue.
- Recap guessed-card text is included only for host snapshots and the active clue-giver's authenticated player snapshot. Other players and public/display snapshots receive counts/state without recap card text.
- Results statistics are calculated from confirmed turns and valid non-undone correct events only. Unconfirmed or undone guesses do not contribute to leaders or best-turn stats.
- Rematch from `FINISHED` resets turns, round cards, guess events, team scores, timers and rotation cursors. Same-cards rematch returns directly to `ROUND_INTRO` round 1; new Personal Cards rematch returns to `CARD_SUBMISSION`.
- The final results view is rendered from the authoritative snapshot and handles ties by marking every tied winning team instead of choosing a false single winner.

## 2026-06-11 - Milestone 6 local party readiness

- Connection status now has explicit player-facing copy for connecting, reconnecting and offline states. The app keeps REST snapshot recovery as the authority after socket events, focus, visibility return and browser online events.
- Browser fetch failures are translated into a structured `NETWORK_ERROR` so offline/backend-stopped states show actionable inline errors instead of raw `TypeError` messages.
- The host invite panel warns when the QR link points at `localhost` or loopback, because same-Wi-Fi phone joining requires `VITE_PUBLIC_APP_URL` to use the host computer's LAN URL.
- Installability is intentionally lightweight: a web manifest, original SVG icon, mobile app metadata and production service worker. The service worker only handles app-shell navigation fallback and does not cache API or Socket.IO traffic.
- Frontend config files were changed to native ESM JavaScript and Vite uses `--configLoader native`; this avoids Windows/sandbox temp-file issues while keeping normal PowerShell commands intact.
- Milestone 6 Playwright coverage adds direct permission assertions for missing host token and non-active player scoring, plus spectator refresh recovery after a score with live-card non-leakage.
- Docker Compose now builds two application services by default: FastAPI with startup migrations and a persisted SQLite volume, plus an nginx-served frontend that proxies REST and Socket.IO to the backend on the same origin.

## 2026-06-11 - Rules polish from local playtest

- Turn-ready copy no longer tells anyone to pass a phone. Every player is assumed to use their own device, so non-active views announce the clue-giver by name while the active player starts from their own phone.
- Turn recap snapshots no longer expose guessed card text to any viewer. Recaps show the number guessed and keep undo/confirm actions authorized by host or active-player token.
- Skip rules are now round-specific in the backend: round 1 allows unlimited skips, while rounds 2 and 3 allow one skip per turn. Snapshots expose `skipsUsed`, `skipsAllowed` and `canSkip` so the frontend disables the skip control from server truth.
- Host lobby shuffle announcements are built after the recovery snapshot refetch completes, keeping the announcement text and visible team cards consistent.

## 2026-06-13 - Premium mobile-first UI simplification

- Keep the existing GuessRush blue/yellow identity, but move the palette to quieter tokens: deep blue surfaces, white/soft-blue content panels and yellow reserved for primary actions, highlights and celebration.
- Add shared UI primitives for the redesign: `Panel`, badge components, `TopBar`, `BottomActionBar`, `ScoreStrip` and `ConfirmDialog`. Screens should compose these instead of repeating one-off rounded card/button classes.
- Use real web fonts in the frontend theme: a friendly display face for titles and a readable body face for interface copy.
- Keep gameplay rules, card secrecy and socket recovery unchanged. The redesign is a presentation and ergonomics pass, not a route/API/game-engine rewrite.
- Add setup-only player leave and host cancel commands so destructive lobby actions can use confirmation dialogs and private tokens instead of being only visual links.
- Keep host tools in a quieter collapsible area while preserving the primary start-game action in the sticky mobile action bar.

## 2026-06-13 - Second-pass party polish

- Centralize team color treatment in `teamAccent` so score strips, team boards, round summaries and final results share the same restrained blue/yellow identity instead of duplicating color classes.
- Treat leading/winning teams as a presentation concern: use subtle colored borders, score zones, leader badges and glows, while leaving server score calculation and tie handling authoritative.
- Route authenticated players from snapshots, not from manual lobby actions. When a saved-token player sees a gameplay phase, lobby/card/join views move them to `/room/:code/play`; setup and card-submission phases still route by deck requirements.
- Return duplicate-card text in backend validation details without exposing card owners. The frontend uses that exact text for inline local and server duplicate messages.
- Compose host QR links from `VITE_PUBLIC_APP_URL` or `VITE_APP_URL` when configured, and show a localhost/LAN warning when the fallback URL is not phone-ready.
- Keep mobile home join-first and host-centered: creating a game stays prominent on desktop/TV, while mobile presents creation as a small secondary hosting path.

## 2026-06-14 - Motion and audio game-feel layer

- Do not add Framer Motion for this pass because it is not already installed and the requested motion can be handled with lightweight CSS transforms, opacity keyframes and shared React wrappers.
- Keep motion centralized in reusable tokens/classes and respect `prefers-reduced-motion`; animations should never be required to understand gameplay state.
- Use a central Web Audio sound manager for generated, short event sounds first. The manager also supports future file-backed sounds by registering `/public/sounds` paths without scattering `Audio` objects in components.
- Persist the sound mute preference in localStorage and expose a compact TopBar mute toggle. Audio unlocks only after the first user gesture and fails silently if the browser blocks context startup.
- Trigger gameplay sounds from previous-state comparisons, not renders: phase changes, score deltas, skip-count changes, ready toggles, duplicate attempts, countdown thresholds and winner reveal each play once per actual transition.
- Keep player-phone audio quieter than host/shared display audio; countdown ticks are limited to the active player and shared display so spectator phones do not all tick together.

## 2026-06-14 - Raspberry Pi OS clone-to-run setup

- Add native Raspberry Pi OS setup scripts instead of making Docker mandatory. Local Python/Node keeps the same development flow as the existing Windows instructions while staying simple for a fresh clone.
- Lower the backend package requirement to Python 3.11+ because Raspberry Pi OS Bookworm ships Python 3.11 and the backend code does not require Python 3.12-only syntax or dependencies.
- Keep Node.js 20+ as the frontend minimum. The setup script installs Node.js 22 from NodeSource only when the system Node.js is missing or too old.
- Generate `backend/.env` and `frontend/.env.local` from the Pi's detected LAN IP so QR links and API calls work from phones on the same Wi-Fi without source edits.
- Protect existing hand-written env files: generated env files include a marker, and the script does not overwrite unmarked local files.
