import Papa from "papaparse";

import { KAIRON_LEVELS, KAIRON_STATUSES } from "@/api/types";
import type { KaironChartRowInput, KaironLevel, KaironStatus } from "@/api/types";

// The exact column order the backend's reference template offers (mirrors
// backend/app/kairon/services.py's TEMPLATE_COLUMNS) — used only to label
// the download link; parsing below matches headers by normalized name, not
// position, so a re-ordered (but otherwise faithful) export still works.
export const KAIRON_TEMPLATE_COLUMNS = [
  "Program",
  "Level",
  "Status",
  "Coding Analyst",
  "Actions",
  "Last Action",
  "Created",
  "Completed",
  "TAT",
  "Age",
  "Practice",
] as const;

const HEADER_FIELD_MAP: Record<string, keyof KaironChartRowInput> = {
  program: "program",
  level: "level",
  status: "status",
  codinganalyst: "codingAnalyst",
  actions: "actions",
  lastaction: "lastAction",
  created: "created",
  completed: "completed",
  tat: "tat",
  age: "age",
  practice: "practice",
};

// Mirrors backend/app/kairon/schemas.py's `_FORBIDDEN_COLUMN_ALIASES`
// exactly — the client-side half of the three-layer PHI exclusion (§7.4 of
// the spec doc). The backend re-checks this independently on submit and is
// the real authority; this is only here to fail fast in the browser.
const FORBIDDEN_COLUMN_ALIASES = new Set(["patient", "patientname", "mbi", "mbinumber", "medicarebeneficiaryidentifier"]);

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const usSlash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usSlash) {
    const [, m, d, y] = usSlash;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const usSlashShortYear = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (usSlashShortYear) {
    const [, m, d, yy] = usSlashShortYear;
    return `${2000 + Number(yy)}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const isoSlash = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (isoSlash) {
    const [, y, m, d] = isoSlash;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

export interface KaironCsvRowError {
  row: number; // 1-based data row (header row excluded), for the manager to find in their spreadsheet
  message: string;
}

export interface KaironCsvParseResult {
  rows: KaironChartRowInput[];
  rowErrors: KaironCsvRowError[];
  // Header-level problems block the whole file — there's nothing meaningful
  // to preview until these are fixed.
  fileErrors: string[];
}

export function parseKaironCsv(csvText: string): KaironCsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  const fields = parsed.meta.fields ?? [];

  const forbiddenHits = fields.filter((field) => FORBIDDEN_COLUMN_ALIASES.has(normalizeHeader(field)));
  if (forbiddenHits.length > 0) {
    return {
      rows: [],
      rowErrors: [],
      fileErrors: [
        `Patient name and MBI must never be uploaded to this system. Remove these column(s) from the file: ${forbiddenHits.join(", ")}.`,
      ],
    };
  }

  const fieldByColumn = new Map<string, keyof KaironChartRowInput>();
  const unrecognized: string[] = [];
  for (const raw of fields) {
    if (raw.trim() === "") continue;
    const mapped = HEADER_FIELD_MAP[normalizeHeader(raw)];
    if (mapped) fieldByColumn.set(raw, mapped);
    else unrecognized.push(raw);
  }

  const fileErrors: string[] = [];
  if (unrecognized.length > 0) {
    fileErrors.push(
      `Unrecognized column(s): ${unrecognized.join(", ")}. Only the template's columns are accepted — remove or rename these to match the template.`,
    );
  }
  const normalizedFields = new Set(fields.map(normalizeHeader));
  const missingColumns = KAIRON_TEMPLATE_COLUMNS.filter((column) => !normalizedFields.has(normalizeHeader(column)));
  if (missingColumns.length > 0) {
    fileErrors.push(`Missing required column(s): ${missingColumns.join(", ")}.`);
  }
  if (fileErrors.length > 0) {
    return { rows: [], rowErrors: [], fileErrors };
  }

  const rows: KaironChartRowInput[] = [];
  const rowErrors: KaironCsvRowError[] = parsed.errors.map((error) => ({
    row: (error.row ?? -1) + 1,
    message: error.message,
  }));

  parsed.data.forEach((rawRow, index) => {
    const row = index + 1;
    const byField: Partial<Record<keyof KaironChartRowInput, string>> = {};
    for (const [column, field] of fieldByColumn.entries()) {
      byField[field] = (rawRow[column] ?? "").trim();
    }

    const errors: string[] = [];

    const program = byField.program ?? "";
    if (!program) errors.push("Program is required");

    const level = byField.level as KaironLevel;
    if (!(KAIRON_LEVELS as readonly string[]).includes(level)) {
      errors.push(`Level must be one of ${KAIRON_LEVELS.join(", ")}`);
    }

    const status = byField.status as KaironStatus;
    if (!(KAIRON_STATUSES as readonly string[]).includes(status)) {
      errors.push(`Status must be one of ${KAIRON_STATUSES.join(", ")}`);
    }

    const codingAnalyst = byField.codingAnalyst ?? "";
    if (!codingAnalyst) errors.push("Coding Analyst is required");

    let actions = 0;
    if (byField.actions) {
      const parsedActions = Number(byField.actions);
      if (!Number.isInteger(parsedActions) || parsedActions < 0) {
        errors.push("Actions must be a non-negative whole number");
      } else {
        actions = parsedActions;
      }
    }

    let created: string | null = null;
    if (!byField.created) {
      errors.push("Created date is required");
    } else {
      created = parseDate(byField.created);
      if (!created) errors.push(`Created date "${byField.created}" isn't recognized (use YYYY-MM-DD, M/D/YYYY, or M/D/YY)`);
    }

    let completed: string | null = null;
    if (byField.completed) {
      completed = parseDate(byField.completed);
      if (!completed) errors.push(`Completed date "${byField.completed}" isn't recognized (use YYYY-MM-DD, M/D/YYYY, or M/D/YY)`);
    }

    let tat: number | null = null;
    if (byField.tat) {
      const parsedTat = Number(byField.tat);
      if (!Number.isInteger(parsedTat) || parsedTat < 0) errors.push("TAT must be a non-negative whole number");
      else tat = parsedTat;
    }

    let age: number | null = null;
    if (byField.age) {
      const parsedAge = Number(byField.age);
      if (!Number.isInteger(parsedAge) || parsedAge < 0) errors.push("Age must be a non-negative whole number");
      else age = parsedAge;
    }

    if (errors.length > 0) {
      rowErrors.push({ row, message: errors.join("; ") });
      return;
    }

    rows.push({
      program,
      level,
      status,
      codingAnalyst,
      actions,
      lastAction: byField.lastAction || null,
      created: created as string,
      completed,
      tat,
      age,
      practice: byField.practice || null,
    });
  });

  return { rows, rowErrors, fileErrors };
}
