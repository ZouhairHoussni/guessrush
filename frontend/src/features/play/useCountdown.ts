import { useEffect, useMemo, useState } from "react";

interface CountdownState {
  secondsLeft: number;
  progress: number;
  urgent: boolean;
  expired: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function millisecondsLeft(deadlineAt: string | null, serverOffset: number): number {
  if (!deadlineAt) {
    return 0;
  }
  return Math.max(0, Date.parse(deadlineAt) - (Date.now() + serverOffset));
}

export function useCountdown(
  deadlineAt: string | null | undefined,
  serverTime: string | null | undefined,
  durationSeconds: number,
): CountdownState {
  const [remainingMs, setRemainingMs] = useState(() =>
    millisecondsLeft(deadlineAt ?? null, 0),
  );

  useEffect(() => {
    const serverOffset = serverTime ? Date.parse(serverTime) - Date.now() : 0;
    setRemainingMs(millisecondsLeft(deadlineAt ?? null, serverOffset));
    const interval = window.setInterval(() => {
      setRemainingMs(millisecondsLeft(deadlineAt ?? null, serverOffset));
    }, 150);
    return () => window.clearInterval(interval);
  }, [deadlineAt, serverTime]);

  return useMemo(() => {
    const durationMs = Math.max(1, durationSeconds * 1000);
    const secondsLeft = Math.ceil(remainingMs / 1000);
    return {
      secondsLeft,
      progress: clamp(remainingMs / durationMs, 0, 1),
      urgent: secondsLeft <= 5,
      expired: remainingMs <= 0,
    };
  }, [durationSeconds, remainingMs]);
}
