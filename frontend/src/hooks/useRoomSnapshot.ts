import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getRoomSnapshot } from "../api/http";
import { connectRoomSocket, type ConnectionStatus } from "../api/sockets";

interface UseRoomSnapshotOptions {
  code: string | undefined;
  hostToken?: string | null;
  playerToken?: string | null;
  enabled?: boolean;
}

export function useRoomSnapshot({
  code,
  hostToken,
  playerToken,
  enabled = true,
}: UseRoomSnapshotOptions) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const query = useQuery({
    queryKey: ["room-snapshot", code, hostToken ? "host" : playerToken ? "player" : "public"],
    enabled: Boolean(code) && enabled,
    queryFn: () => getRoomSnapshot(code!, { hostToken, playerToken }),
  });
  const { refetch } = query;

  useEffect(() => {
    if (!code || !enabled) {
      return undefined;
    }
    const socket = connectRoomSocket({
      code,
      hostToken,
      playerToken,
      onSnapshot: () => {
        void refetch();
      },
      onStatus: setConnectionStatus,
    });
    return () => {
      socket.disconnect();
    };
  }, [code, enabled, hostToken, playerToken, refetch]);

  useEffect(() => {
    if (!code || !enabled) {
      return undefined;
    }
    function recoverSnapshot() {
      void refetch();
    }
    window.addEventListener("focus", recoverSnapshot);
    window.addEventListener("online", recoverSnapshot);
    document.addEventListener("visibilitychange", recoverSnapshot);
    return () => {
      window.removeEventListener("focus", recoverSnapshot);
      window.removeEventListener("online", recoverSnapshot);
      document.removeEventListener("visibilitychange", recoverSnapshot);
    };
  }, [code, enabled, refetch]);

  return { ...query, connectionStatus };
}
