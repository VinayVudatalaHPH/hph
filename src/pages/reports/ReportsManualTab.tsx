import { useState } from "react";
import { Form, Formik, type FormikHelpers } from "formik";
import * as Yup from "yup";

import { getFieldErrors, toFormikErrors } from "@/api/apiError";
import {
  useCompleteManualImportMutation,
  useLazyListManualDailyRecordsQuery,
  useStartManualImportMutation,
  useUploadManualImportChunkMutation,
  useUpsertManualDailyRecordMutation,
} from "@/api/manualDailyRecordsApi";
import { useGetMyManualRecordsQuery } from "@/api/reportsApi";
import {
  MANUAL_DAILY_RECORD_MAX_HOURS,
  type ManualBulkUploadRowError,
  type ManualDailyRecord,
  type ManualDailyRecordUpsertPayload,
  type ManualImportProgress,
  type ManualImportRow,
} from "@/api/types";
import { useListUsersQuery } from "@/api/usersApi";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { inputClasses, TextField } from "@/components/ui/FormField";
import { ManualRecordStatusIndicator } from "@/components/ui/ManualRecordStatusIndicator";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateViews";
import { useAuth } from "@/features/auth/useAuth";
import { useToast } from "@/features/ui/useToast";
import { API_BASE_URL } from "@/lib/env";

import { parseManualBulkFile, type ManualBulkFileResult } from "../manual/manualBulkFile";

import { ReportsReviewsSection } from "./ReportsReviewsSection";

const MANUAL_RECORDS_PAGE_SIZE = 10;

const MANUAL_UPLOAD_CHUNK_SIZE = 500;

async function sha256(value: string | ArrayBuffer) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function downloadManualTemplate() {
  const response = await fetch(`${API_BASE_URL}/manual-daily-records/upload-template`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Could not download the template.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "manual_production_upload_template.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

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

function ManualBulkUploadForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { notifyError } = useToast();
  const { isLoading: isLoadingUsers, refetch: refetchUsers } = useListUsersQuery("all");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileChecksum, setFileChecksum] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ManualBulkFileResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [rowErrors, setRowErrors] = useState<ManualBulkUploadRowError[]>([]);
  const [candidateRows, setCandidateRows] = useState<ManualImportRow[] | null>(null);
  const [comparison, setComparison] = useState<{ newCount: number; modifiedCount: number; unchangedCount: number } | null>(null);
  const [progress, setProgress] = useState<ManualImportProgress | null>(null);
  const [activeImportId, setActiveImportId] = useState<number | null>(null);
  const [uploadFinished, setUploadFinished] = useState(false);
  const [loadExisting, { isFetching: isComparing }] = useLazyListManualDailyRecordsQuery();
  const [startImport, { isLoading: isStarting }] = useStartManualImportMutation();
  const [uploadChunk, { isLoading: isUploading }] = useUploadManualImportChunkMutation();
  const [completeImport, { isLoading: isCompleting }] = useCompleteManualImportMutation();
  const isLoading = isParsing || isLoadingUsers || isComparing || isStarting || isUploading || isCompleting;

  const handleDownload = async () => {
    try {
      await downloadManualTemplate();
    } catch {
      notifyError("Could not download the manual upload template. Try again.");
    }
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setFileChecksum(null);
    setParseResult(null);
    setRowErrors([]);
    setCandidateRows(null);
    setComparison(null);
    setProgress(null);
    setActiveImportId(null);
    setUploadFinished(false);
    setIsParsing(true);
    try {
      const [contents, freshUsers] = await Promise.all([file.arrayBuffer(), refetchUsers().unwrap()]);
      const [parsed, checksum] = await Promise.all([
        parseManualBulkFile(file, freshUsers, contents),
        sha256(contents),
      ]);
      setParseResult(parsed);
      setRowErrors(parsed.rowErrors);
      setFileChecksum(checksum);
    } catch {
      notifyError("Could not refresh the team list before reading the workbook. Try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const valuesMatch = (row: ManualImportRow, existing: ManualDailyRecord) =>
    existing.productionCount === row.productionCount &&
    Number(existing.techIssuesDowntimeHours) === row.techIssuesDowntimeHours &&
    Number(existing.noInventoryIdleTimeHours) === row.noInventoryIdleTimeHours &&
    Number(existing.leaveHours) === row.leaveHours &&
    Number(existing.meetingEngagementHours) === row.meetingEngagementHours;

  const handleUpload = async () => {
    if (!parseResult || !fileName || !fileChecksum || parseResult.rows.length === 0) return;
    try {
      let rowsToUpload = candidateRows;
      if (activeImportId === null || !rowsToUpload) {
        const userIds = [...new Set(parseResult.rows.map((row) => row.userId))];
        const existing = await loadExisting({
          fromDate: parseResult.minDate,
          toDate: parseResult.maxDate,
          userIds,
        }).unwrap();
        const byUserDate = new Map(existing.map((record) => [`${record.userId}|${record.date}`, record]));
        let newCount = 0;
        let modifiedCount = 0;
        let unchangedCount = 0;
        rowsToUpload = parseResult.rows.filter((row) => {
          const record = byUserDate.get(`${row.userId}|${row.date}`);
          if (!record) {
            newCount += 1;
            return true;
          }
          if (valuesMatch(row, record)) {
            unchangedCount += 1;
            return false;
          }
          modifiedCount += 1;
          return true;
        });
        setCandidateRows(rowsToUpload);
        setComparison({ newCount, modifiedCount, unchangedCount });
        if (rowsToUpload.length === 0) {
          setUploadFinished(true);
          onDone();
          return;
        }
      }

      const started =
        activeImportId !== null && progress?.status === "uploading"
          ? progress
          : await startImport({ sourceFilename: fileName, fileChecksum, totalRows: rowsToUpload.length }).unwrap();
      setActiveImportId(started.id);
      setProgress(started);
      for (
        let offset = started.processedCount, chunkNumber = Math.floor(started.processedCount / MANUAL_UPLOAD_CHUNK_SIZE);
        offset < rowsToUpload.length;
        offset += MANUAL_UPLOAD_CHUNK_SIZE, chunkNumber += 1
      ) {
        const rows = rowsToUpload.slice(offset, offset + MANUAL_UPLOAD_CHUNK_SIZE);
        const checksum = await sha256(JSON.stringify(rows));
        const next = await uploadChunk({ importId: started.id, chunkNumber, checksum, rows }).unwrap();
        setProgress(next);
      }
      const completed = await completeImport(started.id).unwrap();
      setProgress(completed);
      setActiveImportId(null);
      setUploadFinished(true);
      onDone();
    } catch {
      notifyError("The manual upload stopped. Click Resume upload to continue from the last completed chunk.");
    }
  };

  const canSubmit = Boolean(
    fileName && fileChecksum && parseResult && parseResult.fileErrors.length === 0 && rowErrors.length === 0 && parseResult.rows.length > 0,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
        <h3 className="font-semibold text-content-primary">Start with the reference template</h3>
        <p className="mt-1 text-sm text-content-muted">
          Upload month-to-date or historical daily production. The first worksheet must match the Coder Production Details format.
        </p>
        <Button type="button" variant="secondary" className="mt-3" onClick={() => void handleDownload()}>
          Download template
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-content-secondary" htmlFor="manualBulkFile">Filled-in workbook (.xlsx)</label>
        <input
          id="manualBulkFile"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className={inputClasses}
          disabled={isLoadingUsers}
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) void handleFile(selected);
          }}
        />
        <p className="text-xs text-content-muted">
          Rows are matched to active and historically relevant team members by Coder name; email is not required. Blank numbers become 0; Holiday must be 0.
        </p>
      </div>

      {isParsing && <div className="rounded-lg border border-border bg-surface-muted p-4 text-sm text-content-secondary">Reading and validating {fileName}…</div>}

      {parseResult?.fileErrors.length ? (
        <ul className="rounded-lg border border-danger/30 bg-danger/5 p-4 pl-9 text-sm text-danger">
          {parseResult.fileErrors.map((error) => <li className="list-disc" key={error}>{error}</li>)}
        </ul>
      ) : null}

      {parseResult && parseResult.fileErrors.length === 0 && rowErrors.length === 0 && (
        <div className="rounded-lg border border-border bg-surface-muted p-4 text-sm text-content-secondary">
          <strong>{parseResult.rows.length.toLocaleString()}</strong> rows across {parseResult.minDate} to {parseResult.maxDate} are ready to compare.
          {parseResult.skippedAfterLastWorkingDay > 0 && (
            <p className="mt-2 text-content-muted">
              Skipped {parseResult.skippedAfterLastWorkingDay.toLocaleString()} row(s) dated after an inactive
              user&apos;s last working day. Their records through the last working day remain included.
            </p>
          )}
        </div>
      )}

      {rowErrors.length > 0 && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4" role="alert">
          <h3 className="font-semibold text-danger">Nothing was imported. Fix these rows and upload again.</h3>
          <ul className="mt-2 max-h-56 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-content-secondary">
            {rowErrors.map((error, index) => (
              <li key={`${error.row}-${index}`}>
                Row {error.row}{error.name ? ` (${error.name})` : ""}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {comparison && (
        <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-surface-muted p-4 text-sm text-content-secondary" role="status">
          <span>New: <strong>{comparison.newCount}</strong></span>
          <span>Modified: <strong>{comparison.modifiedCount}</strong></span>
          <span>Unchanged: <strong>{comparison.unchangedCount}</strong></span>
        </div>
      )}

      {progress && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-4 text-sm">
          <div className="flex justify-between gap-4"><strong>Uploaded {progress.processedCount.toLocaleString()} of {progress.totalRows.toLocaleString()}</strong><span>{Math.round((progress.processedCount / progress.totalRows) * 100)}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(100, (progress.processedCount / progress.totalRows) * 100)}%` }} /></div>
          <div className="grid grid-cols-3 gap-2 text-content-secondary"><span>Created: {progress.createdCount}</span><span>Updated: {progress.updatedCount}</span><span>Unchanged: {progress.unchangedCount}</span></div>
        </div>
      )}

      {uploadFinished && (
        <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-sm text-content-secondary" role="status">
          {comparison && comparison.newCount + comparison.modifiedCount === 0
            ? "No new or modified records were found. Nothing needed to be uploaded."
            : "Upload complete. Select another file to start a new upload."}
        </div>
      )}

      <div className="flex gap-2">
        {!uploadFinished && (
          <Button type="button" isLoading={isLoading} disabled={!canSubmit} onClick={() => void handleUpload()}>
            {activeImportId !== null ? "Resume upload" : "Compare and upload"}
          </Button>
        )}
        <Button type="button" variant="secondary" disabled={isLoading} onClick={onCancel}>Close</Button>
      </div>
    </div>
  );
}

export function ReportsManualTab() {
  const [page, setPage] = useState(1);
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
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
          <div className="flex flex-wrap gap-2">
            {canReview && <Button type="button" variant="secondary" onClick={() => setIsBulkUploadOpen(true)}>Bulk upload</Button>}
            <Button
              type="button"
              aria-expanded={isEntryFormOpen}
              aria-controls="manual-entry-form"
              onClick={() => setIsEntryFormOpen(true)}
            >
              Add daily record
            </Button>
          </div>
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

      <Drawer
        open={canReview && isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        title="Bulk upload manual records"
        description="Import month-to-date or historical daily production. Existing identical user-day values are skipped."
        widthClass="max-w-2xl"
      >
        <ManualBulkUploadForm
          onCancel={() => setIsBulkUploadOpen(false)}
          onDone={() => {
            setPage(1);
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
