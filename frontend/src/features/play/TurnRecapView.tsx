import { CheckCircle2, TimerOff, Undo2 } from "lucide-react";

import type { RoomSnapshot } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { ScorePop } from "../../components/ui/Motion";
import { Panel } from "../../components/ui/Panel";
import { teamAccent } from "../../utils/teamAccent";

interface TurnRecapViewProps {
  snapshot: RoomSnapshot;
  canConfirm: boolean;
  canUndo: boolean;
  pending: boolean;
  undoPending: boolean;
  onConfirm: () => void;
  onUndo: () => void;
}

export function TurnRecapView({
  snapshot,
  canConfirm,
  canUndo,
  pending,
  undoPending,
  onConfirm,
  onUndo,
}: TurnRecapViewProps) {
  const turn = snapshot.turn;
  const expired = turn?.status === "EXPIRED";
  const guessedCount = turn?.points ?? 0;
  const guessedLabel = `${guessedCount} guessed`;
  const activeTeam = snapshot.teams.find((team) => team.id === turn?.activeTeamId);
  const accent = teamAccent(activeTeam?.colorKey ?? "yellow");

  return (
    <Panel variant="hero" className="mx-auto grid max-w-3xl gap-5 text-center">
      <div className="motion-badge-pop mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-brand-yellow-500">
        {expired ? <TimerOff size={34} aria-hidden /> : <CheckCircle2 size={34} aria-hidden />}
      </div>
      <div>
        <p className="font-bold uppercase tracking-[0.16em] text-brand-blue-800">
          {turn?.activeTeamName}
        </p>
        <h1 className="mt-2 font-display text-5xl font-bold">
          {expired ? "Time is up!" : "Turn complete!"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg font-bold text-muted">
          {turn?.activeMemberName} scored {turn?.points ?? 0} this turn.
        </p>
      </div>
      {canConfirm ? (
        <div className={["rounded-[24px] p-4 text-left", accent.card].join(" ")}>
          <div className="mb-3 flex items-center gap-2 font-bold text-brand-blue-900">
            <CheckCircle2 size={20} aria-hidden />
            Turn result
          </div>
          <p
            className={[
              "rounded-[18px] px-4 py-5 text-center font-display text-5xl font-bold",
              accent.scoreZone,
            ].join(" ")}
          >
            <span className="sr-only">{guessedLabel}</span>
            <span aria-hidden="true">
              <ScorePop value={guessedCount} animate />
              <span className="ml-2 text-2xl">guessed</span>
            </span>
          </p>
        </div>
      ) : null}
      {canConfirm ? (
        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <button
            type="button"
            disabled={!canUndo || pending || guessedCount === 0}
            onClick={onUndo}
            className="pressable min-h-12 rounded-[20px] border-2 border-brand-yellow-500 bg-paper px-5 py-3 text-center font-bold text-ink hover:bg-brand-blue-100 disabled:cursor-not-allowed disabled:border-brand-yellow-500/40 disabled:text-ink/45"
          >
            {undoPending ? (
              "Undoing last..."
            ) : (
              <span className="inline-flex items-center justify-center gap-2">
                <Undo2 size={20} aria-hidden />
                Undo last
              </span>
            )}
          </button>
          <Button
            pending={pending}
            pendingLabel="Confirming..."
            disabled={undoPending}
            onClick={onConfirm}
          >
            Confirm & continue
          </Button>
        </div>
      ) : (
        <p className="rounded-[20px] bg-brand-blue-100 px-4 py-3 font-bold text-brand-blue-900">
          Waiting for the active player or host to confirm.
        </p>
      )}
    </Panel>
  );
}
