import { useState } from "react";
import { Form, Formik, type FormikHelpers } from "formik";
import * as Yup from "yup";

import { getFieldErrors, toFormikErrors } from "@/api/apiError";
import { useUpsertManualDailyRecordMutation } from "@/api/manualDailyRecordsApi";
import { useGetMyManualRecordsQuery } from "@/api/reportsApi";
import {
  MANUAL_DAILY_RECORD_MAX_HOURS,
  type ManualDailyRecordUpsertPayload,
} from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { TextField } from "@/components/ui/FormField";
import { ManualRecordStatusIndicator } from "@/components/ui/ManualRecordStatusIndicator";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateViews";
import { useAuth } from "@/features/auth/useAuth";

import { ReportsReviewsSection } from "./ReportsReviewsSection";

const MANUAL_RECORDS_PAGE_SIZE = 10;

interface ManualEntryValues {
  date: string;
  pvpCount: string;
  foundationCount: string;
  techIssuesDowntimeHours: string;
  noInventoryIdleTimeHours: string;
  leaveHours: string;
  meetingEngagementHours: string;
}

const hourField = () =>
  Yup.number()
    .typeError("Enter a number")
    .min(0, "Cannot be negative")
    .max(MANUAL_DAILY_RECORD_MAX_HOURS, `Cannot exceed ${MANUAL_DAILY_RECORD_MAX_HOURS} hours`)
    .required("Required");

const manualValidationSchema = Yup.object({
  date: Yup.string().required("Date is required"),
  pvpCount: Yup.number()
    .typeError("Enter a whole number")
    .integer("Enter a whole number")
    .min(0, "Cannot be negative")
    .required("PVP count is required"),
  foundationCount: Yup.number()
    .typeError("Enter a whole number")
    .integer("Enter a whole number")
    .min(0, "Cannot be negative")
    .required("Foundation count is required"),
  techIssuesDowntimeHours: hourField(),
  noInventoryIdleTimeHours: hourField(),
  leaveHours: hourField(),
  meetingEngagementHours: hourField(),
});

function manualInitialValues(): ManualEntryValues {
  return {
    date: new Date().toISOString().slice(0, 10),
    pvpCount: "0",
    foundationCount: "0",
    techIssuesDowntimeHours: "0",
    noInventoryIdleTimeHours: "0",
    leaveHours: "0",
    meetingEngagementHours: "0",
  };
}

interface ManualEntryFormProps {
  onCancel: () => void;
  onSaved: () => void;
}

function ManualEntryForm({ onCancel, onSaved }: ManualEntryFormProps) {
  const [upsertManualRecord] = useUpsertManualDailyRecordMutation();

  const handleSubmit = async (values: ManualEntryValues, helpers: FormikHelpers<ManualEntryValues>) => {
    const payload: ManualDailyRecordUpsertPayload = {
      date: values.date,
      pvpCount: Number(values.pvpCount),
      foundationCount: Number(values.foundationCount),
      techIssuesDowntimeHours: Number(values.techIssuesDowntimeHours),
      noInventoryIdleTimeHours: Number(values.noInventoryIdleTimeHours),
      leaveHours: Number(values.leaveHours),
      meetingEngagementHours: Number(values.meetingEngagementHours),
    };
    const result = await upsertManualRecord(payload);

    if ("error" in result) {
      const fieldErrors = getFieldErrors(result.error);
      if (fieldErrors) helpers.setErrors(toFormikErrors(fieldErrors));
      helpers.setSubmitting(false);
      return;
    }

    helpers.resetForm({ values: manualInitialValues() });
    onSaved();
  };

  return (
    <section id="manual-entry-form">
      <Formik initialValues={manualInitialValues()} validationSchema={manualValidationSchema} onSubmit={handleSubmit}>
        {({ isSubmitting, values }) => (
          <Form className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-4 md:grid-cols-2 xl:grid-cols-3">
            <TextField label="Date" name="date" type="date" />
            <TextField label="PVP count" name="pvpCount" type="number" min="0" step="1" />
            <TextField label="Foundation count" name="foundationCount" type="number" min="0" step="1" />
            <div className="rounded-md border border-brand-200 bg-brand-50 px-4 py-3">
              <span className="block text-xs font-medium text-brand-700">Total production</span>
              <span className="mt-1 block text-2xl font-semibold text-brand-900">
                {(Number(values.pvpCount) || 0) + (Number(values.foundationCount) || 0)}
              </span>
            </div>
            <TextField label="Technical issues downtime (hours)" name="techIssuesDowntimeHours" type="number" min="0" max={MANUAL_DAILY_RECORD_MAX_HOURS} step="0.25" />
            <TextField label="No inventory / idle time (hours)" name="noInventoryIdleTimeHours" type="number" min="0" max={MANUAL_DAILY_RECORD_MAX_HOURS} step="0.25" />
            <TextField label="Leave (hours)" name="leaveHours" type="number" min="0" max={MANUAL_DAILY_RECORD_MAX_HOURS} step="0.25" />
            <TextField label="Meeting / engagement (hours)" name="meetingEngagementHours" type="number" min="0" max={MANUAL_DAILY_RECORD_MAX_HOURS} step="0.25" />
            <div className="flex gap-2 md:col-span-2 xl:col-span-3">
              <Button type="submit" isLoading={isSubmitting}>Save daily record</Button>
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onCancel}>Cancel</Button>
            </div>
          </Form>
        )}
      </Formik>
    </section>
  );
}

export function ReportsManualTab() {
  const [page, setPage] = useState(1);
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const { hasFeature, hasRoleType } = useAuth();
  const isManager = hasRoleType("manager");
  const canWriteReports = hasFeature("reports", "write");
  const canSubmit = canWriteReports && (isManager || hasRoleType("lead") || hasRoleType("employee"));
  const canReview = canWriteReports && isManager;
  const { data: pageData, isLoading, isError, refetch } = useGetMyManualRecordsQuery(
    { page, pageSize: MANUAL_RECORDS_PAGE_SIZE },
    { refetchOnMountOrArgChange: true },
  );
  const records = pageData?.items;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-content-primary">My records</h2>
          <p className="text-sm text-content-muted">Review your submitted daily production and approval status.</p>
        </div>
        {canSubmit && (
          <Button
            type="button"
            aria-expanded={isEntryFormOpen}
            aria-controls="manual-entry-form"
            onClick={() => setIsEntryFormOpen(true)}
          >
            Add daily record
          </Button>
        )}
      </div>

      <Drawer
        open={canSubmit && isEntryFormOpen}
        onClose={() => setIsEntryFormOpen(false)}
        title="Add daily production"
        description="Submit only your own production record for the selected date."
        widthClass="max-w-2xl"
      >
        <ManualEntryForm
          onCancel={() => setIsEntryFormOpen(false)}
          onSaved={() => {
            setPage(1);
            setIsEntryFormOpen(false);
          }}
        />
      </Drawer>

      <section>
        {isLoading && <LoadingState label="Loading your records…" />}
        {isError && <ErrorState message="Couldn't load your records." onRetry={refetch} />}
        {!isLoading && !isError && records && records.length === 0 && <EmptyState title="No records yet" />}
        {!isLoading && !isError && records && records.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-content-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">PVP</th>
                    <th className="px-4 py-3 font-medium">Foundation</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Downtime</th>
                    <th className="px-4 py-3 font-medium">Idle</th>
                    <th className="px-4 py-3 font-medium">Leave</th>
                    <th className="px-4 py-3 font-medium">Meeting</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3 text-content-primary">{record.date}</td>
                      <td className="px-4 py-3 text-content-secondary">{record.pvpCount}</td>
                      <td className="px-4 py-3 text-content-secondary">{record.foundationCount}</td>
                      <td className="px-4 py-3 font-medium text-content-primary">{record.productionCount}</td>
                      <td className="px-4 py-3 text-content-secondary">{record.techIssuesDowntimeHours}</td>
                      <td className="px-4 py-3 text-content-secondary">{record.noInventoryIdleTimeHours}</td>
                      <td className="px-4 py-3 text-content-secondary">{record.leaveHours}</td>
                      <td className="px-4 py-3 text-content-secondary">{record.meetingEngagementHours}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <ManualRecordStatusIndicator status={record.status} />
                          {record.status === "rejected" && record.rejectionReason && (
                            <span className="text-xs text-content-muted">{record.rejectionReason}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls page={pageData.page} pageSize={pageData.pageSize} total={pageData.total} totalPages={pageData.totalPages} onPageChange={setPage} />
          </div>
        )}
      </section>

      {canReview && <ReportsReviewsSection />}
    </div>
  );
}
