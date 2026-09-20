import type { ManualDailyRecordStatus } from "@/api/types";

import { Badge } from "./Badge";

export function ManualRecordStatusIndicator({ status }: { status: ManualDailyRecordStatus }) {
  if (status === "pending") {
    return <Badge tone="warning">pending</Badge>;
  }

  const approved = status === "approved";
  const label = approved ? "Approved" : "Rejected";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
        approved ? "bg-success-bg text-success" : "bg-danger-bg text-danger"
      }`}
    >
      {approved ? (
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.25">
          <path d="m4.5 10.5 3.25 3.25 7.75-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.25">
          <path d="m5.5 5.5 9 9m0-9-9 9" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}
