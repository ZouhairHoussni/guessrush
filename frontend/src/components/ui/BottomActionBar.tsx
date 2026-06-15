import { ReactNode } from "react";

interface BottomActionBarProps {
  primary: ReactNode;
  secondary?: ReactNode;
}

export function BottomActionBar({ primary, secondary }: BottomActionBarProps) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-3 border-t border-white/12 bg-brand-blue-900/86 px-4 py-2.5 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
      <div className={secondary ? "grid grid-cols-[auto_1fr] items-center gap-3" : "grid"}>
        {secondary}
        {primary}
      </div>
    </div>
  );
}
