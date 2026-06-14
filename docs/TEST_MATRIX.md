# Test Matrix

## Milestone 0

| Area | Coverage | Status |
| --- | --- | --- |
| Backend health/config/database | `GET /health` integration test | Passed |
| Frontend shell | Home/create wizard component tests | Passed |
| Tooling | Ruff, pytest, ESLint, Vitest, build | Passed |
| UI | 390x844 and 1440x900 visual inspection | Passed and recorded in `docs/UI_REVIEW.md` |

## Milestone 1

| Area | Coverage | Status |
| --- | --- | --- |
| Room creation | API integration test verifies code, host token once, safe public response | Passed |
| Host permissions | Host mutation rejects missing/wrong token | Passed |
| Player join | Duplicate-name rejection and auto-balance tests | Passed |
| Player token | Snapshot recovery requires private player token | Passed |
| Token leakage | Public room/snapshot responses do not expose host/player tokens | Passed |
| Realtime lobby | Socket.IO safe snapshot broadcast on roster changes | Passed in Playwright smoke |

## Milestone 2

| Area | Coverage | Status |
| --- | --- | --- |
| Quick Play seed deck | Backend start test verifies 30-card original seed deck is created after ready players | Passed |
| Personal Cards | Backend tests cover required count, duplicate rejection and own-card status | Passed |
| Ready toggle | Backend and UI tests cover ready requirements and player action wiring | Passed |
| Host team arrangement | Backend test covers token-protected member move; UI exposes tap-to-move controls | Passed |
| Start validation | Backend and Playwright tests verify blockers before submissions/ready and success after | Passed |
| Card secrecy | Backend and Playwright tests assert submitted card text is absent from lobby/host snapshots | Passed |
| UI | 390x844 card entry and 1440x900 host-ready screens inspected | Passed |

## Milestone 3

| Area | Coverage | Status |
| --- | --- | --- |
| Explicit gameplay transitions | Backend tests cover start-round, turn-ready, live turn, recap and round-summary boundary transitions | Passed |
| Fair rotation | Backend tests cover `A1 -> B1 -> A2 -> B2 -> A1 -> B1` and uneven 3-team rotation | Passed |
| Round-boundary cursor | Backend test confirms member cursor continues into the next round instead of resetting/skipping | Passed |
| Timer authority | Backend tests reject scoring before start and after deadline; expiry finalisation is idempotent | Passed |
| Player permissions | Backend/API tests reject non-active player scoring with a private but wrong player token | Passed |
| Card secrecy | Backend/API and Playwright tests confirm only the active authenticated player receives live card text | Passed |
| Minimal play UI | Frontend tests cover active card display and spectator card blindness; e2e covers host begin-round and active-player scoring | Passed |
| UI | 390x844 active turn and 1440x900 host live spectator screens inspected | Passed |

## Milestone 4

| Area | Coverage | Status |
| --- | --- | --- |
| Skip mechanics | Backend tests cover skip-to-back order, no score change, idempotent retry, non-active rejection and late skip rejection | Passed |
| Correct idempotency | Backend test verifies retrying the same score action key does not double-score or create duplicate guess events | Passed |
| Live scoreboards | Frontend and Playwright tests verify score surfaces update after a scored card | Passed |
| Shared display | Public display route renders active player/team, timer and scores without live card text | Passed |
| Reconnect recovery | Playwright refreshes the active player's live-turn page and recovers the same card/control state from token snapshot | Passed |
| Timer UX | Frontend tests cover expired active-turn controls; Playwright verifies live countdown screens | Passed |
| UI | 390x844 active gameplay and 1440x900 host/shared display screens inspected | Passed |

## Milestone 5

| Area | Coverage | Status |
| --- | --- | --- |
| Undo mechanics | Backend tests cover idempotent undo, score rollback, pending-card restoration and host/player permissions | Passed |
| Recap visibility | Backend/API and frontend tests verify recap views show counts only and do not expose guessed card text to host, active player or spectators | Passed |
| Round completion | Backend test completes all cards in rounds 1-3 and verifies the same locked base deck is reused | Passed |
| Final results | Backend results stats ignore undone/unconfirmed events; frontend tests cover single winner and tie presentation | Passed |
| Rematch | Backend test resets scores, turns, events and round state; Playwright verifies host rematch returns to Round 1 intro | Passed |
| Multi-context flow | Playwright completes a two-player personal-card game through undo, summaries, final results and rematch | Passed |
| UI | 390x844 recap/results and 1440x900 summary/results screens inspected | Passed |

## Milestone 6

| Area | Coverage | Status |
| --- | --- | --- |
| Multi-context recovery | Playwright refreshes a spectator after live scoring and verifies the recovered score snapshot | Passed |
| Permission hardening | Playwright directly rejects missing host-token start-round and non-active player score attempts | Passed |
| Card leakage | Playwright verifies the recovered spectator never sees the active card text | Passed |
| Reconnection UX | `ConnectionBadge` and `ConnectionNotice` expose connecting/reconnecting/offline copy without changing backend authority | Passed |
| Local phone readiness | README documents Windows LAN IP discovery, backend/frontend env vars, firewall note and QR scan flow | Passed |
| Installability | Manifest, original SVG icon, mobile metadata and conservative production service worker are included | Passed |
| UI | 390x844 spectator recovery and 1440x900 host invite screens inspected | Passed |

## Rules Polish

| Area | Coverage | Status |
| --- | --- | --- |
| Own-phone turn ready | Playwright asserts non-active views announce `Alice is clue-giver` instead of pass-phone copy; screenshots captured at 390x844 and 1440x900 | Passed |
| Round-specific skip limit | Backend tests cover rounds 2 and 3 allowing one skip per turn, preserving idempotent retry, and rejecting a second distinct skip | Passed |
| Count-only recap | Backend/API tests assert recap card text is absent from host, active-player and spectator snapshots; frontend and Playwright assert the count-only recap UI | Passed |
| Shuffle announcement | Playwright shuffles teams in lobby and verifies the `New teams:` announcement appears from backend state | Passed |

## Premium UI Redesign

| Area | Coverage | Status |
| --- | --- | --- |
| Shared UI primitives | TypeScript and ESLint cover `Panel`, badges, `TopBar`, `BottomActionBar`, `ScoreStrip`, `ConfirmDialog`, updated buttons and tokenized theme styles | Passed |
| Lobby ergonomics | Frontend/component coverage still exercises host invite, player lobby, card submission and play views after markup changes | Passed |
| Leave/cancel room commands | Backend tests cover private-token player leave, host-token room cancel and blocked late joins | Passed |
| Accessibility basics | Inline errors use `role="alert"`/`aria-live`; selected segmented controls expose `aria-pressed`; QR code has accessible labeling | Passed by code review and static checks |
| Multi-context visual/E2E | Playwright command could not update `frontend/test-results/.last-run.json` due `EPERM`; elevated rerun was blocked by the environment usage limit | Blocked |
| Production build | Vite transformed modules but failed copying `frontend/public/icon.svg` to `frontend/dist/icon.svg` due `EPERM`; elevated rerun was blocked by the environment usage limit | Blocked |

## Second-Pass Party Polish

| Area | Coverage | Status |
| --- | --- | --- |
| Team score identity | `teamAccent`, `ScoreStrip`, `ScoreBoard`, `TeamBoard`, round summary and results use consistent team-colored surfaces, borders, score zones and leader states | Passed |
| Player phase routing | Join, lobby and card submission views route saved-token players from authoritative room snapshots into the current player phase without changing host/spectator routes | Passed by Vitest and Playwright |
| Duplicate card feedback | Local duplicate detection reports exact card text and highlights the existing local card; backend duplicate rejection returns `details.duplicateCardText` without owner data | Passed by Vitest and backend integration tests |
| QR/LAN behavior | Host invite links prefer `VITE_PUBLIC_APP_URL`/`VITE_APP_URL`, keep copy-link behavior and warn when the QR is localhost-only | Passed by Vitest and visual review |
| Mobile host clarity | Home prioritizes joining on phone-sized screens while desktop/TV keeps create-game primary | Passed by visual review |
| Viewport fit | Player lobby, active turn, host lobby, round summary and final results were refreshed and inspected at 390x844 and 1440x900 | Passed |

## Motion And Audio Polish

| Area | Coverage | Status |
| --- | --- | --- |
| Motion system | CSS keyframes, motion tokens, `MotionPage`, `AnimatedListItem`, `ScorePop`, score highlight, timer urgency, winner reveal and reduced-motion media fallbacks | Passed by TypeScript, lint and screenshot review |
| Audio system | Central Web Audio manager with typed sound names, generated sounds, future file-sound registration, role-based volume and gesture unlock | Passed by TypeScript and code review |
| Mute preference | `SoundProvider`, `useSound` and TopBar `MuteToggle` persist localStorage mute state | Passed by Vitest |
| Event de-duping | Phase, score, leader, skip and countdown sounds use previous-value comparisons to avoid replaying on socket/query refreshes | Passed by TypeScript, lint and Playwright smoke |
| Card feedback | Card add/delete sounds, duplicate attempt buzz, duplicate shake/highlight and list item animations remain local to card submission | Passed by Vitest |
| Game screens | Active timer urgency, score pops, leader badge entry, round summary stagger and final winner reveal preserve readability and viewport fit | Passed by Playwright screenshots |

## Latest Run

| Command | Result |
| --- | --- |
| `node .\node_modules\typescript\bin\tsc -p tsconfig.app.json --noEmit` from `frontend` | Passed |
| `node .\node_modules\eslint\bin\eslint.js .` from `frontend` | Passed |
| `node scripts/run-vitest.mjs` from `frontend` | 5 files / 15 tests passed |
| `node .\node_modules\playwright\cli.js test` from `frontend` | Blocked by sandbox `EPERM` writing `frontend/test-results/.last-run.json` |
| `& 'C:\Program Files\nodejs\node.exe' '.\node_modules\playwright\cli.js' test` from `frontend` | 5 tests passed |
| In-app Browser visual inspection | Blocked by local bridge startup error `CreateProcessAsUserW failed: 5`; refreshed Playwright screenshots were used for visual review instead |
| Backend Ruff/pytest | Not run in this pass; backend code was not changed |
