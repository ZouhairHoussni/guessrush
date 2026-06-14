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
    <div className="mx-auto grid max-w-5xl gap-4 pb-8 text-ink">
      <Panel variant="hero" className="motion-winner-reveal relative overflow-hidden text-center">
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
              "absolute left-1/2 top-6 h-28 w-28 -translate-x-1/2 rounded-full opacity-20",
              "motion-spark",
              winnerAccent.chip,
            ].join(" ")}
          />
        </div>
        <div
          className={[
            "motion-shine-once relative mx-auto mb-4 grid h-20 w-20 place-items-center rounded-[28px]",
            winnerAccent.chip,
          ].join(" ")}
        >
          {results?.isTie ? <Sparkles size={42} aria-hidden /> : <Crown size={42} aria-hidden />}
        </div>
        <p className="relative font-bold uppercase tracking-[0.16em] text-brand-blue-800">
          Final results
        </p>
        <h1 className="relative mt-2 font-display text-4xl font-bold sm:text-6xl">
          {results?.isTie ? "It is a tie!" : `${winnerText ?? "The table"} wins!`}
        </h1>
        <p className="relative mx-auto mt-3 max-w-xl text-lg font-bold text-muted">
          Three rounds down. Same cards, new legends.
        </p>
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2">
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
                  "relative overflow-hidden rounded-[26px] border-4 p-5",
                  accent.card,
                  winner ? `${accent.leaderGlow} motion-score-highlight` : accent.glow,
                ].join(" ")}
              >
                <span className={["absolute inset-x-0 top-0 h-2", accent.stripe].join(" ")} />
                <div className="flex items-center justify-between gap-3">
                  <h2 className={["font-display text-3xl font-bold", accent.text].join(" ")}>
                    {teamName}
                  </h2>
                  {winner ? (
                    <span
                      className={[
                        "motion-leader-in rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.12em]",
                        accent.chip,
                      ].join(" ")}
                    >
                      Winner
                    </span>
                  ) : null}
                </div>
                <p
                  className={[
                    "mt-4 w-fit rounded-[24px] px-4 py-1 font-display text-7xl font-bold tabular-nums",
                    accent.scoreZone,
                  ].join(" ")}
                >
                  <ScorePop value={totalScore} animate />
                </p>
              </article>
            </AnimatedListItem>
          );
        })}
      </section>

      {results ? (
        <Panel variant="default" className="grid gap-3 bg-brand-blue-100 sm:grid-cols-3">
          <article className="rounded-[22px] bg-paper p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-blue-800">
              Card magnet
            </p>
            <p className="mt-2 font-display text-2xl font-bold">
              {results.mostCardsGuessed
                ? `${results.mostCardsGuessed.memberName}: ${results.mostCardsGuessed.value}`
                : "No cards"}
            </p>
          </article>
          <article className="rounded-[22px] bg-paper p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-blue-800">
              Best turn
            </p>
            <p className="mt-2 font-display text-2xl font-bold">
              {results.bestTurn
                ? `${results.bestTurn.memberName}: ${results.bestTurn.points}`
                : "No turn"}
            </p>
          </article>
          <article className="rounded-[22px] bg-paper p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-blue-800">
              Closest round
            </p>
            <p className="mt-2 font-display text-2xl font-bold">
              {results.closestRound
                ? `Round ${results.closestRound.roundNumber}, ${results.closestRound.spread} apart`
                : "No round"}
            </p>
          </article>
        </Panel>
      ) : null}

      <Panel variant="soft" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        {canHost ? (
          <>
            <Button
              pending={pending}
              pendingLabel="Starting rematch..."
              onClick={() => onRematch({ sameCards: true, sameTeams: true })}
            >
              <RotateCcw size={20} aria-hidden />
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
          <p className="rounded-[20px] bg-paper px-4 py-3 text-center font-bold text-brand-blue-900 sm:col-span-2">
            Waiting for the host to choose the next game.
          </p>
        )}
        <LinkButton to="/" tone="secondaryOnLight">
          <span className="inline-flex items-center gap-2">
            <Home size={20} aria-hidden />
            Home
          </span>
        </LinkButton>
      </Panel>
    </div>
  );
}
