import { z } from "zod";

import type {
  ApiErrorPayload,
  CardStatusResponse,
  CreateRoomInput,
  CreateRoomResponse,
  JoinMemberResponse,
  RoomInfo,
  RoomSnapshot,
} from "./types";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

function createActionKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

const deckModeSchema = z.enum(["QUICK_PLAY", "PERSONAL_CARDS"]);
const gamePhaseSchema = z.enum([
  "LOBBY",
  "CARD_SUBMISSION",
  "READY_CHECK",
  "ROUND_INTRO",
  "TURN_READY",
  "TURN_LIVE",
  "TURN_RECAP",
  "ROUND_SUMMARY",
  "FINISHED",
  "CANCELLED",
]);
const turnStatusSchema = z.enum(["READY", "LIVE", "RECAP", "CONFIRMED", "EXPIRED"]);

const roomInfoSchema = z.object({
  code: z.string(),
  phase: gamePhaseSchema,
  deckMode: deckModeSchema,
  teamCount: z.number(),
  turnDurationSeconds: z.number(),
  cardsPerPlayer: z.number().nullable(),
  autoBalanceTeams: z.boolean(),
  joinUrl: z.string(),
});

const memberSnapshotSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  teamId: z.string().nullable(),
  ready: z.boolean(),
  connected: z.boolean(),
  joinOrder: z.number(),
  isMe: z.boolean(),
  cardsSubmitted: z.boolean(),
  submittedCardCount: z.number(),
});

const teamSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  colorKey: z.string(),
  sortOrder: z.number(),
  totalScore: z.number(),
  members: z.array(memberSnapshotSchema),
});

const turnSnapshotSchema = z.object({
  id: z.string(),
  roundNumber: z.number(),
  sequenceNumber: z.number(),
  status: turnStatusSchema,
  activeTeamId: z.string(),
  activeTeamName: z.string(),
  activeMemberId: z.string(),
  activeMemberName: z.string(),
  startedAt: z.string().nullable(),
  deadlineAt: z.string().nullable(),
  serverTime: z.string(),
  points: z.number(),
  cardsRemaining: z.number(),
  skipsUsed: z.number(),
  skipsAllowed: z.number().nullable(),
  canSkip: z.boolean(),
  guessedCards: z.array(
    z.object({
      roundCardId: z.string(),
      text: z.string(),
    }),
  ),
});

const teamRoundScoreSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  colorKey: z.string(),
  roundScore: z.number(),
  totalScore: z.number(),
});

const roundSummarySchema = z.object({
  roundNumber: z.number(),
  teams: z.array(teamRoundScoreSchema),
  nextRoundNumber: z.number().nullable(),
  nextRuleLabel: z.string().nullable(),
  nextRuleDetail: z.string().nullable(),
});

const teamResultSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  colorKey: z.string(),
  totalScore: z.number(),
});

const playerStatSchema = z.object({
  memberId: z.string(),
  memberName: z.string(),
  value: z.number(),
});

const bestTurnSchema = z.object({
  memberId: z.string(),
  memberName: z.string(),
  teamId: z.string(),
  teamName: z.string(),
  roundNumber: z.number(),
  points: z.number(),
});

const closestRoundSchema = z.object({
  roundNumber: z.number(),
  spread: z.number(),
});

const resultsSchema = z.object({
  teams: z.array(teamResultSchema),
  winnerTeamIds: z.array(z.string()),
  isTie: z.boolean(),
  mostCardsGuessed: playerStatSchema.nullable(),
  bestTurn: bestTurnSchema.nullable(),
  closestRound: closestRoundSchema.nullable(),
});

export const roomSnapshotSchema = z.object({
  viewer: z.enum(["PUBLIC", "HOST", "PLAYER"]),
  room: z.object({
    code: z.string(),
    phase: gamePhaseSchema,
    deckMode: deckModeSchema,
    turnDurationSeconds: z.number(),
    cardsPerPlayer: z.number().nullable(),
    autoBalanceTeams: z.boolean(),
    currentRoundNumber: z.number(),
  }),
  teams: z.array(teamSnapshotSchema),
  members: z.array(memberSnapshotSchema),
  joinUrl: z.string(),
  currentMemberId: z.string().nullable(),
  deckStatus: z.object({
    mode: deckModeSchema,
    totalPlayerCount: z.number(),
    submittedPlayerCount: z.number(),
    requiredCardsPerPlayer: z.number().nullable(),
    totalCardCount: z.number(),
    deckReady: z.boolean(),
  }),
  startStatus: z.object({
    canStart: z.boolean(),
    blockers: z.array(z.string()),
  }),
  turn: turnSnapshotSchema.nullable(),
  currentCardText: z.string().nullable(),
  roundSummary: roundSummarySchema.nullable(),
  results: resultsSchema.nullable(),
});

const createRoomResponseSchema = z.object({
  code: z.string(),
  joinUrl: z.string(),
  hostToken: z.string(),
  room: roomInfoSchema,
});

const joinMemberResponseSchema = z.object({
  playerToken: z.string(),
  memberId: z.string(),
  snapshot: roomSnapshotSchema,
});

const commandResponseSchema = z.object({
  snapshot: roomSnapshotSchema,
});

const cardStatusResponseSchema = z.object({
  submitted: z.boolean(),
  requiredCount: z.number(),
  submittedCount: z.number(),
  cards: z.array(z.string()),
});

export class ApiError extends Error {
  code: string;
  details: unknown | null;
  status: number;

  constructor(payload: ApiErrorPayload, status: number) {
    super(payload.error.message);
    this.name = "ApiError";
    this.code = payload.error.code;
    this.details = payload.error.details;
    this.status = status;
  }
}

async function parseApiError(response: Response): Promise<ApiError> {
  try {
    return new ApiError((await response.json()) as ApiErrorPayload, response.status);
  } catch {
    return new ApiError(
      {
        error: {
          code: "NETWORK_ERROR",
          message: "The server did not return a usable response.",
          details: null,
        },
      },
      response.status,
    );
  }
}

async function request<T>(
  path: string,
  schema: z.Schema<T>,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(
      {
        error: {
          code: "NETWORK_ERROR",
          message:
            "Cannot reach the GuessRush server. Keep this page open and check that the host computer is still running the backend.",
          details: null,
        },
      },
      0,
    );
  }
  if (!response.ok) {
    throw await parseApiError(response);
  }
  const json = await response.json();
  return schema.parse(json);
}

export function createRoom(input: CreateRoomInput): Promise<CreateRoomResponse> {
  return request("/api/v1/rooms", createRoomResponseSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getRoom(code: string): Promise<RoomInfo> {
  return request(`/api/v1/rooms/${code}`, roomInfoSchema);
}

export function getRoomSnapshot(
  code: string,
  tokens: { hostToken?: string | null; playerToken?: string | null } = {},
): Promise<RoomSnapshot> {
  const headers: Record<string, string> = {};
  if (tokens.hostToken) {
    headers["X-Host-Token"] = tokens.hostToken;
  }
  if (tokens.playerToken) {
    headers["X-Player-Token"] = tokens.playerToken;
  }
  return request(`/api/v1/rooms/${code}/snapshot`, roomSnapshotSchema, { headers });
}

export function joinRoom(code: string, displayName: string): Promise<JoinMemberResponse> {
  return request(`/api/v1/rooms/${code}/members`, joinMemberResponseSchema, {
    method: "POST",
    body: JSON.stringify({ displayName }),
  });
}

export async function shuffleTeams(code: string, hostToken: string): Promise<RoomSnapshot> {
  const result = await request(`/api/v1/rooms/${code}/host/shuffle-teams`, commandResponseSchema, {
    method: "POST",
    headers: { "X-Host-Token": hostToken },
  });
  return result.snapshot;
}

export async function patchTeams(
  code: string,
  hostToken: string,
  input: {
    teams?: Array<{ id: string; name?: string; colorKey?: string }>;
    assignments?: Array<{ memberId: string; teamId: string }>;
  },
): Promise<RoomSnapshot> {
  const result = await request(`/api/v1/rooms/${code}/host/teams`, commandResponseSchema, {
    method: "PATCH",
    headers: { "X-Host-Token": hostToken },
    body: JSON.stringify(input),
  });
  return result.snapshot;
}

export async function toggleReady(
  code: string,
  playerToken: string,
  ready: boolean,
): Promise<RoomSnapshot> {
  const result = await request(`/api/v1/rooms/${code}/members/me/ready`, commandResponseSchema, {
    method: "POST",
    headers: { "X-Player-Token": playerToken },
    body: JSON.stringify({ ready }),
  });
  return result.snapshot;
}

export async function leaveRoom(code: string, playerToken: string): Promise<RoomSnapshot> {
  const result = await request(`/api/v1/rooms/${code}/members/me`, commandResponseSchema, {
    method: "DELETE",
    headers: { "X-Player-Token": playerToken },
  });
  return result.snapshot;
}

export function getCardStatus(code: string, playerToken: string): Promise<CardStatusResponse> {
  return request(`/api/v1/rooms/${code}/members/me/cards/status`, cardStatusResponseSchema, {
    headers: { "X-Player-Token": playerToken },
  });
}

export function submitCards(
  code: string,
  playerToken: string,
  cards: string[],
): Promise<CardStatusResponse> {
  return request(`/api/v1/rooms/${code}/members/me/cards`, cardStatusResponseSchema, {
    method: "PUT",
    headers: { "X-Player-Token": playerToken },
    body: JSON.stringify({ cards }),
  });
}

export async function startGame(code: string, hostToken: string): Promise<RoomSnapshot> {
  const result = await request(`/api/v1/rooms/${code}/host/start-game`, commandResponseSchema, {
    method: "POST",
    headers: { "X-Host-Token": hostToken },
  });
  return result.snapshot;
}

export async function cancelRoom(code: string, hostToken: string): Promise<RoomSnapshot> {
  const result = await request(`/api/v1/rooms/${code}/host/cancel`, commandResponseSchema, {
    method: "POST",
    headers: { "X-Host-Token": hostToken },
  });
  return result.snapshot;
}

export async function startRound(code: string, hostToken: string): Promise<RoomSnapshot> {
  const result = await request(`/api/v1/rooms/${code}/host/start-round`, commandResponseSchema, {
    method: "POST",
    headers: { "X-Host-Token": hostToken },
  });
  return result.snapshot;
}

export async function startCurrentTurn(
  code: string,
  playerToken: string,
): Promise<RoomSnapshot> {
  const result = await request(`/api/v1/rooms/${code}/turns/current/start`, commandResponseSchema, {
    method: "POST",
    headers: { "X-Player-Token": playerToken },
  });
  return result.snapshot;
}

export async function scoreCurrentCard(
  code: string,
  playerToken: string,
  idempotencyKey = createActionKey(),
): Promise<RoomSnapshot> {
  const result = await request(
    `/api/v1/rooms/${code}/turns/current/correct`,
    commandResponseSchema,
    {
      method: "POST",
      headers: { "X-Player-Token": playerToken, "Idempotency-Key": idempotencyKey },
    },
  );
  return result.snapshot;
}

export async function skipCurrentCard(
  code: string,
  playerToken: string,
  idempotencyKey = createActionKey(),
): Promise<RoomSnapshot> {
  const result = await request(
    `/api/v1/rooms/${code}/turns/current/skip`,
    commandResponseSchema,
    {
      method: "POST",
      headers: { "X-Player-Token": playerToken, "Idempotency-Key": idempotencyKey },
    },
  );
  return result.snapshot;
}

export async function undoLastCorrect(
  code: string,
  tokens: { hostToken?: string | null; playerToken?: string | null },
  idempotencyKey = createActionKey(),
): Promise<RoomSnapshot> {
  const headers: Record<string, string> = { "Idempotency-Key": idempotencyKey };
  if (tokens.hostToken) {
    headers["X-Host-Token"] = tokens.hostToken;
  }
  if (tokens.playerToken) {
    headers["X-Player-Token"] = tokens.playerToken;
  }
  const result = await request(
    `/api/v1/rooms/${code}/turns/current/undo-last-correct`,
    commandResponseSchema,
    {
      method: "POST",
      headers,
    },
  );
  return result.snapshot;
}

export async function confirmCurrentTurn(
  code: string,
  tokens: { hostToken?: string | null; playerToken?: string | null },
): Promise<RoomSnapshot> {
  const headers: Record<string, string> = {};
  if (tokens.hostToken) {
    headers["X-Host-Token"] = tokens.hostToken;
  }
  if (tokens.playerToken) {
    headers["X-Player-Token"] = tokens.playerToken;
  }
  const result = await request(`/api/v1/rooms/${code}/turns/current/confirm`, commandResponseSchema, {
    method: "POST",
    headers,
  });
  return result.snapshot;
}

export async function advanceRound(code: string, hostToken: string): Promise<RoomSnapshot> {
  const result = await request(`/api/v1/rooms/${code}/host/advance-round`, commandResponseSchema, {
    method: "POST",
    headers: { "X-Host-Token": hostToken },
  });
  return result.snapshot;
}

export async function rematchRoom(
  code: string,
  hostToken: string,
  input: { sameCards: boolean; sameTeams: boolean },
): Promise<RoomSnapshot> {
  const result = await request(`/api/v1/rooms/${code}/host/rematch`, commandResponseSchema, {
    method: "POST",
    headers: { "X-Host-Token": hostToken },
    body: JSON.stringify(input),
  });
  return result.snapshot;
}
