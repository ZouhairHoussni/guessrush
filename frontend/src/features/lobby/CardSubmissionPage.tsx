import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ApiError, getCardStatus, submitCards } from "../../api/http";
import { getPlayerToken } from "../../api/storage";
import { useSound } from "../../audio/useSound";
import { AppLogo } from "../../components/ui/AppLogo";
import { Button, LinkButton } from "../../components/ui/Button";
import { InlineError } from "../../components/ui/InlineError";
import { AnimatedListItem, MotionPage } from "../../components/ui/Motion";
import { PageShell } from "../../components/ui/PageShell";
import { Panel } from "../../components/ui/Panel";
import { TopBar } from "../../components/ui/TopBar";
import { useRoomSnapshot } from "../../hooks/useRoomSnapshot";
import { usePreviousValue } from "../../hooks/usePreviousValue";
import { isGameplayPhase } from "../../utils/phaseRouting";

function cleanCard(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normaliseCard(value: string): string {
  return cleanCard(value).toLocaleLowerCase();
}

function duplicateMessage(cardText: string): string {
  return `This card already exists: "${cardText}". Please choose a different one.`;
}

function duplicateCardFromApiError(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== "DUPLICATE_CARD") {
    return null;
  }
  if (!error.details || typeof error.details !== "object") {
    return null;
  }
  const details = error.details as { duplicateCardText?: unknown };
  return typeof details.duplicateCardText === "string" ? details.duplicateCardText : null;
}

export function CardSubmissionPage() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const playerToken = code ? getPlayerToken(code) : null;
  const [cards, setCards] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [duplicatePulse, setDuplicatePulse] = useState(0);
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);
  const removeTimeout = useRef<number | null>(null);
  const duplicateTimeout = useRef<number | null>(null);
  const { playSound } = useSound();
  const room = useRoomSnapshot({ code, playerToken, enabled: Boolean(code && playerToken) });
  const statusQuery = useQuery({
    queryKey: ["card-status", code],
    queryFn: () => getCardStatus(code, playerToken!),
    enabled: Boolean(code && playerToken),
  });
  const requiredCount = statusQuery.data?.requiredCount ?? 3;
  const cleanedDraft = cleanCard(draft);
  const duplicateCard = useMemo(() => {
    const normalised = normaliseCard(draft);
    return normalised.length > 0
      ? cards.find((card) => normaliseCard(card) === normalised) ?? null
      : null;
  }, [cards, draft]);
  const canAdd =
    cleanedDraft.length >= 2 && cleanedDraft.length <= 60 && cards.length < requiredCount;
  const canSubmit = cards.length === requiredCount;
  const nextNumber = Math.min(cards.length + 1, requiredCount);
  const mutation = useMutation({
    mutationFn: () => submitCards(code, playerToken!, cards),
    onSuccess: () => navigate(`/room/${code}/lobby`),
  });
  const serverDuplicateCard = duplicateCardFromApiError(mutation.error);
  const previousServerDuplicateCard = usePreviousValue(serverDuplicateCard);
  const inlineError = duplicateCard
    ? duplicateMessage(duplicateCard)
    : serverDuplicateCard
      ? duplicateMessage(serverDuplicateCard)
      : mutation.error instanceof Error
        ? mutation.error.message
        : statusQuery.error instanceof Error
          ? statusQuery.error.message
          : room.error instanceof Error
            ? room.error.message
            : null;
  const triggerDuplicateFeedback = useCallback(() => {
    playSound("duplicate_error", { role: "player" });
    setDuplicatePulse((value) => value + 1);
    if (duplicateTimeout.current) {
      window.clearTimeout(duplicateTimeout.current);
    }
    duplicateTimeout.current = window.setTimeout(() => setDuplicatePulse(0), 320);
  }, [playSound]);

  useEffect(() => {
    if (statusQuery.data && statusQuery.data.cards.length > 0) {
      setCards(statusQuery.data.cards);
    }
  }, [statusQuery.data]);

  useEffect(() => {
    return () => {
      if (removeTimeout.current) {
        window.clearTimeout(removeTimeout.current);
      }
      if (duplicateTimeout.current) {
        window.clearTimeout(duplicateTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!serverDuplicateCard || serverDuplicateCard === previousServerDuplicateCard) {
      return;
    }
    triggerDuplicateFeedback();
  }, [previousServerDuplicateCard, serverDuplicateCard, triggerDuplicateFeedback]);

  useEffect(() => {
    if (!code || !room.data) {
      return;
    }
    if (isGameplayPhase(room.data.room.phase)) {
      navigate(`/room/${code}/play`, { replace: true });
    } else if (room.data.room.phase === "CANCELLED") {
      navigate(`/room/${code}/lobby`, { replace: true });
    }
  }, [code, navigate, room.data]);

  function addCard() {
    const cleaned = cleanCard(draft);
    if (duplicateCard) {
      triggerDuplicateFeedback();
      return;
    }
    if (
      cleaned.length < 2 ||
      cleaned.length > 60 ||
      cards.length >= requiredCount
    ) {
      return;
    }
    mutation.reset();
    setCards((current) => [...current, cleaned]);
    setDraft("");
    playSound("card_added", { role: "player" });
  }

  function removeCard(index: number) {
    mutation.reset();
    playSound("card_deleted", { role: "player" });
    setRemovingIndex(index);
    if (removeTimeout.current) {
      window.clearTimeout(removeTimeout.current);
    }
    removeTimeout.current = window.setTimeout(() => {
      setCards((current) => current.filter((_card, cardIndex) => cardIndex !== index));
      setRemovingIndex(null);
    }, 150);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (duplicateCard) {
      triggerDuplicateFeedback();
      return;
    }
    if (canAdd) {
      addCard();
      return;
    }
    if (canSubmit) {
      mutation.mutate();
    }
  }

  if (!playerToken) {
    return (
      <PageShell narrow>
        <div className="space-y-6">
          <AppLogo compact />
          <Panel>
            <h1 className="font-display text-3xl font-bold">Join token not found</h1>
            <p className="mt-2 font-semibold text-muted">Join this room before adding cards.</p>
            <LinkButton to={code ? `/join/${code}` : "/join"} className="mt-5" fullWidth>
              Join room
            </LinkButton>
          </Panel>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell narrow>
      <div className="min-h-[calc(100vh-2.5rem)] space-y-5 pb-8">
        <TopBar code={code} logoTo={`/room/${code}/lobby`} />

        <Panel variant="hero">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-blue-800">
            Secret cards
          </p>
          <h1 className="font-display text-4xl font-bold">
            Card {nextNumber} of {requiredCount}
          </h1>
          <p className="mt-2 text-sm font-semibold text-muted">
            Use a person, character, title, object or place your group can recognise.
          </p>
        </Panel>

        <form onSubmit={onSubmit} className="space-y-4">
          <MotionPage motionKey={cards.length < requiredCount ? "add-card" : "review-stack"}>
            {cards.length < requiredCount ? (
              <label className="block space-y-2">
                <span className="font-bold">Card text</span>
                <input
                  value={draft}
                  onChange={(event) => {
                    mutation.reset();
                    setDraft(event.target.value);
                  }}
                  className={[
                    "h-16 w-full rounded-[24px] border bg-paper px-4 text-xl font-bold text-ink shadow-panel",
                    duplicateCard
                      ? "border-brand-yellow-500 ring-2 ring-brand-yellow-500/40"
                      : "border-brand-blue-100",
                    duplicatePulse > 0 ? "motion-shake" : "",
                  ].join(" ")}
                  maxLength={60}
                  autoFocus
                />
              </label>
            ) : (
              <Panel variant="soft" className="text-center">
                <h2 className="font-display text-3xl font-bold">Review your stack</h2>
                <p className="mt-2 text-sm font-semibold text-white/78">
                  All cards are in. Check the list, then submit.
                </p>
              </Panel>
            )}
          </MotionPage>
          <InlineError message={inlineError} />
          <div className="grid grid-cols-[1fr_auto] gap-3">
            {cards.length < requiredCount ? (
              <Button
                tone="secondary"
                type="button"
                disabled={!canAdd || Boolean(duplicateCard)}
                sound={false}
                onClick={addCard}
              >
                Add card
              </Button>
            ) : null}
            <Button
              pending={mutation.isPending}
              pendingLabel="Submitting cards..."
              disabled={!canSubmit}
              type="submit"
              fullWidth
              className={cards.length >= requiredCount ? "col-span-full" : ""}
            >
              Submit <ArrowRight size={18} aria-hidden />
            </Button>
          </div>
        </form>

        <Panel variant="soft" className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold">Review stack</h2>
            <span className="rounded-full bg-brand-yellow-500 px-3 py-1 text-sm font-bold text-ink">
              {cards.length}/{requiredCount}
            </span>
          </div>
          {cards.length === 0 ? (
            <p className="rounded-2xl bg-white/12 px-4 py-3 text-sm font-semibold text-white/78">
              No cards added yet.
            </p>
          ) : (
            cards.map((card, index) => {
              const isDuplicate = duplicateCard === card;
              return (
                <AnimatedListItem
                  key={`${card}-${index}`}
                  index={index}
                  className={[
                    "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-ink",
                    isDuplicate
                      ? "border-brand-yellow-500 bg-[#fff7ce] ring-2 ring-brand-yellow-500/40"
                      : "border-transparent bg-paper",
                    isDuplicate && duplicatePulse > 0 ? "motion-shake" : "",
                    removingIndex === index ? "motion-card-exit" : "",
                  ].join(" ")}
                >
                  <span className="font-bold">{card}</span>
                  <button
                    type="button"
                    className="pressable grid h-11 w-11 place-items-center rounded-2xl bg-brand-blue-100 text-brand-blue-900"
                    onClick={() => removeCard(index)}
                    aria-label={`Remove ${card}`}
                  >
                    <Trash2 size={18} aria-hidden />
                  </button>
                </AnimatedListItem>
              );
            })
          )}
        </Panel>

        {statusQuery.data?.submitted ? (
          <p className="flex items-center gap-2 rounded-2xl bg-brand-yellow-500 px-4 py-3 text-sm font-black text-ink">
            <Check size={18} aria-hidden />
            Cards submitted. Re-submit before the host starts if you edit them.
          </p>
        ) : null}
      </div>
    </PageShell>
  );
}
