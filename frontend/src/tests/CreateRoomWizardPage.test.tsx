import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { createRoom } from "../api/http";
import { CreateRoomWizardPage } from "../features/create-room/CreateRoomWizardPage";
import { renderWithProviders } from "./test-utils";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("../api/http", async () => {
  const actual = await vi.importActual<typeof import("../api/http")>("../api/http");
  return {
    ...actual,
    createRoom: vi.fn(),
  };
});

describe("CreateRoomWizardPage", () => {
  beforeEach(() => {
    navigate.mockReset();
    vi.mocked(createRoom).mockReset();
    window.localStorage.clear();
  });

  test("creates a Quick Play room through the backend contract", async () => {
    const user = userEvent.setup();
    vi.mocked(createRoom).mockResolvedValue({
      code: "ABC234",
      joinUrl: "http://localhost:5173/join/ABC234",
      hostToken: "host-secret",
      room: {
        code: "ABC234",
        phase: "LOBBY",
        deckMode: "QUICK_PLAY",
        teamCount: 2,
        turnDurationSeconds: 30,
        cardsPerPlayer: null,
        autoBalanceTeams: true,
        joinUrl: "http://localhost:5173/join/ABC234",
      },
    });

    renderWithProviders(<CreateRoomWizardPage />, ["/create"]);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /create room/i }));

    expect(vi.mocked(createRoom).mock.calls[0][0]).toEqual({
      deckMode: "QUICK_PLAY",
      teamCount: 2,
      turnDurationSeconds: 30,
      cardsPerPlayer: null,
      autoBalanceTeams: true,
    });
    expect(window.localStorage.getItem("guessrush:host:ABC234")).toBe("host-secret");
    expect(navigate).toHaveBeenCalledWith("/room/ABC234/host");
  });
});
