import { MonitorPlay, Timer } from "lucide-react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

import { useCountdownAudio, useGameAudioCues } from "../../audio/useGameAudioCues";
import { ScoreBoard } from "../../components/room/ScoreBoard";
import { RoleBadge } from "../../components/ui/Badge";
import { ConnectionNotice } from "../../components/ui/ConnectionBadge";
import { InlineError } from "../../components/ui/InlineError";
import { PageShell } from "../../components/ui/PageShell";
import { Panel } from "../../components/ui/Panel";
import { TopBar } from "../../components/ui/TopBar";
import { useRoomSnapshot } from "../../hooks/useRoomSnapshot";
import { ruleForRound } from "../play/roundRules";
import { useCountdown } from "../play/useCountdown";
import { ResultsPage } from "../results/ResultsPage";

function expiryRefetchDelay(deadlineAt: string, serverTime: string): number {
  const serverOffset = Date.parse(serverTime) - Date.now();
  return Math.max(250, Date.parse(deadlineAt) - (Date.now() + serverOffset) + 350);
}

export function SharedDisplayPage() {
  const { code } = useParams();
  const room = useRoomSnapshot({ code, enabled: Boolean(code) });
  const snapshot = room.data;
  const rule = ruleForRound(snapshot?.room.currentRoundNumber ?? 1);
  const countdown = useCountdown(
    snapshot?.turn?.deadlineAt,
    snapshot?.turn?.serverTime,
    snapshot?.room.turnDurationSeconds ?? 30,
  );
  const refetchRoom = room.refetch;
  useGameAudioCues(snapshot, { publicDisplay: true });
  useCountdownAudio({
    enabled: snapshot?.room.phase === "TURN_LIVE" && !countdown.expired,
    secondsLeft: countdown.secondsLeft,
    expired: countdown.expired,
    role: "display",
  });

  useEffect(() => {
    if (snapshot?.room.phase !== "TURN_LIVE" || !snapshot.turn?.deadlineAt) {
      return undefined;
    }
    const delay = expiryRefetchDelay(snapshot.turn.deadlineAt, snapshot.turn.serverTime);
    const timeout = window.setTimeout(() => {
      void refetchRoom();
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [refetchRoom, snapshot?.room.phase, snapshot?.turn?.deadlineAt, snapshot?.turn?.serverTime]);

  return (
    <PageShell>
      <div className="space-y-5 pb-8">
        <TopBar
          code={code}
          role={<RoleBadge>Display</RoleBadge>}
          connectionStatus={room.connectionStatus}
          logoTo="/"
        />
        <ConnectionNotice status={room.connectionStatus} />

        {room.isLoading ? (
          <Panel variant="soft" className="font-bold">
            Loading shared display...
          </Panel>
        ) : null}
        <InlineError message={room.error instanceof Error ? room.error.message : null} />

        {snapshot?.room.phase === "FINISHED" ? (
          <ResultsPage
            snapshot={snapshot}
            canHost={false}
            pending={false}
            onRematch={() => undefined}
          />
        ) : null}

        {snapshot?.room.phase === "CANCELLED" ? (
          <Panel variant="hero" className="text-center">
            <h1 className="font-display text-5xl font-bold">Room ended</h1>
            <p className="mx-auto mt-3 max-w-xl text-lg font-bold text-muted">
              The host closed this game room.
            </p>
          </Panel>
        ) : null}

        {snapshot && !["FINISHED", "CANCELLED"].includes(snapshot.room.phase) ? (
          <>
            <Panel variant="hero" className="text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[24px] bg-brand-yellow-500">
                {snapshot.room.phase === "TURN_LIVE" ? (
                  <Timer size={34} aria-hidden />
                ) : (
                  <MonitorPlay size={34} aria-hidden />
                )}
              </div>
              <p className="font-bold uppercase tracking-[0.16em] text-brand-blue-800">
                Round {snapshot.room.currentRoundNumber || 1} - {rule.label}
              </p>
              <h1 className="mx-auto mt-2 max-w-4xl font-display text-5xl font-bold sm:text-7xl">
                {snapshot.turn
                  ? `${snapshot.turn.activeMemberName} for ${snapshot.turn.activeTeamName}`
                  : "Waiting for the room"}
              </h1>
              {snapshot.room.phase === "TURN_LIVE" ? (
                <div className="mt-5 grid gap-2">
                  <p
                    className={[
                      "motion-timer-ring mx-auto w-fit rounded-full px-8 py-4 font-display text-7xl font-black tabular-nums",
                      countdown.urgent
                        ? "bg-brand-yellow-500 text-ink"
                        : "bg-brand-blue-100 text-brand-blue-900",
                      countdown.urgent
                        ? countdown.secondsLeft <= 3
                          ? "motion-timer-danger"
                          : "motion-timer-warn"
                        : "",
                    ].join(" ")}
                  >
                    {countdown.secondsLeft}s
                  </p>
                  <p className="font-bold uppercase tracking-[0.14em] text-muted">
                    {snapshot.turn?.cardsRemaining ?? 0} cards left - card stays private
                  </p>
                </div>
              ) : (
                <p className="mx-auto mt-4 max-w-xl text-lg font-bold text-muted">
                  The shared display never shows live card text.
                </p>
              )}
            </Panel>
            <ScoreBoard snapshot={snapshot} />
          </>
        ) : null}
      </div>
    </PageShell>
  );
}
