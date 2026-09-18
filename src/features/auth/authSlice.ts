import { createSlice } from "@reduxjs/toolkit";

import { authApi } from "@/api/authApi";
import type { AuthUser } from "@/api/types";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
}

const initialState: AuthState = {
  user: null,
  status: "idle",
};

// Holds "who's logged in" — the one piece of client state the doc calls out
// as genuinely global (§1). Populated entirely by matching on authApi's own
// query/mutation lifecycle actions rather than duplicating request logic.
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(authApi.endpoints.whoami.matchPending, (state) => {
        state.status = "loading";
      })
      .addMatcher(authApi.endpoints.whoami.matchFulfilled, (state, action) => {
        state.user = action.payload.user;
        state.status = "authenticated";
      })
      .addMatcher(authApi.endpoints.whoami.matchRejected, (state) => {
        state.user = null;
        state.status = "unauthenticated";
      })
      .addMatcher(authApi.endpoints.login.matchFulfilled, (state, action) => {
        state.user = action.payload.user;
        state.status = "authenticated";
      })
      .addMatcher(authApi.endpoints.setPassword.matchFulfilled, (state, action) => {
        state.user = action.payload.user;
        state.status = "authenticated";
      })
      .addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
        state.user = null;
        state.status = "unauthenticated";
      });
  },
});

export default authSlice.reducer;
