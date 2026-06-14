import { Menu } from "lucide-react";
import { ReactNode } from "react";

import type { ConnectionStatus } from "../../api/sockets";
import { AppLogo } from "./AppLogo";
import { ConnectionBadge } from "./ConnectionBadge";
import { MuteToggle } from "./MuteToggle";

interface TopBarProps {
  code?: string | null;
  role?: ReactNode;
  connectionStatus?: ConnectionStatus;
  logoTo?: string;
  logoLabel?: string;
  menuLabel?: string;
  onMenuClick?: () => void;
  showSoundToggle?: boolean;
}

export function TopBar({
  code,
  role,
  connectionStatus,
  logoTo = "/",
  logoLabel,
  menuLabel = "Open menu",
  onMenuClick,
  showSoundToggle = true,
}: TopBarProps) {
  const resolvedLogoLabel = logoLabel ?? (logoTo === "/" ? "GuessRush home" : "GuessRush room");

  return (
    <header className="flex items-center justify-between gap-3 py-1">
      <AppLogo compact to={logoTo} ariaLabel={resolvedLogoLabel} />
      <div className="flex min-w-0 items-center justify-end gap-2">
        {code ? (
          <span className="hidden rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-white sm:inline-flex">
            {code}
          </span>
        ) : null}
        {role ? <span className="hidden sm:inline-flex">{role}</span> : null}
        {connectionStatus ? <ConnectionBadge status={connectionStatus} /> : null}
        {showSoundToggle ? <MuteToggle /> : null}
        {onMenuClick ? (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label={menuLabel}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/12 text-white hover:bg-white/18"
          >
            <Menu size={18} aria-hidden />
          </button>
        ) : null}
      </div>
    </header>
  );
}
