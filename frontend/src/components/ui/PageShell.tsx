import { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  narrow?: boolean;
  fullHeight?: boolean;
  contentClassName?: string;
}

export function PageShell({
  children,
  narrow = false,
  fullHeight = false,
  contentClassName = "",
}: PageShellProps) {
  return (
    <main
      className={[
        "blue-radial-background relative overflow-x-hidden px-4 py-3 text-white sm:px-6 sm:py-5 lg:px-8",
        fullHeight ? "h-[100dvh] min-h-[100dvh] overflow-hidden" : "min-h-screen",
      ].join(" ")}
    >
      <div className="soft-grid-background pointer-events-none absolute inset-0" aria-hidden />
      <div
        className={[
          "relative mx-auto",
          fullHeight ? "flex h-full min-h-0 flex-col" : "",
          narrow ? "max-w-2xl" : "max-w-6xl",
          contentClassName,
        ].join(" ")}
      >
        {children}
      </div>
    </main>
  );
}
