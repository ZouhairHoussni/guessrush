# UI Review

## 2026-05-25 - Milestone 0/1

Verified with Playwright-managed backend/frontend servers and Chromium.

| Viewport | Screen | Screenshot | Observations |
| --- | --- | --- | --- |
| 1440x900 | Host invite/lobby after a player joined | `docs/screenshots/m1-host-desktop-1440x900.png` | QR card, room code, copy CTA and team columns fit without horizontal scroll. Yellow CTA uses dark text. Live roster updated with Alice under Blue Comets. |
| 390x844 | Player lobby after join | `docs/screenshots/m1-player-mobile-390x844.png` | Phone layout is readable and thumb-friendly. Main player assignment is visible above team cards. No horizontal overflow observed. |

Visible fixes made during review:

- Moved the desktop verification screenshot to the post-join state so live roster updates are documented.
- Kept ready/card submission copy informational only; no fake ready button is shown before Milestone 2.

## 2026-05-26 - Milestone 2

Verified with Playwright-managed backend/frontend servers and Chromium.

| Viewport | Screen | Screenshot | Observations |
| --- | --- | --- | --- |
| 390x844 | Personal-card submission with completed 3-card stack | `docs/screenshots/m2-card-mobile-390x844.png` | Card entry, review stack and submit CTA fit the target phone width. Yellow CTA uses dark text; disabled state is visibly muted. |
| 1440x900 | Host lobby with all personal cards submitted and players ready | `docs/screenshots/m2-host-ready-desktop-1440x900.png` | Host can see readiness and card-submission counts without card text. Start CTA is clear; team arrangement controls remain visible below the team cards. |

Visible fixes made during review:

- Tightened Playwright roster locator after the host view gained readiness text containing player names.
- Confirmed submitted Personal Card text does not appear on the host page while the room is startable.

## 2026-05-26 - Milestone 3

Verified with Playwright-managed backend/frontend servers and Chromium.

| Viewport | Screen | Screenshot | Observations |
| --- | --- | --- | --- |
| 390x844 | Active clue-giver live turn | `docs/screenshots/m3-active-turn-mobile-390x844.png` | Timer, active team/rule pills, private word card and `Got it!` action fit without horizontal overflow or clipped controls. The live card is large and readable, and the yellow CTA uses dark text. |
| 1440x900 | Host/spectator live turn | `docs/screenshots/m3-host-live-desktop-1440x900.png` | Host view shows active player, team, timer and scoreboard without card text. Layout has generous spacing and remains readable on desktop. |

Visible fixes made during review:

- Reduced active-turn vertical spacing after the first mobile screenshot clipped the bottom action button.
- Normalised backend turn deadlines to UTC in snapshots after Playwright exposed a local-time countdown issue on SQLite-reloaded datetimes.

## 2026-05-26 - Milestone 4

Verified with Playwright-managed backend/frontend servers and Chromium.

| Viewport | Screen | Screenshot | Observations |
| --- | --- | --- | --- |
| 390x844 | Active clue-giver live turn with score/skip controls | `docs/screenshots/m4-active-turn-mobile-390x844.png` | Timer ring, status chips, private card, Skip and `Got it!` controls, and score cards fit the phone viewport without clipping or horizontal overflow. Actions are thumb-friendly and disabled when pending or expired. |
| 1440x900 | Host/spectator live turn | `docs/screenshots/m4-host-live-desktop-1440x900.png` | Host can see active player/team, countdown, score cards and team roster without seeing the live card text. The layout remains readable at desktop width. |
| 1440x900 | Shared display live turn | `docs/screenshots/m4-shared-display-desktop-1440x900.png` | Shared display presents round, active team/player, large countdown, cards-left text and score cards. It intentionally shows no live card text. |

Visible fixes made during review:

- Fixed nested logo links surfaced by the frontend test render warning.
- Added an explicit wake-lock type boundary so the progressive screen-awake enhancement remains TypeScript-clean.
- Kept countdowns aligned to backend `serverTime`/`deadlineAt` snapshots so reconnect and shared-display timers match server state.

## 2026-05-26 - Milestone 5

Verified with Playwright-managed backend/frontend servers and Chromium.

| Viewport | Screen | Screenshot | Observations |
| --- | --- | --- | --- |
| 390x844 | Turn recap with undo and guessed-card list | `docs/screenshots/m5-turn-recap-mobile-390x844.png` | Recap card text is readable for the authorised active player, actions are thumb-friendly, and the fixed outlined Undo control now uses dark text on the light card. No horizontal overflow observed. |
| 1440x900 | Round summary after undo-restored card is completed | `docs/screenshots/m5-round-summary-desktop-1440x900.png` | Round totals and cumulative totals are clear, next-round rule is prominent, and the host continuation CTA uses yellow with dark text. |
| 1440x900 | Final results and host rematch controls | `docs/screenshots/m5-results-desktop-1440x900.png` | Winner banner, final team scores, valid-event stats and rematch controls fit cleanly in the desktop viewport. |
| 390x844 | Final results on player phone | `docs/screenshots/m5-results-mobile-390x844.png` | Winner and scores are visible immediately on mobile. The longer stats/action area continues below the first viewport without overlap or horizontal overflow. |

Visible fixes made during review:

- Replaced the recap Undo button styling after screenshot review exposed low-contrast white text on a light panel.
- Removed extra decorative result-card shapes so the celebration remains original and readable without unrelated floating decoration.

## 2026-06-11 - Milestone 6

Verified with Playwright-managed backend/frontend servers and Chromium.

| Viewport | Screen | Screenshot | Observations |
| --- | --- | --- | --- |
| 1440x900 | Host invite with QR and localhost/LAN warning | `docs/screenshots/m6-host-invite-desktop-1440x900.png` | QR card, room code, copy CTA, localhost phone warning and lobby blockers fit without horizontal overflow. Disabled actions are visually muted and the yellow warning remains high contrast. |
| 390x844 | Spectator recovery after reload during a live turn | `docs/screenshots/m6-spectator-recovery-mobile-390x844.png` | Score recovered to Blue Comets 1 after refresh, live card text remained absent, connection badge stayed unobtrusive, and the spectator live-turn layout fit the target phone viewport without clipped primary content. |

Visible fixes made during review:

- Added a concrete localhost QR warning so hosts know when phone scanning needs LAN env configuration.
- Made the connection badge resilient to missing/unknown status values after unit tests exposed a crash in mocked recovery state.
- Kept PWA service-worker behavior conservative so gameplay API/socket state is never served from cache.

## 2026-06-11 - Rules polish

Verified with Playwright-managed backend/frontend servers and Chromium.

| Viewport | Screen | Screenshot | Observations |
| --- | --- | --- | --- |
| 390x844 | Active player turn-ready screen | `docs/screenshots/polish-turn-ready-mobile-390x844.png` | Copy assumes the active player is on their own phone, with a single clear `Start my turn` CTA. The card remains hidden before start and the panel fits without horizontal overflow. |
| 1440x900 | Non-active turn-ready screen | `docs/screenshots/polish-turn-ready-desktop-1440x900.png` | The screen announces `Alice is clue-giver` instead of pass-phone copy. Text and the card-hidden notice stay centered and readable on desktop. |
| 390x844 | Turn recap count-only result | `docs/screenshots/m5-turn-recap-mobile-390x844.png` | Recap now shows only `4 guessed`, plus undo and confirm actions. No card list appears, and the controls remain thumb-friendly. |
| 1440x900 | Host lobby after shuffle | `docs/screenshots/m2-host-ready-desktop-1440x900.png` | The `New teams:` banner and visible team cards agree after the shuffle. The start CTA remains available and the layout has no horizontal overflow. |

Visible fixes made during review:

- Removed pass-phone wording from turn-ready states.
- Replaced recap card list with a count-only result panel.
- Fixed a stale shuffle-announcement race found in screenshot review by delaying the announcement until the recovery snapshot refetch completed.

## 2026-06-13 - Premium UI simplification pass

Live Chromium screenshot verification was attempted but blocked by the local environment:

- `node .\node_modules\playwright\cli.js test` failed before useful screenshot output because Playwright could not update `frontend/test-results/.last-run.json` (`EPERM`). The elevated rerun request was rejected by the environment usage limit.
- `node .\node_modules\vite\bin\vite.js build --configLoader native` transformed modules but failed copying `frontend/public/icon.svg` into `frontend/dist/icon.svg` (`EPERM`). The elevated rerun request was rejected by the environment usage limit.
- The in-app browser bridge also failed at startup with `CreateProcessAsUserW failed: 5`, so manual browser inspection could not be completed in this session.

Code-level UI review completed after the redesign:

| Viewport | Screen | Screenshot | Observations |
| --- | --- | --- | --- |
| 390x844 | Active gameplay | Not captured; visual tooling blocked | The mobile active-turn component now prioritizes timer, current private card, `Got it`/`Skip` controls and a compact horizontal `ScoreStrip`. The large scoreboard was removed from active turns to reduce first-viewport overload. |
| 390x844 | Player lobby/card submission | Not captured; visual tooling blocked | Player lobby now centers identity, team, readiness and card status badges with one prominent ready action. Card submission hides the disabled add-card button once the stack is complete and promotes review/submit. |
| 1440x900 | Host lobby/shared display | Not captured; visual tooling blocked | Host lobby makes the invite panel the hero and moves shuffle/display/end-room controls into a quieter host-tools area. Shared display keeps live card text hidden and emphasizes round, active player/team, timer and scores. |

Visible/code fixes made during review:

- Added shared `Panel`, badge, `TopBar`, `BottomActionBar`, `ScoreStrip` and `ConfirmDialog` primitives to reduce repeated custom card/button styling.
- Added accessible inline errors, `aria-pressed` segmented controls, QR labeling and action-specific pending labels.
- Added setup-only leave-room and host-cancel flows with confirmation dialogs.
- Flattened the create-room review step so the wizard keeps one main card per step instead of nesting panels.

## 2026-06-13 - Second-pass party polish

Verified with Playwright-managed backend/frontend servers and Chromium screenshots. The in-app Browser bridge could not start in this local session (`CreateProcessAsUserW failed: 5`), so Playwright screenshots were used for manual visual inspection.

| Viewport | Screen | Screenshot | Observations |
| --- | --- | --- | --- |
| 390x844 | Player lobby / ready check | `docs/screenshots/m1-player-mobile-390x844.png` | Essential identity, team assignment, ready action, card status and collapsed team details fit in the first viewport. The ready action remains the only dominant action and long secondary content is lower priority. |
| 1440x900 | Host lobby with QR, status and teams | `docs/screenshots/m2-host-ready-desktop-1440x900.png` | The invite QR, LAN warning, lobby status, host tools, announcement, ready banner and compact team cards fit in the first desktop viewport. Start remains reachable in the bottom action area. |
| 390x844 | Active clue-giver turn | `docs/screenshots/m4-active-turn-mobile-390x844.png` | Timer, current card, skip/correct controls and compact team-colored score strip fit without scrolling in the common case. Team identity is visible without adding active-gameplay animation. |
| 1440x900 | Round summary | `docs/screenshots/m5-round-summary-desktop-1440x900.png` | Summary uses team-colored cards, tinted score zones and leader treatment while preserving a calm desktop layout. The next-round action is obvious and the view fits the desktop viewport. |
| 1440x900 | Final results | `docs/screenshots/m5-results-desktop-1440x900.png` | Winner area now feels more celebratory with restrained team-colored streak/glow details. Team cards clearly show winner/leader identity and actions remain visible. |
| 390x844 | Final results | `docs/screenshots/m5-results-mobile-390x844.png` | Winner and final team scores are visible immediately on mobile. Secondary stats/actions continue below the fold without overlap or horizontal overflow. |

Visible fixes made during review:

- Replaced overly transparent unsupported Tailwind opacity utilities with arbitrary opacity classes so announcement/status panels render as intended.
- Tightened host invite QR sizing and desktop host-lobby grid spacing so QR, status and team cards fit together at 1440x900.
- Collapsed setup team lists on player lobby into a compact details section so the ready action stays above lower-priority roster content.
- Added team-colored score surfaces and leader/winner treatment across score strips, team boards, round summary and final results without coloring entire cards aggressively.
- Confirmed localhost QR warning is visible while the manual room code remains available as a fallback.

## 2026-06-14 - Motion and audio polish

Verified with Playwright-managed backend/frontend servers and Chromium screenshots. The in-app Browser bridge still could not start locally (`CreateProcessAsUserW failed: 5`), so refreshed Playwright screenshots were used for visual inspection. A separate temporary frontend-only screenshot attempt for home/create was unreliable in this environment, so those non-gameplay transitions were checked by code/static review and covered by TypeScript/lint rather than captured.

| Viewport | Screen | Screenshot | Observations |
| --- | --- | --- | --- |
| 390x844 | Player lobby / ready check | `docs/screenshots/m1-player-mobile-390x844.png` | TopBar mute toggle fits without crowding the phone header. Ready panel still fits the first viewport and now has a short success pulse when the actual ready state changes. |
| 390x844 | Active clue-giver turn | `docs/screenshots/m4-active-turn-mobile-390x844.png` | Timer, card text and actions remain stable and readable. Timer ring has motion-ready urgency classes for the final seconds without animating the card text. Score cards remain compact after adding score-pop support. |
| 1440x900 | Host lobby with QR/status/teams | `docs/screenshots/m2-host-ready-desktop-1440x900.png` | The sound toggle fits in the host TopBar. Host lobby still fits QR, LAN warning, status, teams and start readiness in the desktop viewport. |
| 1440x900 | Round summary | `docs/screenshots/m5-round-summary-desktop-1440x900.png` | Team score cards reveal with a short stagger and score pop. A mid-animation screenshot initially looked washed out, so fade keyframes were changed to start near full opacity for continuous readability. |
| 1440x900 | Final results | `docs/screenshots/m5-results-desktop-1440x900.png` | Winner reveal uses one-shot shine/streak accents and readable team score cards. No continuous celebration animation remains after the reveal settles. |
| 390x844 | Final results | `docs/screenshots/m5-results-mobile-390x844.png` | Winner and final scores stay immediately visible on mobile; secondary stats/actions remain below without horizontal overflow. |

Visible/code fixes made during review:

- Softened page/panel/winner fade starts so content stays readable even if a screenshot or user catches the first animation frames.
- Kept active card text static during gameplay; only timer, buttons, score numbers and surrounding panels animate.
- Confirmed no core gameplay, token, socket or route behavior changed; Playwright multi-context flows still passed.
- Confirmed mute is a visible control and audio remains optional; every sound cue has an existing visual state change.
