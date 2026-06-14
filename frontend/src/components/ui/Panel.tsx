import { HTMLAttributes, ReactNode } from "react";

type PanelVariant = "default" | "elevated" | "soft" | "hero" | "compact";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "article" | "div";
  variant?: PanelVariant;
  children: ReactNode;
}

const variantClass: Record<PanelVariant, string> = {
  default: "rounded-[28px] bg-paper p-5 text-ink shadow-party sm:p-6",
  elevated: "rounded-[30px] bg-paper p-5 text-ink shadow-panel sm:p-7",
  soft: "rounded-[28px] border border-white/14 bg-white/12 p-5 text-white shadow-party sm:p-6",
  hero: "rounded-[32px] bg-paper p-6 text-ink shadow-panel sm:p-8",
  compact: "rounded-[24px] bg-paper p-4 text-ink shadow-party",
};

export function Panel({
  as: Component = "section",
  variant = "default",
  className = "",
  children,
  ...props
}: PanelProps) {
  return (
    <Component className={[variantClass[variant], className].join(" ")} {...props}>
      {children}
    </Component>
  );
}
