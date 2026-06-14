import { CheckCircle2, LogOut, PencilLine, Play, UserRound } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { leaveRoom, toggleReady } from "../../api/http";
import { getPlayerToken, removePlayerToken } from "../../api/storage";
import { useSound } from "../../audio/useSound";
import { TeamBoard } from "../../components/room/TeamBoard";
import { AppLogo } from "../../components/ui/AppLogo";
import { CardStatusBadge, ReadyBadge, RoleBadge, TeamBadge } from "../../components/ui/Badge";
import { BottomActionBar } from "../../components/ui/BottomActionBar";
import { Button, LinkButton } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ConnectionNotice } from "../../components/ui/ConnectionBadge";
import { InlineError } from "../../components/ui/InlineError";
import { PageShell } from "../../components/ui/PageShell";
import { Panel } from "../../components/ui/Panel";
import { TopBar } from "../../components/ui/TopBar";
import { useRoomSnapshot } from "../../hooks/useRoomSnapshot";
import { usePreviousValue } from "../../hooks/usePreviousValue";
import { isGameplayPhase, isSetupPhase } from "../../utils/phaseRouting";

export function PlayerLobbyPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const playerToken = code ? getPlayerToken(code) : null;
  const room = useRoomSnapshot({ code, playerToken, enabled: Boolean(code && playerToken) });
  const snapshot = room.data;
  const me = snapshot?.members.find((member) => member.id === snapshot.currentMemberId);
  const myTeam = snapshot?.teams.find((team) => team.id === me?.teamId);
  const setupPhase = snapshot ? isSetupPhase(snapshot.room.phase) : true;
  const previousReady = usePreviousValue(me?.ready);
  const { playSound } = useSound();
  const readyMutation = useMutation({
    mutationFn: () => toggleReady(code!, playerToken!, !(me?.ready ?? false)),
    onSuccess: () => room.refetch(),
  });
  const leaveMutation = useMutation({
    mutationFn: () => leaveRoom(code!, playerToken!),
    onSuccess: () => {
      removePlayerToken(code!);
      navigate(`/join/${code}`);
    },
  });

  useEffect(() => {
    if (code && snapshot && isGameplayPhase(snapshot.room.phase)) {
      navigate(`/room/${code}/play`, { replace: true });
    }
  }, [code, navigate, snapshot]);

  useEffect(() => {
    if (previousReady === undefined || me?.ready === undefined || previousReady === me.ready) {
      return;
    }
    playSound(me.ready ? "ready_on" : "ready_off", { role: "player" });
  }, [me?.ready, playSound, previousReady]);

  if (!code || !playerToken) {
    return (
      <PageShell narrow>
        <div className="space-y-6">
          <AppLogo compact />
          <Panel>
            <h1 className="font-display text-3xl font-bold">Join token not found</h1>
            <p className="mt-2 font-semibold text-muted">Join again on this device to recover your seat.</p>
            <LinkButton to={code ? `/join/${code}` : "/join"} className="mt-5" fullWidth>
              Join room
            </LinkButton>
          </Panel>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-5 pb-8">
        <TopBar
          code={code}
          role={<RoleBadge>Player</RoleBadge>}
          connectionStatus={room.connectionStatus}
          logoTo={code ? `/room/${code}/lobby` : "/"}
        />
        <ConnectionNotice status={room.connectionStatus} />

        {room.isLoading ? (
          <Panel variant="soft" className="font-bold">Loading your lobby...</Panel>
        ) : null}
        <InlineError message={room.error instanceof Error ? room.error.message : null} />

        {snapshot && me ? (
          <>
            <Panel variant="hero">
              <div className="flex items-start gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-brand-yellow-500">
                  <UserRound aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-blue-800">
                    You joined
                  </p>
                  <h1 className="font-display text-4xl font-bold">{me.displayName}</h1>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {myTeam ? <TeamBadge>{myTeam.name}</TeamBadge> : null}
                    <ReadyBadge ready={me.ready} />
                    {snapshot.room.deckMode === "PERSONAL_CARDS" ? (
                      <CardStatusBadge submitted={me.cardsSubmitted} />
                    ) : null}
                  </div>
                </div>
              </div>
            </Panel>

            {snapshot.room.phase === "CANCELLED" ? (
              <Panel>
                <p className="font-bold uppercase tracking-[0.14em] text-brand-blue-800">
                  Room ended
                </p>
                <h2 className="font-display text-3xl font-bold">The host closed this room</h2>
                <p className="mt-1 font-bold text-muted">Start fresh when your group is ready.</p>
                <LinkButton to="/" className="mt-5" fullWidth>
                  Home
                </LinkButton>
              </Panel>
            ) : setupPhase ? (
              <Panel
                variant="soft"
                className={previousReady === undefined ? "" : me.ready ? "motion-ready-on" : "motion-ready-off"}
              >
                <div className="mb-3 flex items-center gap-3">
                  <CheckCircle2 className="text-brand-yellow-500" aria-hidden />
                  <div>
                    <h2 className="font-display text-2xl font-bold">
                      {me.ready ? "You are ready" : "Ready check"}
                    </h2>
                    <p className="text-sm font-semibold text-white/78">
                      The host starts once everyone is ready.
                    </p>
                  </div>
                </div>
                {snapshot.room.deckMode === "PERSONAL_CARDS" && !me.cardsSubmitted ? (
                  <LinkButton
                    to={`/room/${code}/cards`}
                    fullWidth
                  >
                    <PencilLine size={18} aria-hidden />
                    Add secret cards
                  </LinkButton>
                ) : (
                  <BottomActionBar
                    secondary={
                      <Button tone="secondary" onClick={() => setConfirmLeaveOpen(true)}>
                        <LogOut size={18} aria-hidden />
                        Leave
                      </Button>
                    }
                    primary={
                      <Button
                        fullWidth
                        pending={readyMutation.isPending}
                        pendingLabel={me.ready ? "Updating..." : "Marking ready..."}
                        sound={false}
                        onClick={() => readyMutation.mutate()}
                      >
                        {me.ready ? "Not ready" : "I'm ready"}
                      </Button>
                    }
                  />
                )}
                <InlineError
                  message={readyMutation.error instanceof Error ? readyMutation.error.message : null}
                />
                <InlineError
                  message={leaveMutation.error instanceof Error ? leaveMutation.error.message : null}
                />
                <p className="mt-3 rounded-2xl bg-white/12 px-4 py-3 text-sm font-bold text-white">
                  {snapshot.room.deckMode === "PERSONAL_CARDS"
                    ? `${snapshot.deckStatus.submittedPlayerCount}/${snapshot.deckStatus.totalPlayerCount} players submitted cards.`
                    : `${snapshot.deckStatus.totalCardCount} Quick Play cards are ready.`}
                </p>
              </Panel>
            ) : (
              <Panel>
                <p className="font-bold uppercase tracking-[0.14em] text-brand-blue-800">
                  Game in progress
                </p>
                <h2 className="font-display text-3xl font-bold">Head to the play view</h2>
                <p className="mt-1 font-bold text-muted">
                  Phase: {snapshot.room.phase.replaceAll("_", " ")}
                </p>
                <LinkButton
                  to={`/room/${code}/play`}
                  className="mt-5"
                  fullWidth
                >
                  <Play size={18} aria-hidden />
                  Open play view
                </LinkButton>
              </Panel>
            )}

            {setupPhase ? (
              <details className="rounded-[24px] border border-white/14 bg-white/10 p-4">
                <summary className="cursor-pointer font-display text-xl font-bold text-white">
                  Teams and ready status
                </summary>
                <div className="mt-3">
                  <TeamBoard snapshot={snapshot} compact />
                </div>
              </details>
            ) : (
              <TeamBoard snapshot={snapshot} compact />
            )}
            <ConfirmDialog
              open={confirmLeaveOpen}
              title="Leave this room?"
              body="Your seat and any unstarted personal cards will be removed from the lobby."
              confirmLabel="Leave room"
              pendingLabel="Leaving..."
              pending={leaveMutation.isPending}
              onCancel={() => setConfirmLeaveOpen(false)}
              onConfirm={() => leaveMutation.mutate()}
            />
          </>
        ) : null}
      </div>
    </PageShell>
  );
}
