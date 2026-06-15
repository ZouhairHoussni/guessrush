import { useMutation } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getRoom } from "../../api/http";
import { Button } from "../../components/ui/Button";
import { InlineError } from "../../components/ui/InlineError";
import { Panel } from "../../components/ui/Panel";
import { PageShell } from "../../components/ui/PageShell";
import { TopBar } from "../../components/ui/TopBar";

function cleanCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function JoinCodePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const mutation = useMutation({
    mutationFn: getRoom,
    onSuccess: (room) => navigate(`/join/${room.code}`),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (code.length === 6) {
      mutation.mutate(code);
    }
  }

  return (
    <PageShell narrow fullHeight>
      <div className="flex h-full min-h-0 flex-col justify-between gap-4">
        <TopBar />
        <form onSubmit={onSubmit} className="grid gap-4">
          <Panel variant="hero" className="p-5 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-blue-800">
              Join a game
            </p>
            <h1 className="mt-2 font-display text-[clamp(2.5rem,12vw,4rem)] font-bold leading-none">
              Enter room code
            </h1>
            <p className="mt-2 font-semibold text-muted">Six characters from the host screen.</p>
          </Panel>
          <div className="space-y-2 text-center">
            <input
              value={code}
              onChange={(event) => setCode(cleanCode(event.target.value))}
              className="h-16 w-full rounded-[24px] border border-brand-blue-100 bg-paper px-4 text-center font-display text-3xl font-bold tracking-[0.2em] text-ink shadow-panel sm:h-20 sm:text-4xl"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={6}
              aria-label="Room code"
              placeholder="ABC123"
            />
          </div>
          <InlineError message={mutation.error instanceof Error ? mutation.error.message : null} />
          <Button
            fullWidth
            pending={mutation.isPending}
            pendingLabel="Checking room..."
            disabled={code.length !== 6}
          >
            Continue <ArrowRight size={20} aria-hidden />
          </Button>
        </form>
        <div />
      </div>
    </PageShell>
  );
}
