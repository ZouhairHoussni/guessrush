import { screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

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

function snapshotWithJoinUrl(joinUrl: string): RoomSnapshot {
  return {
    ...snapshot,
    joinUrl,
  };
}

function useSnapshotInviteUrl() {
  vi.stubEnv("VITE_PUBLIC_APP_URL", "");
  vi.stubEnv("VITE_APP_URL", "");
}

describe("HostInvitePanel", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("renders a LAN invitation without localhost warning", () => {
    useSnapshotInviteUrl();

    renderWithProviders(
      <HostInvitePanel
        snapshot={snapshotWithJoinUrl("http://192.168.1.146:5173/join/ABC234")}
      />,
    );

    expect(screen.getByText("ABC234")).toBeInTheDocument();
    expect(screen.getByText(/scan to join/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /join guessrush room abc234/i })).toBeInTheDocument();
    expect(screen.getByText("http://192.168.1.146:5173/join/ABC234")).toBeInTheDocument();
    expect(screen.queryByText(/phone testing needs a lan url/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/players on the same wi-fi can scan this qr/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy link/i })).toBeInTheDocument();
  });

  test("renders localhost invitation with LAN warning", () => {
    useSnapshotInviteUrl();

    renderWithProviders(
      <HostInvitePanel snapshot={snapshotWithJoinUrl("http://localhost:5173/join/ABC234")} />,
    );

    expect(screen.getByText(/phone testing needs a lan url/i)).toBeInTheDocument();
    expect(screen.getByText("http://localhost:5173/join/ABC234")).toBeInTheDocument();
  });
});
