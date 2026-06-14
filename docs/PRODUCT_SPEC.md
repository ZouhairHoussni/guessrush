# Time's-Up-Inspired Party Game — Codex Desktop Master Specification

**Working project name:** `GuessRush`  
**Product type:** mobile-first, local/hosted multiplayer party game inspired by the three-round guessing format.  
**Primary user:** a group of friends around one table, using individual phones and optionally one shared scoreboard screen.  
**Implementation target:** Codex Desktop building a new repository from scratch.  
**Stack decision:** React + TypeScript frontend, FastAPI + Python backend, realtime events, tested game engine.

---

## 0. Instructions to Codex Desktop

You are implementing this application from scratch. Treat this document as the source of truth for product behaviour, architecture, design constraints and acceptance tests.

### Non-negotiable working rules

1. Do not clone the existing Flask MVP. Build a clean new implementation while preserving the good concepts: room code, join-by-phone, teams, three rounds, active-player-only card visibility, server-owned timer and score.
2. Work incrementally in vertical slices. At the end of every milestone, the app must run, relevant tests must pass, and the implementation must be visually inspected at mobile and desktop widths.
3. Do not silently invent or change game rules. When a design decision is required but absent here, choose the simplest robust default and record it in `docs/DECISIONS.md`.
4. Do not use the official Time's Up logo, official artwork, official card text/database, box art, or trademarked visual assets. The visual language may be inspired by a playful bright blue/yellow party-game aesthetic, but the application must use original branding and assets.
5. Never put authority in public IDs. A host secret authorises host actions; a player reconnect token authorises player actions. Public room codes and public player IDs are not authentication.
6. The backend game engine is the authority for turns, scores, deck order, allowed actions, deadlines and game phases. The frontend is a realtime view/controller only.
7. Implement and test fair clue-giver rotation: all members of a team must take turns in sequence, not only the first player.
8. Use realtime events for instant UI updates, but keep REST snapshot endpoints for initial load, reconnect and recovery.
9. Prefer readable, typed, maintainable code over clever abstractions. Avoid premature distributed-system complexity.
10. Do not claim a milestone is complete until its acceptance criteria and tests have passed.

### Expected Codex output after each implementation run

Codex must report:

- Files created or changed.
- Architectural decisions made.
- Commands needed to run the application.
- Tests executed and their outcome.
- Manual UI verification performed, including viewport sizes.
- Remaining limitations or next milestone.

---

## 1. Product vision

Build a fast, joyful party-game web app in which friends join a room on their phones and play three escalating rounds using the same deck of cards:

1. **Describe** — say anything except the answer or obvious derivatives.
2. **One word** — give only one clue word.
3. **Mime** — no spoken words.

The app must remove setup friction while making the game fair and reliable. A group should be able to create a room, scan a QR code, join, prepare the deck and begin playing in under two minutes in Quick Play mode.

### Design principles

- **Instant to understand:** one obvious primary action per screen.
- **Phone-first:** touch targets, readability and one-hand interactions take priority.
- **Social, not administrative:** the host screen is a fun scoreboard/display, not a technical dashboard.
- **Fair by construction:** rotation, timer and scores cannot depend on trust or manual arithmetic.
- **Recoverable:** refreshing a page or briefly losing Wi-Fi must not break a game.
- **Fun payoff:** round transitions and final results should feel celebratory.

---

## 2. Scope boundaries

### MVP must include

- Create room.
- Join using QR-link or short room code.
- Host can optionally join as a player from another device/browser.
- 2–4 teams; auto-balanced assignment by default; host can move players before game starts.
- Two deck modes:
  - **Quick Play:** built-in original starter cards provided by this application.
  - **Personal Cards:** each player submits cards secretly.
- Ready state and validation before starting.
- Three fixed rounds.
- Timed turns: 30, 45 or 60 seconds.
- Fair rotating clue-givers within every team.
- Correct / skip controls.
- Turn recap with undo-last-correct before confirming.
- Round intro and round summary screens.
- Final results and rematch.
- Shared display mode.
- Server-authoritative state and access tokens.
- Realtime updates plus reconnect recovery.
- Automated test suite and responsive UI validation.

### Deliberately not in MVP

- Public matchmaking.
- User accounts or social profiles.
- Remote internet hosting hardening beyond basic deployment readiness.
- Paid subscriptions.
- Native mobile app.
- Voice recognition or AI judging.
- Official branded content or copied commercial card packs.
- Multiple languages beyond UI architecture being translation-ready; start with English strings, optionally add French later.

---

## 3. Product naming and intellectual-property constraint

Use an original default app identity such as **GuessRush** or **RoundRush**. Keep the app name in one configuration/theme constant so it can be changed later.

The visual direction is inspired by the bright, energetic feeling of a classic blue/yellow party-game box: dominant blue surfaces, vivid yellow highlights, white playing cards, small orange/red celebratory accents, playful radial motion and an hourglass-like timer motif. Do not copy the official wordmark, typography treatment, iconography or artwork. Do not ship an official card list.

---

## 4. Target user journeys

## 4.1 Home screen

Route: `/`

Purpose: immediate entry point, minimal cognitive load.

Content:

- Original logo/wordmark for the app.
- Short tagline: “Describe. One word. Mime. Beat the clock.”
- Primary action: `Create a game`.
- Secondary action: `Join a game`.
- Tiny footer link: `How it works`.

Mobile layout:

- Full viewport blue background with subtle radial pattern.
- Yellow logo panel or badge.
- Two large buttons anchored near the lower half.

No network/IP information is displayed on the main screen.

---

## 4.2 Create-room wizard

Route: `/create`

A smooth three-step wizard; do not present a long configuration form.

### Step 1 — Choose play mode

Cards:

- `Quick Play` — “Start fast with a ready-made deck.” Selected by default.
- `Personal Cards` — “Every player secretly adds cards.”

### Step 2 — Core settings

Required settings:

- Number of teams: `2`, `3`, `4`; default `2`.
- Turn duration: `30`, `45`, `60` seconds; default `30`.
- Team assignment: `Auto balance` default; `Host arranges` alternative.

For Personal Cards:

- Cards per player: `2`, `3`, `4`, `5`; default `3`.

Advanced settings accordion, optional:

- Team names and colour selections.
- Allow skip: enabled by default.
- Minimum players warning override for test/demo play.

### Step 3 — Create room

On submit:

- Backend creates a room and returns public room code and private host token.
- Host token is stored in secure-enough local client persistence for MVP, never shown in UI or emitted publicly.
- Navigate to `/room/:code/host`.

---

## 4.3 Host invite and lobby screen

Route: `/room/:code/host`

This is the host’s central display before and during the game.

Lobby state content:

- Large QR code generated from the join URL, for example `http://<accessible-host>/join/<code>`.
- Large readable room code as fallback.
- Copy/share link button.
- Connected players count and status.
- Teams as colourful columns/cards.
- Buttons: `Shuffle teams`, `Edit teams`, `Start game`.
- Secondary destructive action in a menu: `End room`.

Behaviour:

- Players entering the room appear instantly via realtime events.
- With auto-balance, server assigns a new player to the smallest team.
- Host can drag or tap-to-move players between teams only before game begins.
- `Start game` is disabled unless deck and readiness conditions are met.
- Clear explanations replace generic errors: e.g. “Waiting for 2 players to submit their cards.”

Optional action:

- `Join as a player on this device` routes into player join flow while retaining host capability only when safe. Prefer host using a second phone for active participation; shared scoreboard mode should remain visible on the main screen.

---

## 4.4 Player join flow

Routes:

- `/join` — manual code entry.
- `/join/:code` — QR/deep-link join.

### Manual code entry

- Six-character input, auto uppercase, space formatting.
- Validate room exists on submit.

### Name entry

- One text input, remember prior display name locally as a suggestion.
- `Join game` button.
- Server rejects duplicate active player names case-insensitively within a room.
- On successful join, server issues a private reconnect/player token.

### After joining

- Display assigned team visually.
- Player may be moved by host in lobby; update instantly.
- If deck mode is Personal Cards, proceed to secret card submission before readiness.
- If Quick Play, proceed directly to ready waiting screen.

---

## 4.5 Personal-card submission flow

Route: `/room/:code/cards`

Only for `PERSONAL_CARDS` mode.

Goals:

- Extremely quick entry.
- Cards are private before play.
- Avoid unusable cards and accidental duplicates.

UI:

- Shows progress: `Card 1 of 3`, etc.
- One input at a time on mobile; Enter/Next adds card.
- Review stack once required count reached.
- Edit/remove before final submit.
- Explanation: use a person, character, title, object or place that the group can recognise.

Validation:

- Trim whitespace and normalise casing for comparison.
- 2–60 visible characters.
- No blank values.
- Reject exact duplicate in room case-insensitively; prompt for a different card.
- Do not disclose another player's full secret card when duplicate is rejected; message only says the card already exists.

Once submitted:

- Cards cannot be viewed by other players in lobby.
- The submitting player sees only “Cards submitted ✓”.
- MVP may allow player to edit before host starts; modifications lock when the game begins.

Quick Play mode:

- Use an original seed card dataset, configured by category. Default room selects a configurable number appropriate for group size; suggested default is 30 cards for 4–6 players and 40 cards for larger groups.
- Do not use copied official deck content.

---

## 4.6 Ready screen

Route: `/room/:code/lobby`

Player view:

- Their name and assigned team.
- Team roster and all player readiness badges.
- Deck status if Personal Cards: “2 of 4 players submitted cards.”
- Large toggle button: `I'm ready` / `Not ready`.
- Status text: “The host will start when everyone is ready.”

Rules:

- Player can leave lobby before start.
- Leaving removes them cleanly or marks disconnected, according to simple MVP behaviour selected and documented. Recommended: allow explicit Leave and remove the lobby member; temporary disconnect does not remove them.
- Host may start only when all current players are ready and required deck is ready.
- Warn but allow a 2-player demonstration game; recommend 4–12 players in UI.

---

## 4.7 Round introduction

Routes logically rendered from game phase; may remain under `/room/:code/play`.

Every device sees a full-screen intro at the beginning of each round:

### Round 1

- Title: `ROUND 1`.
- Rule: `Describe freely`.
- Supporting text: “Say anything except the name on the card.”

### Round 2

- Title: `ROUND 2`.
- Rule: `One word only`.
- Supporting text: “Choose one clue word. No extra sounds or gestures.”

### Round 3

- Title: `ROUND 3`.
- Rule: `Mime only`.
- Supporting text: “No words. Act it out.”

Host action:

- `Begin round` advances to the first ready turn of that round.

Do not begin an active player’s timer automatically from round intro.

---

## 4.8 Turn-ready state

When a team becomes active, all clients see the next clue-giver. The active player's view displays:

- `Your turn, Mohamed!`
- Team label.
- Current round rule.
- Large `Start my turn` button.

All other players/shared display see:

- `Mohamed is clue-giver` or `Mohamed is up next for Team Blue`.
- No card content.

The timer begins only once the authenticated active player taps `Start my turn`.

---

## 4.9 Active turn screen

### Active clue-giver view

This screen must optimise speed and avoid accidental taps.

Layout top-to-bottom:

- Small team pill and round-rule pill.
- Large circular/rounded timer with visual countdown.
- White physical-card-style panel containing current card text in very large type.
- Two actions at bottom:
  - Secondary yellow-outlined `Skip` button.
  - Primary yellow-filled `Got it!` button, larger than Skip.

Behaviours:

- Card text is only delivered to the active authenticated player.
- Timer is server-authoritative.
- UI can animate time smoothly locally using a deadline sent by server; it must resynchronise with server events/snapshots.
- At five seconds remaining, timer becomes urgent and phone vibration fires once when available.
- At zero seconds, actions disable instantly and a time-up event/transition occurs.
- Prevent double-scoring by disabling action while mutation is pending and by backend idempotency/validation.

### Non-active player view

- Never receives or displays current card content.
- Shows active clue-giver, active team, timer and compact score.
- Friendly message such as “Guess out loud!” for the current team, or “Watch closely—your team is next.”

### Shared display mode

Route: `/room/:code/display`

- Does not reveal card.
- Shows the round, active player/team, large timer, cards remaining and score columns.
- Designed for laptop/tablet/TV width.

---

## 4.10 Turn recap and correction

At the end of a timed turn, do not immediately move forward invisibly.

Active clue-giver and host see:

- `Turn complete!`
- Points earned this turn.
- Number of correctly guessed cards during this turn.
- `Undo last correct` action, available until turn is confirmed.
- Primary `Confirm & continue` action.

Other players see:

- `Team Yellow scored 4!`
- Waiting for confirmation.

Rule:

- Only the active clue-giver or host may request undo for a scored card during the current unconfirmed turn.
- On confirmation, events for the turn are locked and the engine calculates next turn or next round.
- Skipped cards remain available at the end of the unresolved deck order for that round.

This recap prevents accidental taps from permanently deciding the game.

---

## 4.11 Round summary

When all cards in a round have been correctly guessed:

- Stop turns and enter `ROUND_SUMMARY` phase.
- Show each team's points in this round and cumulative score.
- Explain next rule.
- Host triggers `Start next round`.
- Rebuild/shuffle the same full base deck for the following round.

The same card set must be played in all three rounds.

---

## 4.12 Final results and rematch

After Round 3 is completed:

Full celebratory results view on all devices:

- Winning team banner; tie presentation if applicable.
- Final scores by team.
- Optional safe fun statistics from stored events:
  - Most cards guessed by a clue-giver.
  - Best single turn.
  - Closest round.
- Buttons available to host:
  - `Rematch — same teams, same cards`.
  - `Rematch — same teams, new deck` where allowed.
  - `New game`.

A rematch resets round, scores, turn records and deck/round state correctly while preserving players and team arrangement unless host chooses otherwise.

---

## 5. Game rules and state machine

## 5.1 Public game phases

Use explicit phases; do not infer key UX states from nullable timestamps.

```ts
export type GamePhase =
  | 'LOBBY'
  | 'CARD_SUBMISSION'
  | 'READY_CHECK'
  | 'ROUND_INTRO'
  | 'TURN_READY'
  | 'TURN_LIVE'
  | 'TURN_RECAP'
  | 'ROUND_SUMMARY'
  | 'FINISHED'
  | 'CANCELLED';
```

Backend Python must have an equivalent enum.

## 5.2 Legal transitions

```text
Create room
  -> LOBBY                     (Quick Play)
  -> CARD_SUBMISSION           (Personal Cards)

CARD_SUBMISSION -> READY_CHECK (all required submissions complete)
LOBBY           -> READY_CHECK (players joined / room ready flow)
READY_CHECK     -> ROUND_INTRO (host starts game when valid)
ROUND_INTRO     -> TURN_READY  (host begins round)
TURN_READY      -> TURN_LIVE   (active authorised player starts timer)
TURN_LIVE       -> TURN_RECAP  (time expires or all cards guessed during turn)
TURN_RECAP      -> TURN_READY  (cards remain in round; next turn selected)
TURN_RECAP      -> ROUND_SUMMARY (no cards remain)
ROUND_SUMMARY   -> ROUND_INTRO (rounds remain)
ROUND_SUMMARY   -> FINISHED    (round 3 complete)
Any pre-finished phase -> CANCELLED (host ends room)
FINISHED -> ROUND_INTRO/READY_CHECK via rematch flow
```

All transition commands must be validated by the backend service and should return typed errors when illegal.

## 5.3 Turn rotation algorithm — critical requirement

A team sequence rotates between teams; a clue-giver sequence rotates within each team.

For two teams:

```text
Team Blue: Alice, Amine
Team Yellow: Bilal, Badr
Expected sequence:
Alice -> Bilal -> Amine -> Badr -> Alice -> Bilal ...
```

Implementation requirement:

- Store each team's next clue-giver cursor or compute it reliably from confirmed turn history.
- On selecting Team X for a turn, select the next player from Team X's ordered roster and advance only that team's cursor after the turn is confirmed.
- Moving players is not allowed once gameplay begins unless a future explicitly designed rule handles it.
- Rotation continues across rounds unless product decision records a deliberate reset; default: continue fairly from where it left off at round boundary.

Unit tests for this behaviour are mandatory before UI gameplay is considered complete.

## 5.4 Deck and card rules

- The base deck contains all cards selected/submitted at game start.
- Each round creates a shuffled round order from the full base deck.
- A card can be unresolved, guessed in a specific turn, or currently displayed.
- Correct guesses grant one point to the active team and credit the active clue-giver for statistics.
- Skip gives no penalty by default and moves the current unresolved card to the back of the unresolved queue. Round 1 allows unlimited skips; rounds 2 and 3 allow one skip per turn.
- The server never exposes card content to unauthorised/non-active clients during gameplay.
- Recaps show counts only and do not reveal guessed card text to host, active player, spectators or shared display.

## 5.5 Timer rules

- Timer duration is configured per room: 30/45/60 seconds.
- Backend stores `turn_started_at` and `turn_deadline_at` in UTC.
- Client displays local countdown based on deadline and periodic sync/event payloads.
- On any relevant request or realtime tick/expiry handling, backend finalises expired live turns exactly once.
- Button actions received after the deadline are rejected with a clear `TURN_EXPIRED` error even if a client displays stale time.

---

## 6. Authentication and permissions without accounts

No registration is needed, but actions must be protected.

## 6.1 Room identifiers

- `room_id`: internal UUID, never used for user join.
- `room_code`: short uppercase code, 6 characters, public and shareable.
- Avoid ambiguous characters if desired: alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.

## 6.2 Host authority

On room creation:

- Generate a high-entropy host token.
- Store only a secure hash of token in database if practical for MVP.
- Return raw token only once to host frontend.
- Store token on host device; send it with host REST mutations and authenticated socket connection.

Host-only actions:

- Move players between teams before gameplay.
- Shuffle teams.
- Start game/start round.
- Cancel room.
- Confirm/undo current turn as moderator.
- Rematch settings.

## 6.3 Player authority

On successful player join:

- Generate a high-entropy reconnect/player token tied to room member.
- Store hash in database.
- Store raw token in that player's browser local persistence.
- Authenticate player actions with token; public player ID alone is never enough.

Player-only actions:

- Toggle own ready status.
- Submit/edit own personal cards before lock.
- Start own turn if selected as active clue-giver.
- Score/skip only while actively playing in `TURN_LIVE`.
- Undo own last score during own unconfirmed turn.

## 6.4 Visibility permissions

- Lobby rosters and scores are public to room participants/display clients.
- Secret submitted card texts are not included in lobby snapshots.
- Current card content is sent only to active authenticated player.
- Host/display view should not reveal current card during a turn.

---

## 7. Recommended architecture

## 7.1 Repository structure

Create a monorepo with clearly separated frontend/backend and top-level project commands.

```text
guessrush/
  README.md
  AGENTS.md
  .editorconfig
  .gitignore
  docker-compose.yml                 # Postgres optional/local integration profile
  docs/
    PRODUCT_SPEC.md                  # copy/reference of this specification
    DECISIONS.md
    TEST_MATRIX.md
    UI_REVIEW.md
  backend/
    pyproject.toml
    .env.example
    alembic.ini
    alembic/
    app/
      main.py
      config.py
      db.py
      models/
        room.py
        member.py
        team.py
        card.py
        turn.py
        event.py
      schemas/
        room.py
        lobby.py
        gameplay.py
        realtime.py
      api/
        deps.py
        rooms.py
        lobby.py
        gameplay.py
        display.py
      realtime/
        server.py
        events.py
      services/
        room_service.py
        auth_service.py
        deck_service.py
        game_engine.py
        rotation_service.py
        timer_service.py
      seed/
        starter_cards.json
      tests/
        unit/
        integration/
        conftest.py
  frontend/
    package.json
    vite.config.ts
    tailwind.config.ts
    src/
      app/
        router.tsx
        providers.tsx
      api/
        http.ts
        sockets.ts
        types.ts
      components/
        ui/
        room/
        game/
      features/
        home/
        create-room/
        join-room/
        lobby/
        play/
        display/
        results/
      hooks/
      store/
      theme/
        tokens.css
      assets/
      tests/
    e2e/
      multiplayer.spec.ts
  scripts/
    dev.ps1
    dev.sh
```

## 7.2 Backend technology

Required:

- Python 3.12 or later within current stable support.
- FastAPI.
- Pydantic v2 settings and request/response schemas.
- SQLAlchemy 2.x ORM.
- Alembic migrations.
- SQLite for immediate local development, with database URL configuration allowing PostgreSQL.
- PostgreSQL Docker Compose service for integration/production-like testing.
- `python-socketio` ASGI integration for rooms, reconnection and typed event semantics, or an equivalently robust FastAPI WebSocket approach if Codex records and justifies the decision. Prefer Socket.IO for this app.
- Uvicorn development server.
- Pytest, pytest-asyncio, httpx for API tests.
- Ruff formatting/linting; mypy or pyright-compatible typing checks where practical.

Backend principles:

- Routes are thin: authenticate, validate, call services, translate errors.
- `game_engine.py` owns allowed transitions and scoring/turn rules.
- Database mutations associated with a gameplay command are transactional.
- Emit realtime update only after successful commit.
- Snapshot serialization must remove secret card data based on viewer role.

## 7.3 Frontend technology

Required:

- React with TypeScript and Vite.
- Tailwind CSS with compiled configuration, not CDN.
- React Router.
- `socket.io-client` if Socket.IO backend selected.
- Zod for validating API/event payloads at boundaries.
- TanStack Query for REST loading/mutations and reconnect snapshots.
- Zustand or a very small reducer-based store for active realtime room snapshot; choose one and keep it simple.
- `qrcode.react` or similar maintained QR component.
- `vite-plugin-pwa` for installable mobile experience once core gameplay works; offline gameplay is not required.
- Vitest + React Testing Library.
- Playwright for multi-context E2E flows.

Frontend principles:

- The URL maps to user intent (`/create`, `/join/:code`, `/room/:code/play`, `/room/:code/display`).
- UI renders based on explicit server phase and current viewer permission.
- Never embed game logic in button components.
- All buttons show pending/error state and prevent rapid duplicate commands.
- On socket reconnect, fetch fresh snapshot and re-render safely.

## 7.4 Realtime strategy

REST remains authoritative for:

- Create room.
- Join room.
- Fetch initial/recovery snapshot.
- Commands can be REST mutations or socket commands; MVP recommendation: REST commands plus socket broadcast events for easier testing and reliability.

Socket events sent from server after commits:

```ts
export interface ServerToClientEvents {
  'room:snapshot': (snapshot: PublicRoomSnapshot | PlayerRoomSnapshot | HostRoomSnapshot) => void;
  'room:player-joined': (payload: PublicLobbyUpdate) => void;
  'room:player-ready': (payload: PublicLobbyUpdate) => void;
  'room:teams-updated': (payload: PublicLobbyUpdate) => void;
  'game:phase-changed': (payload: PublicGameState) => void;
  'game:turn-ready': (payload: PublicTurnReady) => void;
  'game:turn-started': (payload: PublicTurnLive) => void;
  'game:private-card': (payload: ActivePlayerCardPayload) => void; // only active player's socket room
  'game:score-updated': (payload: PublicScoreState) => void;
  'game:turn-ended': (payload: PublicTurnRecapState) => void;
  'game:finished': (payload: ResultsState) => void;
  'room:error': (payload: ClientSafeError) => void;
}
```

Room channels:

- Public room channel: safe state and public event broadcasts.
- Host-private channel: moderator data/actions status.
- Per-player private channel: active card payload and player-specific data.

Do not implement any event that broadcasts current card text to the public channel.

---

## 8. Domain and database model

Use UUID primary keys internally unless a simpler database decision is documented. Public codes remain separate.

## 8.1 Tables/entities

### `rooms`

| Field | Notes |
|---|---|
| `id` | UUID PK |
| `code` | unique public 6-character join code |
| `host_token_hash` | required |
| `name` | optional party name |
| `phase` | enum game phase |
| `deck_mode` | `QUICK_PLAY` or `PERSONAL_CARDS` |
| `turn_duration_seconds` | 30 / 45 / 60 |
| `cards_per_player` | nullable for Quick Play |
| `current_round_number` | 0 before game, then 1–3 |
| `active_team_id` | nullable FK |
| `active_member_id` | nullable FK |
| `turn_started_at` | nullable UTC datetime |
| `turn_deadline_at` | nullable UTC datetime |
| `created_at`, `updated_at`, `finished_at` | timestamps |

### `teams`

| Field | Notes |
|---|---|
| `id` | UUID PK |
| `room_id` | FK |
| `name` | display name |
| `color_key` | theme-controlled colour key, not arbitrary unsafe CSS |
| `sort_order` | team alternation order |
| `next_member_cursor` | fair intra-team clue-giver rotation cursor |
| `total_score` | derived/cache updated transactionally |

### `members`

| Field | Notes |
|---|---|
| `id` | UUID PK |
| `room_id` | FK |
| `team_id` | FK, nullable briefly before assignment if needed |
| `display_name` | unique within room case-insensitively |
| `player_token_hash` | private action/reconnect auth |
| `role` | `PLAYER` or optional `DISPLAY`; host authority remains token-based |
| `ready` | boolean |
| `connected` | optional approximate connection state |
| `join_order` | stable ordering |
| `created_at` | timestamp |

### `cards`

| Field | Notes |
|---|---|
| `id` | UUID PK |
| `room_id` | FK |
| `created_by_member_id` | nullable for Quick Play seed |
| `text` | secret before exposure during play |
| `normalised_text` | duplicate checks |
| `locked` | no edit after game begins |
| `created_at` | timestamp |

### `round_cards`

| Field | Notes |
|---|---|
| `id` | UUID PK |
| `room_id` | FK |
| `round_number` | 1–3 |
| `card_id` | FK |
| `queue_position` | evolving/deck order |
| `status` | `PENDING`, `GUESSED` |
| `guessed_turn_id` | nullable FK |

### `turns`

| Field | Notes |
|---|---|
| `id` | UUID PK |
| `room_id` | FK |
| `round_number` | 1–3 |
| `team_id` | FK |
| `clue_giver_member_id` | FK |
| `sequence_number` | monotonically increasing within game |
| `status` | `READY`, `LIVE`, `RECAP`, `CONFIRMED`, `EXPIRED` |
| `started_at`, `deadline_at`, `ended_at`, `confirmed_at` | UTC timestamps |
| `points` | confirmed points, cached for display |

### `guess_events`

| Field | Notes |
|---|---|
| `id` | UUID PK |
| `turn_id` | FK |
| `round_card_id` | FK |
| `action` | `CORRECT`, `UNDO_CORRECT`, optionally `SKIP` if analytics desired |
| `occurred_at` | timestamp |

Use service logic to prevent a card from being scored twice and to undo only valid last scoring actions during recap.

---

## 9. API contract outline

Prefix all REST endpoints with `/api/v1`.

Use typed JSON errors:

```json
{
  "error": {
    "code": "TURN_EXPIRED",
    "message": "Time is up. This card cannot be scored.",
    "details": null
  }
}
```

## 9.1 Room setup endpoints

### `POST /api/v1/rooms`

Creates a room.

Request:

```json
{
  "deckMode": "QUICK_PLAY",
  "teamCount": 2,
  "turnDurationSeconds": 30,
  "cardsPerPlayer": null,
  "autoBalanceTeams": true,
  "teams": [
    { "name": "Blue", "colorKey": "blue" },
    { "name": "Yellow", "colorKey": "yellow" }
  ]
}
```

Response includes public code, public join URL and raw host token exactly at creation time.

### `GET /api/v1/rooms/{code}`

Public safe room-existence/settings query for join flow. Never returns secret cards/tokens.

### `GET /api/v1/rooms/{code}/snapshot`

Returns role-dependent snapshot based on provided host/player token or public display access.

## 9.2 Join/lobby endpoints

### `POST /api/v1/rooms/{code}/members`

Join player; returns player token once.

### `POST /api/v1/rooms/{code}/members/me/ready`

Authenticated player toggles ready.

### `DELETE /api/v1/rooms/{code}/members/me`

Authenticated lobby player leaves before play.

### `PATCH /api/v1/rooms/{code}/host/teams`

Host assigns/moves players or renames teams before game.

### `POST /api/v1/rooms/{code}/host/shuffle-teams`

Host randomly balances/reassigns players before game.

## 9.3 Card endpoints

### `PUT /api/v1/rooms/{code}/members/me/cards`

Authenticated personal-card submission/edit before game lock.

### `GET /api/v1/rooms/{code}/members/me/cards/status`

Returns submission status without exposing other players' card text.

## 9.4 Game control endpoints

### `POST /api/v1/rooms/{code}/host/start-game`

Checks readiness/deck/minimum validity and moves to `ROUND_INTRO` for round 1.

### `POST /api/v1/rooms/{code}/host/start-round`

Moves from `ROUND_INTRO` to first `TURN_READY`.

### `POST /api/v1/rooms/{code}/turns/current/start`

Authenticated active clue-giver starts timer.

### `POST /api/v1/rooms/{code}/turns/current/correct`

Authenticated active clue-giver scores visible card if live and before deadline.

### `POST /api/v1/rooms/{code}/turns/current/skip`

Authenticated active clue-giver cycles card to back of pending deck.

### `POST /api/v1/rooms/{code}/turns/current/undo-last-correct`

Active player or host in recap only.

### `POST /api/v1/rooms/{code}/turns/current/confirm`

Active player or host confirms recap and triggers next turn/round summary.

### `POST /api/v1/rooms/{code}/host/advance-round`

From round summary to next round intro or finished phase.

### `POST /api/v1/rooms/{code}/host/rematch`

Request includes `sameCards` and `sameTeams` booleans.

### `POST /api/v1/rooms/{code}/host/cancel`

Cancels active room.

---

## 10. UI design system — blue/yellow party-game direction

## 10.1 Design objective

Create a joyful, high-energy interface that evokes a bright blue/yellow tabletop party-game atmosphere while remaining original and modern. It should feel like cards and an hourglass have become a mobile game interface, not like a dark administrative dashboard.

## 10.2 Brand palette

Use CSS variables and Tailwind theme tokens. Starting palette:

```css
:root {
  --color-brand-blue-900: #063970;
  --color-brand-blue-800: #07549A;
  --color-brand-blue-700: #0077BD;
  --color-brand-blue-600: #008CD2;
  --color-brand-blue-100: #DDF4FF;
  --color-brand-yellow-500: #FFD21F;
  --color-brand-yellow-400: #FFE36A;
  --color-brand-orange-500: #F58220;
  --color-brand-red-500: #EF4444;
  --color-ink: #10243A;
  --color-paper: #FFFDF7;
  --color-white: #FFFFFF;
  --color-success: #18A957;
}
```

Usage:

- Main backgrounds: blue-700/800 with a subtle original radial/swirl texture built in CSS.
- Primary interactive CTA: yellow-500 with ink text.
- Secondary CTA: white or transparent with yellow outline.
- Physical word card: paper white, rounded, blue border, slight tilt/shadow in non-active illustrations only; active text panel remains stable and very readable.
- Urgency timer: yellow normally; orange/red at last five seconds.
- Celebration confetti accents: yellow, orange and white.

Team colours:

- Default two teams: `Blue Comets` and `Yellow Sparks`; ensure Blue team remains distinguishable on blue backgrounds using white/light surfaces and borders.
- For 3–4 teams, add coral and green variants with sufficient contrast.

## 10.3 Typography

Use open-source web fonts only:

- Display/headings: `Fredoka` or `Baloo 2`, bold; playful and rounded.
- Functional UI/body: `Inter`, medium/semibold.
- Timer numbers: `Inter` with tabular numeric settings.

Do not imitate or reproduce the official logo lettering.

## 10.4 Shapes and visual language

- Rounded corners: playful, `20px`–`28px` on primary cards/panels.
- Strong but soft shadows: blue-tinted drop shadows under yellow buttons.
- Card motif: white stack/card illustrations with a thin blue border and a small yellow header stripe.
- Timer motif: simple original hourglass outline icon, not copied artwork.
- Background: CSS radial rings at low opacity to create game-night motion.
- Decorative bursts/confetti used only on home, round transition and winner screens; never compromise readability during an active turn.

## 10.5 Component states

Every actionable component includes:

- Default.
- Hover/focus desktop.
- Pressed tactile state on mobile.
- Disabled state with reason nearby when relevant.
- Pending state with spinner/label; never allow duplicate score submission.
- Error state rendered inline, not only via browser alert.

## 10.6 Accessibility and mobile usability

- Minimum tap target: 48×48 px; gameplay buttons 64 px height minimum.
- Contrast meets WCAG AA where practical; yellow buttons use dark ink, not white text.
- Visible keyboard focus ring.
- No critical information communicated by colour alone.
- Respect `prefers-reduced-motion`.
- Prevent screen sleep during active clue-giver turn when supported through Wake Lock API; fall back safely if unavailable.
- Vibration used as enhancement only, never as the sole timer cue.

---

## 11. Responsive screens and component inventory

## 11.1 Breakpoints

Design mobile-first and verify at:

- `390 × 844` — common modern phone portrait; highest priority.
- `430 × 932` — larger phone.
- `768 × 1024` — tablet/shared display.
- `1440 × 900` — laptop host/shared scoreboard.

No horizontal scroll in any primary screen.

## 11.2 Core reusable UI components

```text
AppLogo
BlueRadialBackground
PrimaryButton
SecondaryButton
DangerMenuAction
GameCardPanel
RoomCodeDisplay
QrJoinCard
TeamCard
PlayerChip
ReadyBadge
RoundRuleBanner
CountdownTimer
ScoreBoard
CardSubmissionInput
TurnActionBar
TurnRecapList
WinnerBanner
InlineError
ConnectionBadge
ConfirmDialog
```

## 11.3 Screen feature components

```text
features/home/HomePage.tsx
features/create-room/CreateRoomWizardPage.tsx
features/join-room/JoinCodePage.tsx
features/join-room/JoinNamePage.tsx
features/lobby/HostLobbyPage.tsx
features/lobby/PlayerLobbyPage.tsx
features/lobby/CardSubmissionPage.tsx
features/play/RoundIntroView.tsx
features/play/TurnReadyView.tsx
features/play/ActiveTurnView.tsx
features/play/SpectatorTurnView.tsx
features/play/TurnRecapView.tsx
features/play/RoundSummaryView.tsx
features/display/SharedDisplayPage.tsx
features/results/ResultsPage.tsx
```

---

## 12. Error handling, network recovery and edge cases

Implement friendly, actionable UX for these scenarios:

| Scenario | Expected handling |
|---|---|
| Invalid room code | Show “Room not found” and return-to-join action |
| Room already finished | Show results if participant token matches, otherwise finished-room message |
| Duplicate player name | Inline name field error; preserve typed name |
| Duplicate submitted card | Ask for replacement without exposing owner |
| Player refreshes | Recover using local player token; fetch fresh snapshot; reconnect socket |
| Host refreshes | Recover host authority using stored token; fetch snapshot |
| Player loses connection | Show small reconnecting banner; resync on return |
| Active player's connection drops | Timer remains authoritative; after reconnect show current active state; host can confirm recap when turn ends |
| Score button double tap | Backend rejects repeated/obsolete scoring; UI mutation locked |
| Host tries to start early | Server rejects with structured unmet conditions; UI lists them |
| Timer expires during click | Backend rejects late score and moves/maintains correct phase |
| Two clients attempt transition | Transaction/phase validation results in one valid idempotent transition |
| Tie result | Show both teams as winners; do not arbitrarily choose one |

Persist only what is needed in the browser:

- Host: `hostToken` for that room.
- Player: `playerToken`, `roomCode`, suggested display name.
- Never persist live card content longer than necessary; clear when turn changes.

---

## 13. Testing strategy — mandatory for Codex

## 13.1 Backend unit tests: game engine first

Write these before or alongside gameplay UI implementation.

### Required rotation tests

1. Two teams with two players each produce sequence `A1, B1, A2, B2, A1, B1` over six confirmed turns.
2. Three teams with uneven sizes still rotate teams and each team's members fairly.
3. Round boundary does not permanently skip a member; chosen cursor behaviour is documented and tested.

### Required scoring/deck tests

1. Correct card increments active team's score exactly once.
2. Correct card cannot be submitted twice.
3. Skip moves card behind unresolved cards and does not score.
4. Undo last correct during recap removes score and restores card to pending state consistently.
5. Same base card set is used for rounds 1, 2 and 3.
6. Completion of all cards enters round summary, and after round 3 enters finished.

### Required timer tests

1. Turn cannot be scored before it starts.
2. Score before deadline is accepted.
3. Score after deadline is rejected.
4. Expiry finalisation is idempotent.

### Required permission tests

1. Host mutations fail without correct host token.
2. Player cannot act as another player using public ID.
3. Non-active player's scoring attempt fails.
4. Public snapshot does not contain card texts during game.
5. Active authorised player's private snapshot/event includes only the current card needed to play.

## 13.2 Backend API integration tests

Automate at least:

- Create room -> join four players -> submit/ready -> start game.
- Host moves player in lobby and state updates correctly.
- Personal-card duplicate validation.
- Complete minimal game with short/artificial timer or direct service control, reaching results.
- Rematch resets all state correctly.

## 13.3 Frontend unit/component tests

Required:

- Create wizard validation and mode-specific fields.
- QR/invite screen renders code and joined count.
- Ready button state and unmet-start messages.
- Active player view displays card; spectator view never displays card.
- Timer urgent styling and disabled controls at expiry.
- Results screen handles win and tie.

## 13.4 Playwright E2E tests using multiple browser contexts

This is especially important: the product is multi-device by nature.

Automated scenario A — Quick Play happy path:

1. Host opens desktop context and creates a 2-team Quick Play room.
2. Four separate player contexts join through room URL.
3. All players become ready.
4. Host starts game.
5. Assert active player sees word card while other players and shared display do not.
6. Score a card, skip a card, end/confirm turn.
7. Assert next clue-giver follows fair rotation.

Automated scenario B — Personal Cards:

1. Create room in Personal Cards mode with 2 cards/player.
2. Players submit cards; duplicate is rejected.
3. Start game and validate submitted deck is used.

Automated scenario C — Recovery:

1. Refresh active player during `TURN_READY` or live turn.
2. Verify token restores correct player control/state.
3. Disconnect/reconnect spectator and confirm fresh score snapshot.

Automated scenario D — Permissions:

1. Player tries host endpoint without token: rejected.
2. Spectator/player attempts to score using manipulated ID/token: rejected.

## 13.5 Visual review workflow required from Codex Desktop

After each UI milestone, open the running app and inspect/capture screens at minimum:

- Mobile: `390 × 844`.
- Desktop/shared screen: `1440 × 900`.

Codex must fix obvious issues before marking completion:

- Overflow or scrolling during an active turn.
- Low contrast yellow/white combinations.
- Misaligned cards/team panels.
- Buttons not reachable with thumb on mobile.
- Empty or confusing states.
- Unbalanced whitespace.

Document reviewed screenshots/observations in `docs/UI_REVIEW.md`.

---

## 14. Local development and run experience

The finished repository must support a simple Windows/PowerShell-friendly workflow.

Expected developer commands, adjusted if package manager choices differ:

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

### Tests

```powershell
cd backend
pytest
ruff check .

cd ..\frontend
npm run test
npm run lint
npm run e2e
```

### Optional unified workflow

Create root scripts or a documented terminal setup to run frontend/backend together. For local phone testing on the same Wi-Fi, ensure the frontend determines/generates a reachable join URL rather than embedding `localhost` in QR code.

Environment variables expected:

```text
BACKEND_DATABASE_URL=sqlite+aiosqlite:///./guessrush.db
FRONTEND_ORIGIN=http://localhost:5173
PUBLIC_APP_URL=http://<LAN_IP>:5173
APP_SECRET=<development secret>
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://<LAN_IP>:5173
```

Do not make phone testing depend on the user manually editing source code.

---

## 15. Implementation milestones for Codex Desktop

Codex should work through these milestones in sequence. Keep commits or checkpoint summaries aligned to each milestone.

## Milestone 0 — Repository skeleton and UX shell

Deliverables:

- Monorepo structure.
- Backend boots with health endpoint and configured database.
- Frontend boots with routing and blue/yellow original theme tokens.
- Home and create-room wizard UI implemented with mocked submit only or basic backend create.
- Docs: `DECISIONS.md`, `TEST_MATRIX.md`, `UI_REVIEW.md`.
- Lint/test tooling installed and running.

Acceptance:

- `GET /health` returns OK.
- Home and create wizard render well at phone and desktop sizes.
- No Tailwind CDN.

## Milestone 1 — Rooms, host invite and player joining

Deliverables:

- Room/team/member tables and migrations.
- Room creation with room code and host token.
- Host invite screen with functioning QR code and share/copy action.
- Join-code/name flow with player token.
- Auto team balance and live lobby roster updates.
- Permission tests for host/player tokens begin here.

Acceptance:

- A phone on the same network can scan/link and join.
- Refresh restores host/player lobby view.
- No public endpoint exposes tokens.

## Milestone 2 — Deck modes and ready flow

Deliverables:

- Quick Play original seed deck.
- Personal card entry, duplicate protection and card lock.
- Player ready toggle.
- Host team arrangement/shuffle before start.
- Start validation UI and backend.

Acceptance:

- Host cannot start Personal Cards game until required submissions and ready states are satisfied.
- Submitted card texts remain secret in lobby snapshots.

## Milestone 3 — Game engine and fair rotation

Deliverables:

- Explicit state machine service.
- Round intro, turn ready, rotation and server-owned timer domain logic.
- Required unit tests for rotations, transitions and timer permissions.
- Minimal play UI wired to state.

Acceptance:

- Four-player rotation test and manual test pass.
- A score cannot be sent by a non-active or expired player.

## Milestone 4 — Full active gameplay and realtime UX

Deliverables:

- Active/spectator/shared display views.
- Correct and skip mechanics.
- Smooth countdown display with server resync.
- Socket event updates and reconnect snapshot handling.
- Mobile vibration/wake-lock progressive enhancement.

Acceptance:

- Only active player sees the card.
- All scoreboards update instantly or nearly instantly without manual refresh.
- Gameplay screen is usable without scrolling on target phone viewport.

## Milestone 5 — Recaps, round summaries, final results and rematch

Deliverables:

- Turn recap and undo-last-correct.
- Round summary transitions.
- Winner/tie results experience and celebratory UI.
- Rematch flows.
- Stats calculated only from valid confirmed events.

Acceptance:

- Full game reaches finished cleanly.
- Undo updates score and pending deck correctly.
- Rematch is reliable and covered by tests.

## Milestone 6 — Quality pass and local party readiness

Deliverables:

- Full Playwright multi-context tests.
- Improved errors/reconnection states.
- PWA/installability where practical.
- README with local-network phone testing instructions.
- UI screenshot/review pass and fixes.

Acceptance:

- A non-technical group can create and play a room on the same Wi-Fi using QR joining.
- Test suite passes.
- No known high-severity gameplay/security defect remains.

---

## 16. MVP definition of done

The app is complete enough for real play only when all of the following are true:

- [ ] A host can create a game through a smooth blue/yellow setup flow.
- [ ] Players join via QR code or short code from their phones.
- [ ] Quick Play and Personal Cards both function.
- [ ] All players can ready up and see live lobby updates.
- [ ] Host commands require host authority.
- [ ] Player commands require their private token.
- [ ] Current card is never leaked to non-active player/display clients.
- [ ] Explicit state phases drive the UI.
- [ ] Rotation includes every teammate fairly.
- [ ] Timer and scores remain correct on refresh/reconnect.
- [ ] Correct, skip, recap and undo operate reliably.
- [ ] Three rounds reuse the same deck.
- [ ] Results and rematch are satisfying and functional.
- [ ] The active turn view is clean on mobile without scrolling.
- [ ] Blue/yellow visual system is cohesive and original.
- [ ] Backend unit/integration tests pass.
- [ ] Frontend/component tests pass.
- [ ] Playwright multi-player critical flows pass.
- [ ] README documents Windows/PowerShell setup and LAN-phone testing.

---

## 17. Important decisions that must not be lost during implementation

1. This is not a direct reskin of the current Flask app; it is a clean architecture rewrite.
2. It should be visually blue/yellow and playful, but not copy official protected assets.
3. Use React/TypeScript for the frontend and FastAPI/Python for the backend because the project is both a usable product and a strong portfolio/learning project.
4. Realtime behaviour is core, but backend service correctness is more important than animation.
5. Fix the known MVP defect: team turn rotation must include all players.
6. Use token-based authority; public room/player identifiers never authorise commands.
7. Build for real physical usage: QR joining, readable phones, shared display, rapid setup, reconnection and celebratory end state.
