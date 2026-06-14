import { Clock3 } from "lucide-react";
import { Link } from "react-router-dom";

interface AppLogoProps {
  compact?: boolean;
  to?: string;
  ariaLabel?: string;
}

export function AppLogo({ compact = false, to = "/", ariaLabel = "GuessRush home" }: AppLogoProps) {
  return (
    <Link to={to} className="inline-flex items-center gap-3 text-white" aria-label={ariaLabel}>
      <span className="grid h-11 w-11 place-items-center rounded-[18px] bg-brand-yellow-500 text-ink shadow-button">
        <Clock3 aria-hidden size={compact ? 22 : 26} strokeWidth={3} />
      </span>
      <span className={compact ? "font-display text-2xl font-bold" : "font-display text-4xl font-bold"}>
        GuessRush
      </span>
    </Link>
  );
}
