import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { RoomSnapshot } from "../api/types";
import { ActiveTurnView } from "../features/play/ActiveTurnView";
import { ResultsPage } from "../features/results/ResultsPage";
import { SharedDisplayPage } from "../features/display/SharedDisplayPage";
import { SpectatorTurnView } from "../features/play/SpectatorTurnView";
import { TurnRecapView } from "../features/play/TurnRecapView";
import { useRoomSnapshot } from "../hooks/useRoomSnapshot";
import { renderWithProviders } from "./test-utils";

vi.mock("../hooks/useRoomSnapshot", () => ({
  useRoomSnapshot: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ code: "ABC234" }),
  };
});

function gameplaySnapshot(cardText: string | null, deadline = new Date(Date.now() + 30_000)): RoomSnapshot {
  return {
    viewer: cardText ? "PLAYER" : "PUBLIC",
    room: {
      code: "ABC234",
      phase: "TURN_LIVE",
      deckMode: "QUICK_PLAY",
      turnDurationSeconds: 30,
      cardsPerPlayer: null,
      autoBalanceTeams: true,
      currentRoundNumber: 1,
    },
    teams: [
      {
        id: "team-a",
        name: "Blue Comets",
        colorKey: "blue",
        sortOrder: 0,
        totalScore: 1,
        members: [],
      },
      {
        id: "team-b",
        name: "Yellow Sparks",
        colorKey: "yellow",
        sortOrder: 1,
        totalScore: 0,
        members: [],
      },
    ],
    members: [],
    joinUrl: "http://localhost:5173/join/ABC234",
    currentMemberId: cardText ? "member-a" : null,
    deckStatus: {
      mode: "QUICK_PLAY",
      totalPlayerCount: 2,
      submittedPlayerCount: 0,
      requiredCardsPerPlayer: null,
      totalCardCount: 30,
      deckReady: true,
    },
    startStatus: { canStart: false, blockers: [] },
    turn: {
      id: "turn-1",
      roundNumber: 1,
      sequenceNumber: 1,
      status: "LIVE",
      activeTeamId: "team-a",
      activeTeamName: "Blue Comets",
      activeMemberId: "member-a",
      activeMemberName: "Alice",
      startedAt: new Date().toISOString(),
      deadlineAt: deadline.toISOString(),
      serverTime: new Date().toISOString(),
      points: 1,
      cardsRemaining: 29,
      skipsUsed: 0,
      skipsAllowed: null,
      canSkip: true,
      guessedCards: [],
    },
    currentCardText: cardText,
    roundSummary: null,
    results: null,
  };
}

function recapSnapshot(): RoomSnapshot {
  return {
    ...gameplaySnapshot(null),
    viewer: "PLAYER",
    currentMemberId: "member-a",
    room: {
      ...gameplaySnapshot(null).room,
      phase: "TURN_RECAP",
    },
    turn: {
      ...gameplaySnapshot(null).turn!,
      status: "RECAP",
      points: 2,
      cardsRemaining: 0,
      guessedCards: [],
    },
  };
}

function finishedSnapshot(tie = false): RoomSnapshot {
  const base = gameplaySnapshot(null);
  return {
    ...base,
    viewer: "HOST",
    room: { ...base.room, phase: "FINISHED", currentRoundNumber: 3 },
    turn: null,
    results: {
      teams: [
        { teamId: "team-a", teamName: "Blue Comets", colorKey: "blue", totalScore: 9 },
        { teamId: "team-b", teamName: "Yellow Sparks", colorKey: "yellow", totalScore: tie ? 9 : 7 },
      ],
      winnerTeamIds: tie ? ["team-a", "team-b"] : ["team-a"],
      isTie: tie,
      mostCardsGuessed: { memberId: "member-a", memberName: "Alice", value: 6 },
      bestTurn: {
        memberId: "member-a",
        memberName: "Alice",
        teamId: "team-a",
        teamName: "Blue Comets",
        roundNumber: 2,
        points: 4,
      },
      closestRound: { roundNumber: 3, spread: 1 },
    },
  };
}

describe("play views", () => {
  test("active player view displays the private current card", () => {
    render(
      <ActiveTurnView
        snapshot={gameplaySnapshot("Secret Moon")}
        scorePending={false}
        skipPending={false}
        onScore={vi.fn()}
        onSkip={vi.fn()}
      />,
    );

    expect(screen.getByText("Secret Moon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /got it/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /skip/i })).toBeEnabled();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });

  test("spectator view never displays the private current card", () => {
    render(<SpectatorTurnView snapshot={gameplaySnapshot(null)} />);

    expect(screen.queryByText("Secret Moon")).not.toBeInTheDocument();
    expect(screen.getByText(/card stays private/i)).toBeInTheDocument();
  });

  test("expired active turn disables score and skip controls", () => {
    render(
      <ActiveTurnView
        snapshot={gameplaySnapshot("Secret Moon", new Date(Date.now() - 1_000))}
        scorePending={false}
        skipPending={false}
        onScore={vi.fn()}
        onSkip={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /got it/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /skip/i })).toBeDisabled();
  });

  test("later-round active turn disables skip after the one allowed skip is used", () => {
    const snapshot = gameplaySnapshot("Secret Moon");
    render(
      <ActiveTurnView
        snapshot={{
          ...snapshot,
          room: { ...snapshot.room, currentRoundNumber: 2 },
          turn: {
            ...snapshot.turn!,
            roundNumber: 2,
            skipsUsed: 1,
            skipsAllowed: 1,
            canSkip: false,
          },
        }}
        scorePending={false}
        skipPending={false}
        onScore={vi.fn()}
        onSkip={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /skip used/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /got it/i })).toBeEnabled();
  });

  test("shared display uses public snapshot and never renders card text", () => {
    vi.mocked(useRoomSnapshot).mockReturnValue({
      data: gameplaySnapshot(null),
      connectionStatus: "live",
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRoomSnapshot>);

    renderWithProviders(<SharedDisplayPage />, ["/room/ABC234/display"]);

    expect(screen.getByText(/card stays private/i)).toBeInTheDocument();
    expect(screen.queryByText("Secret Moon")).not.toBeInTheDocument();
  });

  test("turn recap shows the guessed count without listing card text", () => {
    render(
      <TurnRecapView
        snapshot={recapSnapshot()}
        canConfirm
        canUndo
        pending={false}
        undoPending={false}
        onConfirm={vi.fn()}
        onUndo={vi.fn()}
      />,
    );

    expect(screen.getByText("2 guessed")).toBeInTheDocument();
    expect(screen.queryByText("Secret Moon")).not.toBeInTheDocument();
    expect(screen.queryByText("Paper Castle")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /undo last/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeEnabled();
  });

  test("results screen handles a single winner", () => {
    renderWithProviders(
      <ResultsPage
        snapshot={finishedSnapshot(false)}
        canHost
        pending={false}
        onRematch={vi.fn()}
      />,
      ["/room/ABC234/play"],
    );

    expect(screen.getByText(/blue comets wins/i)).toBeInTheDocument();
    expect(screen.getByText(/alice: 6/i)).toBeInTheDocument();
  });

  test("results screen handles ties without choosing a false winner", () => {
    renderWithProviders(
      <ResultsPage
        snapshot={finishedSnapshot(true)}
        canHost
        pending={false}
        onRematch={vi.fn()}
      />,
      ["/room/ABC234/play"],
    );

    expect(screen.getByText(/it is a tie/i)).toBeInTheDocument();
    expect(screen.getAllByText("Winner")).toHaveLength(2);
  });
});
