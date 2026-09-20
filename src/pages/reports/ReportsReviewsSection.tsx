import { useMemo, useState } from "react";

import { useApproveManualDailyRecordMutation, useRejectManualDailyRecordMutation } from "@/api/manualDailyRecordsApi";
import { useBulkApproveManualRecordsMutation, useBulkRejectManualRecordsMutation, useListManualReviewsQuery } from "@/api/reportsApi";
import { useGetMyManagerTeamQuery, useListUsersQuery } from "@/api/usersApi";
import type { ManualDailyRecordStatus } from "@/api/types";
import { useUserNameLookup } from "@/api/useUserNameLookup";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { inputClasses } from "@/components/ui/FormField";
import { ManualRecordStatusIndicator } from "@/components/ui/ManualRecordStatusIndicator";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateViews";
import { useAuth } from "@/features/auth/useAuth";
import { useToast } from "@/features/ui/useToast";

type DateFilterMode = "all" | "day" | "month" | "range";

const RECORDS_PAGE_SIZE = 10;

const STATUS_TABS: { key: ManualDailyRecordStatus | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

// The manager-only "Reviews" breadcrumb under the Manual tab (Reports doc
// §3.3) — other users' records (never the reviewing manager's own, which
// they already see in their own Manual tab), with individual
// approve/reject plus two bulk actions: Accept All (everything currently
// visible/filtered, not every pending record system-wide) and Reject
// Multiple (one reason per selected record, never one shared reason).
export function ReportsReviewsSection() {
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState<ManualDailyRecordStatus | "all">("all");
  const [leadId, setLeadId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [dayDate, setDayDate] = useState("");
  const [month, setMonth] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [singleRejectId, setSingleRejectId] = useState<number | null>(null);
  const [singleReason, setSingleReason] = useState("");
  // Non-null while the reject-multiple modal is open: id -> that record's own reason.
  const [rejectDraft, setRejectDraft] = useState<Record<number, string> | null>(null);

  const { hasRoleType } = useAuth();
  const isManager = hasRoleType("manager");
  const { data: users = [] } = useListUsersQuery("active");
  const { data: teamData } = useGetMyManagerTeamQuery(
    { page: 1, pageSize: 1, search: null, leadId: null },
    { skip: !isManager },
  );
  const leads = teamData?.leads ?? [];

  const userOptions = useMemo(() => {
    const eligible = users.filter((user) => {
      if (user.role.roleType !== "lead" && user.role.roleType !== "employee") return false;
      if (leadId === null) return true;
      return user.id === leadId || user.reports_to_id === leadId;
    });
    return eligible.sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`),
    );
  }, [leadId, users]);

  const dateRange = useMemo(() => {
    if (dateMode === "day") return { fromDate: dayDate || null, toDate: dayDate || null };
    if (dateMode === "range") return { fromDate: rangeStart || null, toDate: rangeEnd || null };
    if (dateMode === "month" && month) {
      const [year, monthNumber] = month.split("-").map(Number);
      const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
      return { fromDate: `${month}-01`, toDate: `${month}-${String(lastDay).padStart(2, "0")}` };
    }
    return { fromDate: null, toDate: null };
  }, [dateMode, dayDate, month, rangeEnd, rangeStart]);

  const {
    data: pageData,
    isLoading,
    isError,
    refetch,
  } = useListManualReviewsQuery(
    {
      status: statusTab === "all" ? null : statusTab,
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
      userId,
      leadId,
      page,
      pageSize: RECORDS_PAGE_SIZE,
    },
    { refetchOnMountOrArgChange: true },
  );
  const records = pageData?.items;
  const getUserName = useUserNameLookup();
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const getLeadName = (recordUserId: number) => {
    const recordUser = usersById.get(recordUserId);
    if (!recordUser) return "—";
    if (recordUser.role.roleType === "lead") return `${recordUser.first_name} ${recordUser.last_name}`;
    return getUserName(recordUser.reports_to_id);
  };
  const { notifyInfo } = useToast();

  const [approveOne, { isLoading: isApprovingOne }] = useApproveManualDailyRecordMutation();
  const [rejectOne, { isLoading: isRejectingOne }] = useRejectManualDailyRecordMutation();
  const [bulkApprove, { isLoading: isBulkApproving }] = useBulkApproveManualRecordsMutation();
  const [bulkReject, { isLoading: isBulkRejecting }] = useBulkRejectManualRecordsMutation();

  const resetResults = () => {
    setPage(1);
    setSelected(new Set());
  };

  const pendingVisibleIds = useMemo(
    () => (records ?? []).filter((record) => record.status === "pending").map((record) => record.id),
    [records],
  );

  const toggleSelected = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAcceptAll = async () => {
    if (pendingVisibleIds.length === 0) return;
    const result = await bulkApprove(pendingVisibleIds);
    if (!("error" in result) && result.data.skipped.length > 0) {
      notifyInfo(`${result.data.approved.length} approved, ${result.data.skipped.length} skipped (already decided).`);
    }
  };

  const handleSingleReject = async () => {
    if (singleRejectId === null) return;
    const result = await rejectOne({ id: singleRejectId, reason: singleReason || null });
    if (!("error" in result)) {
      setSingleRejectId(null);
      setSingleReason("");
    }
  };

  const openRejectMultiple = () => {
    if (selected.size === 0) return;
    setRejectDraft(Object.fromEntries(Array.from(selected).map((id) => [id, ""])));
  };

  const submitRejectMultiple = async () => {
    if (!rejectDraft) return;
    const items = Object.entries(rejectDraft).map(([id, reason]) => ({ id: Number(id), reason: reason || null }));
    const result = await bulkReject(items);
    if (!("error" in result)) {
      if (result.data.skipped.length > 0) {
        notifyInfo(`${result.data.rejected.length} rejected, ${result.data.skipped.length} skipped (already decided).`);
      }
      setRejectDraft(null);
      setSelected(new Set());
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-content-primary">Team manual records</h2>
          <p className="text-sm text-content-muted">Review and filter daily records across your leads and coders.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={pendingVisibleIds.length === 0}
            isLoading={isBulkApproving}
            onClick={() => void handleAcceptAll()}
          >
            Accept all ({pendingVisibleIds.length})
          </Button>
          <Button variant="danger" disabled={selected.size === 0} onClick={openRejectMultiple}>
            Reject selected ({selected.size})
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatusTab(tab.key);
              resetResults();
            }}
            className={`px-3 py-2 text-sm font-medium ${
              statusTab === tab.key
                ? "border-b-2 border-brand-600 text-brand-700"
                : "text-content-muted hover:text-content-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg bg-surface-muted p-3 md:grid-cols-2 xl:grid-cols-4">
        {isManager && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-content-secondary" htmlFor="manual-lead-filter">Lead</label>
            <select
              id="manual-lead-filter"
              className={inputClasses}
              value={leadId ?? ""}
              onChange={(event) => {
                setLeadId(event.target.value ? Number(event.target.value) : null);
                setUserId(null);
                resetResults();
              }}
            >
              <option value="">All leads</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>{lead.firstName} {lead.lastName}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-content-secondary" htmlFor="manual-user-filter">User</label>
          <select
            id="manual-user-filter"
            className={inputClasses}
            value={userId ?? ""}
            onChange={(event) => {
              setUserId(event.target.value ? Number(event.target.value) : null);
              resetResults();
            }}
          >
            <option value="">All users</option>
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>{user.first_name} {user.last_name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-content-secondary" htmlFor="manual-date-mode">Date</label>
          <select
            id="manual-date-mode"
            className={inputClasses}
            value={dateMode}
            onChange={(event) => {
              setDateMode(event.target.value as DateFilterMode);
              resetResults();
            }}
          >
            <option value="all">All dates</option>
            <option value="day">Single day</option>
            <option value="month">Month</option>
            <option value="range">Date range</option>
          </select>
        </div>

        {dateMode === "day" && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-content-secondary" htmlFor="manual-day-filter">Day</label>
            <input
              id="manual-day-filter"
              type="date"
              className={inputClasses}
              value={dayDate}
              onChange={(event) => {
                setDayDate(event.target.value);
                resetResults();
              }}
            />
          </div>
        )}

        {dateMode === "month" && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-content-secondary" htmlFor="manual-month-filter">Month</label>
            <input
              id="manual-month-filter"
              type="month"
              className={inputClasses}
              value={month}
              onChange={(event) => {
                setMonth(event.target.value);
                resetResults();
              }}
            />
          </div>
        )}

        {dateMode === "range" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-content-secondary" htmlFor="manual-range-start">From</label>
              <input
                id="manual-range-start"
                type="date"
                className={inputClasses}
                value={rangeStart}
                max={rangeEnd || undefined}
                onChange={(event) => {
                  setRangeStart(event.target.value);
                  resetResults();
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-content-secondary" htmlFor="manual-range-end">To</label>
              <input
                id="manual-range-end"
                type="date"
                className={inputClasses}
                value={rangeEnd}
                min={rangeStart || undefined}
                onChange={(event) => {
                  setRangeEnd(event.target.value);
                  resetResults();
                }}
              />
            </div>
          </>
        )}

        <div className="flex items-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setLeadId(null);
              setUserId(null);
              setDateMode("all");
              setDayDate("");
              setMonth("");
              setRangeStart("");
              setRangeEnd("");
              resetResults();
            }}
          >
            Clear filters
          </Button>
        </div>
      </div>

      {isLoading && <LoadingState label="Loading team records…" />}
      {isError && <ErrorState message="Couldn't load team records." onRetry={refetch} />}
      {!isLoading && !isError && records && records.length === 0 && <EmptyState title="No records match these filters" />}

      {!isLoading && !isError && records && records.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-content-muted">
              <tr>
                <th className="px-3 py-2" />
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Lead</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">PVP</th>
                <th className="px-3 py-2 font-medium">Foundation</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Downtime</th>
                <th className="px-3 py-2 font-medium">Idle</th>
                <th className="px-3 py-2 font-medium">Leave</th>
                <th className="px-3 py-2 font-medium">Meeting</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-3 py-2">
                    {record.status === "pending" && (
                      <input
                        type="checkbox"
                        checked={selected.has(record.id)}
                        onChange={() => toggleSelected(record.id)}
                        aria-label={`Select record #${record.id} for bulk reject`}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-content-primary">{getUserName(record.userId)}</td>
                  <td className="px-3 py-2 text-content-secondary">{getLeadName(record.userId)}</td>
                  <td className="px-3 py-2 text-content-secondary">{record.date}</td>
                  <td className="px-3 py-2 text-content-secondary">{record.pvpCount}</td>
                  <td className="px-3 py-2 text-content-secondary">{record.foundationCount}</td>
                  <td className="px-3 py-2 font-medium text-content-primary">{record.productionCount}</td>
                  <td className="px-3 py-2 text-content-secondary">{record.techIssuesDowntimeHours}</td>
                  <td className="px-3 py-2 text-content-secondary">{record.noInventoryIdleTimeHours}</td>
                  <td className="px-3 py-2 text-content-secondary">{record.leaveHours}</td>
                  <td className="px-3 py-2 text-content-secondary">{record.meetingEngagementHours}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <ManualRecordStatusIndicator status={record.status} />
                      {record.status === "rejected" && record.rejectionReason && (
                        <span className="text-xs text-content-muted">{record.rejectionReason}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {record.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" isLoading={isApprovingOne} onClick={() => void approveOne(record.id)}>
                          Approve
                        </Button>
                        <Button variant="danger" onClick={() => setSingleRejectId(record.id)}>
                          Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          <PaginationControls
            page={pageData.page}
            pageSize={pageData.pageSize}
            total={pageData.total}
            totalPages={pageData.totalPages}
            onPageChange={(nextPage) => {
              setPage(nextPage);
              setSelected(new Set());
            }}
          />
        </div>
      )}

      {singleRejectId !== null && (
        <Drawer
          open
          onClose={() => {
            setSingleRejectId(null);
            setSingleReason("");
          }}
          title="Reject this record?"
          description="Let the coder know what to fix (optional)."
          widthClass="max-w-md"
        >
            <textarea
              className={`${inputClasses} w-full`}
              rows={3}
              value={singleReason}
              onChange={(event) => setSingleReason(event.target.value)}
              placeholder="Reason (optional)"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                disabled={isRejectingOne}
                onClick={() => {
                  setSingleRejectId(null);
                  setSingleReason("");
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" isLoading={isRejectingOne} onClick={() => void handleSingleReject()}>
                Reject
              </Button>
            </div>
        </Drawer>
      )}

      {rejectDraft && (
        <Drawer
          open
          onClose={() => setRejectDraft(null)}
          title={`Reject ${Object.keys(rejectDraft).length} record(s)`}
          description="Give each record its own reason (optional)."
          widthClass="max-w-xl"
        >
            <div className="flex flex-col gap-3">
              {Object.keys(rejectDraft).map((idString) => {
                const id = Number(idString);
                const record = records?.find((candidate) => candidate.id === id);
                return (
                  <div key={id} className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-content-secondary">
                      {record ? `${getUserName(record.userId)} — ${record.date}` : `Record #${id}`}
                    </label>
                    <textarea
                      className={inputClasses}
                      rows={2}
                      value={rejectDraft[id]}
                      onChange={(event) =>
                        setRejectDraft((prev) => (prev ? { ...prev, [id]: event.target.value } : prev))
                      }
                      placeholder="Reason (optional)"
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" disabled={isBulkRejecting} onClick={() => setRejectDraft(null)}>
                Cancel
              </Button>
              <Button variant="danger" isLoading={isBulkRejecting} onClick={() => void submitRejectMultiple()}>
                Reject all
              </Button>
            </div>
        </Drawer>
      )}
    </div>
  );
}
