import { Crown } from "lucide-react";

import type { RoomSnapshot } from "../../api/types";
import { ScorePop } from "../ui/Motion";
import { isLeadingScore, teamAccent } from "../../utils/teamAccent";
import { usePreviousValue } from "../../hooks/usePreviousValue";

export function ScoreStrip({ snapshot }: { snapshot: RoomSnapshot }) {
  const scores = snapshot.teams.map((team) => team.totalScore);
  const scoreByTeam = new Map(snapshot.teams.map((team) => [team.id, team.totalScore]));
  const previousScoreByTeam = usePreviousValue(scoreByTeam);
  const leaderSignature = snapshot.teams
    .filter((team) => isLeadingScore(team.totalScore, scores))
    .map((team) => team.id)
    .join("|");
  const previousLeaderSignature = usePreviousValue(leaderSignature);
  const leaderChanged =
    previousLeaderSignature !== undefined && previousLeaderSignature !== leaderSignature;

  return (
    <section
      className="flex snap-x gap-2 overflow-x-auto"
      aria-label="Scores"
      data-testid="score-strip"
    >
      {snapshot.teams.map((team) => {
        const accent = teamAccent(team.colorKey);
        const leading = isLeadingScore(team.totalScore, scores);
        const previousScore = previousScoreByTeam?.get(team.id);
        const delta = previousScore === undefined ? 0 : team.totalScore - previousScore;
        return (
          <div
            key={team.id}
            data-testid="team-score"
            className={[
              "relative min-w-[118px] snap-start overflow-hidden rounded-[16px] border px-3 py-1.5 text-ink sm:min-w-[140px] sm:py-2",
              accent.card,
              leading ? accent.leaderGlow : accent.glow,
              delta > 0 ? "motion-score-highlight" : "",
            ].join(" ")}
          >
            <span className={["absolute inset-x-0 top-0 h-1", accent.stripe].join(" ")} />
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className={["truncate text-xs font-black", accent.text].join(" ")}>
                {team.name}
              </p>
              {leading ? (
                <span
                  className={[
                    "rounded-full px-2 py-1",
                    accent.chip,
                    leaderChanged ? "motion-leader-in" : "",
                  ].join(" ")}
                >
                  <Crown size={12} aria-label="Leading team" />
                </span>
              ) : null}
            </div>
            <p
              className={[
                "mt-1 w-fit rounded-2xl px-2.5 py-0.5 font-display text-2xl font-black tabular-nums sm:px-3 sm:text-3xl",
                accent.scoreZone,
              ].join(" ")}
            >
              <ScorePop value={team.totalScore} delta={delta} />
            </p>
          </div>
        );
      })}
    </section>
  );
}
