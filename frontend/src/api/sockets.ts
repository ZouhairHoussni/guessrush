import { io, Socket } from "socket.io-client";

import { API_BASE_URL, roomSnapshotSchema } from "./http";
import type { RoomSnapshot } from "./types";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "offline";

interface RoomSocketOptions {
  code: string;
  hostToken?: string | null;
  playerToken?: string | null;
  onSnapshot: (snapshot: RoomSnapshot) => void;
  onStatus: (status: ConnectionStatus) => void;
}

export function connectRoomSocket(options: RoomSocketOptions): Socket {
  options.onStatus("connecting");
  const socket = io(API_BASE_URL, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    auth: {
      code: options.code,
      hostToken: options.hostToken ?? undefined,
      playerToken: options.playerToken ?? undefined,
    },
  });

  socket.on("connect", () => options.onStatus("connected"));
  socket.io.on("reconnect_attempt", () => options.onStatus("reconnecting"));
  socket.io.on("reconnect", () => options.onStatus("connected"));
  socket.on("disconnect", () => options.onStatus("offline"));
  socket.on("connect_error", () => options.onStatus("offline"));
  socket.on("room:snapshot", (payload: unknown) => {
    const parsed = roomSnapshotSchema.safeParse(payload);
    if (parsed.success) {
      options.onSnapshot(parsed.data);
    }
  });

  return socket;
}
