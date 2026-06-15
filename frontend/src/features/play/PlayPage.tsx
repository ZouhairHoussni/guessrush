import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import {
  advanceRound,
  confirmCurrentTurn,
  rematchRoom,
  scoreCurrentCard,
  skipCurrentCard,
  startCurrentTurn,
  startRound,
  undoLastCorrect,
} from "../../api/http";
import { getHostToken, getPlayerToken } from "../../api/storage";
import type { RoomSnapshot } from "../../api/types";
import { useGameAudioCues } from "../../audio/useGameAudioCues";
import { RoleBadge } from "../../components/ui/Badge";
import { LinkButton } from "../../components/ui/Button";
import { ConnectionNotice } from "../../components/ui/ConnectionBadge";
import { InlineError } from "../../components/ui/InlineError";
import { MotionPage } from "../../components/ui/Motion";
import { PageShell } from "../../components/ui/PageShell";
import { Panel } from "../../components/ui/Panel";
import { TopBar } from "../../components/ui/TopBar";
import { useRoomSnapshot } from "../../hooks/useRoomSnapshot";
import { ResultsPage } from "../results/ResultsPage";
import { ActiveTurnView } from "./ActiveTurnView";
import { RoundIntroView } from "./RoundIntroView";
import { RoundSummaryView } from "./RoundSummaryView";
import { SpectatorTurnView } from "./SpectatorTurnView";
import { TurnReadyView } from "./TurnReadyView";
import { TurnRecapView } from "./TurnRecapView";

function isActivePlayer(snapshot: RoomSnapshot): boolean {
  return Boolean(
    snapshot.viewer === "PLAYER" &&
      snapshot.currentMemberId &&
      snapshot.turn &&
      snapshot.currentMemberId === snapshot.turn.activeMemberId,
  );
}

function expiryRefetchDelay(deadlineAt: string, serverTime: string): number {
  const serverOffset = Date.parse(serverTime) - Date.now();
  return Math.max(250, Date.parse(deadlineAt) - (Date.now() + serverOffset) + 350);
}

export function PlayPage() {
  const { code } = useParams();
  const hostToken = code ? getHostToken(code) : null;
  const playerToken = code ? getPlayerToken(code) : null;
  const snapshotHostToken = playerToken ? null : hostToken;
  const snapshotPlayerToken = playerToken;
  const room = useRoomSnapshot({
    code,
    hostToken: snapshotHostToken,
    playerToken: snapshotPlayerToken,
    enabled: Boolean(code),
  });
  const snapshot = room.data;
  const canHost = Boolean(hostToken);
  const active = snapshot ? isActivePlayer(snapshot) : false;
  const hostOnlyView = Boolean(hostToken && !playerToken);
  const logoTarget = code
    ? hostToken && !playerToken
      ? `/room/${code}/host`
      : `/room/${code}/lobby`
    : "/";

  const beginRoundMutation = useMutation({
    mutationFn: () => startRound(code!, hostToken!),
    onSuccess: () => room.refetch(),
  });
  const startTurnMutation = useMutation({
    mutationFn: () => startCurrentTurn(code!, playerToken!),
    onSuccess: () => room.refetch(),
  });
  const scoreMutation = useMutation({
    mutationFn: () => scoreCurrentCard(code!, playerToken!),
    onSuccess: () => room.refetch(),
  });
  const skipMutation = useMutation({
    mutationFn: () => skipCurrentCard(code!, playerToken!),
    onSuccess: () => room.refetch(),
  });
  const confirmMutation = useMutation({
    mutationFn: () =>
      confirmCurrentTurn(code!, playerToken ? { playerToken } : { hostToken: hostToken! }),
    onSuccess: () => room.refetch(),
  });
  const undoMutation = useMutation({
    mutationFn: () => undoLastCorrect(code!, playerToken ? { playerToken } : { hostToken }),
    onSuccess: () => room.refetch(),
  });
  const advanceRoundMutation = useMutation({
    mutationFn: () => advanceRound(code!, hostToken!),
    onSuccess: () => room.refetch(),
  });
  const rematchMutation = useMutation({
    mutationFn: (input: { sameCards: boolean; sameTeams: boolean }) =>
      rematchRoom(code!, hostToken!, input),
    onSuccess: () => room.refetch(),
  });
  const refetchRoom = room.refetch;

  useGameAudioCues(snapshot, {
    activePlayer: active,
    hostView: hostOnlyView,
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
    <PageShell fullHeight>
      <div className="flex h-full min-h-0 flex-col gap-3">
        <TopBar
          code={code}
          role={<RoleBadge>{canHost && !playerToken ? "Host" : "Player"}</RoleBadge>}
          connectionStatus={room.connectionStatus}
          logoTo={logoTarget}
        />
        <ConnectionNotice status={room.connectionStatus} />

        {room.isLoading ? (
          <Panel variant="soft" className="font-bold">Loading game...</Panel>
        ) : null}
        <InlineError message={room.error instanceof Error ? room.error.message : null} />
        <InlineError
          message={
            beginRoundMutation.error instanceof Error ? beginRoundMutation.error.message : null
          }
        />
        <InlineError
          message={startTurnMutation.error instanceof Error ? startTurnMutation.error.message : null}
        />
        <InlineError message={scoreMutation.error instanceof Error ? scoreMutation.error.message : null} />
        <InlineError message={skipMutation.error instanceof Error ? skipMutation.error.message : null} />
        <InlineError
          message={confirmMutation.error instanceof Error ? confirmMutation.error.message : null}
        />
        <InlineError message={undoMutation.error instanceof Error ? undoMutation.error.message : null} />
        <InlineError
          message={
            advanceRoundMutation.error instanceof Error ? advanceRoundMutation.error.message : null
          }
        />
        <InlineError
          message={rematchMutation.error instanceof Error ? rematchMutation.error.message : null}
        />

        <div className="min-h-0 flex-1 overflow-hidden">
        {snapshot?.room.phase === "ROUND_INTRO" ? (
          <MotionPage motionKey={`round-intro-${snapshot.room.currentRoundNumber}`} className="h-full min-h-0">
            <RoundIntroView
              snapshot={snapshot}
              canHost={canHost}
              pending={beginRoundMutation.isPending}
              onBeginRound={() => beginRoundMutation.mutate()}
            />
          </MotionPage>
        ) : null}

        {snapshot?.room.phase === "TURN_READY" ? (
          <MotionPage motionKey={`turn-ready-${snapshot.turn?.id ?? "syncing"}`} className="h-full min-h-0">
            <TurnReadyView
              snapshot={snapshot}
              isActivePlayer={active}
              pending={startTurnMutation.isPending}
              onStartTurn={() => startTurnMutation.mutate()}
            />
          </MotionPage>
        ) : null}

        {snapshot?.room.phase === "TURN_LIVE" && active ? (
          <MotionPage motionKey={`turn-live-${snapshot.turn?.id ?? "syncing"}`} className="h-full min-h-0">
            <ActiveTurnView
              snapshot={snapshot}
              scorePending={scoreMutation.isPending}
              skipPending={skipMutation.isPending}
              onScore={() => scoreMutation.mutate()}
              onSkip={() => skipMutation.mutate()}
            />
          </MotionPage>
        ) : null}

        {snapshot?.room.phase === "TURN_LIVE" && !active ? (
          <MotionPage motionKey={`spectator-live-${snapshot.turn?.id ?? "syncing"}`} className="h-full min-h-0 overflow-auto">
            <SpectatorTurnView snapshot={snapshot} />
          </MotionPage>
        ) : null}

        {snapshot?.room.phase === "TURN_RECAP" ? (
          <MotionPage motionKey={`turn-recap-${snapshot.turn?.id ?? "syncing"}`} className="h-full min-h-0">
            <TurnRecapView
              snapshot={snapshot}
              canConfirm={canHost || active}
              canUndo={canHost || active}
              pending={confirmMutation.isPending}
              undoPending={undoMutation.isPending}
              onConfirm={() => confirmMutation.mutate()}
              onUndo={() => undoMutation.mutate()}
            />
          </MotionPage>
        ) : null}

        {snapshot?.room.phase === "ROUND_SUMMARY" ? (
          <MotionPage motionKey={`round-summary-${snapshot.room.currentRoundNumber}`} className="h-full min-h-0">
            <RoundSummaryView
              snapshot={snapshot}
              canHost={canHost}
              pending={advanceRoundMutation.isPending}
              onAdvance={() => advanceRoundMutation.mutate()}
            />
          </MotionPage>
        ) : null}

        {snapshot?.room.phase === "FINISHED" ? (
          <MotionPage motionKey="finished-results" className="h-full min-h-0">
            <ResultsPage
              snapshot={snapshot}
              canHost={canHost}
              pending={rematchMutation.isPending}
              onRematch={(input) => rematchMutation.mutate(input)}
            />
          </MotionPage>
        ) : null}

        {snapshot?.room.phase === "CANCELLED" ? (
          <Panel className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-4xl font-bold">Room ended</h1>
            <p className="mt-2 font-bold text-muted">The host closed this game room.</p>
            <LinkButton to="/" className="mx-auto mt-5 max-w-sm" fullWidth>
              Home
            </LinkButton>
          </Panel>
        ) : null}

        {snapshot &&
        ![
          "ROUND_INTRO",
          "TURN_READY",
          "TURN_LIVE",
          "TURN_RECAP",
          "ROUND_SUMMARY",
          "FINISHED",
          "CANCELLED",
        ].includes(snapshot.room.phase) ? (
          <Panel className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-4xl font-bold">Game has not started yet</h1>
            <p className="mt-2 font-bold text-muted">Finish setup in the lobby first.</p>
            <LinkButton
              to={code ? `/room/${code}/lobby` : "/join"}
              className="mx-auto mt-5 max-w-sm"
              fullWidth
            >
              Back to lobby
            </LinkButton>
          </Panel>
        ) : null}
        </div>
      </div>
    </PageShell>
  );
}
