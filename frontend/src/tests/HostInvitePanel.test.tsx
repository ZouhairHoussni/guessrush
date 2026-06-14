import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import type { RoomSnapshot } from "../api/types";
import { HostInvitePanel } from "../features/lobby/HostInvitePanel";
import { renderWithProviders } from "./test-utils";

const snapshot: RoomSnapshot = {
  viewer: "HOST",
  room: {
    code: "ABC234",
    phase: "LOBBY",
    deckMode: "QUICK_PLAY",
    turnDurationSeconds: 30,
    cardsPerPlayer: null,
    autoBalanceTeams: true,
    currentRoundNumber: 0,
  },
  teams: [],
  members: [],
  joinUrl: "http://localhost:5173/join/ABC234",
  currentMemberId: null,
  deckStatus: {
    mode: "QUICK_PLAY",
    totalPlayerCount: 0,
    submittedPlayerCount: 0,
    requiredCardsPerPlayer: null,
    totalCardCount: 30,
    deckReady: true,
  },
  startStatus: {
    canStart: false,
    blockers: ["Waiting for at least 2 players."],
  },
  turn: null,
  currentCardText: null,
  roundSummary: null,
  results: null,
};

describe("HostInvitePanel", () => {
  test("renders QR invitation and readable room code", () => {
    renderWithProviders(<HostInvitePanel snapshot={snapshot} />);

    expect(screen.getByText("ABC234")).toBeInTheDocument();
    expect(screen.getByText(/scan to join/i)).toBeInTheDocument();
    expect(screen.getByText(/phone testing needs a lan url/i)).toBeInTheDocument();
    expect(screen.getByText("http://localhost:5173/join/ABC234")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy link/i })).toBeInTheDocument();
  });
});
