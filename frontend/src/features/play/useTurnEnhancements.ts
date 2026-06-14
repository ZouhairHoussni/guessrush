import { useEffect, useRef } from "react";

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

interface WakeLockNavigatorLike {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
}

export function useTurnEnhancements(enabled: boolean, urgent: boolean): void {
  const vibratedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const nav = navigator as unknown as WakeLockNavigatorLike;

    if (nav.wakeLock) {
      void nav.wakeLock
        .request("screen")
        .then((lock) => {
          if (cancelled) {
            void lock.release();
            return;
          }
          sentinel = lock;
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
      if (sentinel) {
        void sentinel.release();
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !urgent || vibratedRef.current) {
      return;
    }
    vibratedRef.current = true;
    if ("vibrate" in navigator) {
      navigator.vibrate(140);
    }
  }, [enabled, urgent]);
}
