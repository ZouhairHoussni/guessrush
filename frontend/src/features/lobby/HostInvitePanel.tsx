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
    <Panel variant="hero" className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[228px_1fr]">
      <div
        className="rounded-[24px] border border-brand-blue-100 bg-white p-3"
        aria-label={`QR code for joining room ${snapshot.room.code}`}
      >
        <QRCodeSVG
          value={joinUrl}
          size={196}
          fgColor="#101828"
          bgColor="#FFFFFF"
          role="img"
          aria-label={`Join GuessRush room ${snapshot.room.code}`}
        />
      </div>
      <div className="flex flex-col justify-between gap-5">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-brand-blue-800">
            <QrCode size={18} aria-hidden />
            Scan to join
          </p>
          <h1 className="mt-2 font-display text-5xl font-bold tracking-[0.12em] text-brand-blue-900 sm:text-6xl">
            {snapshot.room.code}
          </h1>
          {isLocalJoinUrl ? (
            <p className="mt-3 max-w-md rounded-2xl bg-[#fff7ce] px-4 py-3 text-sm font-black text-ink">
              Phone testing needs a LAN URL. Set VITE_PUBLIC_APP_URL to this computer's local IP.
            </p>
          ) : (
            <p className="mt-3 max-w-md text-sm font-semibold text-muted">
              Players on the same Wi-Fi can scan this QR and appear here instantly.
            </p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0 rounded-2xl bg-soft px-4 py-3 text-sm font-bold text-muted">
            <span className="block truncate">{joinUrl}</span>
          </div>
          <Button tone="secondaryOnLight" onClick={copyLink} className="whitespace-nowrap">
            <Copy size={18} aria-hidden />
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
