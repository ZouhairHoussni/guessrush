import { Volume2, VolumeX } from "lucide-react";

import { useSound } from "../../audio/useSound";

export function MuteToggle() {
  const { muted, toggleMuted, playSound, unlockAudio } = useSound();

  return (
    <button
      type="button"
      aria-label={muted ? "Unmute sounds" : "Mute sounds"}
      aria-pressed={muted}
      onClick={() => {
        unlockAudio();
        if (muted) {
          toggleMuted();
          playSound("button_click", { volume: 0.65 });
        } else {
          playSound("button_click", { volume: 0.45 });
          toggleMuted();
        }
      }}
      className="pressable grid h-10 w-10 place-items-center rounded-full bg-white/12 text-white hover:bg-white/18"
    >
      {muted ? <VolumeX size={17} aria-hidden /> : <Volume2 size={17} aria-hidden />}
    </button>
  );
}
