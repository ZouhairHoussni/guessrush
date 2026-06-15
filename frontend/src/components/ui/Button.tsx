import { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { Link, LinkProps } from "react-router-dom";

import { useSound } from "../../audio/useSound";
import type { SoundEventName } from "../../audio/soundManager";

type ButtonTone = "primary" | "secondary" | "secondaryOnLight" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  fullWidth?: boolean;
  pending?: boolean;
  pendingLabel?: string;
  sound?: SoundEventName | false;
  children: ReactNode;
}

const toneClass: Record<ButtonTone, string> = {
  primary:
    "bg-brand-yellow-500 text-ink shadow-button hover:bg-brand-yellow-400 active:translate-y-0.5 disabled:bg-white/35 disabled:text-white/70 disabled:shadow-none",
  secondary:
    "border border-white/24 bg-white/12 text-white hover:bg-white/18 active:translate-y-0.5 disabled:border-white/16 disabled:text-white/50",
  secondaryOnLight:
    "border border-brand-blue-100 bg-white text-brand-blue-900 hover:bg-brand-blue-100 active:translate-y-0.5 disabled:text-muted",
  ghost: "bg-white/10 text-white hover:bg-white/16 active:translate-y-0.5 disabled:text-white/50",
  danger:
    "bg-brand-red-500 text-white shadow-button hover:bg-[#d92d20] active:translate-y-0.5 disabled:bg-brand-red-500/45 disabled:text-white/70 disabled:shadow-none",
};

const baseClass =
  "pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-[16px] px-4 py-2.5 text-center font-bold disabled:cursor-not-allowed sm:min-h-12 sm:px-5 sm:py-3";

export function Button({
  tone = "primary",
  fullWidth = false,
  pending = false,
  pendingLabel,
  disabled,
  sound = "button_click",
  className = "",
  onClick,
  children,
  ...props
}: ButtonProps) {
  const { playSound, unlockAudio } = useSound();

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!disabled && !pending && sound) {
      unlockAudio();
      playSound(sound);
    }
    onClick?.(event);
  }

  return (
    <button
      className={[
        baseClass,
        fullWidth ? "w-full" : "",
        toneClass[tone],
        className,
      ].join(" ")}
      disabled={disabled || pending}
      onClick={handleClick}
      {...props}
    >
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}

interface LinkButtonProps extends LinkProps {
  tone?: Exclude<ButtonTone, "danger">;
  fullWidth?: boolean;
  sound?: SoundEventName | false;
}

export function LinkButton({
  tone = "primary",
  fullWidth = false,
  sound = "button_click",
  className = "",
  onClick,
  children,
  ...props
}: LinkButtonProps) {
  const { playSound, unlockAudio } = useSound();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (sound) {
      unlockAudio();
      playSound(sound);
    }
    onClick?.(event);
  }

  return (
    <Link
      className={[
        baseClass,
        fullWidth ? "w-full" : "",
        toneClass[tone],
        className,
      ].join(" ")}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
}
