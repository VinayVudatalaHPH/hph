import type { ReactNode } from "react";

import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "primary" | "danger";
  isLoading?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "primary",
  isLoading,
  confirmDisabled,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-hph-blue/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-white/60 bg-surface p-6 shadow-popover">
        <div className="mb-4 h-1 w-12 rounded-full bg-hph-magenta" />
        <h2 className="text-lg font-semibold text-hph-blue">{title}</h2>
        {description && <p className="mt-2 text-sm text-content-secondary">{description}</p>}
        {children}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" variant={variant} onClick={onConfirm} isLoading={isLoading} disabled={isLoading || confirmDisabled}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
