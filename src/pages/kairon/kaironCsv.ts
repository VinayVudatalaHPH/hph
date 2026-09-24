import Papa from "papaparse";

import { KAIRON_LEVELS, KAIRON_STATUSES } from "@/api/types";
import type { KaironChartRowInput, KaironLevel, KaironStatus } from "@/api/types";

// The exact column order the backend's reference template offers (mirrors
// backend/app/kairon/services.py's TEMPLATE_COLUMNS) — used only to label
// the download link; parsing below matches headers by normalized name, not
// position, so a re-ordered (but otherwise faithful) export still works.
export const KAIRON_TEMPLATE_COLUMNS = [
  "MBI",
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
  mbi: "mbi",
  mbinumber: "mbi",
  medicarebeneficiaryidentifier: "mbi",
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

// Patient columns may exist in a raw Kairon export, but are intentionally
// ignored while projecting each row into the upload payload.
const PATIENT_COLUMN_ALIASES = new Set(["patient", "patientname"]);

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

interface ParsedTabularData {
  fields: string[];
  data: Record<string, string>[];
  errors: KaironCsvRowError[];
}

function buildKaironParseResult(parsed: ParsedTabularData): KaironCsvParseResult {
  const fields = parsed.fields;

  const fieldByColumn = new Map<string, keyof KaironChartRowInput>();
  const unrecognized: string[] = [];
  for (const raw of fields) {
    if (raw.trim() === "" || PATIENT_COLUMN_ALIASES.has(normalizeHeader(raw))) continue;
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
  const missingColumns = KAIRON_TEMPLATE_COLUMNS.filter((column) => {
    if (column === "MBI") {
      return !["mbi", "mbinumber", "medicarebeneficiaryidentifier"].some((alias) => normalizedFields.has(alias));
    }
    return !normalizedFields.has(normalizeHeader(column));
  });
  if (missingColumns.length > 0) {
    fileErrors.push(`Missing required column(s): ${missingColumns.join(", ")}.`);
  }
  if (fileErrors.length > 0) {
    return { rows: [], rowErrors: [], fileErrors };
  }

  const rows: KaironChartRowInput[] = [];
  const rowErrors: KaironCsvRowError[] = [...parsed.errors];

  parsed.data.forEach((rawRow, index) => {
    const row = index + 1;
    const byField: Partial<Record<keyof KaironChartRowInput, string>> = {};
    for (const [column, field] of fieldByColumn.entries()) {
      byField[field] = (rawRow[column] ?? "").trim();
    }

    const errors: string[] = [];

    const mbi = byField.mbi ?? "";
    if (!mbi) errors.push("MBI is required for duplicate-safe importing");

    const rawProgram = byField.program ?? "";
    const program = rawProgram.toLowerCase().includes("foundation") ? "FOUNDATION" : rawProgram;
    if (!program) errors.push("Program is required");

    const level = byField.level as KaironLevel;
    if (!(KAIRON_LEVELS as readonly string[]).includes(level)) {
      errors.push(`Level must be one of ${KAIRON_LEVELS.join(", ")}`);
    }

    const normalizedStatus = byField.status?.toLowerCase() === "blocked" ? "On Hold" : byField.status;
    const status = normalizedStatus as KaironStatus;
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
      mbi,
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

export function parseKaironCsv(csvText: string): Promise<KaironCsvParseResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (parsed) =>
        resolve(
          buildKaironParseResult({
            fields: parsed.meta.fields ?? [],
            data: parsed.data,
            errors: parsed.errors.map((error) => ({
              row: (error.row ?? -1) + 1,
              message: error.message,
            })),
          }),
        ),
    });
  });
}

function isZipWorkbook(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function isLegacyExcelWorkbook(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  );
}

async function parseWorkbook(bytes: ArrayBuffer): Promise<KaironCsvParseResult> {
  const XLSX = await import("@e965/xlsx");
  const workbook = XLSX.read(bytes, {
    type: "array",
    cellDates: false,
    dense: true,
  });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { rows: [], rowErrors: [], fileErrors: ["The workbook does not contain a worksheet."] };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
    dateNF: "m/d/yyyy",
  });
  if (matrix.length === 0) {
    return { rows: [], rowErrors: [], fileErrors: ["The first worksheet is empty."] };
  }

  const fields = matrix[0].map((value) => String(value).trim());
  const data = matrix.slice(1).map((values) =>
    Object.fromEntries(fields.map((field, index) => [field, String(values[index] ?? "").trim()])),
  );
  return buildKaironParseResult({ fields, data, errors: [] });
}

export async function parseKaironFile(file: File, contents?: ArrayBuffer): Promise<KaironCsvParseResult> {
  try {
    const bytes = contents ?? (await file.arrayBuffer());
    const signature = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 8));
    const extension = file.name.split(".").pop()?.toLowerCase();
    const isWorkbook =
      isZipWorkbook(signature) ||
      isLegacyExcelWorkbook(signature) ||
      extension === "ods" ||
      extension === "xls" ||
      extension === "xlsx";

    if (isWorkbook) return await parseWorkbook(bytes);
    return await parseKaironCsv(new TextDecoder("utf-8").decode(bytes));
  } catch {
    return {
      rows: [],
      rowErrors: [],
      fileErrors: ["This file could not be read. Upload a valid CSV, ODS, XLS, or XLSX workbook."],
    };
  }
}
