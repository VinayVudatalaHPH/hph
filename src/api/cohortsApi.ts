import { apiSlice, providesList } from "./apiSlice";
import { buildQueryString } from "./queryString";
import { notifyOnSettle } from "./notify";
import type {
  ChangeStageTargetPayload,
  CodingUserSummary,
  CreateTeamCohortPayload,
  StageTargetRule,
  PaginatedResult,
  TeamCoderOverviewItem,
  TeamCoderOverviewQuery,
  TeamCohort,
} from "./types";

export const cohortsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTeamCoderOverview: builder.query<PaginatedResult<TeamCoderOverviewItem>, TeamCoderOverviewQuery>({
      query: (params) => ({ url: `/team/coders${buildQueryString(params)}` }),
      providesTags: [{ type: "Team" }],
    }),
    listTeamCohorts: builder.query<TeamCohort[], void>({
      query: () => ({ url: "/team/cohorts" }),
      providesTags: (result) => providesList("Cohorts", result),
    }),
    listEligibleCohortMembers: builder.query<CodingUserSummary[], void>({
      query: () => ({ url: "/team/cohorts/eligible-members" }),
      providesTags: [{ type: "Cohorts", id: "ELIGIBLE" }],
    }),
    createTeamCohort: builder.mutation<TeamCohort, CreateTeamCohortPayload>({
      query: (body) => ({ url: "/team/cohorts", method: "POST", body }),
      invalidatesTags: [
        { type: "Cohorts", id: "LIST" },
        { type: "Cohorts", id: "ELIGIBLE" },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
    listStageTargetRules: builder.query<StageTargetRule[], void>({
      query: () => ({ url: "/stage-target-rules" }),
      providesTags: (result) => providesList("StageTargets", result),
    }),
    changeStageTarget: builder.mutation<StageTargetRule, ChangeStageTargetPayload>({
      query: (body) => ({ url: "/team/stage-targets/change", method: "POST", body }),
      invalidatesTags: [{ type: "StageTargets", id: "LIST" }, { type: "CodingDashboard" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await notifyOnSettle(dispatch, queryFulfilled);
      },
    }),
  }),
});

export const {
  useGetTeamCoderOverviewQuery,
  useListTeamCohortsQuery,
  useListEligibleCohortMembersQuery,
  useCreateTeamCohortMutation,
  useListStageTargetRulesQuery,
  useChangeStageTargetMutation,
} = cohortsApi;
