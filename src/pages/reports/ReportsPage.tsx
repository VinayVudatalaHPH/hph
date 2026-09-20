import { useState } from "react";

import { ReportsKaironTab } from "./ReportsKaironTab";
import { ReportsManualTab } from "./ReportsManualTab";
import { ReportsOverviewTab } from "./ReportsOverviewTab";

type Tab = "overview" | "kairon" | "manual";

// One workspace for Kairon and Manual reporting/input. The child tabs apply
// their own role-aware visibility and actions.
export function ReportsPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-content-primary">Reports and input</h1>
        <p className="text-sm text-content-muted">Review Kairon and Manual data, and submit the inputs available to your role.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("overview")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "overview" ? "border-b-2 border-brand-600 text-brand-700" : "text-content-muted hover:text-content-secondary"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setTab("kairon")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "kairon" ? "border-b-2 border-brand-600 text-brand-700" : "text-content-muted hover:text-content-secondary"
          }`}
        >
          Kairon
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "manual" ? "border-b-2 border-brand-600 text-brand-700" : "text-content-muted hover:text-content-secondary"
          }`}
        >
          Manual
        </button>
      </div>

      {tab === "overview" && <ReportsOverviewTab />}
      {tab === "kairon" && <ReportsKaironTab />}
      {tab === "manual" && <ReportsManualTab />}
    </div>
  );
}
