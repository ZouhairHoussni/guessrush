import { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  narrow?: boolean;
}

export function PageShell({ children, narrow = false }: PageShellProps) {
  return (
    <main className="blue-radial-background relative min-h-screen overflow-x-hidden px-4 py-3 text-white sm:px-6 sm:py-5 lg:px-8">
      <div className="soft-grid-background pointer-events-none absolute inset-0" aria-hidden />
      <div className={["relative mx-auto", narrow ? "max-w-2xl" : "max-w-6xl"].join(" ")}>
        {children}
      </div>
    </main>
  );
}
