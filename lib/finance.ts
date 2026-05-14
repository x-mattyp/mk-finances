import type { Entry, YearFilter } from "@/types/entry";
import { MONTH_NAMES } from "@/types/entry";

export function n(v: number | null | undefined): number {
  return v ?? 0;
}

export function totalExpenses(e: Entry): number {
  return (
    n(e.exp_home) +
    n(e.exp_food) +
    n(e.exp_travel) +
    n(e.exp_fun) +
    n(e.exp_gifts) +
    n(e.exp_transport) +
    n(e.exp_shopping) +
    n(e.exp_selfcare) +
    n(e.exp_loans) +
    n(e.exp_student_loans) +
    n(e.exp_taxes)
  );
}

export function totalAssets(e: Entry): number {
  return (
    n(e.asset_cash) +
    n(e.asset_btc) +
    n(e.asset_equities) +
    n(e.asset_retirement) +
    n(e.asset_other)
  );
}

export function totalLiabilities(e: Entry): number {
  return n(e.liab_credit_cards) + n(e.liab_student_loan) + n(e.liab_other_loans);
}

export function totalSavingsContributions(e: Entry): number {
  return n(e.sav_btc) + n(e.sav_ira) + n(e.sav_fund);
}

export function netWorth(e: Entry): number {
  return totalAssets(e) - totalLiabilities(e);
}

export function netIncomeForMonth(e: Entry): number {
  return n(e.income_net) - totalExpenses(e);
}

export function savingsRatePercent(e: Entry): number | null {
  const inc = n(e.income_net);
  if (inc <= 0) return null;
  return (totalSavingsContributions(e) / inc) * 100;
}

export function expenseRatePercent(e: Entry): number | null {
  const inc = n(e.income_net);
  if (inc <= 0) return null;
  return (totalExpenses(e) / inc) * 100;
}

export function monthLabel(year: number, month: number): string {
  const m = MONTH_NAMES[month - 1] ?? "?";
  const yy = String(year).slice(-2);
  return `${m} ${yy}`;
}

export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) =>
    a.year === b.year ? a.month - b.month : a.year - b.year,
  );
}

export function filterByYear(entries: Entry[], filter: YearFilter): Entry[] {
  const sorted = sortEntries(entries);
  if (filter === "all") return sorted;
  const y = filter === "2025" ? 2025 : 2026;
  return sorted.filter((e) => e.year === y);
}

/** First index in sorted filtered list where year is 2026, and some prior month is 2025 */
export function yearTransitionIndex(entries: Entry[]): number | null {
  const sorted = sortEntries(entries);
  let first2026 = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].year === 2026) {
      first2026 = i;
      break;
    }
  }
  if (first2026 <= 0) return null;
  const has2025Before = sorted.slice(0, first2026).some((e) => e.year === 2025);
  if (!has2025Before) return null;
  return first2026;
}

export interface DashboardSummary {
  netWorth: number;
  nwChange: number | null;
  incomeAfterTax: number;
  netIncomeKept: number;
  totalInvested: number;
  totalExpenses: number;
  avgExpenseRate: number | null;
  monthsTracked: number;
}

export function buildSummary(filtered: Entry[]): DashboardSummary {
  if (filtered.length === 0) {
    return {
      netWorth: 0,
      nwChange: null,
      incomeAfterTax: 0,
      netIncomeKept: 0,
      totalInvested: 0,
      totalExpenses: 0,
      avgExpenseRate: null,
      monthsTracked: 0,
    };
  }

  const last = filtered[filtered.length - 1];
  const prev = filtered.length > 1 ? filtered[filtered.length - 2] : null;

  const incomeAfterTax = filtered.reduce((s, e) => s + n(e.income_net), 0);
  const netIncomeKept = filtered.reduce((s, e) => s + netIncomeForMonth(e), 0);
  const totalInvested = filtered.reduce((s, e) => s + totalSavingsContributions(e), 0);
  const totalExpensesSum = filtered.reduce((s, e) => s + totalExpenses(e), 0);

  const rates: number[] = [];
  for (const e of filtered) {
    const r = expenseRatePercent(e);
    if (r !== null) rates.push(r);
  }
  const avgExpenseRate =
    rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null;

  const nwLast = netWorth(last);
  const nwChange = prev ? nwLast - netWorth(prev) : null;

  return {
    netWorth: nwLast,
    nwChange,
    incomeAfterTax,
    netIncomeKept,
    totalInvested,
    totalExpenses: totalExpensesSum,
    avgExpenseRate,
    monthsTracked: filtered.length,
  };
}

export function sumIncomeLineItems(e: Entry): number {
  return (
    n(e.matty_w2) +
    n(e.matty_1099) +
    n(e.matty_other) +
    n(e.kara_w2) +
    n(e.kara_other)
  );
}

export function clampRate(v: number | null): number | null {
  if (v === null || Number.isNaN(v)) return null;
  return Math.max(-300, Math.min(300, v));
}
