import { ReactNode } from "react";

import { Button } from "./Button";
import { Panel } from "./Panel";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  pendingLabel = "Confirming...",
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/48 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <Panel
        as="div"
        variant="elevated"
        className="w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h2 id="confirm-dialog-title" className="font-display text-3xl font-black">
          {title}
        </h2>
        <div className="mt-2 text-sm font-semibold text-muted">{body}</div>
        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Button tone="secondaryOnLight" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button tone="danger" pending={pending} pendingLabel={pendingLabel} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
