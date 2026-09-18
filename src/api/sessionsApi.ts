import { apiSlice, providesList } from "./apiSlice";
import { notifyOnSettle } from "./notify";
import type { SessionRow } from "./types";

export const sessionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    myActiveSessions: builder.query<SessionRow[], void>({
      query: () => ({ url: "/sessions/me" }),
      providesTags: (result) => providesList("Sessions", result),
    }),
    // Revokes one of the caller's *other* sessions (§0 addition) — never
    // the current one, since the UI only wires this to non-current rows.
    revokeSession: builder.mutation<null, number>({
      query: (sessionId) => ({ url: `/sessions/${sessionId}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Sessions", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
  }),
});

export const { useMyActiveSessionsQuery, useRevokeSessionMutation } = sessionsApi;
