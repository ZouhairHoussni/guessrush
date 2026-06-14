import { RefreshCw, Wifi, WifiOff } from "lucide-react";

import type { ConnectionStatus } from "../../api/sockets";

const statusCopy: Record<ConnectionStatus, { label: string; title: string; notice: string }> = {
  connected: {
    label: "Live",
    title: "Realtime room updates are connected.",
    notice: "",
  },
  connecting: {
    label: "Connecting",
    title: "Connecting to realtime room updates.",
    notice: "Connecting to the room. If this takes a moment, the latest snapshot is still loading.",
  },
  reconnecting: {
    label: "Reconnecting",
    title: "Trying to reconnect to realtime room updates.",
    notice: "Reconnecting. Keep this page open and GuessRush will resync the room automatically.",
  },
  offline: {
    label: "Offline",
    title: "Realtime updates are paused.",
    notice:
      "Connection paused. Check Wi-Fi or that the host server is still running; this page will resync when it returns.",
  },
};

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const safeStatus = statusCopy[status] ? status : "connecting";
  const connected = safeStatus === "connected";
  const copy = statusCopy[safeStatus];
  const Icon = safeStatus === "connected" ? Wifi : safeStatus === "reconnecting" ? RefreshCw : WifiOff;
  return (
    <span
      aria-live="polite"
      title={copy.title}
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold",
        connected ? "bg-white/[0.92] text-brand-blue-900" : "bg-brand-yellow-500 text-ink",
      ].join(" ")}
    >
      <Icon
        size={14}
        aria-hidden
        className={safeStatus === "reconnecting" ? "motion-safe:animate-spin" : undefined}
      />
      {copy.label}
    </span>
  );
}

export function ConnectionNotice({ status }: { status: ConnectionStatus }) {
  const safeStatus = statusCopy[status] ? status : "connecting";

  if (safeStatus === "connected") {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-brand-yellow-500 bg-brand-yellow-500 px-4 py-3 text-sm font-bold text-ink shadow-button"
    >
      {statusCopy[safeStatus].notice}
    </div>
  );
}
