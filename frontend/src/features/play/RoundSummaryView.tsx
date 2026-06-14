import { Crown, Trophy } from "lucide-react";

import type { RoomSnapshot } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { AnimatedListItem, ScorePop } from "../../components/ui/Motion";
import { Panel } from "../../components/ui/Panel";
import { isLeadingScore, teamAccent } from "../../utils/teamAccent";

interface RoundSummaryViewProps {
  snapshot: RoomSnapshot;
  canHost: boolean;
  pending: boolean;
  onAdvance: () => void;
}

export function RoundSummaryView({
  snapshot,
  canHost,
  pending,
  onAdvance,
}: RoundSummaryViewProps) {
  const summary = snapshot.roundSummary;
  const finalRoundComplete = snapshot.room.currentRoundNumber >= 3;
  const scores = (summary?.teams ?? []).map((team) => team.totalScore);

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <Panel variant="hero" className="text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[24px] bg-brand-yellow-500">
          <Trophy size={34} aria-hidden />
        </div>
        <p className="font-bold uppercase tracking-[0.16em] text-brand-blue-800">
          Round {summary?.roundNumber ?? snapshot.room.currentRoundNumber} complete
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
          {finalRoundComplete ? "Final scores are ready" : summary?.nextRuleLabel}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg font-bold text-muted">
          {finalRoundComplete
            ? "One tap from the celebration."
            : summary?.nextRuleDetail ?? "The next round is ready."}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(summary?.teams ?? []).map((team, index) => {
            const accent = teamAccent(team.colorKey);
            const leading = isLeadingScore(team.totalScore, scores);
            return (
              <AnimatedListItem key={team.teamId} index={index}>
                <article
                  className={[
                    "relative overflow-hidden rounded-[24px] border-2 px-4 py-4 text-left",
                    accent.card,
                    leading ? accent.leaderGlow : accent.glow,
                  ].join(" ")}
                >
                  <span className={["absolute inset-x-0 top-0 h-1.5", accent.stripe].join(" ")} />
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className={["font-display text-2xl font-bold", accent.text].join(" ")}>
                      {team.teamName}
                    </p>
                    {leading ? (
                      <span
                        className={[
                          "motion-leader-in inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black",
                          accent.chip,
                        ].join(" ")}
                      >
                        <Crown size={13} aria-hidden /> Leading
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-[18px] bg-white/80 p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        This round
                      </p>
                      <p className="font-display text-4xl font-bold">
                        <ScorePop value={team.roundScore} animate />
                      </p>
                    </div>
                    <div className={["rounded-[18px] p-3", accent.scoreZone].join(" ")}>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-70">
                        Total
                      </p>
                      <p className="font-display text-4xl font-bold">
                        <ScorePop value={team.totalScore} animate />
                      </p>
                    </div>
                  </div>
                </article>
              </AnimatedListItem>
            );
          })}
        </div>

        {canHost ? (
          <Button
            pending={pending}
            pendingLabel={finalRoundComplete ? "Opening results..." : "Starting round..."}
            onClick={onAdvance}
            className="mx-auto mt-5 w-full max-w-sm"
          >
            {finalRoundComplete ? "Show final results" : "Start next round"}
          </Button>
        ) : (
          <p className="mt-5 rounded-[20px] bg-brand-blue-100 px-4 py-3 font-bold text-brand-blue-900">
            Waiting for the host to continue.
          </p>
        )}
      </Panel>
    </div>
  );
}
