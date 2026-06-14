import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError, getCardStatus, submitCards } from "../api/http";
import { CardSubmissionPage } from "../features/lobby/CardSubmissionPage";
import { useRoomSnapshot } from "../hooks/useRoomSnapshot";
import { renderWithProviders } from "./test-utils";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ code: "ABC234" }),
  };
});

vi.mock("../api/http", async () => {
  const actual = await vi.importActual<typeof import("../api/http")>("../api/http");
  return {
    ...actual,
    getCardStatus: vi.fn(),
    submitCards: vi.fn(),
  };
});

vi.mock("../hooks/useRoomSnapshot", () => ({
  useRoomSnapshot: vi.fn(),
}));

describe("CardSubmissionPage", () => {
  beforeEach(() => {
    navigate.mockReset();
    vi.mocked(getCardStatus).mockReset();
    vi.mocked(submitCards).mockReset();
    vi.mocked(useRoomSnapshot).mockReturnValue({
      data: null,
      error: null,
    } as unknown as ReturnType<typeof useRoomSnapshot>);
    window.localStorage.clear();
    window.localStorage.setItem("guessrush:player:ABC234", "player-secret");
  });

  test("submits the required personal cards for the current player", async () => {
    const user = userEvent.setup();
    vi.mocked(getCardStatus).mockResolvedValue({
      submitted: false,
      requiredCount: 2,
      submittedCount: 0,
      cards: [],
    });
    vi.mocked(submitCards).mockResolvedValue({
      submitted: true,
      requiredCount: 2,
      submittedCount: 2,
      cards: ["Moon Pancake", "Bubble Museum"],
    });

    renderWithProviders(<CardSubmissionPage />, ["/room/ABC234/cards"]);

    await screen.findByText("Card 1 of 2");
    await user.type(screen.getByLabelText("Card text"), "Moon Pancake");
    await user.click(screen.getByRole("button", { name: /add card/i }));
    await user.type(screen.getByLabelText("Card text"), "Bubble Museum");
    await user.click(screen.getByRole("button", { name: /add card/i }));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(submitCards).toHaveBeenCalledWith("ABC234", "player-secret", [
        "Moon Pancake",
        "Bubble Museum",
      ]);
    });
    expect(navigate).toHaveBeenCalledWith("/room/ABC234/lobby");
  });

  test("blocks duplicate cards before submission", async () => {
    const user = userEvent.setup();
    vi.mocked(getCardStatus).mockResolvedValue({
      submitted: false,
      requiredCount: 2,
      submittedCount: 0,
      cards: [],
    });

    renderWithProviders(<CardSubmissionPage />, ["/room/ABC234/cards"]);

    await screen.findByText("Card 1 of 2");
    await user.type(screen.getByLabelText("Card text"), "Moon Pancake");
    await user.click(screen.getByRole("button", { name: /add card/i }));
    await user.type(screen.getByLabelText("Card text"), "moon pancake");

    expect(
      screen.getByText('This card already exists: "Moon Pancake". Please choose a different one.'),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add card/i })).toBeDisabled();
  });

  test("shows exact duplicate card text from the server when available", async () => {
    const user = userEvent.setup();
    vi.mocked(getCardStatus).mockResolvedValue({
      submitted: false,
      requiredCount: 2,
      submittedCount: 0,
      cards: [],
    });
    vi.mocked(submitCards).mockRejectedValue(
      new ApiError(
        {
          error: {
            code: "DUPLICATE_CARD",
            message: 'This card already exists: "Moon Pancake". Please choose a different one.',
            details: { duplicateCardText: "Moon Pancake" },
          },
        },
        409,
      ),
    );

    renderWithProviders(<CardSubmissionPage />, ["/room/ABC234/cards"]);

    await screen.findByText("Card 1 of 2");
    await user.type(screen.getByLabelText("Card text"), "Moon Pancake");
    await user.click(screen.getByRole("button", { name: /add card/i }));
    await user.type(screen.getByLabelText("Card text"), "Bubble Museum");
    await user.click(screen.getByRole("button", { name: /add card/i }));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      await screen.findByText(
        'This card already exists: "Moon Pancake". Please choose a different one.',
      ),
    ).toBeInTheDocument();
  });

  test("routes to play when the room snapshot moves into gameplay", async () => {
    vi.mocked(getCardStatus).mockResolvedValue({
      submitted: false,
      requiredCount: 2,
      submittedCount: 0,
      cards: [],
    });
    vi.mocked(useRoomSnapshot).mockReturnValue({
      data: {
        room: { phase: "ROUND_INTRO" },
      },
      error: null,
    } as unknown as ReturnType<typeof useRoomSnapshot>);

    renderWithProviders(<CardSubmissionPage />, ["/room/ABC234/cards"]);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/room/ABC234/play", { replace: true });
    });
  });
});
