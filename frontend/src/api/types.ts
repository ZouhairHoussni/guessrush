export type DeckMode = "QUICK_PLAY" | "PERSONAL_CARDS";
export type GamePhase =
  | "LOBBY"
  | "CARD_SUBMISSION"
  | "READY_CHECK"
  | "ROUND_INTRO"
  | "TURN_READY"
  | "TURN_LIVE"
  | "TURN_RECAP"
  | "ROUND_SUMMARY"
  | "FINISHED"
  | "CANCELLED";

export type ViewerRole = "PUBLIC" | "HOST" | "PLAYER";
export type TurnStatus = "READY" | "LIVE" | "RECAP" | "CONFIRMED" | "EXPIRED";

export interface TeamCreate {
  name: string;
  colorKey: string;
}

export interface CreateRoomInput {
  deckMode: DeckMode;
  teamCount: number;
  turnDurationSeconds: number;
  cardsPerPlayer: number | null;
  autoBalanceTeams: boolean;
  teams?: TeamCreate[];
}

export interface RoomInfo {
  code: string;
  phase: GamePhase;
  deckMode: DeckMode;
  teamCount: number;
  turnDurationSeconds: number;
  cardsPerPlayer: number | null;
  autoBalanceTeams: boolean;
  joinUrl: string;
}

export interface CreateRoomResponse {
  code: string;
  joinUrl: string;
  hostToken: string;
  room: RoomInfo;
}

export interface MemberSnapshot {
  id: string;
  displayName: string;
  teamId: string | null;
  ready: boolean;
  connected: boolean;
  joinOrder: number;
  isMe: boolean;
  cardsSubmitted: boolean;
  submittedCardCount: number;
}

export interface TeamSnapshot {
  id: string;
  name: string;
  colorKey: string;
  sortOrder: number;
  totalScore: number;
  members: MemberSnapshot[];
}

export interface SnapshotRoom {
  code: string;
  phase: GamePhase;
  deckMode: DeckMode;
  turnDurationSeconds: number;
  cardsPerPlayer: number | null;
  autoBalanceTeams: boolean;
  currentRoundNumber: number;
}

export interface RoomSnapshot {
  viewer: ViewerRole;
  room: SnapshotRoom;
  teams: TeamSnapshot[];
  members: MemberSnapshot[];
  joinUrl: string;
  currentMemberId: string | null;
  deckStatus: DeckStatusSnapshot;
  startStatus: StartStatusSnapshot;
  turn: TurnSnapshot | null;
  currentCardText: string | null;
  roundSummary: RoundSummarySnapshot | null;
  results: ResultsSnapshot | null;
}

export interface JoinMemberResponse {
  playerToken: string;
  memberId: string;
  snapshot: RoomSnapshot;
}

export interface DeckStatusSnapshot {
  mode: DeckMode;
  totalPlayerCount: number;
  submittedPlayerCount: number;
  requiredCardsPerPlayer: number | null;
  totalCardCount: number;
  deckReady: boolean;
}

export interface StartStatusSnapshot {
  canStart: boolean;
  blockers: string[];
}

export interface TurnSnapshot {
  id: string;
  roundNumber: number;
  sequenceNumber: number;
  status: TurnStatus;
  activeTeamId: string;
  activeTeamName: string;
  activeMemberId: string;
  activeMemberName: string;
  startedAt: string | null;
  deadlineAt: string | null;
  serverTime: string;
  points: number;
  cardsRemaining: number;
  skipsUsed: number;
  skipsAllowed: number | null;
  canSkip: boolean;
  guessedCards: RecapCardSnapshot[];
}

export interface RecapCardSnapshot {
  roundCardId: string;
  text: string;
}

export interface TeamRoundScoreSnapshot {
  teamId: string;
  teamName: string;
  colorKey: string;
  roundScore: number;
  totalScore: number;
}

export interface RoundSummarySnapshot {
  roundNumber: number;
  teams: TeamRoundScoreSnapshot[];
  nextRoundNumber: number | null;
  nextRuleLabel: string | null;
  nextRuleDetail: string | null;
}

export interface TeamResultSnapshot {
  teamId: string;
  teamName: string;
  colorKey: string;
  totalScore: number;
}

export interface PlayerStatSnapshot {
  memberId: string;
  memberName: string;
  value: number;
}

export interface BestTurnSnapshot {
  memberId: string;
  memberName: string;
  teamId: string;
  teamName: string;
  roundNumber: number;
  points: number;
}

export interface ClosestRoundSnapshot {
  roundNumber: number;
  spread: number;
}

export interface ResultsSnapshot {
  teams: TeamResultSnapshot[];
  winnerTeamIds: string[];
  isTie: boolean;
  mostCardsGuessed: PlayerStatSnapshot | null;
  bestTurn: BestTurnSnapshot | null;
  closestRound: ClosestRoundSnapshot | null;
}

export interface CardStatusResponse {
  submitted: boolean;
  requiredCount: number;
  submittedCount: number;
  cards: string[];
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details: unknown | null;
  };
}
