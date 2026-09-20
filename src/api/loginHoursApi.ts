import { apiSlice, providesList } from "./apiSlice";
import { notifyOnSettle } from "./notify";
import { buildQueryString } from "./queryString";
import type {
  LoginHourRecordPage,
  LoginHourRecordQuery,
  LoginHoursUploadBatch,
  LoginHoursUploadPayload,
} from "./types";

export const loginHoursApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listLoginHoursUploads: builder.query<LoginHoursUploadBatch[], void>({
      query: () => ({ url: "/login-hours/uploads" }),
      providesTags: (result) => providesList("LoginHours", result),
    }),
    uploadLoginHours: builder.mutation<LoginHoursUploadBatch, LoginHoursUploadPayload>({
      query: (body) => ({ url: "/login-hours/uploads", method: "POST", body }),
      invalidatesTags: [
        { type: "LoginHours", id: "LIST" },
        { type: "LoginHours", id: "RECORDS" },
        { type: "CodingDashboard" },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
    listLoginHourRecords: builder.query<LoginHourRecordPage, LoginHourRecordQuery>({
      query: (params) => ({ url: `/login-hours/records${buildQueryString(params)}` }),
      providesTags: [{ type: "LoginHours", id: "RECORDS" }],
    }),
  }),
});

export const {
  useListLoginHoursUploadsQuery,
  useUploadLoginHoursMutation,
  useListLoginHourRecordsQuery,
} = loginHoursApi;
