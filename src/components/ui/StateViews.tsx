import type { ReactNode } from "react";

// Every list/detail screen has three explicit states — loading, empty,
// error — never a silent blank screen (doc's cross-cutting conventions).

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-content-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border py-16 text-center">
      <p className="text-sm font-medium text-content-secondary">{title}</p>
      {description && <p className="text-sm text-content-muted">{description}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-danger/30 bg-danger-bg py-16 text-center">
      <p className="text-sm font-medium text-danger">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium text-danger underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  );
}

export function NotPermittedState({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface py-16 text-center">
      <p className="text-sm font-medium text-content-secondary">You don't have permission to view this page.</p>
      {children}
    </div>
  );
}
