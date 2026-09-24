import { apiSlice, providesList } from "./apiSlice";
import { notifyOnSettle } from "./notify";
import { buildQueryString } from "./queryString";
import type {
  ManualBulkUploadPayload,
  ManualBulkUploadResult,
  ManualDailyRecord,
  ManualDailyRecordQuery,
  ManualDailyRecordUpsertPayload,
  ManualImportChunkPayload,
  ManualImportProgress,
  ManualImportStartPayload,
} from "./types";

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
    uploadManualDailyRecords: builder.mutation<ManualBulkUploadResult, ManualBulkUploadPayload>({
      query: (body) => ({ url: "/manual-daily-records/bulk-upload", method: "POST", body }),
      invalidatesTags: [{ type: "ManualDailyRecords", id: "LIST" }, { type: "CodingDashboard" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
    startManualImport: builder.mutation<ManualImportProgress, ManualImportStartPayload>({
      query: (body) => ({ url: "/manual-daily-records/imports", method: "POST", body }),
    }),
    uploadManualImportChunk: builder.mutation<ManualImportProgress, ManualImportChunkPayload>({
      query: ({ importId, chunkNumber, ...body }) => ({
        url: `/manual-daily-records/imports/${importId}/chunks/${chunkNumber}`,
        method: "POST",
        body,
      }),
    }),
    completeManualImport: builder.mutation<ManualImportProgress, number>({
      query: (importId) => ({ url: `/manual-daily-records/imports/${importId}/complete`, method: "POST" }),
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
  useLazyListManualDailyRecordsQuery,
  useUpsertManualDailyRecordMutation,
  useUploadManualDailyRecordsMutation,
  useStartManualImportMutation,
  useUploadManualImportChunkMutation,
  useCompleteManualImportMutation,
  useApproveManualDailyRecordMutation,
  useRejectManualDailyRecordMutation,
} = manualDailyRecordsApi;
