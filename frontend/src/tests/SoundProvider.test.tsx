import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { SoundProvider } from "../audio/SoundProvider";
import { soundManager } from "../audio/soundManager";
import { MuteToggle } from "../components/ui/MuteToggle";

describe("sound preferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
    soundManager.setMuted(false);
  });

  test("mute toggle persists the sound preference", async () => {
    const user = userEvent.setup();
    render(
      <SoundProvider>
        <MuteToggle />
      </SoundProvider>,
    );

    await user.click(screen.getByRole("button", { name: /mute sounds/i }));
    expect(window.localStorage.getItem("guessrush:sound-muted")).toBe("true");
    expect(screen.getByRole("button", { name: /unmute sounds/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /unmute sounds/i }));
    expect(window.localStorage.getItem("guessrush:sound-muted")).toBe("false");
  });
});
