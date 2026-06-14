import { createContext } from "react";

import { soundManager, SoundEventName, SoundRole } from "./soundManager";

export interface SoundContextValue {
  muted: boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  playSound: (eventName: SoundEventName, options?: { role?: SoundRole; volume?: number }) => void;
  unlockAudio: () => void;
}

export const SoundContext = createContext<SoundContextValue>({
  muted: soundManager.isMuted(),
  setMuted: (muted) => soundManager.setMuted(muted),
  toggleMuted: () => soundManager.toggleMuted(),
  playSound: (eventName, options) => soundManager.play(eventName, options),
  unlockAudio: () => {
    void soundManager.unlock();
  },
});
