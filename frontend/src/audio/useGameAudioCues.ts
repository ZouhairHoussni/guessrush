import { useEffect, useMemo } from "react";

import type { RoomSnapshot, TeamSnapshot } from "../api/types";
import { usePreviousValue } from "../hooks/usePreviousValue";
import { useSound } from "./useSound";
import type { SoundRole } from "./soundManager";

interface GameAudioCueOptions {
  activePlayer?: boolean;
  publicDisplay?: boolean;
  hostView?: boolean;
}

function uniqueLeaderId(teams: TeamSnapshot[]): string | null {
  const scores = teams.map((team) => team.totalScore);
  const maxScore = Math.max(...scores, 0);
  if (maxScore <= 0) {
    return null;
  }
  const leaders = teams.filter((team) => team.totalScore === maxScore);
  return leaders.length === 1 ? leaders[0].id : null;
}

function scoreMap(teams: TeamSnapshot[]): Map<string, number> {
  return new Map(teams.map((team) => [team.id, team.totalScore]));
}

function shouldUsePublicAudio(options: GameAudioCueOptions): boolean {
  return Boolean(options.activePlayer || options.hostView || options.publicDisplay);
}

export function useGameAudioCues(
  snapshot: RoomSnapshot | null | undefined,
  options: GameAudioCueOptions = {},
): void {
  const { playSound } = useSound();
  const phaseKey = snapshot
    ? `${snapshot.room.phase}:${snapshot.room.currentRoundNumber}:${snapshot.turn?.id ?? "none"}`
    : "none";
  const previousPhaseKey = usePreviousValue(phaseKey);
  const phase = snapshot?.room.phase ?? null;
  const role: SoundRole = options.publicDisplay ? "display" : options.hostView ? "host" : "player";

  const scores = useMemo(() => (snapshot ? scoreMap(snapshot.teams) : new Map()), [snapshot]);
  const scoreSignature = snapshot
    ? snapshot.teams.map((team) => `${team.id}:${team.totalScore}`).join("|")
    : "none";
  const previousScores = usePreviousValue(scores);
  const previousScoreSignature = usePreviousValue(scoreSignature);

  const leaderId = snapshot ? uniqueLeaderId(snapshot.teams) : null;
  const previousLeaderId = usePreviousValue(leaderId);

  const skipKey = snapshot?.turn ? `${snapshot.turn.id}:${snapshot.turn.skipsUsed}` : "none";
  const previousSkipKey = usePreviousValue(skipKey);

  useEffect(() => {
    if (!snapshot || previousPhaseKey === undefined || previousPhaseKey === phaseKey) {
      return;
    }
    if (phase === "TURN_LIVE" && shouldUsePublicAudio(options)) {
      playSound("turn_start", { role });
    }
    if (phase === "ROUND_INTRO" && shouldUsePublicAudio(options)) {
      playSound("phase_change", { role, volume: 0.62 });
    }
    if (phase === "TURN_RECAP" && shouldUsePublicAudio(options)) {
      playSound("time_up", { role, volume: options.activePlayer ? 0.72 : 0.5 });
    }
    if (phase === "ROUND_SUMMARY" && shouldUsePublicAudio(options)) {
      playSound("round_complete", { role });
    }
    if (phase === "FINISHED" && shouldUsePublicAudio(options)) {
      playSound("winner_reveal", { role });
    }
  }, [options, phase, phaseKey, playSound, previousPhaseKey, role, snapshot]);

  useEffect(() => {
    if (
      !snapshot ||
      previousScores === undefined ||
      previousScoreSignature === undefined ||
      previousScoreSignature === scoreSignature ||
      !shouldUsePublicAudio(options)
    ) {
      return;
    }
    const scoreIncreased = snapshot.teams.some(
      (team) => team.totalScore > (previousScores.get(team.id) ?? team.totalScore),
    );
    if (scoreIncreased) {
      playSound("correct", { role, volume: options.activePlayer ? 0.88 : 0.62 });
    }
  }, [
    options,
    playSound,
    previousScoreSignature,
    previousScores,
    role,
    scoreSignature,
    snapshot,
  ]);

  useEffect(() => {
    if (
      previousLeaderId === undefined ||
      !leaderId ||
      !previousLeaderId ||
      leaderId === previousLeaderId ||
      !shouldUsePublicAudio(options)
    ) {
      return;
    }
    playSound("leader_change", { role });
  }, [leaderId, options, playSound, previousLeaderId, role]);

  useEffect(() => {
    if (!snapshot?.turn || previousSkipKey === undefined || previousSkipKey === skipKey) {
      return;
    }
    const [previousTurnId, previousSkips] = previousSkipKey.split(":");
    if (
      previousTurnId === snapshot.turn.id &&
      snapshot.turn.skipsUsed > Number(previousSkips) &&
      (options.activePlayer || options.publicDisplay)
    ) {
      playSound("skip", { role, volume: options.activePlayer ? 0.74 : 0.48 });
    }
  }, [options, playSound, previousSkipKey, role, skipKey, snapshot?.turn]);
}

export function useCountdownAudio({
  enabled,
  secondsLeft,
  role = "player",
}: {
  enabled: boolean;
  secondsLeft: number;
  expired: boolean;
  role?: SoundRole;
}): void {
  const { playSound } = useSound();
  const previousSeconds = usePreviousValue(secondsLeft);

  useEffect(() => {
    if (!enabled || previousSeconds === undefined || previousSeconds === secondsLeft) {
      return;
    }
    if (secondsLeft > 0 && secondsLeft <= 5) {
      playSound(secondsLeft <= 3 ? "countdown_warning" : "countdown_tick", {
        role,
        volume: secondsLeft <= 3 ? 0.52 : 0.36,
      });
    }
  }, [enabled, playSound, previousSeconds, role, secondsLeft]);
}
