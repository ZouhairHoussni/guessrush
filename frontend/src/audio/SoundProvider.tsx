import { ReactNode, useEffect, useMemo, useState } from "react";

import { SoundContext, SoundContextValue } from "./soundContext";
import { soundManager } from "./soundManager";

export function SoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMutedState] = useState(() => soundManager.isMuted());

  useEffect(() => soundManager.subscribe(setMutedState), []);

  useEffect(() => {
    const unlock = () => {
      void soundManager.unlock();
    };
    window.addEventListener("pointerdown", unlock, { once: true, capture: true });
    window.addEventListener("keydown", unlock, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
    };
  }, []);

  const value = useMemo<SoundContextValue>(
    () => ({
      muted,
      setMuted: (nextMuted) => soundManager.setMuted(nextMuted),
      toggleMuted: () => soundManager.toggleMuted(),
      playSound: (eventName, options) => soundManager.play(eventName, options),
      unlockAudio: () => {
        void soundManager.unlock();
      },
    }),
    [muted],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}
