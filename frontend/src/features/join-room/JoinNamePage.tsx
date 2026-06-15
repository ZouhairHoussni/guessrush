import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getRoom, getRoomSnapshot, joinRoom } from "../../api/http";
import {
  getPlayerToken,
  getSuggestedName,
  savePlayerToken,
  saveSuggestedName,
} from "../../api/storage";
import { Button, LinkButton } from "../../components/ui/Button";
import { InlineError } from "../../components/ui/InlineError";
import { Panel } from "../../components/ui/Panel";
import { PageShell } from "../../components/ui/PageShell";
import { TopBar } from "../../components/ui/TopBar";
import { playerRouteForSnapshot } from "../../utils/phaseRouting";

export function JoinNamePage() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState(getSuggestedName());
  const existingToken = code ? getPlayerToken(code) : null;
  const roomQuery = useQuery({
    queryKey: ["room-info", code],
    queryFn: () => getRoom(code),
    enabled: Boolean(code),
  });
  const savedSeatQuery = useQuery({
    queryKey: ["saved-seat", code],
    queryFn: () => getRoomSnapshot(code, { playerToken: existingToken }),
    enabled: Boolean(code && existingToken),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: () => joinRoom(code, name),
    onSuccess: (joined) => {
      savePlayerToken(code, joined.playerToken);
      saveSuggestedName(name.trim());
      navigate(playerRouteForSnapshot(code, joined.snapshot));
    },
  });

  useEffect(() => {
    if (code && savedSeatQuery.data) {
      navigate(playerRouteForSnapshot(code, savedSeatQuery.data), { replace: true });
    }
  }, [code, navigate, savedSeatQuery.data]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length > 0) {
      mutation.mutate();
    }
  }

  return (
    <PageShell narrow fullHeight>
      <div className="flex h-full min-h-0 flex-col justify-center gap-4">
        <TopBar code={code} />
        <Panel variant="hero" className="p-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-blue-800">Room</p>
          <h1 className="font-display text-[clamp(2.8rem,14vw,4rem)] font-bold leading-none tracking-[0.14em]">
            {code}
          </h1>
          <p className="mt-2 font-semibold text-muted">
            {roomQuery.data
              ? `${roomQuery.data.teamCount} teams, ${roomQuery.data.turnDurationSeconds}s turns`
              : "Checking room..."}
          </p>
        </Panel>

        {existingToken && !savedSeatQuery.error ? (
          <Panel variant="soft" className="space-y-3 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-brand-yellow-500" aria-hidden />
              <div>
                <h2 className="font-display text-2xl font-bold leading-tight">You are already in</h2>
                <p className="text-sm font-semibold text-white/78">
                  Continue with your saved player token.
                </p>
              </div>
            </div>
            <LinkButton
              to={
                savedSeatQuery.data
                  ? playerRouteForSnapshot(code, savedSeatQuery.data)
                  : `/room/${code}/lobby`
              }
              fullWidth
            >
              Continue <ArrowRight size={20} aria-hidden />
            </LinkButton>
          </Panel>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block space-y-2">
              <span className="font-bold">Your name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-14 w-full rounded-[22px] border border-brand-blue-100 bg-paper px-4 text-xl font-bold text-ink shadow-panel sm:h-16"
                maxLength={40}
                autoFocus
              />
            </label>
            <InlineError
              message={
                roomQuery.error instanceof Error
                  ? roomQuery.error.message
                  : mutation.error instanceof Error
                    ? mutation.error.message
                    : null
              }
            />
            <Button
              fullWidth
              pending={mutation.isPending}
              pendingLabel="Joining..."
              disabled={!roomQuery.data || name.trim().length === 0}
            >
              Join game <ArrowRight size={20} aria-hidden />
            </Button>
          </form>
        )}
      </div>
    </PageShell>
  );
}
