import { CheckCircle2, SkipForward } from "lucide-react";
import type { RoomSnapshot } from "../../api/types";
import { useCountdownAudio } from "../../audio/useGameAudioCues";
import { ScoreStrip } from "../../components/room/ScoreStrip";
import { TeamBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { ruleForRound } from "./roundRules";
import { useCountdown } from "./useCountdown";
import { useTurnEnhancements } from "./useTurnEnhancements";

interface ActiveTurnViewProps {
  snapshot: RoomSnapshot;
  scorePending: boolean;
  skipPending: boolean;
  onScore: () => void;
  onSkip: () => void;
}

export function ActiveTurnView({
  snapshot,
  scorePending,
  skipPending,
  onScore,
  onSkip,
}: ActiveTurnViewProps) {
  const rule = ruleForRound(snapshot.room.currentRoundNumber);
  const countdown = useCountdown(
    snapshot.turn?.deadlineAt,
    snapshot.turn?.serverTime,
    snapshot.room.turnDurationSeconds,
  );
  const actionDisabled =
    scorePending || skipPending || countdown.expired || !snapshot.currentCardText;
  const skipsAllowed = snapshot.turn?.skipsAllowed ?? null;
  const activeTeam = snapshot.teams.find((team) => team.id === snapshot.turn?.activeTeamId);
  const skipsRemaining =
    skipsAllowed === null
      ? null
      : Math.max(0, skipsAllowed - (snapshot.turn?.skipsUsed ?? 0));
  const skipAvailable = snapshot.turn?.canSkip ?? true;
  const skipDisabled = actionDisabled || !skipAvailable;
  const skipLabel =
    skipsAllowed === null
      ? "Skip"
      : skipsRemaining && skipsRemaining > 0
        ? `Skip (${skipsRemaining} left)`
        : "Skip used";
  const secondsLeft = countdown.secondsLeft;
  const timerLabel = `${secondsLeft}s`;
  useTurnEnhancements(!countdown.expired, countdown.urgent);
  useCountdownAudio({
    enabled: !countdown.expired,
    secondsLeft,
    expired: countdown.expired,
    role: "player",
  });
  const timerDanger = secondsLeft <= 3;

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 py-1">
      <div className="flex flex-wrap justify-center gap-2">
        <TeamBadge colorKey={activeTeam?.colorKey}>{snapshot.turn?.activeTeamName}</TeamBadge>
        <span className="rounded-full bg-white/12 px-4 py-2 text-sm font-bold text-white">
          {rule.label}
        </span>
        <span className="rounded-full bg-white/12 px-4 py-2 text-sm font-bold text-white">
          {snapshot.turn?.cardsRemaining ?? 0} cards left
        </span>
        <span className="rounded-full bg-white/12 px-4 py-2 text-sm font-bold text-white">
          +{snapshot.turn?.points ?? 0} this turn
        </span>
        {skipsAllowed !== null ? (
          <span className="rounded-full bg-white/12 px-4 py-2 text-sm font-bold text-white">
            {skipsRemaining && skipsRemaining > 0 ? `${skipsRemaining} skip left` : "Skip used"}
          </span>
        ) : null}
      </div>

      <div
        className={[
          "motion-timer-ring mx-auto grid aspect-square h-24 place-items-center rounded-full border-[7px] text-center shadow-party sm:h-28",
          countdown.urgent
            ? "border-brand-red-500 text-ink"
            : "border-white text-brand-blue-900",
          countdown.urgent ? (timerDanger ? "motion-timer-danger" : "motion-timer-warn") : "",
        ].join(" ")}
        style={{
          background: `conic-gradient(var(--color-brand-yellow-500) ${countdown.progress * 360}deg, var(--color-brand-blue-100) 0deg)`,
        }}
        data-testid="turn-countdown"
        aria-label={`${secondsLeft} seconds left`}
      >
        <span
          className="grid h-[72%] w-[72%] place-items-center rounded-full bg-paper font-display text-5xl font-black tabular-nums"
          aria-live="polite"
        >
          {timerLabel}
        </span>
      </div>

      <div>
        <Panel variant="hero" className="w-full text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-brand-blue-800">
            Current card
          </p>
          <h1 className="break-words font-display text-5xl font-bold leading-tight sm:text-7xl">
            <span data-testid="current-card-text">{snapshot.currentCardText ?? "Syncing..."}</span>
          </h1>
        </Panel>
      </div>

      <div className="grid grid-cols-[0.85fr_1.15fr] gap-3">
        <Button
          tone="secondary"
          fullWidth
          pending={skipPending}
          pendingLabel="Skipping..."
          disabled={skipDisabled}
          sound={false}
          onClick={onSkip}
          className="min-h-16 border-white bg-white/10 text-base"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <SkipForward size={22} aria-hidden />
            {skipLabel}
          </span>
        </Button>
        <Button
          fullWidth
          pending={scorePending}
          pendingLabel="Marking correct..."
          disabled={actionDisabled}
          sound={false}
          onClick={onScore}
          className="min-h-16 text-xl"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <CheckCircle2 size={24} aria-hidden />
            Got it!
          </span>
        </Button>
      </div>
      <ScoreStrip snapshot={snapshot} />
    </section>
  );
}
