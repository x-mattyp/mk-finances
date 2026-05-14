"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { monthLabel } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import {
  computedExpenseTotalFromValues,
  getWorkbookDebugInfo,
  parseSpreadsheetBuffer,
  parsedRowToUpsertPayload,
  type ParsedMonthRow,
  type WorkbookDebugInfo,
} from "@/lib/sheet-import";

export default function ImportClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<ParsedMonthRow[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<WorkbookDebugInfo | null>(null);

  const processFile = useCallback(async (file: File) => {
    setSuccess(null);
    setErrors([]);
    setWarnings([]);
    setRows(null);
    setDebugInfo(null);
    setFileName(file.name);

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".csv")) {
      setErrors(["Please choose an .xlsx or .csv file."]);
      return;
    }

    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      setDebugInfo(getWorkbookDebugInfo(buf));
      const result = parseSpreadsheetBuffer(buf);
      setWarnings(result.warnings);
      setErrors(result.errors);
      setRows(result.rows);
      if (result.errors.length > 0) {
        setRows(null);
      }
    } catch (e) {
      setErrors([
        e instanceof Error ? e.message : "Failed to read the file.",
      ]);
      setRows(null);
    } finally {
      setParsing(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) void processFile(f);
    },
    [processFile],
  );

  async function onConfirmImport() {
    if (!rows || rows.length === 0) return;
    setImporting(true);
    setSuccess(null);
    setErrors([]);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErrors(["You must be signed in to import."]);
      setImporting(false);
      return;
    }

    const payloads = rows.map((r) => parsedRowToUpsertPayload(r, user.id));
    const { error } = await supabase.from("entries").upsert(payloads, {
      onConflict: "user_id,year,month",
    });

    setImporting(false);
    if (error) {
      setErrors([error.message]);
      return;
    }
    setSuccess(`Imported ${payloads.length} month row(s) successfully.`);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 900);
  }

  return (
    <div className="min-h-full pb-16">
      <header className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Link href="/dashboard" className="text-xs text-muted hover:text-accent">
            ← Dashboard
          </Link>
          <h1 className="font-display text-lg text-foreground">Import data</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <p className="text-sm text-muted">
          Upload a Google Sheet export (.xlsx) or CSV. Expected tabs:{" "}
          <span className="text-foreground">
            Joint Statements (2025)
          </span>{" "}
          and{" "}
          <span className="text-foreground">
            Joint Statements (2026)
          </span>
          . Month headers look like <span className="text-accent">Jan-2025</span>{" "}
          from column C.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void processFile(f);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors ${
            dragOver
              ? "border-accent bg-accent/10"
              : "border-border bg-surface hover:border-accent/40"
          }`}
        >
          <span className="text-sm text-foreground">
            {parsing ? "Reading file…" : "Drop .xlsx or .csv here, or click to browse"}
          </span>
          {fileName ? (
            <span className="mt-2 text-xs text-muted">{fileName}</span>
          ) : null}
        </button>

        {debugInfo ? (
          <div className="rounded-lg border border-dashed border-accent/30 bg-surface/80 p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
              Import debug
            </h2>
            {debugInfo.readError ? (
              <p className="mb-3 text-xs text-accent-red">{debugInfo.readError}</p>
            ) : null}
            <div className="mb-4">
              <p className="mb-1 text-xs font-medium text-foreground">
                1) Sheet names in this file ({debugInfo.sheetNames.length})
              </p>
              {debugInfo.sheetNames.length === 0 ? (
                <p className="text-xs text-muted">(none)</p>
              ) : (
                <ol className="list-inside list-decimal font-mono text-xs text-muted">
                  {debugInfo.sheetNames.map((name) => (
                    <li key={name} className="text-foreground">
                      {name}
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-foreground">
                2) First 3 rows of first sheet{" "}
                {debugInfo.firstSheetName ? (
                  <span className="font-mono text-muted">
                    ({debugInfo.firstSheetName})
                  </span>
                ) : (
                  <span className="text-muted">(no sheets)</span>
                )}
              </p>
              <p className="mb-2 text-[10px] text-muted">
                Columns A–Z (26 max); cell shows ref, formatted value (w), SheetJS type (t).
              </p>
              <div className="overflow-x-auto rounded border border-border bg-background/50">
                <table className="w-full border-collapse text-left font-mono text-[10px]">
                  <thead>
                    <tr className="border-b border-border bg-surface text-muted">
                      <th className="sticky left-0 z-[1] bg-surface px-1 py-1">Row</th>
                      {(debugInfo.previewRows[0]?.cells ?? []).map((cell) => (
                        <th key={cell.ref} className="min-w-[4.5rem] px-1 py-1">
                          {cell.ref.replace(/\d+/g, "")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {debugInfo.previewRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={Math.max(
                            2,
                            (debugInfo.previewRows[0]?.cells.length ?? 0) + 1,
                          )}
                          className="px-2 py-2 text-muted italic"
                        >
                          No cells in range (empty sheet?).
                        </td>
                      </tr>
                    ) : (
                      debugInfo.previewRows.map((row) => (
                        <tr key={row.rowIndex} className="border-b border-border/60">
                          <td className="sticky left-0 bg-background/80 px-1 py-1 text-muted">
                            {row.rowIndex}
                          </td>
                          {row.cells.map((cell) => (
                            <td
                              key={cell.ref}
                              className="max-w-[10rem] whitespace-pre-wrap break-words px-1 py-1 align-top text-foreground"
                              title={`${cell.ref} t=${cell.cellType ?? ""}`}
                            >
                              <span className="text-muted">{cell.ref}:</span>{" "}
                              {cell.display === "" ? (
                                <span className="italic text-muted">(empty)</span>
                              ) : (
                                <span>{cell.display}</span>
                              )}
                              {cell.cellType ? (
                                <span className="block text-[9px] text-muted">
                                  t={cell.cellType}
                                </span>
                              ) : null}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {errors.length > 0 ? (
          <div
            className="rounded-md border border-accent-red/40 bg-accent-red/10 px-4 py-3 text-sm text-accent-red"
            role="alert"
          >
            {errors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        ) : null}

        {warnings.length > 0 ? (
          <div className="rounded-md border border-border bg-surface px-4 py-3 text-xs text-muted">
            <p className="mb-1 font-medium text-foreground">Notes</p>
            <ul className="list-inside list-disc space-y-1">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {rows && rows.length > 0 ? (
          <>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h2 className="font-display mb-3 text-base text-foreground">
                Preview ({rows.length} months)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      <th className="py-2 pr-3">Period</th>
                      <th className="py-2 pr-3">Income (net)</th>
                      <th className="py-2 pr-3">Matty W-2</th>
                      <th className="py-2 pr-3">Kara W-2</th>
                      <th className="py-2 pr-3">Expenses (calc)</th>
                      <th className="py-2 pr-3">IRA</th>
                      <th className="py-2 pr-3">NW (sheet)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const v = r.values;
                      const expSum = computedExpenseTotalFromValues(v);
                      return (
                        <tr key={`${r.year}-${r.month}`} className="border-b border-border/70">
                          <td className="py-2 pr-3 text-foreground">
                            {monthLabel(r.year, r.month)}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {formatCurrency(v.income_net ?? null)}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {formatCurrency(v.matty_w2 ?? null)}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {formatCurrency(v.kara_w2 ?? null)}
                          </td>
                          <td className="py-2 pr-3 tabular-nums text-accent-teal">
                            {formatCurrency(expSum)}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {formatCurrency(v.sav_ira ?? null)}
                          </td>
                          <td className="py-2 pr-3 tabular-nums text-muted">
                            {formatCurrency(r.netWorthVerify)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={importing}
                onClick={() => void onConfirmImport()}
                className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {importing ? "Importing…" : "Confirm import"}
              </button>
              <Link
                href="/dashboard"
                className="rounded-md border border-border px-5 py-2.5 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </Link>
            </div>
          </>
        ) : null}

        {success ? (
          <p className="text-sm text-accent" role="status">
            {success} Redirecting to dashboard…
          </p>
        ) : null}
      </main>
    </div>
  );
}
