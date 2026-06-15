import { Crown, Trophy } from "lucide-react";

import type { RoomSnapshot } from "../../api/types";
import { usePreviousValue } from "../../hooks/usePreviousValue";
import { isLeadingScore, teamAccent } from "../../utils/teamAccent";
import { ScorePop } from "../ui/Motion";
import { Panel } from "../ui/Panel";

interface ScoreBoardProps {
  snapshot: RoomSnapshot;
  compact?: boolean;
}

export function ScoreBoard({ snapshot, compact = false }: ScoreBoardProps) {
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
      className={[
        "grid gap-3",
        compact ? "grid-cols-2 md:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-4",
      ].join(" ")}
      aria-label="Scores"
    >
      {snapshot.teams.map((team) => {
        const accent = teamAccent(team.colorKey);
        const leading = isLeadingScore(team.totalScore, scores);
        const previousScore = previousScoreByTeam?.get(team.id);
        const delta = previousScore === undefined ? 0 : team.totalScore - previousScore;
        return (
          <Panel
            as="article"
            variant="compact"
            key={team.id}
            data-testid="team-score"
            className={[
              "relative overflow-hidden border-2",
              compact ? "p-3" : "",
              accent.card,
              leading ? accent.leaderGlow : accent.glow,
              delta > 0 ? "motion-score-highlight" : "",
            ].join(" ")}
          >
            <span className={["absolute inset-x-0 top-0 h-1.5", accent.stripe].join(" ")} />
            <div className="flex items-start justify-between gap-3 pt-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Score</p>
                <h3
                  className={["font-display text-xl font-bold leading-tight", accent.text].join(
                    " ",
                  )}
                >
                  {team.name}
                </h3>
              </div>
              <span
                className={[
                  "grid h-10 w-10 place-items-center rounded-2xl",
                  leading ? accent.chip : accent.softChip,
                  leading && leaderChanged ? "motion-leader-in" : "",
                ].join(" ")}
              >
                {leading ? (
                  <Crown size={20} aria-label="Leading team" />
                ) : (
                  <Trophy size={20} aria-hidden />
                )}
              </span>
            </div>
            <p
              className={[
              compact
                ? "mt-2 w-fit rounded-[18px] px-3 py-0.5 font-display text-4xl font-black tabular-nums"
                : "mt-3 w-fit rounded-[20px] px-4 py-1 font-display text-5xl font-black tabular-nums",
                accent.scoreZone,
              ].join(" ")}
            >
              <ScorePop value={team.totalScore} delta={delta} />
            </p>
          </Panel>
        );
      })}
    </section>
  );
}
