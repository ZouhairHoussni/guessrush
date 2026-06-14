import { CSSProperties, ReactNode } from "react";

import { motionClass } from "../../motion/motionTokens";

interface MotionPageProps {
  motionKey?: string | number;
  children: ReactNode;
  className?: string;
}

export function MotionPage({ motionKey, children, className = "" }: MotionPageProps) {
  return (
    <div key={motionKey} className={[motionClass.page, className].join(" ")}>
      {children}
    </div>
  );
}

interface AnimatedPanelProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}

export function AnimatedPanel({ children, className = "", delayMs = 0 }: AnimatedPanelProps) {
  return (
    <div
      className={[motionClass.panel, className].join(" ")}
      style={{ "--motion-delay": `${delayMs}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
  index?: number;
}

export function AnimatedListItem({ children, className = "", index = 0 }: AnimatedListItemProps) {
  return (
    <div
      className={[motionClass.listItem, className].join(" ")}
      style={{ "--motion-delay": `${Math.min(index * 55, 220)}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

interface ScorePopProps {
  value: number;
  delta?: number;
  animate?: boolean;
  className?: string;
}

export function ScorePop({ value, delta = 0, animate = false, className = "" }: ScorePopProps) {
  return (
    <span className="relative inline-flex items-baseline">
      <span
        key={value}
        className={[delta !== 0 || animate ? motionClass.scorePop : "", className].join(" ")}
      >
        {value}
      </span>
      {delta > 0 ? (
        <span
          key={`delta-${value}`}
          className="motion-score-delta absolute -right-8 -top-2 text-base font-black"
          aria-hidden
        >
          +{delta}
        </span>
      ) : null}
    </span>
  );
}
