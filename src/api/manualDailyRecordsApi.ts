import { apiSlice, providesList } from "./apiSlice";
import { notifyOnSettle } from "./notify";
import { buildQueryString } from "./queryString";
import type { ManualDailyRecord, ManualDailyRecordQuery, ManualDailyRecordUpsertPayload } from "./types";

export const manualDailyRecordsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listManualDailyRecords: builder.query<ManualDailyRecord[], ManualDailyRecordQuery | void>({
      query: (args) => ({ url: `/manual-daily-records${buildQueryString({ ...args })}` }),
      providesTags: (result) => providesList("ManualDailyRecords", result),
    }),
    upsertManualDailyRecord: builder.mutation<ManualDailyRecord, ManualDailyRecordUpsertPayload>({
      query: (body) => ({ url: "/manual-daily-records", method: "POST", body }),
      invalidatesTags: [{ type: "ManualDailyRecords", id: "LIST" }, { type: "CodingDashboard" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
    approveManualDailyRecord: builder.mutation<ManualDailyRecord, number>({
      query: (id) => ({ url: `/manual-daily-records/${id}/approve`, method: "POST" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "ManualDailyRecords", id },
        { type: "ManualDailyRecords", id: "LIST" },
        { type: "CodingDashboard" },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
    rejectManualDailyRecord: builder.mutation<ManualDailyRecord, { id: number; reason?: string | null }>({
      query: ({ id, reason }) => ({ url: `/manual-daily-records/${id}/reject`, method: "POST", body: { reason } }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "ManualDailyRecords", id },
        { type: "ManualDailyRecords", id: "LIST" },
        { type: "CodingDashboard" },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
  }),
});

export const {
  useListManualDailyRecordsQuery,
  useUpsertManualDailyRecordMutation,
  useApproveManualDailyRecordMutation,
  useRejectManualDailyRecordMutation,
} = manualDailyRecordsApi;
