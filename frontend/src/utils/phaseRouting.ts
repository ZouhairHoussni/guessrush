import type { GamePhase, RoomSnapshot } from "../api/types";

const SETUP_PHASES: GamePhase[] = ["LOBBY", "CARD_SUBMISSION", "READY_CHECK"];

export function isSetupPhase(phase: GamePhase): boolean {
  return SETUP_PHASES.includes(phase);
}

export function isGameplayPhase(phase: GamePhase): boolean {
  return !isSetupPhase(phase) && phase !== "CANCELLED";
}

export function currentPlayerNeedsCards(snapshot: RoomSnapshot): boolean {
  const me = snapshot.members.find((member) => member.id === snapshot.currentMemberId);
  return snapshot.room.deckMode === "PERSONAL_CARDS" && Boolean(me && !me.cardsSubmitted);
}

export function playerRouteForSnapshot(code: string, snapshot: RoomSnapshot): string {
  if (snapshot.room.phase === "CANCELLED") {
    return `/room/${code}/lobby`;
  }

  if (isGameplayPhase(snapshot.room.phase)) {
    return `/room/${code}/play`;
  }

  if (snapshot.room.phase === "CARD_SUBMISSION" && currentPlayerNeedsCards(snapshot)) {
    return `/room/${code}/cards`;
  }

  return `/room/${code}/lobby`;
}
