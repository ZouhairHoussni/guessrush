import { Copy, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";

import type { RoomSnapshot } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";

interface HostInvitePanelProps {
  snapshot: RoomSnapshot;
}

function baseUrlFromJoinUrl(joinUrl: string, code: string): string {
  const suffix = `/join/${code}`;
  return joinUrl.endsWith(suffix) ? joinUrl.slice(0, -suffix.length) : joinUrl;
}

function browserJoinUrl(snapshot: RoomSnapshot): string {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL ?? import.meta.env.VITE_APP_URL;
  const browserOrigin = window.location.origin;
  const browserIsLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(
    browserOrigin,
  );
  const snapshotBaseUrl = baseUrlFromJoinUrl(snapshot.joinUrl, snapshot.room.code);
  const fallbackUrl = browserIsLocal ? snapshotBaseUrl : browserOrigin;
  const origin =
    configuredUrl && configuredUrl.length > 0
      ? configuredUrl
      : fallbackUrl || browserOrigin;
  return `${origin.replace(/\/$/, "")}/join/${snapshot.room.code}`;
}

export function HostInvitePanel({ snapshot }: HostInvitePanelProps) {
  const [copied, setCopied] = useState(false);
  const joinUrl = useMemo(() => browserJoinUrl(snapshot), [snapshot]);
  const isLocalJoinUrl = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\//i.test(
    joinUrl,
  );

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Panel
      variant="hero"
      className="grid grid-cols-[116px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[148px_minmax(0,1fr)] sm:p-4 lg:grid-cols-[156px_minmax(0,1fr)]"
    >
      <div
        className="grid place-items-center rounded-[20px] border border-brand-blue-100 bg-white p-2"
        aria-label={`QR code for joining room ${snapshot.room.code}`}
      >
        <QRCodeSVG
          value={joinUrl}
          size={132}
          fgColor="#101828"
          bgColor="#FFFFFF"
          role="img"
          aria-label={`Join GuessRush room ${snapshot.room.code}`}
        />
      </div>
      <div className="flex min-w-0 flex-col justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-blue-800 sm:text-sm">
            <QrCode size={16} aria-hidden />
            Scan to join
          </p>
          <h1 className="mt-1 font-display text-[clamp(2.2rem,9vw,3.8rem)] font-bold leading-none tracking-[0.12em] text-brand-blue-900">
            {snapshot.room.code}
          </h1>
          {isLocalJoinUrl ? (
            <p className="mt-2 max-w-xl rounded-2xl bg-[#fff7ce] px-3 py-2 text-xs font-black text-ink sm:text-sm">
              Phone testing needs a LAN URL. Set VITE_PUBLIC_APP_URL to this computer's local IP.
            </p>
          ) : (
            <p className="mt-2 max-w-xl text-xs font-semibold text-muted sm:text-sm">
              Players on the same Wi-Fi can scan this QR and appear here instantly.
            </p>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 rounded-2xl bg-soft px-3 py-2 text-xs font-bold text-muted sm:text-sm">
            <span className="block truncate">{joinUrl}</span>
          </div>
          <Button tone="secondaryOnLight" onClick={copyLink} className="min-h-10 whitespace-nowrap py-2">
            <Copy size={16} aria-hidden />
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
