import { Timer, UsersRound } from "lucide-react";

import type { RoomSnapshot } from "../../api/types";
import { ScoreBoard } from "../../components/room/ScoreBoard";
import { TeamBoard } from "../../components/room/TeamBoard";
import { Panel } from "../../components/ui/Panel";
import { ruleForRound } from "./roundRules";
import { useCountdown } from "./useCountdown";

interface SpectatorTurnViewProps {
  snapshot: RoomSnapshot;
}

export function SpectatorTurnView({ snapshot }: SpectatorTurnViewProps) {
  const rule = ruleForRound(snapshot.room.currentRoundNumber);
  const turn = snapshot.turn;
  const countdown = useCountdown(
    snapshot.turn?.deadlineAt,
    snapshot.turn?.serverTime,
    snapshot.room.turnDurationSeconds,
  );

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <Panel variant="hero" className="text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[24px] bg-brand-yellow-500">
          {snapshot.room.phase === "TURN_LIVE" ? (
            <Timer size={34} aria-hidden />
          ) : (
            <UsersRound size={34} aria-hidden />
          )}
        </div>
        <p className="font-bold uppercase tracking-[0.16em] text-brand-blue-800">
          {turn?.activeTeamName ?? "Team turn"}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold sm:text-6xl">
          {turn?.activeMemberName ?? "Clue-giver"} is playing
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg font-bold text-muted">
          {rule.label}. Guess out loud, but the card stays private.
        </p>
        {snapshot.room.phase === "TURN_LIVE" ? (
          <div className="mx-auto mt-5 grid gap-2">
            <p
              className={[
                "mx-auto w-fit rounded-full px-5 py-3 font-display text-4xl font-black tabular-nums",
                countdown.urgent
                  ? "bg-brand-yellow-500 text-ink"
                  : "bg-brand-blue-100 text-brand-blue-900",
              ].join(" ")}
            >
              {countdown.secondsLeft}s
            </p>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-muted">
              {turn?.cardsRemaining ?? 0} cards left - {turn?.points ?? 0} this turn
            </p>
          </div>
        ) : null}
      </Panel>
      <ScoreBoard snapshot={snapshot} compact />
      <TeamBoard snapshot={snapshot} />
    </div>
  );
}
