import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useUploadKaironBatchMutation } from "@/api/kaironApi";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/FormField";
import { useToast } from "@/features/ui/useToast";
import { API_BASE_URL } from "@/lib/env";

import { parseKaironCsv, type KaironCsvParseResult } from "./kaironCsv";

// The template endpoint (backend/app/kairon/routes.py's KaironUploadTemplate)
// returns plain text/csv, not the {status,message,data} JSON envelope, so
// the backend's encryption hook skips it (encrypt_response_body only
// touches JSON responses) — a plain fetch outside RTK Query's encrypted
// baseQuery is the correct way to pull it, not a workaround.
async function downloadTemplate() {
  const response = await fetch(`${API_BASE_URL}/kairon/upload-template`, { credentials: "include" });
  if (!response.ok) throw new Error("Could not download the template.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kairon_upload_template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

interface KaironUploadFormPageProps {
  embedded?: boolean;
  onCancel?: () => void;
  onDone?: () => void;
}

export function KaironUploadFormPage({ embedded = false, onCancel, onDone }: KaironUploadFormPageProps = {}) {
  const navigate = useNavigate();
  const { notifyError } = useToast();
  const [asOfDate, setAsOfDate] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<KaironCsvParseResult | null>(null);
  const [uploadBatch, { isLoading }] = useUploadKaironBatchMutation();

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    setParseResult(parseKaironCsv(text));
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate();
    } catch {
      notifyError("Could not download the template. Try again.");
    }
  };

  const canSubmit =
    Boolean(asOfDate) &&
    parseResult !== null &&
    parseResult.fileErrors.length === 0 &&
    parseResult.rowErrors.length === 0 &&
    parseResult.rows.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !parseResult) return;
    const result = await uploadBatch({ asOfDate, sourceFilename: fileName, rows: parseResult.rows });
    if (!("error" in result)) {
      if (onDone) onDone();
      else navigate("/input-data");
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {!embedded && (
        <div>
          <h1 className="text-lg font-semibold text-content-primary">Upload Kairon chart records</h1>
          <p className="text-sm text-content-muted">
            Download the reference template, fill it in (or export Kairon rows into the same shape), then upload it
            here for a single reporting date. Patient name and MBI are never accepted — do not add those columns.
          </p>
        </div>
      )}

      <div className={`flex flex-col gap-4 ${embedded ? "" : "rounded-lg border border-border bg-surface p-6"}`}>
        <div>
          <Button type="button" variant="secondary" onClick={() => void handleDownloadTemplate()}>
            Download reference template
          </Button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-content-secondary" htmlFor="asOfDate">
            As of date
          </label>
          <input
            id="asOfDate"
            type="date"
            className={inputClasses}
            value={asOfDate}
            onChange={(event) => setAsOfDate(event.target.value)}
          />
          <p className="text-xs text-content-muted">
            The reporting date this batch represents. Uploading again for the same date replaces the earlier batch
            entirely rather than merging row by row — there's no Patient/MBI key to match rows against.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-content-secondary" htmlFor="kaironFile">
            Filled-in CSV file
          </label>
          <input
            id="kaironFile"
            type="file"
            accept=".csv,text/csv"
            className={inputClasses}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>

        {parseResult && (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-muted p-4 text-sm">
            {parseResult.fileErrors.length > 0 ? (
              <ul className="list-disc pl-5 text-danger">
                {parseResult.fileErrors.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            ) : (
              <>
                <p className="text-content-secondary">
                  {parseResult.rows.length} row(s) ready to upload
                  {parseResult.rowErrors.length > 0 && `, ${parseResult.rowErrors.length} row(s) with errors`}.
                </p>
                {parseResult.rowErrors.length > 0 && (
                  <>
                    <ul className="max-h-48 list-disc overflow-y-auto pl-5 text-danger">
                      {parseResult.rowErrors.map((error, index) => (
                        <li key={index}>
                          Row {error.row}: {error.message}
                        </li>
                      ))}
                    </ul>
                    <p className="text-content-muted">
                      Fix these rows in the file and re-select it — the whole batch is rejected together, not row by
                      row.
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-2 flex gap-2">
          <Button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit} isLoading={isLoading}>
            Upload batch
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => (onCancel ? onCancel() : navigate("/input-data"))}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
