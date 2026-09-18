import { useCallback } from "react";

import { useAppDispatch } from "@/app/hooks";

import { toastShown } from "./uiSlice";

// Every mutation's success/error `message` from the backend is shown
// directly (never re-derived) per the doc's cross-cutting conventions.
export function useToast() {
  const dispatch = useAppDispatch();

  const notifySuccess = useCallback(
    (message: string) => dispatch(toastShown({ type: "success", message })),
    [dispatch],
  );
  const notifyError = useCallback((message: string) => dispatch(toastShown({ type: "error", message })), [dispatch]);
  const notifyInfo = useCallback((message: string) => dispatch(toastShown({ type: "info", message })), [dispatch]);

  return { notifySuccess, notifyError, notifyInfo };
}
