import type { UnknownAction } from "@reduxjs/toolkit";

import { toastShown } from "@/features/ui/uiSlice";

import { getErrorMessage } from "./apiError";
import type { ApiErrorShape } from "./apiError";
import type { ApiResponseMeta } from "./baseQuery";

type Dispatch = (action: UnknownAction) => unknown;

// Every mutation's success/error `message` from the backend is shown
// directly as a toast (doc's cross-cutting conventions) — centralized here,
// in each endpoint's `onQueryStarted`, so pages don't repeat this. `login`
// is the one deliberate exception (§5 wants a couple of messages rewritten
// client-side), so it wires its own handling in LoginPage instead.
export async function notifyOnSettle<T>(
  dispatch: Dispatch,
  queryFulfilled: Promise<{ data: T; meta?: ApiResponseMeta }>,
) {
  try {
    const { meta } = await queryFulfilled;
    if (meta?.message) {
      dispatch(toastShown({ type: "success", message: meta.message }));
    }
  } catch (rejected) {
    const { error } = rejected as { error: ApiErrorShape };
    dispatch(toastShown({ type: "error", message: getErrorMessage(error) }));
  }
}
