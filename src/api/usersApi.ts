import { apiSlice, providesList } from "./apiSlice";
import { notifyOnSettle } from "./notify";
import type { AdminUser, UserCreatePayload, UserUpdatePayload } from "./types";

export type UserStatusFilter = "all" | "active" | "inactive";

const LIST_PATH: Record<UserStatusFilter, string> = {
  all: "/users",
  active: "/users/active",
  inactive: "/users/inactive",
};

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listUsers: builder.query<AdminUser[], UserStatusFilter>({
      query: (status) => ({ url: LIST_PATH[status] }),
      providesTags: (result) => providesList("Users", result),
    }),
    getUser: builder.query<AdminUser, number>({
      query: (id) => ({ url: `/users/${id}` }),
      providesTags: (_result, _error, id) => [{ type: "Users", id }],
    }),
    createUser: builder.mutation<AdminUser, UserCreatePayload>({
      query: (body) => ({ url: "/users", method: "POST", body }),
      invalidatesTags: [{ type: "Users", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
    updateUser: builder.mutation<AdminUser, { id: number; body: UserUpdatePayload }>({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
    deactivateUser: builder.mutation<null, number>({
      query: (id) => ({ url: `/users/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
    resendTemporaryPassword: builder.mutation<AdminUser, number>({
      query: (id) => ({ url: `/users/${id}/resend-temporary-password`, method: "POST" }),
      invalidatesTags: (_result, _error, id) => [{ type: "Users", id }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
  }),
});

export const {
  useListUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useResendTemporaryPasswordMutation,
} = usersApi;
