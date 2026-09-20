import { useMemo, useState } from "react";

import { getErrorMessage } from "@/api/apiError";
import { useGetCodingDashboardQuery, useGetMyEfficiencyQuery } from "@/api/reportsApi";
import type { CodingDashboardCard, DailyEfficiency, EfficiencySummary } from "@/api/types";
import { inputClasses } from "@/components/ui/FormField";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateViews";
import { useAuth } from "@/features/auth/useAuth";

type SeriesKey = "adjustedTarget" | "manualCharts" | "kaironCharts";
type LostHourKey = "idle" | "downtime" | "leave" | "meeting";
type GraphInterval = "day" | "week" | "month";

const LOGIN_HOURS_REPORTING_START = "2026-08-11";

interface LostHoursDay {
  date: string;
  label?: string;
  idle: number;
  downtime: number;
  leave: number;
  meeting: number;
  noLogin: boolean;
}

type ProductionDay = Pick<DailyEfficiency, "date" | "adjustedTarget" | "manualCharts" | "kaironCharts"> & { label?: string };

const SERIES: Array<{ key: SeriesKey; label: string; color: string; dashed?: boolean }> = [
  { key: "adjustedTarget", label: "Adjusted target", color: "var(--color-chart-target)", dashed: true },
  { key: "manualCharts", label: "Manual charts", color: "var(--color-chart-manual)" },
  { key: "kaironCharts", label: "Kairon charts", color: "var(--color-chart-kairon)" },
];

const LOST_HOUR_SERIES: Array<{ key: LostHourKey; label: string; color: string }> = [
  { key: "idle", label: "Idle", color: "var(--color-warning)" },
  { key: "downtime", label: "Downtime", color: "var(--color-chart-downtime)" },
  { key: "leave", label: "Leave", color: "var(--color-brand-500)" },
  { key: "meeting", label: "Meetings", color: "#4f91a8" },
];

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCpd(value: string | null) {
  return value === null ? "—" : Number(value).toFixed(1);
}

function achievement(actual: string | null, target: string | null) {
  if (actual === null || target === null || Number(target) <= 0) return null;
  return Number(actual) * 100 / Number(target);
}

function weekdaysInRange(fromDate: string, toDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);
  while (cursor <= end) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) dates.push(localDateValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function rangeDayCount(fromDate: string, toDate: string) {
  if (!fromDate || !toDate) return 0;
  return Math.floor((new Date(`${toDate}T00:00:00`).getTime() - new Date(`${fromDate}T00:00:00`).getTime()) / 86_400_000) + 1;
}

function intervalKey(date: string, interval: GraphInterval) {
  if (interval === "day") return date;
  if (interval === "month") return date.slice(0, 7);
  const monday = new Date(`${date}T00:00:00`);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return localDateValue(monday);
}

function intervalLabel(key: string, interval: GraphInterval) {
  if (interval === "day") {
    return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (interval === "month") {
    return new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }
  const start = new Date(`${key}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString(undefined, { month: start.getMonth() === end.getMonth() ? undefined : "short", day: "numeric" });
  return `${startLabel}–${endLabel}`;
}

function groupProductionRows(rows: DailyEfficiency[], interval: GraphInterval): ProductionDay[] {
  if (interval === "day") return rows;
  const groups = new Map<string, { manualCharts: number; kaironCharts: number; adjustedTarget: number; hasTarget: boolean }>();
  rows.forEach((row) => {
    const key = intervalKey(row.date, interval);
    const group = groups.get(key) ?? { manualCharts: 0, kaironCharts: 0, adjustedTarget: 0, hasTarget: false };
    group.manualCharts += row.manualCharts;
    group.kaironCharts += row.kaironCharts;
    if (row.adjustedTarget !== null) {
      group.adjustedTarget += Number(row.adjustedTarget);
      group.hasTarget = true;
    }
    groups.set(key, group);
  });
  return [...groups.entries()].map(([date, group]) => ({
    date,
    label: intervalLabel(date, interval),
    manualCharts: group.manualCharts,
    kaironCharts: group.kaironCharts,
    adjustedTarget: group.hasTarget ? group.adjustedTarget.toFixed(1) : null,
  }));
}

function groupLostHoursRows(rows: LostHoursDay[], interval: GraphInterval): LostHoursDay[] {
  if (interval === "day") return rows;
  const groups = new Map<string, LostHoursDay>();
  rows.forEach((row) => {
    const key = intervalKey(row.date, interval);
    const group = groups.get(key) ?? { date: key, label: intervalLabel(key, interval), idle: 0, downtime: 0, leave: 0, meeting: 0, noLogin: false };
    group.idle += row.idle;
    group.downtime += row.downtime;
    group.leave += row.leave;
    group.meeting += row.meeting;
    group.noLogin = group.noLogin || row.noLogin;
    groups.set(key, group);
  });
  return [...groups.values()];
}

function cpd(charts: number, targetMinutes: number) {
  return targetMinutes > 0 ? (charts * 480 / targetMinutes).toFixed(1) : null;
}

function aggregateTeamOverview(cards: CodingDashboardCard[], from: string, to: string): EfficiencySummary {
  const totals = cards.reduce(
    (result, card) => ({
      manualCharts: result.manualCharts + card.efficiency.manualCharts,
      kaironCharts: result.kaironCharts + card.efficiency.kaironCharts,
      adjustedTarget: result.adjustedTarget + Number(card.efficiency.adjustedTarget),
      insideMinutes: result.insideMinutes + card.efficiency.insideMinutes,
      loginDays: result.loginDays + card.efficiency.loginDays,
      productiveMinutes: result.productiveMinutes + card.efficiency.productiveMinutes,
      targetMinutes: result.targetMinutes + card.efficiency.targetMinutes,
      calculatedDays: result.calculatedDays + card.efficiency.calculatedDays,
    }),
    { manualCharts: 0, kaironCharts: 0, adjustedTarget: 0, insideMinutes: 0, loginDays: 0, productiveMinutes: 0, targetMinutes: 0, calculatedDays: 0 },
  );
  const daily = new Map<string, { manualCharts: number; kaironCharts: number; adjustedTarget: number; targetMinutes: number }>();
  cards.forEach((card) => card.efficiency.daily.forEach((row) => {
    const current = daily.get(row.date) ?? { manualCharts: 0, kaironCharts: 0, adjustedTarget: 0, targetMinutes: 0 };
    current.manualCharts += row.manualCharts;
    current.kaironCharts += row.kaironCharts;
    current.adjustedTarget += Number(row.adjustedTarget ?? 0);
    current.targetMinutes += row.targetMinutes ?? 0;
    daily.set(row.date, current);
  }));

  return {
    from,
    to,
    ...totals,
    adjustedTarget: totals.adjustedTarget.toFixed(2),
    manualEfficiencyPercent: totals.adjustedTarget > 0 ? Math.min(120, totals.manualCharts * 100 / totals.adjustedTarget).toFixed(1) : null,
    kaironEfficiencyPercent: totals.adjustedTarget > 0 ? Math.min(120, totals.kaironCharts * 100 / totals.adjustedTarget).toFixed(1) : null,
    manualCpd: cpd(totals.manualCharts, totals.targetMinutes),
    kaironCpd: cpd(totals.kaironCharts, totals.targetMinutes),
    targetCpd: cpd(totals.adjustedTarget, totals.targetMinutes),
    daily: [...daily.entries()].map(([date, row]) => ({
      date,
      stage: null,
      dailyTarget: null,
      manualCharts: row.manualCharts,
      kaironCharts: row.kaironCharts,
      insideMinutes: null,
      downtimeMinutes: 0,
      idleMinutes: 0,
      leaveMinutes: 0,
      meetingMinutes: 0,
      excludedMinutes: 0,
      productiveMinutes: null,
      targetMinutes: row.targetMinutes || null,
      adjustedTarget: row.adjustedTarget > 0 ? row.adjustedTarget.toFixed(2) : null,
      manualEfficiencyPercent: row.adjustedTarget > 0 ? Math.min(120, row.manualCharts * 100 / row.adjustedTarget).toFixed(1) : null,
      kaironEfficiencyPercent: row.adjustedTarget > 0 ? Math.min(120, row.kaironCharts * 100 / row.adjustedTarget).toFixed(1) : null,
      manualCpd: cpd(row.manualCharts, row.targetMinutes),
      kaironCpd: cpd(row.kaironCharts, row.targetMinutes),
      targetCpd: cpd(row.adjustedTarget, row.targetMinutes),
      manualStatus: null,
    })),
  };
}

export function TeamPerformanceGraphs({ cards }: { cards: CodingDashboardCard[] }) {
  const fromDate = cards[0]?.efficiency.from ?? "";
  const toDate = cards[0]?.efficiency.to ?? "";
  const [graphInterval, setGraphInterval] = useState<GraphInterval>("day");
  const selectedDayCount = fromDate && toDate ? rangeDayCount(fromDate, toDate) : 0;
  const intervalOptions: GraphInterval[] = [
    "day",
    ...(selectedDayCount > 15 ? ["week" as const] : []),
    ...(selectedDayCount > 50 ? ["month" as const] : []),
  ];
  const activeGraphInterval = intervalOptions.includes(graphInterval) ? graphInterval : "day";
  const summary = useMemo(
    () => fromDate && toDate ? aggregateTeamOverview(cards, fromDate, toDate) : null,
    [cards, fromDate, toDate],
  );
  const rows = useMemo(
    () => [...(summary?.daily ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [summary?.daily],
  );
  const lostHoursRows = useMemo<LostHoursDay[]>(() => {
    if (!fromDate || !toDate) return [];
    return weekdaysInRange(fromDate, toDate).map((date) => {
      const beforeLoginHoursReporting = date < LOGIN_HOURS_REPORTING_START;
      const aggregate = cards.reduce<LostHoursDay>((result, card) => {
        const row = card.efficiency.daily.find((candidate) => candidate.date === date);
        const noLogin = !beforeLoginHoursReporting && (!row || row.insideMinutes === null);
        result.idle += row ? row.idleMinutes / 60 : 0;
        result.downtime += row ? row.downtimeMinutes / 60 : 0;
        result.leave += beforeLoginHoursReporting ? 0 : noLogin ? 8 : (row?.leaveMinutes ?? 0) / 60;
        result.meeting += row ? row.meetingMinutes / 60 : 0;
        result.noLogin = result.noLogin || noLogin;
        return result;
      }, { date, idle: 0, downtime: 0, leave: 0, meeting: 0, noLogin: false });
      return cards.length > 0
        ? {
            ...aggregate,
            idle: aggregate.idle / cards.length,
            downtime: aggregate.downtime / cards.length,
            leave: aggregate.leave / cards.length,
            meeting: aggregate.meeting / cards.length,
          }
        : aggregate;
    });
  }, [cards, fromDate, toDate]);
  const displayedProductionRows = useMemo(
    () => groupProductionRows(rows, activeGraphInterval),
    [activeGraphInterval, rows],
  );
  const displayedLostHoursRows = useMemo(
    () => groupLostHoursRows(lostHoursRows, activeGraphInterval),
    [activeGraphInterval, lostHoursRows],
  );

  if (cards.length === 0) {
    return <EmptyState title="No coders match these filters" />;
  }

  return (
    <div className="space-y-4 p-5">
      {intervalOptions.length > 1 && (
        <div className="flex justify-end">
          <div className="flex h-10 items-center rounded-md border border-border bg-surface p-1" aria-label="Graph interval">
            {intervalOptions.map((interval) => (
              <button
                key={interval}
                type="button"
                onClick={() => setGraphInterval(interval)}
                className={`h-8 rounded px-3 text-xs font-medium capitalize transition ${activeGraphInterval === interval ? "bg-brand-600 text-white shadow-sm" : "text-content-secondary hover:bg-surface-muted"}`}
              >
                {interval}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={`grid min-w-0 gap-4 ${displayedLostHoursRows.length > 0 ? "lg:grid-cols-2" : ""}`}>
        {displayedProductionRows.length === 0
          ? <EmptyState title="No CPD data is available for this date range" />
          : <DailyProductionChart rows={displayedProductionRows} interval={activeGraphInterval} />}
        {displayedLostHoursRows.length > 0 && (
          <LostHoursChart rows={displayedLostHoursRows} teamView interval={activeGraphInterval} />
        )}
      </div>
    </div>
  );
}

export function ReportsOverviewTab() {
  const { user } = useAuth();
  const isTeamView = ["super_admin", "admin", "manager"].includes(user?.role.roleType ?? "");
  const today = localDateValue();
  const [fromDate, setFromDate] = useState(`${today.slice(0, 7)}-01`);
  const [toDate, setToDate] = useState(today);
  const [graphInterval, setGraphInterval] = useState<GraphInterval>("day");
  const validRange = Boolean(fromDate && toDate && fromDate <= toDate);
  const selectedDayCount = validRange ? rangeDayCount(fromDate, toDate) : 0;
  const intervalOptions: GraphInterval[] = [
    "day",
    ...(selectedDayCount > 15 ? ["week" as const] : []),
    ...(selectedDayCount > 50 ? ["month" as const] : []),
  ];
  const activeGraphInterval = intervalOptions.includes(graphInterval) ? graphInterval : "day";
  const efficiency = useGetMyEfficiencyQuery(
    validRange ? { from: fromDate, to: toDate } : undefined,
    { skip: !validRange || isTeamView },
  );
  const teamDashboard = useGetCodingDashboardQuery(
    validRange ? { from: fromDate, to: toDate, includeDaily: true } : undefined,
    { skip: !validRange || !isTeamView },
  );
  const summary = useMemo(
    () => isTeamView
      ? teamDashboard.data ? aggregateTeamOverview(teamDashboard.data, fromDate, toDate) : undefined
      : efficiency.data,
    [efficiency.data, fromDate, isTeamView, teamDashboard.data, toDate],
  );
  const rows = useMemo(
    () => [...(summary?.daily ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [summary?.daily],
  );
  const lostHoursRows = useMemo<LostHoursDay[]>(() => {
    if (!validRange) return [];
    const teamCards = teamDashboard.data ?? [];
    const rowsByDate = new Map(rows.map((row) => [row.date, row]));
    return weekdaysInRange(fromDate, toDate).map((date) => {
      const beforeLoginHoursReporting = date < LOGIN_HOURS_REPORTING_START;
      if (isTeamView) {
        const aggregate = teamCards.reduce<LostHoursDay>((result, card) => {
          const row = card.efficiency.daily.find((candidate) => candidate.date === date);
          const noLogin = !beforeLoginHoursReporting && (!row || row.insideMinutes === null);
          result.idle += row ? row.idleMinutes / 60 : 0;
          result.downtime += row ? row.downtimeMinutes / 60 : 0;
          result.leave += beforeLoginHoursReporting ? 0 : noLogin ? 8 : (row?.leaveMinutes ?? 0) / 60;
          result.meeting += row ? row.meetingMinutes / 60 : 0;
          result.noLogin = result.noLogin || noLogin;
          return result;
        }, { date, idle: 0, downtime: 0, leave: 0, meeting: 0, noLogin: false });
        const coderCount = teamCards.length;
        return coderCount > 0
          ? {
              ...aggregate,
              idle: aggregate.idle / coderCount,
              downtime: aggregate.downtime / coderCount,
              leave: aggregate.leave / coderCount,
              meeting: aggregate.meeting / coderCount,
            }
          : aggregate;
      }
      const row = rowsByDate.get(date);
      const noLogin = !beforeLoginHoursReporting && (!row || row.insideMinutes === null);
      return {
        date,
        idle: row ? row.idleMinutes / 60 : 0,
        downtime: row ? row.downtimeMinutes / 60 : 0,
        leave: beforeLoginHoursReporting ? 0 : noLogin ? 8 : (row?.leaveMinutes ?? 0) / 60,
        meeting: row ? row.meetingMinutes / 60 : 0,
        noLogin,
      };
    });
  }, [fromDate, isTeamView, rows, teamDashboard.data, toDate, validRange]);
  const displayedProductionRows = useMemo(
    () => groupProductionRows(rows, activeGraphInterval),
    [activeGraphInterval, rows],
  );
  const displayedLostHoursRows = useMemo(
    () => groupLostHoursRows(lostHoursRows, activeGraphInterval),
    [activeGraphInterval, lostHoursRows],
  );
  const manualAchievement = summary ? achievement(summary.manualCpd, summary.targetCpd) : null;
  const kaironAchievement = summary ? achievement(summary.kaironCpd, summary.targetCpd) : null;
  const isLoading = isTeamView ? teamDashboard.isLoading : efficiency.isLoading;
  const error = isTeamView ? teamDashboard.error : efficiency.error;
  const refetch = isTeamView ? teamDashboard.refetch : efficiency.refetch;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-content-primary">{isTeamView ? "Team daily overview" : "Daily CPD overview"}</h2>
          <p className="text-sm text-content-muted">Compare {isTeamView ? "the team's" : "your"} target, Manual, and Kairon charts by {activeGraphInterval}.</p>
        </div>
        <div className="flex flex-wrap items-end justify-end gap-3">
          {intervalOptions.length > 1 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-content-secondary">Graph interval</span>
              <div className="flex h-10 items-center rounded-md border border-border bg-surface p-1">
                {intervalOptions.map((interval) => (
                  <button
                    key={interval}
                    type="button"
                    onClick={() => setGraphInterval(interval)}
                    className={`h-8 rounded px-3 text-xs font-medium capitalize transition ${activeGraphInterval === interval ? "bg-brand-600 text-white shadow-sm" : "text-content-secondary hover:bg-surface-muted"}`}
                  >
                    {interval}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-content-secondary">
            From
            <input
              className={inputClasses}
              type="date"
              max={toDate || today}
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-content-secondary">
            To
            <input
              className={inputClasses}
              type="date"
              min={fromDate || undefined}
              max={today}
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </label>
          </div>
        </div>
      </div>

      {!validRange && (
        <p className="rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">From date must be on or before To date.</p>
      )}

      {isLoading ? (
        <LoadingState label={`Building ${isTeamView ? "the team" : "your"} daily overview…`} />
      ) : error ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <CpdCard label="Target CPD" value={summary.targetCpd} />
            <CpdCard label="Manual CPD" value={summary.manualCpd} achievement={manualAchievement} />
            <CpdCard label="Kairon CPD" value={summary.kaironCpd} achievement={kaironAchievement} />
          </div>

          <div className={`grid min-w-0 gap-4 ${displayedLostHoursRows.length > 0 ? "lg:grid-cols-2" : ""}`}>
            {displayedProductionRows.length === 0 ? (
              <EmptyState title="No CPD data is available for this date range" />
            ) : (
              <DailyProductionChart rows={displayedProductionRows} interval={activeGraphInterval} />
            )}
            {displayedLostHoursRows.length > 0 && <LostHoursChart rows={displayedLostHoursRows} teamView={isTeamView} interval={activeGraphInterval} />}
          </div>
        </>
      ) : null}
    </section>
  );
}

function LostHoursChart({ rows, teamView, interval }: { rows: LostHoursDay[]; teamView: boolean; interval: GraphInterval }) {
  const chartWidth = Math.max(760, rows.length * 58);
  const chartHeight = 340;
  const margin = { top: 28, right: 28, bottom: 62, left: 52 };
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const totals = Object.fromEntries(
    LOST_HOUR_SERIES.map((series) => [series.key, rows.reduce((sum, row) => sum + row[series.key], 0)]),
  ) as Record<LostHourKey, number>;
  const rawMaximum = Math.max(...rows.map((row) => LOST_HOUR_SERIES.reduce((sum, series) => sum + row[series.key], 0)), 8);
  const yMaximum = Math.ceil(rawMaximum);
  const y = (value: number) => margin.top + plotHeight - value / yMaximum * plotHeight;
  const bandWidth = plotWidth / rows.length;
  const barWidth = Math.min(34, bandWidth * 0.62);
  const x = (index: number) => margin.left + bandWidth * index + (bandWidth - barWidth) / 2;
  const labelInterval = Math.max(1, Math.ceil(rows.length / 12));

  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 className="font-semibold capitalize text-content-primary">{interval}-wise lost hours by reason</h3>
          <p className="text-sm text-content-muted">
            {teamView
              ? "Daily bars and legend totals are average hours per coder. A missing weekday Login Hours record contributes 8 hours of leave."
              : "A weekday without a Login Hours record is displayed as 8 hours of leave."} Before August 11, 2026, leave is not inferred; available idle, downtime, and meeting time is still shown. Weekends are excluded.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-x-4 gap-y-2 text-xs text-content-secondary">
          {LOST_HOUR_SERIES.map((series) => (
            <span key={series.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: series.color }} />
              {teamView ? `Avg ${series.label.toLowerCase()}` : series.label} <strong className="text-content-primary">{totals[series.key].toFixed(1)}h</strong>
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto px-3 pb-3 pt-2">
        <svg width={chartWidth} height={chartHeight} role="img" aria-label="Daily lost hours by idle time, downtime, leave, and meetings">
          {[0, 1, 2, 3, 4].map((tick) => {
            const value = yMaximum * tick / 4;
            const yPosition = y(value);
            return (
              <g key={tick}>
                <line x1={margin.left} x2={chartWidth - margin.right} y1={yPosition} y2={yPosition} stroke="var(--color-border)" strokeWidth="1" />
                <text x={margin.left - 10} y={yPosition + 4} textAnchor="end" fontSize="11" fill="var(--color-content-muted)">{value.toFixed(value % 1 ? 1 : 0)}h</text>
              </g>
            );
          })}

          {rows.map((row, index) => {
            let stackedHours = 0;
            return (
              <g key={row.date}>
                {LOST_HOUR_SERIES.map((series) => {
                  const value = row[series.key];
                  if (value <= 0) return null;
                  const top = stackedHours + value;
                  const topY = y(top);
                  const height = y(stackedHours) - topY;
                  stackedHours = top;
                  return (
                    <g key={series.key}>
                      <rect x={x(index)} y={topY} width={barWidth} height={height} fill={series.color} rx="2">
                        <title>{`${row.label ?? row.date} · ${!teamView && row.noLogin ? "No login record · " : ""}${teamView ? `Average ${series.label.toLowerCase()}` : series.label}: ${value.toFixed(1)} hours`}</title>
                      </rect>
                      {height >= 18 && (
                        <text x={x(index) + barWidth / 2} y={topY + height / 2 + 4} textAnchor="middle" fontSize="10" fontWeight="600" fill="white">
                          {value.toFixed(1)}
                        </text>
                      )}
                    </g>
                  );
                })}
                {(index % labelInterval === 0 || index === rows.length - 1) && (
                  <text
                    x={x(index) + barWidth / 2}
                    y={chartHeight - 25}
                    textAnchor="end"
                    transform={`rotate(-35 ${x(index) + barWidth / 2} ${chartHeight - 25})`}
                    fontSize="10"
                    fill="var(--color-content-muted)"
                  >
                    {row.label ?? new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </article>
  );
}

function CpdCard({ label, value, achievement: achievementValue }: { label: string; value: string | null; achievement?: number | null }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <p className="text-sm text-content-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold tracking-tight text-content-primary">{formatCpd(value)}</p>
        {achievementValue != null && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${achievementValue >= 100 ? "bg-success-bg text-success" : "bg-warning-bg text-warning"}`}>
            {achievementValue.toFixed(1)}% of target
          </span>
        )}
      </div>
    </article>
  );
}

function DailyProductionChart({ rows, interval }: { rows: ProductionDay[]; interval: GraphInterval }) {
  const chartWidth = Math.max(760, rows.length * 58);
  const chartHeight = 360;
  const margin = { top: 28, right: 28, bottom: 62, left: 52 };
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const values = rows.flatMap((row) => SERIES.map((series) => Number(row[series.key] ?? 0)));
  const rawMaximum = Math.max(...values, 1);
  const yMaximum = Math.max(5, Math.ceil(rawMaximum / 5) * 5);
  const x = (index: number) => margin.left + (rows.length === 1 ? plotWidth / 2 : index * plotWidth / (rows.length - 1));
  const y = (value: number) => margin.top + plotHeight - value / yMaximum * plotHeight;
  const labelInterval = Math.max(1, Math.ceil(rows.length / 12));

  const pointsFor = (key: SeriesKey) => rows.flatMap((row, index) => {
    const value = row[key];
    return value == null ? [] : [{ x: x(index), y: y(Number(value)), value: Number(value), date: row.date, label: row.label }];
  });

  const pathFor = (key: SeriesKey) => {
    const points = pointsFor(key);
    if (points.length === 0) return "";
    if (points.length === 1) return `M${points[0].x},${points[0].y}`;

    return points.slice(0, -1).reduce((path, point, index) => {
      const previous = points[index - 1] ?? point;
      const next = points[index + 1];
      const afterNext = points[index + 2] ?? next;
      const controlOneX = point.x + (next.x - previous.x) / 6;
      const controlOneY = point.y + (next.y - previous.y) / 6;
      const controlTwoX = next.x - (afterNext.x - point.x) / 6;
      const controlTwoY = next.y - (afterNext.y - point.y) / 6;
      return `${path} C${controlOneX},${controlOneY} ${controlTwoX},${controlTwoY} ${next.x},${next.y}`;
    }, `M${points[0].x},${points[0].y}`);
  };

  const formatPointValue = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);

  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 className="font-semibold capitalize text-content-primary">{interval}-wise production comparison</h3>
          <p className="text-sm text-content-muted">Manual and Kairon charts against the same adjusted target shown on the dashboard.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-content-secondary">
          {SERIES.map((series) => (
            <span key={series.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.color }} />
              {series.label}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto px-3 pb-3 pt-2">
        <svg width={chartWidth} height={chartHeight} role="img" aria-label="Daily adjusted target, Manual charts, and Kairon charts comparison graph">
          {[0, 1, 2, 3, 4].map((tick) => {
            const value = yMaximum * tick / 4;
            const yPosition = y(value);
            return (
              <g key={tick}>
                <line x1={margin.left} x2={chartWidth - margin.right} y1={yPosition} y2={yPosition} stroke="var(--color-border)" strokeWidth="1" />
                <text x={margin.left - 10} y={yPosition + 4} textAnchor="end" fontSize="11" fill="var(--color-content-muted)">{value.toFixed(0)}</text>
              </g>
            );
          })}

          {rows.map((row, index) => index % labelInterval === 0 || index === rows.length - 1 ? (
            <text
              key={row.date}
              x={x(index)}
              y={chartHeight - 25}
              textAnchor="end"
              transform={`rotate(-35 ${x(index)} ${chartHeight - 25})`}
              fontSize="10"
              fill="var(--color-content-muted)"
            >
              {row.label ?? new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </text>
          ) : null)}

          {SERIES.map((series) => (
            <g key={series.key}>
              <path
                d={pathFor(series.key)}
                fill="none"
                stroke={series.color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={series.dashed ? "8 6" : undefined}
              />
              {pointsFor(series.key).map((point) => (
                <g key={`${series.key}-${point.date}`}>
                  <circle cx={point.x} cy={point.y} r="4" fill={series.color} stroke="var(--color-surface)" strokeWidth="2">
                    <title>{`${point.label ?? point.date} · ${series.label}: ${point.value.toFixed(1)}`}</title>
                  </circle>
                  <text
                    x={point.x}
                    y={point.y + (series.key === "kaironCharts" ? 18 : -10)}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill={series.color}
                    stroke="var(--color-surface)"
                    strokeWidth="3"
                    paintOrder="stroke"
                  >
                    {formatPointValue(point.value)}
                  </text>
                </g>
              ))}
            </g>
          ))}
        </svg>
      </div>
    </article>
  );
}
