import { apiSlice } from "./apiSlice";
import { notifyOnSettle } from "./notify";
import type { AuthUser, LoginPayload, SetPasswordPayload } from "./types";

interface UserEnvelope {
  user: AuthUser;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Called once on app mount to restore "who's logged in" from the
    // session cookie without forcing a re-login on refresh.
    whoami: builder.query<UserEnvelope, void>({
      query: () => ({ url: "/sessions/whoami" }),
      providesTags: ["CurrentUser"],
    }),
    // Each of these mints or ends the caller's session, so the cached
    // /sessions/me list (used for "current session" duration) is just as
    // stale as CurrentUser afterwards — without this, whichever session row
    // was cached from the previous user/login lingers and its createdAt
    // keeps counting instead of resetting.
    login: builder.mutation<UserEnvelope, LoginPayload>({
      query: (body) => ({ url: "/sessions/login", method: "POST", body }),
      invalidatesTags: ["CurrentUser", "Sessions"],
    }),
    logout: builder.mutation<null, void>({
      query: () => ({ url: "/sessions/logout", method: "POST" }),
      invalidatesTags: ["CurrentUser", "Sessions"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
    // Session is rotated server-side on success — the response already
    // includes the fresh user profile, so authSlice adopts it directly.
    setPassword: builder.mutation<UserEnvelope, SetPasswordPayload>({
      query: (body) => ({ url: "/users/set-password", method: "POST", body }),
      invalidatesTags: ["CurrentUser", "Sessions"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
  }),
});

export const { useWhoamiQuery, useLoginMutation, useLogoutMutation, useSetPasswordMutation } = authApi;
