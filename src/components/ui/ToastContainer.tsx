import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { toastDismissed, type Toast } from "@/features/ui/uiSlice";

const TONE_CLASSES: Record<Toast["type"], string> = {
  success: "border-success/30 bg-success-bg text-success",
  error: "border-danger/30 bg-danger-bg text-danger",
  info: "border-brand-200 bg-brand-50 text-brand-700",
};

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = window.setTimeout(() => dispatch(toastDismissed(toast.id)), 5000);
    return () => window.clearTimeout(timer);
  }, [dispatch, toast.id]);

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-card ${TONE_CLASSES[toast.type]}`}
    >
      <p className="flex-1">{toast.message}</p>
      <button
        onClick={() => dispatch(toastDismissed(toast.id))}
        aria-label="Dismiss"
        className="text-current opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useAppSelector((state) => state.ui.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-full max-w-sm">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
