import * as XLSX from "xlsx";
import type { Entry } from "@/types/entry";
import { n, totalExpenses } from "@/lib/finance";

/** Shared options for import + debug reads (cached formula results, formatted .w). */
const XLSX_READ_OPTS: XLSX.ParsingOptions = {
  type: "array",
  cellDates: true,
  cellFormula: false,
  cellNF: false,
  raw: false,
};

export const JOINT_SHEET_NAMES = [
  "Joint Statements (2025)",
  "Joint Statements (2026)",
] as const;

export type ImportNumericKey = Exclude<
  keyof Entry,
  "id" | "user_id" | "year" | "month"
>;

export type ParsedMonthRow = {
  year: number;
  month: number;
  /** Parsed numeric fields (missing = null / not in sheet) */
  values: Partial<Record<ImportNumericKey, number | null>>;
  /** Net Worth Total from sheet — verification only */
  netWorthVerify: number | null;
};

const MONTH_HEADER_RE =
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-20(\d{2})$/i;

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

type Section = "unknown" | "income" | "expenses" | "savings" | "assets" | "liabilities";

function normLabel(s: string): string {
  return s
    .replace(/\u00a0/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function parseMoneyCell(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") {
    const s = String(v).trim();
    if (s === "" || s === "—" || s === "-") return null;
    return parseMoneyCell(s);
  }
  let s = v.trim();
  if (s === "" || s === "—" || s === "-" || s.toLowerCase() === "n/a") return null;

  let neg = false;
  if (/^\$\([\d,.\s]+\)$/i.test(s)) {
    neg = true;
    s = s.replace(/^\$\(|\)$/g, "");
  } else if (/^\([\d,.\s]+\)$/i.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  } else {
    s = s.replace(/\$/g, "").replace(/,/g, "");
  }

  const num = parseFloat(s.replace(/\s/g, ""));
  if (!Number.isFinite(num)) return null;
  return neg ? -Math.abs(num) : num;
}

/**
 * Parse formatted display text (cell.w) when cell.v is missing — e.g. formula
 * cells in some browser / export paths only expose the cached value here.
 */
function numberFromFormattedCellText(w: string): number | undefined {
  let s = w.trim().replace(/\u00a0/g, " ");
  if (s === "" || s === "—" || s === "-") return undefined;

  let neg = false;
  if (/^\$\([\d,.\s]+\)$/i.test(s)) {
    neg = true;
    s = s.replace(/^\$\(|\)$/g, "");
  } else if (/^\([\d,.\s]+\)$/i.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  } else {
    s = s.replace(/\$/g, "").replace(/,/g, "");
  }

  const num = parseFloat(s.replace(/\s/g, ""));
  if (!Number.isFinite(num)) return undefined;
  return neg ? -Math.abs(num) : num;
}

/**
 * Prefer cached cell.v; fall back to formatted cell.w for formula / Sheets exports.
 */
function cellRaw(sheet: XLSX.WorkSheet, r: number, c: number): unknown {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = sheet[addr] as { v?: unknown; w?: string } | undefined;
  if (!cell) return undefined;

  const v = cell.v;
  if (v !== undefined && v !== null) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const t = v.trim();
      if (t === "" || t === "—" || t === "-") return undefined;
      const direct = parseFloat(t);
      if (Number.isFinite(direct)) return direct;
      const commaStripped = parseFloat(t.replace(/,/g, ""));
      if (Number.isFinite(commaStripped)) return commaStripped;
      return v;
    }
    return v;
  }

  if (typeof cell.w === "string") {
    const fromW = numberFromFormattedCellText(cell.w);
    if (fromW !== undefined) return fromW;
    const t = cell.w.trim();
    return t === "" ? undefined : cell.w;
  }

  return undefined;
}

function parseMonthHeader(text: string): { month: number; year: number } | null {
  const t = text.trim();
  const m = t.match(MONTH_HEADER_RE);
  if (!m) return null;
  const mon = MONTH_MAP[m[1].toLowerCase()];
  if (!mon) return null;
  const yy = parseInt(m[2], 10);
  const year = 2000 + yy;
  return { month: mon, year };
}

/** Excel serial day count → UTC calendar month/year (1900 date system). */
function excelSerialToMonthYear(serial: number): { month: number; year: number } | null {
  if (!Number.isFinite(serial)) return null;
  const whole = Math.floor(serial);
  // ~1955–2170 as day serials; avoids treating arbitrary currency integers as dates
  if (whole < 20000 || whole > 80000) return null;
  const epochMs = Date.UTC(1899, 11, 30) + whole * 86400000;
  const d = new Date(epochMs);
  if (Number.isNaN(d.getTime())) return null;
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

/**
 * Month headers are often Date values or numeric Excel serials (not only "Jan-2025").
 */
function monthYearFromHeaderValue(raw: unknown): { month: number; year: number } | null {
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    return { month: raw.getMonth() + 1, year: raw.getFullYear() };
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const fromSerial = excelSerialToMonthYear(raw);
    if (fromSerial) return fromSerial;
    return null;
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
      const d = new Date(t);
      if (!Number.isNaN(d.getTime())) {
        return { month: d.getMonth() + 1, year: d.getFullYear() };
      }
    }
    return parseMonthHeader(t);
  }
  if (raw !== undefined && raw !== null) {
    return parseMonthHeader(String(raw).trim());
  }
  return null;
}

function monthYearFromHeaderCell(
  sheet: XLSX.WorkSheet,
  r: number,
  c: number,
): { month: number; year: number } | null {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = sheet[addr] as
    | { t?: string; v?: unknown; w?: string; z?: string }
    | undefined;
  if (!cell) return null;
  const raw =
    cell.v !== undefined && cell.v !== null
      ? cell.v
      : typeof cell.w === "string"
        ? cell.w
        : undefined;
  return monthYearFromHeaderValue(raw);
}

function updateSection(labelNorm: string): Section | null {
  if (/^income$/i.test(labelNorm) || /^earnings$/i.test(labelNorm))
    return "income";
  if (/^expenses?$/.test(labelNorm) || labelNorm === "expense") return "expenses";
  if (/savings|investments?/.test(labelNorm)) return "savings";
  if (/^assets?$/.test(labelNorm)) return "assets";
  if (/liabilit/.test(labelNorm)) return "liabilities";
  return null;
}

/** Column B section title before deduction lines that reuse income row labels (e.g. Matty W-2). */
function isTaxesDeductionsSectionHeader(labelNorm: string): boolean {
  const head = labelNorm.split(/\s*[–—-]\s*/)[0]?.trim() ?? labelNorm;
  return head === "taxes & deductions" || head === "taxes and deductions";
}

type RowField = ImportNumericKey | "matty_ira" | "kara_ira";

function matchDataField(
  labelNorm: string,
  section: Section,
): RowField | null {
  const pairs: Array<{
    field: RowField;
    patterns: string[];
    section?: Section;
    strictSection?: boolean;
  }> = [
    { field: "matty_w2", patterns: ["matty w-2", "matty w2"], section: "income" },
    { field: "matty_1099", patterns: ["matty 1099"], section: "income" },
    { field: "matty_other", patterns: ["matty other"], section: "income" },
    { field: "kara_w2", patterns: ["kara w2", "kara w-2"], section: "income" },
    { field: "kara_other", patterns: ["kara other"], section: "income" },
    { field: "exp_home", patterns: ["home"], section: "expenses" },
    { field: "exp_food", patterns: ["food"], section: "expenses" },
    { field: "exp_travel", patterns: ["travel"], section: "expenses" },
    { field: "exp_fun", patterns: ["fun"], section: "expenses" },
    { field: "exp_gifts", patterns: ["gifts"], section: "expenses" },
    { field: "exp_transport", patterns: ["transport"], section: "expenses" },
    { field: "exp_shopping", patterns: ["shopping"], section: "expenses" },
    { field: "exp_selfcare", patterns: ["selfcare", "self care"], section: "expenses" },
    { field: "exp_student_loans", patterns: ["student loans"], section: "expenses" },
    { field: "exp_loans", patterns: ["loans"], section: "expenses" },
    { field: "exp_taxes", patterns: ["taxes", "tax"], section: "expenses" },
    {
      field: "sav_btc",
      patterns: ["bitcoin"],
      section: "savings",
      strictSection: true,
    },
    { field: "sav_fund", patterns: ["emergency fund", "emergency", "energency fund"], section: "savings" },
    { field: "asset_cash", patterns: ["cash"], section: "assets" },
    {
      field: "asset_btc",
      patterns: ["bitcoin"],
      section: "assets",
      strictSection: true,
    },
    { field: "asset_equities", patterns: ["equities", "equity"], section: "assets" },
    { field: "asset_retirement", patterns: ["retirement"], section: "assets" },
    { field: "asset_other", patterns: ["other assets", "other asset"], section: "assets" },
    {
      field: "liab_credit_cards",
      patterns: ["credit cards", "credit card"],
      section: "liabilities",
    },
    {
      field: "liab_student_loan",
      patterns: ["student loan"],
      section: "liabilities",
    },
    {
      field: "liab_other_loans",
      patterns: [
        "other loans",
        "other loan",
        "auto loan",
        "mortgage",
        "remaining loan",
        "other debt",
      ],
      section: "liabilities",
    },
    { field: "matty_ira", patterns: ["matty ira"], section: "savings" },
    { field: "kara_ira", patterns: ["kara ira"], section: "savings" },
  ];

  for (const { field, patterns, section: need, strictSection } of pairs) {
    if (need) {
      if (strictSection) {
        if (section !== need) continue;
      } else if (section !== need && section !== "unknown") {
        continue;
      }
    }
    for (const p of patterns) {
      if (labelNorm === p || labelNorm.startsWith(`${p} `)) {
        return field;
      }
    }
  }
  return null;
}

/** matty_ira / kara_ira are temporary keys merged into sav_ira */
type Accumulator = Partial<
  Record<ImportNumericKey | "matty_ira" | "kara_ira", number | null>
>;

function sheetRange(sheet: XLSX.WorkSheet): { maxR: number; maxC: number } {
  const ref = sheet["!ref"];
  if (!ref) return { maxR: 0, maxC: 0 };
  const d = XLSX.utils.decode_range(ref);
  return { maxR: d.e.r, maxC: d.e.c };
}

function findHeaderRow(
  sheet: XLSX.WorkSheet,
  maxR: number,
  maxC: number,
): number {
  let bestRow = -1;
  let bestScore = 0;
  for (let r = 0; r <= Math.min(maxR, 300); r++) {
    const c2 = monthYearFromHeaderCell(sheet, r, 2);
    if (!c2) continue;

    let dateColCount = 0;
    for (let c = 2; c <= maxC; c++) {
      if (monthYearFromHeaderCell(sheet, r, c)) dateColCount++;
    }
    if (dateColCount < 2) continue;

    const bRaw = cellRaw(sheet, r, 1);
    const bLabel =
      bRaw !== undefined && bRaw !== null ? String(bRaw).trim() : "";
    const incomeBonus = /^income$/i.test(normLabel(bLabel)) ? 1000 : 0;
    const score = dateColCount + incomeBonus;
    if (score > bestScore) {
      bestScore = score;
      bestRow = r;
    }
  }
  return bestRow >= 0 ? bestRow : -1;
}

function parseOneSheet(
  sheet: XLSX.WorkSheet,
  warnings: string[],
): Map<string, Accumulator & { netWorthVerify?: number | null }> {
  const byMonth = new Map<
    string,
    Accumulator & { netWorthVerify?: number | null }
  >();

  const { maxR, maxC } = sheetRange(sheet);
  const headerRow = findHeaderRow(sheet, maxR, maxC);
  const monthCols: { col: number; month: number; year: number }[] = [];

  if (headerRow < 0) {
    warnings.push(
      "No header row found: need a row where column C is a date or Excel serial date, with at least two month columns from C onward (optional “Income” in column B).",
    );
    return byMonth;
  }

  for (let c = 2; c <= maxC; c++) {
    const parsed = monthYearFromHeaderCell(sheet, headerRow, c);
    if (!parsed) continue;
    monthCols.push({ col: c, month: parsed.month, year: parsed.year });
  }

  const deduped = new Map<string, { col: number; month: number; year: number }>();
  for (const mc of monthCols) {
    deduped.set(`${mc.year}-${mc.month}`, mc);
  }
  const uniqueMonthCols = [...deduped.values()].sort((a, b) => a.col - b.col);

  if (uniqueMonthCols.length === 0) {
    warnings.push(
      "Header row matched but no month columns parsed from dates in that row (check column C onward).",
    );
    return byMonth;
  }

  let section: Section = "unknown";
  let awaitIncomeNetTotal = false;
  /** After "Taxes & Deductions", duplicate "Matty W-2" / "Kara W-2" rows are withholdings — not gross income. */
  let afterTaxesDeductionsSection = false;

  for (let r = headerRow + 1; r <= maxR; r++) {
    const bRaw = cellRaw(sheet, r, 1);
    if (bRaw === undefined || bRaw === null) continue;
    const label = String(bRaw).trim();
    if (!label) continue;
    const labelNorm = normLabel(label);

    if (isTaxesDeductionsSectionHeader(labelNorm)) {
      afterTaxesDeductionsSection = true;
      continue;
    }

    const sec = updateSection(labelNorm);
    if (sec) {
      section = sec;
      if (/net\s*income\s*after\s*tax/i.test(labelNorm)) {
        awaitIncomeNetTotal = true;
      }
      continue;
    }

    if (/net\s*income\s*after\s*tax/i.test(labelNorm)) {
      section = "income";
      awaitIncomeNetTotal = true;
      continue;
    }

    if (labelNorm === "total" && awaitIncomeNetTotal) {
      for (const { col, month, year } of uniqueMonthCols) {
        const key = `${year}-${month}`;
        if (!byMonth.has(key)) byMonth.set(key, {});
        const acc = byMonth.get(key)!;
        acc.income_net = parseMoneyCell(cellRaw(sheet, r, col));
      }
      awaitIncomeNetTotal = false;
      continue;
    }

    if (/net\s*worth\s*total/i.test(labelNorm)) {
      for (const { col, month, year } of uniqueMonthCols) {
        const key = `${year}-${month}`;
        if (!byMonth.has(key)) byMonth.set(key, {});
        const acc = byMonth.get(key)!;
        acc.netWorthVerify = parseMoneyCell(cellRaw(sheet, r, col));
      }
      continue;
    }

    const field = matchDataField(labelNorm, section);
    if (!field) continue;
    if (
      afterTaxesDeductionsSection &&
      (field === "matty_w2" || field === "kara_w2")
    ) {
      continue;
    }

    for (const { col, month, year } of uniqueMonthCols) {
      const key = `${year}-${month}`;
      if (!byMonth.has(key)) byMonth.set(key, {});
      const acc = byMonth.get(key)!;
      const val = parseMoneyCell(cellRaw(sheet, r, col));
      if (field === "matty_ira" || field === "kara_ira") {
        const prev = n(acc[field] as number | null);
        acc[field] = prev + n(val);
      } else {
        acc[field] = val;
      }
    }
  }

  for (const [, acc] of byMonth) {
    const m = n(acc.matty_ira as number | null);
    const k = n(acc.kara_ira as number | null);
    if (m !== 0 || k !== 0) {
      acc.sav_ira = m + k;
    }
    delete acc.matty_ira;
    delete acc.kara_ira;
  }

  return byMonth;
}

function mergeMaps(
  a: Map<string, Accumulator & { netWorthVerify?: number | null }>,
  b: Map<string, Accumulator & { netWorthVerify?: number | null }>,
) {
  for (const [k, v] of b) {
    if (!a.has(k)) {
      a.set(k, { ...v });
      continue;
    }
    const t = a.get(k)!;
    for (const [fk, fv] of Object.entries(v)) {
      if (fv === null || fv === undefined) continue;
      if (fk === "netWorthVerify") {
        t.netWorthVerify = fv as number;
        continue;
      }
      const key = fk as ImportNumericKey;
      const existing = t[key];
      if (existing === null || existing === undefined) {
        (t as Record<string, unknown>)[key] = fv;
      } else if (typeof fv === "number" && typeof existing === "number") {
        (t as Record<string, unknown>)[key] = fv;
      }
    }
  }
}

export function parseSpreadsheetBuffer(buf: ArrayBuffer): {
  rows: ParsedMonthRow[];
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, XLSX_READ_OPTS);
  } catch (e) {
    errors.push(
      e instanceof Error ? e.message : "Could not read spreadsheet file.",
    );
    return { rows: [], warnings, errors };
  }

  const merged = new Map<
    string,
    Accumulator & { netWorthVerify?: number | null }
  >();

  let anySheet = false;
  for (const name of JOINT_SHEET_NAMES) {
    const sheet = wb.Sheets[name];
    if (!sheet) {
      warnings.push(`Sheet "${name}" not found — skipped.`);
      continue;
    }
    anySheet = true;
    const part = parseOneSheet(sheet, warnings);
    mergeMaps(merged, part);
  }

  if (!anySheet) {
    const firstName = wb.SheetNames[0];
    if (firstName) {
      warnings.push(
        `Using first sheet "${firstName}" (expected ${JOINT_SHEET_NAMES.join(" / ")}).`,
      );
      const sheet = wb.Sheets[firstName];
      if (sheet) mergeMaps(merged, parseOneSheet(sheet, warnings));
    } else {
      errors.push("Workbook has no sheets.");
      return { rows: [], warnings, errors };
    }
  }

  const rows: ParsedMonthRow[] = [];
  for (const [ym, acc] of merged) {
    const [ys, ms] = ym.split("-");
    const year = parseInt(ys, 10);
    const month = parseInt(ms, 10);
    if (!year || !month) continue;
    const { netWorthVerify, ...values } = acc;
    rows.push({
      year,
      month,
      values: values as Partial<Record<ImportNumericKey, number | null>>,
      netWorthVerify: netWorthVerify ?? null,
    });
  }

  rows.sort((a, b) =>
    a.year === b.year ? a.month - b.month : a.year - b.year,
  );

  return { rows, warnings, errors };
}

const UPSERT_KEYS: ImportNumericKey[] = [
  "matty_w2",
  "matty_1099",
  "matty_other",
  "kara_w2",
  "kara_other",
  "income_net",
  "exp_home",
  "exp_food",
  "exp_travel",
  "exp_fun",
  "exp_gifts",
  "exp_transport",
  "exp_shopping",
  "exp_selfcare",
  "exp_loans",
  "exp_student_loans",
  "exp_taxes",
  "sav_btc",
  "sav_ira",
  "sav_fund",
  "asset_cash",
  "asset_btc",
  "asset_equities",
  "asset_retirement",
  "asset_other",
  "liab_credit_cards",
  "liab_student_loan",
  "liab_other_loans",
];

export function parsedRowToUpsertPayload(
  row: ParsedMonthRow,
  userId: string,
): Record<string, string | number | null> {
  const v = row.values;
  const out: Record<string, string | number | null> = {
    user_id: userId,
    year: row.year,
    month: row.month,
  };
  for (const k of UPSERT_KEYS) {
    const val = v[k];
    out[k] = val === null || val === undefined ? 0 : val;
  }
  return out;
}

export function computedExpenseTotalFromValues(
  values: Partial<Record<ImportNumericKey, number | null>>,
): number {
  const pseudo = {
    id: "",
    user_id: "",
    year: 0,
    month: 0,
    matty_w2: null,
    matty_1099: null,
    matty_other: null,
    kara_w2: null,
    kara_other: null,
    income_net: null,
    exp_home: values.exp_home ?? 0,
    exp_food: values.exp_food ?? 0,
    exp_travel: values.exp_travel ?? 0,
    exp_fun: values.exp_fun ?? 0,
    exp_gifts: values.exp_gifts ?? 0,
    exp_transport: values.exp_transport ?? 0,
    exp_shopping: values.exp_shopping ?? 0,
    exp_selfcare: values.exp_selfcare ?? 0,
    exp_loans: values.exp_loans ?? 0,
    exp_student_loans: values.exp_student_loans ?? 0,
    exp_taxes: values.exp_taxes ?? 0,
    sav_btc: null,
    sav_ira: null,
    sav_fund: null,
    asset_cash: null,
    asset_btc: null,
    asset_equities: null,
    asset_retirement: null,
    asset_other: null,
    liab_credit_cards: null,
    liab_student_loan: null,
    liab_other_loans: null,
  } as Entry;
  return totalExpenses(pseudo);
}

export type WorkbookDebugCell = {
  ref: string;
  display: string;
  cellType?: string;
};

export type WorkbookDebugInfo = {
  sheetNames: string[];
  firstSheetName: string | null;
  /** First three rows (0-based indices 0–2) of the first sheet */
  previewRows: Array<{ rowIndex: number; cells: WorkbookDebugCell[] }>;
  readError?: string;
};

/** Sheet names + first 3 rows of first sheet (for troubleshooting imports). */
export function getWorkbookDebugInfo(buf: ArrayBuffer): WorkbookDebugInfo {
  const empty: WorkbookDebugInfo = {
    sheetNames: [],
    firstSheetName: null,
    previewRows: [],
  };
  try {
    const wb = XLSX.read(buf, XLSX_READ_OPTS);
    const sheetNames = [...wb.SheetNames];
    const firstSheetName = sheetNames[0] ?? null;
    const previewRows: WorkbookDebugInfo["previewRows"] = [];
    if (!firstSheetName) {
      return { ...empty, sheetNames };
    }
    const sheet = wb.Sheets[firstSheetName];
    if (!sheet) {
      return { sheetNames, firstSheetName, previewRows };
    }
    const { maxR, maxC } = sheetRange(sheet);
    const lastCol = Math.min(maxC, 25);
    for (let r = 0; r <= Math.min(2, maxR); r++) {
      const cells: WorkbookDebugCell[] = [];
      for (let c = 0; c <= lastCol; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[ref] as
          | { t?: string; v?: unknown; w?: string }
          | undefined;
        let display = "";
        let cellType: string | undefined;
        if (cell) {
          cellType = cell.t;
          if (typeof cell.w === "string" && cell.w !== "") {
            display = cell.w;
          } else if (cell.v != null && cell.v !== "") {
            display =
              cell.v instanceof Date
                ? cell.v.toISOString()
                : String(cell.v);
          }
        }
        cells.push({ ref, display, cellType });
      }
      previewRows.push({ rowIndex: r, cells });
    }
    return { sheetNames, firstSheetName, previewRows };
  } catch (e) {
    return {
      ...empty,
      readError: e instanceof Error ? e.message : String(e),
    };
  }
}
