import { useState } from "react";
import { MonitorPlay, Play, Shuffle, UsersRound } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { cancelRoom, patchTeams, shuffleTeams, startGame } from "../../api/http";
import { getHostToken, removeHostToken } from "../../api/storage";
import type { MemberSnapshot, RoomSnapshot } from "../../api/types";
import { TeamBoard } from "../../components/room/TeamBoard";
import { AppLogo } from "../../components/ui/AppLogo";
import { ReadyBadge, RoleBadge } from "../../components/ui/Badge";
import { BottomActionBar } from "../../components/ui/BottomActionBar";
import { Button, LinkButton } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ConnectionNotice } from "../../components/ui/ConnectionBadge";
import { InlineError } from "../../components/ui/InlineError";
import { PageShell } from "../../components/ui/PageShell";
import { Panel } from "../../components/ui/Panel";
import { TopBar } from "../../components/ui/TopBar";
import { useRoomSnapshot } from "../../hooks/useRoomSnapshot";
import { HostInvitePanel } from "./HostInvitePanel";

function HostTeamEditor({
  snapshot,
  onMove,
  pending,
}: {
  snapshot: RoomSnapshot;
  onMove: (member: MemberSnapshot, teamId: string) => void;
  pending: boolean;
}) {
  if (snapshot.members.length === 0) {
    return null;
  }
  return (
    <Panel variant="soft">
      <h2 className="font-display text-2xl font-bold">Arrange teams</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {snapshot.members.map((member) => (
          <div
            key={member.id}
            className="grid gap-3 rounded-[20px] bg-paper p-3 text-ink sm:grid-cols-[1fr_auto]"
          >
            <div>
              <p className="font-display text-xl font-bold">{member.displayName}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <ReadyBadge ready={member.ready} compact />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {snapshot.teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  disabled={pending || member.teamId === team.id}
                  onClick={() => onMove(member, team.id)}
                  className={[
                    "min-h-11 rounded-2xl px-3 py-2 text-xs font-bold",
                    member.teamId === team.id
                      ? "bg-brand-yellow-500 text-ink"
                      : "bg-soft text-brand-blue-900",
                  ].join(" ")}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function formatTeamAnnouncement(snapshot: RoomSnapshot): string {
  return snapshot.teams
    .map((team) => {
      const names = team.members.map((member) => member.displayName).join(", ");
      return `${team.name}: ${names || "empty"}`;
    })
    .join(". ");
}

export function HostLobbyPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [teamAnnouncement, setTeamAnnouncement] = useState<string | null>(null);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const hostToken = code ? getHostToken(code) : null;
  const room = useRoomSnapshot({ code, hostToken, enabled: Boolean(code && hostToken) });
  const shuffleMutation = useMutation({
    mutationFn: () => shuffleTeams(code!, hostToken!),
    onSuccess: async (snapshot) => {
      const refreshed = await room.refetch();
      setTeamAnnouncement(`New teams: ${formatTeamAnnouncement(refreshed.data ?? snapshot)}.`);
    },
  });
  const moveMutation = useMutation({
    mutationFn: ({ memberId, teamId }: { memberId: string; teamId: string }) =>
      patchTeams(code!, hostToken!, { assignments: [{ memberId, teamId }] }),
    onSuccess: () => {
      setTeamAnnouncement(null);
      void room.refetch();
    },
  });
  const startMutation = useMutation({
    mutationFn: () => startGame(code!, hostToken!),
    onSuccess: () => {
      void room.refetch();
      navigate(`/room/${code}/play`);
    },
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancelRoom(code!, hostToken!),
    onSuccess: () => {
      removeHostToken(code!);
      navigate("/");
    },
  });

  if (!code || !hostToken) {
    return (
      <PageShell narrow>
        <div className="space-y-6">
          <AppLogo compact />
          <Panel>
            <h1 className="font-display text-3xl font-bold">Host access is not on this device</h1>
            <p className="mt-2 font-semibold text-muted">
              Create a new room here, or return to the original host browser.
            </p>
            <LinkButton to="/create" className="mt-5" fullWidth>
              Create a game
            </LinkButton>
          </Panel>
        </div>
      </PageShell>
    );
  }

  const snapshot = room.data;
  const setupPhase = snapshot
    ? ["LOBBY", "CARD_SUBMISSION", "READY_CHECK"].includes(snapshot.room.phase)
    : true;

  return (
    <PageShell>
      <div className="space-y-5 pb-8">
        <TopBar
          code={code}
          role={<RoleBadge>Host</RoleBadge>}
          connectionStatus={room.connectionStatus}
          logoTo={`/room/${code}/host`}
        />
        <ConnectionNotice status={room.connectionStatus} />

        {room.isLoading ? (
          <Panel variant="soft" className="font-bold">Loading room...</Panel>
        ) : null}
        <InlineError message={room.error instanceof Error ? room.error.message : null} />

        {snapshot ? (
          <>
            {setupPhase ? <HostInvitePanel snapshot={snapshot} /> : null}

            {snapshot.room.phase === "CANCELLED" ? (
              <Panel>
                <p className="font-bold uppercase tracking-[0.14em] text-brand-blue-800">
                  Room ended
                </p>
                <h1 className="font-display text-4xl font-bold">This room is closed</h1>
                <p className="mt-1 font-bold text-muted">Create a new room when your group is ready.</p>
                <LinkButton to="/create" className="mt-5" fullWidth>
                  Create a new game
                </LinkButton>
              </Panel>
            ) : setupPhase ? (
              <Panel variant="soft" className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/14 text-white">
                    <UsersRound aria-hidden />
                  </span>
                  <div>
                    <h2 className="font-display text-2xl font-bold">Lobby</h2>
                    <p className="text-sm font-semibold text-white/78">
                      {snapshot.members.length} players joined.{" "}
                      {snapshot.room.deckMode === "PERSONAL_CARDS"
                        ? `${snapshot.deckStatus.submittedPlayerCount}/${snapshot.deckStatus.totalPlayerCount} submitted cards`
                      : `${snapshot.deckStatus.totalCardCount} Quick Play cards available`}
                    </p>
                  </div>
                </div>
                <details className="rounded-2xl border border-white/16 bg-white/8 px-4 py-3">
                  <summary className="cursor-pointer text-sm font-bold text-white">Host tools</summary>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <Button
                      tone="secondary"
                      pending={shuffleMutation.isPending}
                      pendingLabel="Shuffling..."
                      disabled={snapshot.members.length < 2}
                      onClick={() => shuffleMutation.mutate()}
                      className="min-h-10 py-2"
                    >
                      <Shuffle size={18} aria-hidden />
                      Shuffle teams
                    </Button>
                    <LinkButton
                      tone="secondary"
                      to={`/room/${code}/display`}
                      className="min-h-10 py-2"
                    >
                      <MonitorPlay size={18} aria-hidden />
                      Open display
                    </LinkButton>
                    <Button
                      tone="ghost"
                      onClick={() => setConfirmEndOpen(true)}
                      className="min-h-10 py-2"
                    >
                      End room
                    </Button>
                  </div>
                </details>
              </Panel>
            ) : (
              <Panel className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-bold uppercase tracking-[0.14em] text-brand-blue-800">
                    Game in progress
                  </p>
                  <h1 className="font-display text-4xl font-bold">Round controls are live</h1>
                  <p className="mt-1 font-bold text-muted">
                    Phase: {snapshot.room.phase.replaceAll("_", " ")}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <LinkButton
                    to={`/room/${code}/play`}
                  >
                    <Play size={18} aria-hidden />
                    Open play view
                  </LinkButton>
                  <LinkButton
                    to={`/room/${code}/display`}
                    tone="secondaryOnLight"
                  >
                    Shared display
                  </LinkButton>
                </div>
              </Panel>
            )}
            {setupPhase && teamAnnouncement ? (
              <div
                className="rounded-2xl bg-white/[0.92] px-4 py-3 text-sm font-bold text-brand-blue-900"
                aria-live="polite"
              >
                {teamAnnouncement}
              </div>
            ) : null}
            {setupPhase && snapshot.startStatus.blockers.length > 0 ? (
              <div className="rounded-2xl bg-white/[0.92] px-4 py-3 text-sm font-bold text-ink">
                {snapshot.startStatus.blockers.map((blocker) => (
                  <p key={blocker}>{blocker}</p>
                ))}
              </div>
            ) : setupPhase ? (
              <p className="rounded-2xl bg-brand-yellow-500 px-4 py-3 text-sm font-bold text-ink">
                Everyone is ready. Start moves the room to Round Intro.
              </p>
            ) : null}
            <InlineError message={shuffleMutation.error instanceof Error ? shuffleMutation.error.message : null} />
            <InlineError message={moveMutation.error instanceof Error ? moveMutation.error.message : null} />
            <InlineError message={startMutation.error instanceof Error ? startMutation.error.message : null} />
            <InlineError message={cancelMutation.error instanceof Error ? cancelMutation.error.message : null} />
            <TeamBoard snapshot={snapshot} compact={setupPhase} />
            {setupPhase && snapshot.members.length > 0 ? (
              <details
                className="rounded-[24px] border border-white/14 bg-white/10 p-4"
                open={!snapshot.room.autoBalanceTeams}
              >
                <summary className="cursor-pointer font-display text-xl font-bold text-white">
                  Arrange teams
                </summary>
                <div className="mt-3">
                  <HostTeamEditor
                    snapshot={snapshot}
                    pending={moveMutation.isPending}
                    onMove={(member, teamId) =>
                      moveMutation.mutate({ memberId: member.id, teamId })
                    }
                  />
                </div>
              </details>
            ) : null}
            {setupPhase ? (
              <BottomActionBar
                primary={
                  <Button
                    pending={startMutation.isPending}
                    pendingLabel="Starting game..."
                    disabled={!snapshot.startStatus.canStart}
                    onClick={() => startMutation.mutate()}
                    fullWidth
                  >
                    <Play size={18} aria-hidden />
                    Start game
                  </Button>
                }
              />
            ) : null}
            <ConfirmDialog
              open={confirmEndOpen}
              title="End this room?"
              body="Players will stop receiving room updates, and this host token will be cleared from this browser."
              confirmLabel="End room"
              pendingLabel="Ending room..."
              pending={cancelMutation.isPending}
              onCancel={() => setConfirmEndOpen(false)}
              onConfirm={() => cancelMutation.mutate()}
            />
          </>
        ) : null}
      </div>
    </PageShell>
  );
}
