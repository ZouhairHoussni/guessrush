import { Play, UsersRound } from "lucide-react";

import type { RoomSnapshot } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { ruleForRound } from "./roundRules";

interface TurnReadyViewProps {
  snapshot: RoomSnapshot;
  isActivePlayer: boolean;
  pending: boolean;
  onStartTurn: () => void;
}

export function TurnReadyView({
  snapshot,
  isActivePlayer,
  pending,
  onStartTurn,
}: TurnReadyViewProps) {
  const turn = snapshot.turn;
  const rule = ruleForRound(snapshot.room.currentRoundNumber);

  if (!turn) {
    return (
      <Panel variant="hero" className="text-center">
        <h1 className="font-display text-4xl font-bold">Turn is syncing</h1>
      </Panel>
    );
  }

  return (
    <Panel variant="hero" className="mx-auto grid max-w-3xl gap-5 text-center">
      <div className="motion-badge-pop mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-brand-yellow-500">
        {isActivePlayer ? <Play size={34} aria-hidden /> : <UsersRound size={34} aria-hidden />}
      </div>
      <div>
        <p className="font-bold uppercase tracking-[0.16em] text-brand-blue-800">
          {turn.activeTeamName}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold sm:text-6xl">
          {isActivePlayer
            ? `Your turn, ${turn.activeMemberName}!`
            : `${turn.activeMemberName} is clue-giver`}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg font-bold text-muted">
          {rule.label}. The timer starts only when{" "}
          {isActivePlayer ? "you tap start" : `${turn.activeMemberName} taps start on their phone`}.
        </p>
      </div>
      {isActivePlayer ? (
        <Button
          pending={pending}
          pendingLabel="Starting turn..."
          sound={false}
          onClick={onStartTurn}
          className="mx-auto w-full max-w-sm"
        >
          Start my turn
        </Button>
      ) : (
        <p className="rounded-[20px] bg-brand-blue-100 px-4 py-3 font-bold text-brand-blue-900">
          No card is shown here. Watch {turn.activeMemberName}'s clues.
        </p>
      )}
    </Panel>
  );
}
