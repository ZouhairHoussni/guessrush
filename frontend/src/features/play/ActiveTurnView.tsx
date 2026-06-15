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
    <section className="mx-auto flex h-full min-h-0 max-w-3xl flex-col justify-between gap-2 py-0">
      <div className="flex flex-wrap justify-center gap-1.5">
        <TeamBadge colorKey={activeTeam?.colorKey}>{snapshot.turn?.activeTeamName}</TeamBadge>
        <span className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold text-white sm:text-sm">
          {rule.label}
        </span>
        <span className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold text-white sm:text-sm">
          {snapshot.turn?.cardsRemaining ?? 0} cards left
        </span>
        <span className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold text-white sm:text-sm">
          +{snapshot.turn?.points ?? 0} this turn
        </span>
        {skipsAllowed !== null ? (
          <span className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold text-white sm:text-sm">
            {skipsRemaining && skipsRemaining > 0 ? `${skipsRemaining} skip left` : "Skip used"}
          </span>
        ) : null}
      </div>

      <div
        className={[
          "motion-timer-ring mx-auto grid aspect-square h-[clamp(4.7rem,18dvh,6.5rem)] place-items-center rounded-full border-[6px] text-center shadow-party",
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
          className="grid h-[72%] w-[72%] place-items-center rounded-full bg-paper font-display text-[clamp(2rem,8vw,3.2rem)] font-black tabular-nums"
          aria-live="polite"
        >
          {timerLabel}
        </span>
      </div>

      <div className="min-h-0">
        <Panel variant="hero" className="w-full p-4 text-center sm:p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-blue-800 sm:text-sm">
            Current card
          </p>
          <h1 className="break-words font-display text-[clamp(2.25rem,10vw,4.8rem)] font-bold leading-[0.98]">
            <span data-testid="current-card-text">{snapshot.currentCardText ?? "Syncing..."}</span>
          </h1>
        </Panel>
      </div>

      <div className="grid grid-cols-[0.85fr_1.15fr] gap-2 sm:gap-3">
        <Button
          tone="secondary"
          fullWidth
          pending={skipPending}
          pendingLabel="Skipping..."
          disabled={skipDisabled}
          sound={false}
          onClick={onSkip}
          className="min-h-14 border-white bg-white/10 text-sm sm:min-h-16 sm:text-base"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <SkipForward size={20} aria-hidden />
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
          className="min-h-14 text-lg sm:min-h-16 sm:text-xl"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <CheckCircle2 size={22} aria-hidden />
            Got it!
          </span>
        </Button>
      </div>
      <ScoreStrip snapshot={snapshot} />
    </section>
  );
}
