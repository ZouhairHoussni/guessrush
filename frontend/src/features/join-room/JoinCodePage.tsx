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
    <PageShell narrow>
      <div className="flex min-h-[calc(100vh-2.5rem)] flex-col justify-between gap-8">
        <TopBar />
        <form onSubmit={onSubmit} className="space-y-5">
          <Panel variant="hero" className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-blue-800">
              Join a game
            </p>
            <h1 className="mt-2 font-display text-5xl font-bold">Enter room code</h1>
            <p className="mt-2 font-semibold text-muted">Six characters from the host screen.</p>
          </Panel>
          <div className="space-y-2 text-center">
            <input
              value={code}
              onChange={(event) => setCode(cleanCode(event.target.value))}
              className="h-20 w-full rounded-[26px] border border-brand-blue-100 bg-paper px-5 text-center font-display text-4xl font-bold tracking-[0.2em] text-ink shadow-panel"
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
