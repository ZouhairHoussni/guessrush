import { Crown, Home, RotateCcw, Sparkles } from "lucide-react";

import type { RoomSnapshot } from "../../api/types";
import { Button, LinkButton } from "../../components/ui/Button";
import { AnimatedListItem, ScorePop } from "../../components/ui/Motion";
import { Panel } from "../../components/ui/Panel";
import { teamAccent } from "../../utils/teamAccent";

interface ResultsPageProps {
  snapshot: RoomSnapshot;
  canHost: boolean;
  pending: boolean;
  onRematch: (input: { sameCards: boolean; sameTeams: boolean }) => void;
}

export function ResultsPage({ snapshot, canHost, pending, onRematch }: ResultsPageProps) {
  const results = snapshot.results;
  const winners = results?.teams.filter((team) => results.winnerTeamIds.includes(team.teamId)) ?? [];
  const winnerText =
    winners.length > 1 ? winners.map((team) => team.teamName).join(" + ") : winners[0]?.teamName;
  const winnerAccent = teamAccent(winners[0]?.colorKey ?? "yellow");

  return (
    <div className="mx-auto grid h-full min-h-0 max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-3 text-ink">
      <Panel
        variant="hero"
        className="motion-winner-reveal relative overflow-hidden p-4 text-center sm:p-5"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <span
            className={[
              "absolute left-[12%] top-10 h-1.5 w-24 -rotate-12 rounded-full opacity-70",
              "motion-winner-streak",
              winnerAccent.stripe,
            ].join(" ")}
          />
          <span
            className={[
              "absolute right-[10%] top-16 h-1.5 w-16 rotate-12 rounded-full opacity-70",
              "motion-winner-streak",
              winnerAccent.stripe,
            ].join(" ")}
          />
          <span
            className={[
              "absolute left-1/2 top-4 h-20 w-20 -translate-x-1/2 rounded-full opacity-20",
              "motion-spark",
              winnerAccent.chip,
            ].join(" ")}
          />
        </div>
        <div
          className={[
            "motion-shine-once relative mx-auto mb-2 grid h-14 w-14 place-items-center rounded-[22px] sm:h-16 sm:w-16",
            winnerAccent.chip,
          ].join(" ")}
        >
          {results?.isTie ? <Sparkles size={32} aria-hidden /> : <Crown size={32} aria-hidden />}
        </div>
        <p className="relative text-xs font-bold uppercase tracking-[0.16em] text-brand-blue-800 sm:text-sm">
          Final results
        </p>
        <h1 className="relative mt-1 font-display text-[clamp(2rem,8vw,4rem)] font-bold leading-none">
          {results?.isTie ? "It is a tie!" : `${winnerText ?? "The table"} wins!`}
        </h1>
        <p className="relative mx-auto mt-2 max-w-xl text-sm font-bold text-muted sm:text-base">
          Three rounds down. Same cards, new legends.
        </p>
      </Panel>

      <section className="min-h-0 overflow-auto pr-1">
      <div className="grid gap-2 sm:grid-cols-2">
        {(results?.teams ?? snapshot.teams).map((team, index) => {
          const teamId = "teamId" in team ? team.teamId : team.id;
          const teamName = "teamName" in team ? team.teamName : team.name;
          const colorKey = "colorKey" in team ? team.colorKey : "blue";
          const totalScore = team.totalScore;
          const winner = results?.winnerTeamIds.includes(teamId) ?? false;
          const accent = teamAccent(colorKey);
          return (
            <AnimatedListItem key={teamId} index={index}>
              <article
                data-testid="result-team"
                className={[
                  "relative overflow-hidden rounded-[22px] border-2 p-3 sm:p-4",
                  accent.card,
                  winner ? `${accent.leaderGlow} motion-score-highlight` : accent.glow,
                ].join(" ")}
              >
                <span className={["absolute inset-x-0 top-0 h-2", accent.stripe].join(" ")} />
                <div className="flex items-center justify-between gap-3">
                  <h2 className={["font-display text-2xl font-bold sm:text-3xl", accent.text].join(" ")}>
                    {teamName}
                  </h2>
                  {winner ? (
                    <span
                      className={[
                        "motion-leader-in rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]",
                        accent.chip,
                      ].join(" ")}
                    >
                      Winner
                    </span>
                  ) : null}
                </div>
                <p
                  className={[
                    "mt-2 w-fit rounded-[20px] px-4 py-0.5 font-display text-5xl font-bold tabular-nums sm:text-6xl",
                    accent.scoreZone,
                  ].join(" ")}
                >
                  <ScorePop value={totalScore} animate />
                </p>
              </article>
            </AnimatedListItem>
          );
        })}
      </div>
      </section>

      <Panel variant="soft" className="grid gap-2 p-3 sm:grid-cols-[1fr_1fr_auto] sm:p-4">
        {canHost ? (
          <>
            <Button
              pending={pending}
              pendingLabel="Starting rematch..."
              onClick={() => onRematch({ sameCards: true, sameTeams: true })}
            >
              <RotateCcw size={18} aria-hidden />
              Rematch
            </Button>
            <Button
              tone="secondary"
              pending={pending}
              pendingLabel="Shuffling teams..."
              onClick={() => onRematch({ sameCards: true, sameTeams: false })}
            >
              Rematch, shuffle teams
            </Button>
          </>
        ) : (
          <p className="rounded-[18px] bg-paper px-4 py-2 text-center font-bold text-brand-blue-900 sm:col-span-2">
            Waiting for the host to choose the next game.
          </p>
        )}
        <LinkButton to="/" tone="secondaryOnLight">
          <span className="inline-flex items-center gap-2">
            <Home size={18} aria-hidden />
            Home
          </span>
        </LinkButton>
      </Panel>

      {results ? (
        <Panel variant="default" className="grid gap-2 bg-brand-blue-100 p-3 sm:grid-cols-3">
          <article className="rounded-[18px] bg-paper p-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-blue-800">
              Card magnet
            </p>
            <p className="mt-1 font-display text-lg font-bold sm:text-xl">
              {results.mostCardsGuessed
                ? `${results.mostCardsGuessed.memberName}: ${results.mostCardsGuessed.value}`
                : "No cards"}
            </p>
          </article>
          <article className="rounded-[18px] bg-paper p-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-blue-800">
              Best turn
            </p>
            <p className="mt-1 font-display text-lg font-bold sm:text-xl">
              {results.bestTurn
                ? `${results.bestTurn.memberName}: ${results.bestTurn.points}`
                : "No turn"}
            </p>
          </article>
          <article className="rounded-[18px] bg-paper p-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-blue-800">
              Closest round
            </p>
            <p className="mt-1 font-display text-lg font-bold sm:text-xl">
              {results.closestRound
                ? `Round ${results.closestRound.roundNumber}, ${results.closestRound.spread} apart`
                : "No round"}
            </p>
          </article>
        </Panel>
      ) : null}
    </div>
  );
}
