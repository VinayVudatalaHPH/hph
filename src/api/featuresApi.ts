import { apiSlice, providesList } from "./apiSlice";
import { notifyOnSettle } from "./notify";
import type { Feature, FeaturePayload } from "./types";

export const featuresApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listFeatures: builder.query<Feature[], void>({
      query: () => ({ url: "/features" }),
      providesTags: (result) => providesList("Features", result),
    }),
    createFeature: builder.mutation<Feature, FeaturePayload>({
      query: (body) => ({ url: "/features", method: "POST", body }),
      invalidatesTags: [{ type: "Features", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
    updateFeature: builder.mutation<Feature, { id: number; body: Partial<FeaturePayload> }>({
      query: ({ id, body }) => ({ url: `/features/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Features", id },
        { type: "Features", id: "LIST" },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
    // The backend's DELETE is a soft toggle (feature.active = false), not a
    // row removal — the UI calls this "Deactivate", never "Delete".
    deactivateFeature: builder.mutation<Feature, number>({
      query: (id) => ({ url: `/features/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Features", id },
        { type: "Features", id: "LIST" },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
  }),
});

export const {
  useListFeaturesQuery,
  useCreateFeatureMutation,
  useUpdateFeatureMutation,
  useDeactivateFeatureMutation,
} = featuresApi;
