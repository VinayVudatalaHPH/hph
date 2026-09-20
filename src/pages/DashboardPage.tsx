import { useState } from "react";

import { getErrorMessage } from "@/api/apiError";
import { useGetMyEfficiencyQuery } from "@/api/reportsApi";
import { ErrorState, LoadingState } from "@/components/ui/StateViews";
import { useAuth } from "@/features/auth/useAuth";
import { CodingDashboardPage } from "@/pages/coding/CodingDashboardPage";

const inputClassName =
  "h-10 rounded-md border border-border bg-surface px-3 text-sm text-content-primary outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function currentMonthValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function formatMinutes(value: number | null) {
  if (value === null) return "—";
  return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, "0")}m`;
}

function formatTarget(value: string | null) {
  return value === null ? "—" : Number(value).toFixed(1);
}

function formatCpd(value: string | null) {
  return value === null ? "—" : Number(value).toFixed(1);
}

function EfficiencyValue({ value, large = false }: { value: string | null; large?: boolean }) {
  if (value === null) return <span className="text-content-muted">Not available</span>;
  const numeric = Number(value);
  const color = numeric >= 100 ? "text-success" : numeric >= 80 ? "text-warning" : "text-danger";
  return <span className={`${large ? "text-5xl" : "font-semibold"} ${color}`}>{numeric.toFixed(1)}%</span>;
}

export function DashboardPage() {
  const { user } = useAuth();
  const showsTeamDashboard = ["super_admin", "admin", "manager"].includes(user?.role.roleType ?? "");

  return showsTeamDashboard ? <CodingDashboardPage /> : <PersonalDashboardPage />;
}

function PersonalDashboardPage() {
  const { user } = useAuth();
  const currentMonth = currentMonthValue();
  const [month, setMonth] = useState(currentMonth);
  const efficiency = useGetMyEfficiencyQuery({ month });
  const summary = efficiency.data;

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">My performance</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-content-primary">Welcome, {user?.firstName}.</h1>
          <p className="mt-1 text-sm text-content-muted">Daily and monthly efficiency based on productive login time.</p>
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-content-secondary">
          Month
          <input
            type="month"
            max={currentMonth}
            value={month}
            onChange={(event) => setMonth(event.target.value || currentMonth)}
            className={inputClassName}
          />
        </label>
      </section>

      {efficiency.isLoading ? (
        <LoadingState label="Calculating efficiency…" />
      ) : efficiency.error ? (
        <ErrorState message={getErrorMessage(efficiency.error)} onRetry={efficiency.refetch} />
      ) : summary ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="Manual efficiency"><EfficiencyValue value={summary.manualEfficiencyPercent} large /></SummaryCard>
            <SummaryCard label="Kairon efficiency"><EfficiencyValue value={summary.kaironEfficiencyPercent} large /></SummaryCard>
            <SummaryCard label="Manual CPD" value={formatCpd(summary.manualCpd)} />
            <SummaryCard label="Kairon CPD" value={formatCpd(summary.kaironCpd)} />
            <SummaryCard label="Target CPD" value={formatCpd(summary.targetCpd)} />
            <SummaryCard label="Manual charts" value={String(summary.manualCharts)} />
            <SummaryCard label="Kairon charts" value={String(summary.kaironCharts)} />
            <SummaryCard label="Adjusted target" value={Number(summary.adjustedTarget).toFixed(1)} />
            <SummaryCard label="Calculated days" value={String(summary.calculatedDays)} />
          </section>

          <p className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
            Productive time = Total Inside − downtime − idle time − meetings. Daily Refresh basis = 8 hours − downtime − idle time − meetings − leave/permission. Manual, Kairon, and Target CPD use the Daily Refresh basis; efficiency uses the adjusted target and is capped at 120%.
          </p>

          <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold text-content-primary">Daily efficiency</h2>
              <p className="text-sm text-content-muted">Days without both login hours and an active stage target remain unavailable.</p>
            </div>
            {summary.daily.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-content-muted">No efficiency data is available for this month.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-muted text-xs uppercase tracking-wide text-content-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Stage</th>
                      <th className="px-4 py-3 font-medium">Inside</th>
                      <th className="px-4 py-3 font-medium">Excluded</th>
                      <th className="px-4 py-3 font-medium">Productive</th>
                      <th className="px-4 py-3 font-medium">Target basis</th>
                      <th className="px-4 py-3 font-medium">Manual charts</th>
                      <th className="px-4 py-3 font-medium">Kairon charts</th>
                      <th className="px-4 py-3 font-medium">Adjusted target</th>
                      <th className="px-4 py-3 font-medium">Manual efficiency</th>
                      <th className="px-4 py-3 font-medium">Kairon efficiency</th>
                      <th className="px-4 py-3 font-medium">Manual CPD</th>
                      <th className="px-4 py-3 font-medium">Kairon CPD</th>
                      <th className="px-4 py-3 font-medium">Target CPD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.daily.map((row) => (
                      <tr key={row.date}>
                        <td className="px-4 py-3 text-content-secondary">{new Date(`${row.date}T00:00:00`).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-content-secondary">{row.stage ?? "—"}</td>
                        <td className="px-4 py-3 text-content-secondary">{formatMinutes(row.insideMinutes)}</td>
                        <td className="px-4 py-3 text-content-secondary">{formatMinutes(row.excludedMinutes)}</td>
                        <td className="px-4 py-3 text-content-secondary">{formatMinutes(row.productiveMinutes)}</td>
                        <td className="px-4 py-3 text-content-secondary">{formatMinutes(row.targetMinutes)}</td>
                        <td className="px-4 py-3 font-medium text-content-primary">{row.manualCharts}</td>
                        <td className="px-4 py-3 font-medium text-content-primary">{row.kaironCharts}</td>
                        <td className="px-4 py-3 text-content-secondary">{formatTarget(row.adjustedTarget)}</td>
                        <td className="px-4 py-3"><EfficiencyValue value={row.manualEfficiencyPercent} /></td>
                        <td className="px-4 py-3"><EfficiencyValue value={row.kaironEfficiencyPercent} /></td>
                        <td className="px-4 py-3 font-medium text-content-primary">{formatCpd(row.manualCpd)}</td>
                        <td className="px-4 py-3 font-medium text-content-primary">{formatCpd(row.kaironCpd)}</td>
                        <td className="px-4 py-3 font-medium text-content-primary">{formatCpd(row.targetCpd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <p className="text-sm text-content-muted">{label}</p>
      <div className="mt-3 text-4xl font-semibold tracking-tight text-content-primary">{children ?? value}</div>
    </article>
  );
}
