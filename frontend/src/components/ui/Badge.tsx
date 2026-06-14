import { CheckCircle2, Circle, Clock3, ShieldCheck } from "lucide-react";
import { ReactNode } from "react";

import { teamAccent } from "../../utils/teamAccent";

type BadgeTone = "blue" | "yellow" | "green" | "muted" | "white";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const toneClass: Record<BadgeTone, string> = {
  blue: "bg-brand-blue-100 text-brand-blue-900",
  yellow: "bg-brand-yellow-500 text-ink",
  green: "bg-success/12 text-[#067647]",
  muted: "bg-soft text-muted",
  white: "bg-white/14 text-white",
};

export function Badge({ tone = "blue", className = "", children }: BadgeProps) {
  return (
    <span className={["inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", toneClass[tone], className].join(" ")}>
      {children}
    </span>
  );
}

export function ReadyBadge({ ready, compact = false }: { ready: boolean; compact?: boolean }) {
  return (
    <Badge
      tone={ready ? "green" : "muted"}
      className={[compact ? "px-2" : "", ready ? "motion-badge-pop" : ""].join(" ")}
    >
      {ready ? <CheckCircle2 size={13} aria-hidden /> : <Clock3 size={13} aria-hidden />}
      {ready ? "Ready" : "Not ready"}
    </Badge>
  );
}

export function CardStatusBadge({
  submitted,
  compact = false,
}: {
  submitted: boolean;
  compact?: boolean;
}) {
  return (
    <Badge tone={submitted ? "blue" : "yellow"} className={compact ? "px-2" : ""}>
      {submitted ? <CheckCircle2 size={13} aria-hidden /> : <Circle size={12} aria-hidden />}
      {submitted ? "Cards in" : "Needs cards"}
    </Badge>
  );
}

export function RoleBadge({ children }: { children: ReactNode }) {
  return (
    <Badge tone="white">
      <ShieldCheck size={13} aria-hidden />
      {children}
    </Badge>
  );
}

export function TeamBadge({
  children,
  className = "",
  colorKey,
}: {
  children: ReactNode;
  className?: string;
  colorKey?: string | null;
}) {
  if (colorKey) {
    const accent = teamAccent(colorKey);
    return (
      <Badge tone="blue" className={[accent.chip, className].join(" ")}>
        {children}
      </Badge>
    );
  }

  return (
    <Badge tone="yellow" className={className}>
      {children}
    </Badge>
  );
}
