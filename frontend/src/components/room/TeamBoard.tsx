import { Crown, Users } from "lucide-react";

import type { RoomSnapshot, TeamSnapshot } from "../../api/types";
import { isLeadingScore, teamAccent } from "../../utils/teamAccent";
import { CardStatusBadge, ReadyBadge } from "../ui/Badge";
import { Panel } from "../ui/Panel";

function TeamCard({
  team,
  showCardStatus,
  compact,
  leading,
}: {
  team: TeamSnapshot;
  showCardStatus: boolean;
  compact: boolean;
  leading: boolean;
}) {
  const accent = teamAccent(team.colorKey);
  return (
    <Panel
      as="section"
      variant="compact"
      className={[
        "relative overflow-hidden border-2",
        compact ? "min-h-[96px] p-3" : "min-h-[132px]",
        accent.card,
        leading ? accent.leaderGlow : accent.glow,
      ].join(" ")}
    >
      <span className={["absolute inset-x-0 top-0 h-1.5", accent.stripe].join(" ")} />
      <div
        className={[
          "flex items-start justify-between gap-3 pt-1",
          compact ? "mb-1.5" : "mb-3",
        ].join(" ")}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={[
                "font-display font-bold",
                compact ? "text-lg" : "text-2xl",
                accent.text,
              ].join(" ")}
            >
              {team.name}
            </h3>
            {leading ? (
              <span
                className={[
                  "rounded-full px-2.5 py-1 text-xs font-black uppercase",
                  accent.chip,
                ].join(" ")}
              >
                Leader
              </span>
            ) : null}
          </div>
          <p className="text-xs font-semibold text-muted sm:text-sm">
            {team.members.length} players - {team.totalScore} points
          </p>
        </div>
        <span
          className={[
            compact ? "grid h-8 w-8 place-items-center rounded-xl" : "grid h-10 w-10 place-items-center rounded-2xl",
            leading ? accent.chip : accent.softChip,
          ].join(" ")}
        >
          {leading ? (
            <Crown size={compact ? 16 : 20} aria-label="Leading team" />
          ) : (
            <Users size={compact ? 16 : 20} aria-hidden />
          )}
        </span>
      </div>
      <div className={["grid", compact ? "gap-1.5" : "gap-2"].join(" ")}>
        {team.members.length === 0 ? (
          <span className="rounded-2xl bg-white/[0.74] px-3 py-2 text-sm font-semibold text-muted">
            Waiting for a player
          </span>
        ) : (
          team.members.map((member) => (
            <div
              key={member.id}
              data-testid="team-member"
              className={[
            "rounded-2xl bg-white/[0.86] px-3 text-sm font-bold text-ink",
            compact ? "py-1" : "py-2",
                member.isMe ? "ring-2 ring-brand-yellow-500" : "",
              ].join(" ")}
            >
              <span className="block truncate">{member.displayName}</span>
              <span className={["flex flex-wrap gap-1.5", compact ? "mt-1" : "mt-2"].join(" ")}>
                <ReadyBadge ready={member.ready} compact />
                {showCardStatus ? (
                  <CardStatusBadge submitted={member.cardsSubmitted} compact />
                ) : null}
              </span>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

export function TeamBoard({
  snapshot,
  compact = false,
}: {
  snapshot: RoomSnapshot;
  compact?: boolean;
}) {
  const showCardStatus = snapshot.room.deckMode === "PERSONAL_CARDS";
  const scores = snapshot.teams.map((team) => team.totalScore);
  return (
    <div
      className={[
        "grid",
        compact ? "gap-2 sm:grid-cols-2" : "gap-4 md:grid-cols-2 xl:grid-cols-4",
      ].join(" ")}
    >
      {snapshot.teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          showCardStatus={showCardStatus}
          compact={compact}
          leading={isLeadingScore(team.totalScore, scores)}
        />
      ))}
    </div>
  );
}
