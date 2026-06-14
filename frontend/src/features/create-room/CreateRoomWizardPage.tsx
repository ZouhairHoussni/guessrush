import { useMutation } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, PartyPopper, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createRoom } from "../../api/http";
import type { CreateRoomInput, DeckMode } from "../../api/types";
import { saveHostToken } from "../../api/storage";
import { useSound } from "../../audio/useSound";
import { AppLogo } from "../../components/ui/AppLogo";
import { Button } from "../../components/ui/Button";
import { BottomActionBar } from "../../components/ui/BottomActionBar";
import { InlineError } from "../../components/ui/InlineError";
import { MotionPage } from "../../components/ui/Motion";
import { Panel } from "../../components/ui/Panel";
import { PageShell } from "../../components/ui/PageShell";

const steps = ["Cards", "Settings", "Launch"];

function OptionCard({
  title,
  body,
  active,
  onClick,
}: {
  title: string;
  body: string;
  active: boolean;
  onClick: () => void;
}) {
  const { playSound, unlockAudio } = useSound();
  return (
    <button
      type="button"
      onClick={() => {
        unlockAudio();
        playSound("button_click", { volume: active ? 0.35 : 0.55 });
        onClick();
      }}
      aria-pressed={active}
      className={[
        "pressable min-h-28 rounded-[22px] border p-4 text-left text-ink transition",
        active
          ? "border-brand-yellow-500 bg-paper shadow-party ring-2 ring-brand-yellow-500/30"
          : "border-brand-blue-100 bg-white hover:border-brand-blue-600",
      ].join(" ")}
    >
      <span className="mb-2 flex items-center justify-between gap-3">
        <span className="font-display text-2xl font-bold">{title}</span>
        {active ? (
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-yellow-500">
            <Check size={20} aria-hidden />
          </span>
        ) : null}
      </span>
      <span className="block text-sm font-semibold text-ink/70">{body}</span>
    </button>
  );
}

function SegmentedButton<T extends string | number>({
  value,
  current,
  onSelect,
  label,
}: {
  value: T;
  current: T;
  onSelect: (value: T) => void;
  label: string;
}) {
  const { playSound, unlockAudio } = useSound();
  return (
    <button
      type="button"
      onClick={() => {
        unlockAudio();
        playSound("button_click", { volume: value === current ? 0.32 : 0.5 });
        onSelect(value);
      }}
      aria-pressed={value === current}
      className={[
        "pressable min-h-12 rounded-2xl border px-4 py-2 text-sm font-bold transition",
        value === current
          ? "border-brand-yellow-500 bg-brand-yellow-500 text-ink shadow-button"
          : "border-white/18 bg-white/10 text-white hover:bg-white/16",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export function CreateRoomWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [deckMode, setDeckMode] = useState<DeckMode>("QUICK_PLAY");
  const [teamCount, setTeamCount] = useState(2);
  const [turnDurationSeconds, setTurnDurationSeconds] = useState(30);
  const [cardsPerPlayer, setCardsPerPlayer] = useState(3);
  const [autoBalanceTeams, setAutoBalanceTeams] = useState(true);

  const payload = useMemo<CreateRoomInput>(
    () => ({
      deckMode,
      teamCount,
      turnDurationSeconds,
      cardsPerPlayer: deckMode === "PERSONAL_CARDS" ? cardsPerPlayer : null,
      autoBalanceTeams,
    }),
    [autoBalanceTeams, cardsPerPlayer, deckMode, teamCount, turnDurationSeconds],
  );

  const mutation = useMutation({
    mutationFn: createRoom,
    onSuccess: (created) => {
      saveHostToken(created.code, created.hostToken);
      navigate(`/room/${created.code}/host`);
    },
  });

  return (
    <PageShell narrow>
      <div className="min-h-[calc(100vh-2.5rem)] space-y-5 pb-4">
        <header className="flex items-center justify-between gap-4">
          <AppLogo compact />
          <span className="rounded-full bg-white/14 px-3 py-2 text-xs font-bold text-white">
            Step {step + 1} of 3
          </span>
        </header>

        <section className="rounded-[24px] bg-white/10 p-1.5">
          <div className="grid grid-cols-3 gap-2">
            {steps.map((label, index) => (
              <div
                key={label}
                className={[
                  "rounded-[18px] px-2 py-2.5 text-center text-xs font-bold",
                  index === step ? "bg-brand-yellow-500 text-ink" : "text-white/70",
                ].join(" ")}
                aria-current={index === step ? "step" : undefined}
              >
                {label}
              </div>
            ))}
          </div>
        </section>

        <Panel variant="soft">
          <MotionPage motionKey={step} className="space-y-4">
          {step === 0 ? (
            <>
              <div>
                <h1 className="font-display text-4xl font-bold">Choose your cards</h1>
                <p className="mt-2 text-sm font-semibold text-white/80">
                  Quick Play starts fast. Personal Cards asks each player for a secret mini deck.
                </p>
              </div>
              <div className="grid gap-3">
                <OptionCard
                  title="Quick Play"
                  body="Start fast with a ready-made deck."
                  active={deckMode === "QUICK_PLAY"}
                  onClick={() => setDeckMode("QUICK_PLAY")}
                />
                <OptionCard
                  title="Personal Cards"
                  body="Every player secretly adds cards."
                  active={deckMode === "PERSONAL_CARDS"}
                  onClick={() => setDeckMode("PERSONAL_CARDS")}
                />
              </div>
            </>
          ) : null}
          {step === 1 ? (
            <>
              <div>
                <h1 className="font-display text-4xl font-bold">Set the table</h1>
                <p className="mt-2 text-sm font-semibold text-white/80">
                  Keep it short and lively. You can invite players right after launch.
                </p>
              </div>
              <div className="space-y-5">
                <fieldset className="space-y-2">
                  <legend className="font-bold">Teams</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 3, 4].map((value) => (
                      <SegmentedButton
                        key={value}
                        value={value}
                        current={teamCount}
                        onSelect={setTeamCount}
                        label={`${value}`}
                      />
                    ))}
                  </div>
                </fieldset>

                <fieldset className="space-y-2">
                  <legend className="font-bold">Turn time</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {[30, 45, 60].map((value) => (
                      <SegmentedButton
                        key={value}
                        value={value}
                        current={turnDurationSeconds}
                        onSelect={setTurnDurationSeconds}
                        label={`${value}s`}
                      />
                    ))}
                  </div>
                </fieldset>

                <fieldset className="space-y-2">
                  <legend className="font-bold">Team assignment</legend>
                  <div className="grid grid-cols-2 gap-2">
                    <SegmentedButton
                      value="auto"
                      current={autoBalanceTeams ? "auto" : "host"}
                      onSelect={() => setAutoBalanceTeams(true)}
                      label="Auto balance"
                    />
                    <SegmentedButton
                      value="host"
                      current={autoBalanceTeams ? "auto" : "host"}
                      onSelect={() => setAutoBalanceTeams(false)}
                      label="Host arranges"
                    />
                  </div>
                </fieldset>

                {deckMode === "PERSONAL_CARDS" ? (
                  <fieldset className="space-y-2">
                    <legend className="font-bold">Cards per player</legend>
                    <div className="grid grid-cols-4 gap-2">
                      {[2, 3, 4, 5].map((value) => (
                        <SegmentedButton
                          key={value}
                          value={value}
                          current={cardsPerPlayer}
                          onSelect={setCardsPerPlayer}
                          label={`${value}`}
                        />
                      ))}
                    </div>
                  </fieldset>
                ) : null}
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div>
                <h1 className="font-display text-4xl font-bold">Review and create</h1>
                <p className="mt-2 text-sm font-semibold text-white/80">
                  Host authority is stored privately on this device.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-yellow-500 text-ink">
                  <PartyPopper aria-hidden />
                </span>
                <div>
                  <h2 className="font-display text-2xl font-bold">Ready to invite</h2>
                  <p className="text-sm font-semibold text-white/78">Players join by QR or code.</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm font-bold">
                <div className="rounded-2xl bg-white/12 p-3">
                  <dt className="text-white/62">Mode</dt>
                  <dd>{deckMode === "QUICK_PLAY" ? "Quick Play" : "Personal Cards"}</dd>
                </div>
                <div className="rounded-2xl bg-white/12 p-3">
                  <dt className="text-white/62">Teams</dt>
                  <dd>{teamCount}</dd>
                </div>
                <div className="rounded-2xl bg-white/12 p-3">
                  <dt className="text-white/62">Turn</dt>
                  <dd>{turnDurationSeconds}s</dd>
                </div>
                <div className="rounded-2xl bg-white/12 p-3">
                  <dt className="text-white/62">Balance</dt>
                  <dd>{autoBalanceTeams ? "Auto" : "Host"}</dd>
                </div>
              </dl>
            </>
          ) : null}
          </MotionPage>
        </Panel>

        <InlineError message={mutation.error instanceof Error ? mutation.error.message : null} />

        <BottomActionBar
          secondary={
            <Button tone="secondary" disabled={step === 0 || mutation.isPending} onClick={() => setStep(step - 1)}>
              <ChevronLeft size={18} aria-hidden />
              Back
            </Button>
          }
          primary={
            step < 2 ? (
              <Button onClick={() => setStep(step + 1)} fullWidth>
                Next <ChevronRight size={18} aria-hidden />
              </Button>
            ) : (
              <Button
                pending={mutation.isPending}
                pendingLabel="Creating room..."
                onClick={() => mutation.mutate(payload)}
                fullWidth
              >
                <Settings2 size={18} aria-hidden />
                Create room
              </Button>
            )
          }
        />
      </div>
    </PageShell>
  );
}
