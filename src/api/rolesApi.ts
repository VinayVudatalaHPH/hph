import { apiSlice, providesList } from "./apiSlice";
import { notifyOnSettle } from "./notify";
import type { AdminRole, RolePayload, RoleType, SessionTimeout } from "./types";

export const rolesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listRoles: builder.query<AdminRole[], void>({
      query: () => ({ url: "/roles" }),
      providesTags: (result) => providesList("Roles", result),
    }),
    getRole: builder.query<AdminRole, number>({
      query: (id) => ({ url: `/roles/${id}` }),
      providesTags: (_result, _error, id) => [{ type: "Roles", id }],
    }),
    createRole: builder.mutation<AdminRole, RolePayload>({
      query: (body) => ({ url: "/roles", method: "POST", body }),
      invalidatesTags: [{ type: "Roles", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
    updateRole: builder.mutation<AdminRole, { id: number; body: Partial<RolePayload> }>({
      query: ({ id, body }) => ({ url: `/roles/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Roles", id },
        { type: "Roles", id: "LIST" },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
    deleteRole: builder.mutation<null, number>({
      query: (id) => ({ url: `/roles/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Roles", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),

    // Fixed seed data (§0 addition) — populates the roleType picker on the
    // Roles form and the session-timeout editor below.
    listRoleTypes: builder.query<RoleType[], void>({
      query: () => ({ url: "/role-types" }),
      providesTags: (result) => providesList("RoleTypes", result),
    }),
    getSessionTimeout: builder.query<SessionTimeout, number>({
      query: (roleTypeId) => ({ url: `/role-types/${roleTypeId}/session-timeout` }),
      providesTags: (_result, _error, roleTypeId) => [{ type: "RoleTypes", id: roleTypeId }],
    }),
    updateSessionTimeout: builder.mutation<SessionTimeout, { roleTypeId: number; sessionTimeoutMinutes: number }>({
      query: ({ roleTypeId, sessionTimeoutMinutes }) => ({
        url: `/role-types/${roleTypeId}/session-timeout`,
        method: "PATCH",
        body: { session_timeout_minutes: sessionTimeoutMinutes },
      }),
      invalidatesTags: (_result, _error, { roleTypeId }) => [
        { type: "RoleTypes", id: roleTypeId },
        { type: "RoleTypes", id: "LIST" },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
  }),
});

export const {
  useListRolesQuery,
  useGetRoleQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useListRoleTypesQuery,
  useGetSessionTimeoutQuery,
  useUpdateSessionTimeoutMutation,
} = rolesApi;
