import { useContext } from "react";

import { SoundContext } from "./soundContext";

export function useSound() {
  return useContext(SoundContext);
}
