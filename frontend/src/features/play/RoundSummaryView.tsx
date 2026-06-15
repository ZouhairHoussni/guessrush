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
    <div className="mx-auto flex h-full min-h-0 max-w-5xl flex-col">
      <Panel
        variant="hero"
        className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-4 text-center sm:p-5"
      >
        <div>
        <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-[20px] bg-brand-yellow-500 sm:h-14 sm:w-14">
          <Trophy size={28} aria-hidden />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue-800 sm:text-sm">
          Round {summary?.roundNumber ?? snapshot.room.currentRoundNumber} complete
        </p>
        <h1 className="mt-1 font-display text-[clamp(2rem,8vw,3.5rem)] font-bold leading-none">
          {finalRoundComplete ? "Final scores are ready" : summary?.nextRuleLabel}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm font-bold text-muted sm:text-base">
          {finalRoundComplete
            ? "One tap from the celebration."
            : summary?.nextRuleDetail ?? "The next round is ready."}
        </p>
        </div>

        <div className="min-h-0 overflow-auto pr-1">
        <div className="grid gap-2 sm:grid-cols-2">
          {(summary?.teams ?? []).map((team, index) => {
            const accent = teamAccent(team.colorKey);
            const leading = isLeadingScore(team.totalScore, scores);
            return (
              <AnimatedListItem key={team.teamId} index={index}>
                <article
                  className={[
                    "relative overflow-hidden rounded-[22px] border-2 px-3 py-3 text-left sm:px-4",
                    accent.card,
                    leading ? accent.leaderGlow : accent.glow,
                  ].join(" ")}
                >
                  <span className={["absolute inset-x-0 top-0 h-1.5", accent.stripe].join(" ")} />
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className={["font-display text-xl font-bold sm:text-2xl", accent.text].join(" ")}>
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
                  <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-[16px] bg-white/80 p-2">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        This round
                      </p>
                      <p className="font-display text-3xl font-bold sm:text-4xl">
                        <ScorePop value={team.roundScore} animate />
                      </p>
                    </div>
                    <div className={["rounded-[16px] p-2", accent.scoreZone].join(" ")}>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-70">
                        Total
                      </p>
                      <p className="font-display text-3xl font-bold sm:text-4xl">
                        <ScorePop value={team.totalScore} animate />
                      </p>
                    </div>
                  </div>
                </article>
              </AnimatedListItem>
            );
          })}
        </div>
        </div>

        {canHost ? (
          <Button
            pending={pending}
            pendingLabel={finalRoundComplete ? "Opening results..." : "Starting round..."}
            onClick={onAdvance}
            className="mx-auto w-full max-w-sm"
          >
            {finalRoundComplete ? "Show final results" : "Start next round"}
          </Button>
        ) : (
          <p className="rounded-[20px] bg-brand-blue-100 px-4 py-3 font-bold text-brand-blue-900">
            Waiting for the host to continue.
          </p>
        )}
      </Panel>
    </div>
  );
}
