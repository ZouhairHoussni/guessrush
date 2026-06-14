import { Hourglass } from "lucide-react";

import type { RoomSnapshot } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { ruleForRound } from "./roundRules";

interface RoundIntroViewProps {
  snapshot: RoomSnapshot;
  canHost: boolean;
  pending: boolean;
  onBeginRound: () => void;
}

export function RoundIntroView({
  snapshot,
  canHost,
  pending,
  onBeginRound,
}: RoundIntroViewProps) {
  const rule = ruleForRound(snapshot.room.currentRoundNumber);

  return (
    <Panel variant="hero" className="mx-auto grid max-w-3xl gap-5 text-center">
      <div className="motion-badge-pop mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-brand-yellow-500">
        <Hourglass size={34} aria-hidden />
      </div>
      <div>
        <p className="font-bold uppercase tracking-[0.16em] text-brand-blue-800">{rule.title}</p>
        <h1 className="mt-2 font-display text-5xl font-bold sm:text-6xl">{rule.label}</h1>
        <p className="mx-auto mt-3 max-w-xl text-lg font-bold text-muted">{rule.detail}</p>
      </div>
      {canHost ? (
        <Button
          pending={pending}
          pendingLabel="Beginning round..."
          onClick={onBeginRound}
          className="mx-auto w-full max-w-sm"
        >
          Begin round
        </Button>
      ) : (
        <p className="rounded-[20px] bg-brand-blue-100 px-4 py-3 font-bold text-brand-blue-900">
          Waiting for the host to begin the round.
        </p>
      )}
    </Panel>
  );
}
