"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Entry, YearFilter } from "@/types/entry";
import {
  EXPENSE_FIELDS,
  INCOME_FIELDS,
  LIABILITY_FIELDS,
} from "@/types/entry";
import {
  buildSummary,
  clampRate,
  expenseRatePercent,
  filterByYear,
  monthLabel,
  n,
  netWorth,
  savingsRatePercent,
  totalAssets,
  totalExpenses,
  totalLiabilities,
  totalSavingsContributions,
  yearTransitionIndex,
} from "@/lib/finance";
import { formatCurrency, formatPercent } from "@/lib/format";
import { IncomeVsExpensesChart } from "@/components/charts/IncomeVsExpensesChart";
import { SavingsStackedChart } from "@/components/charts/SavingsStackedChart";
import { SavingsExpenseRateChart } from "@/components/charts/SavingsExpenseRateChart";
import { IncomeSourcesStackedChart } from "@/components/charts/IncomeSourcesStackedChart";
import { ExpenseCategoriesStackedChart } from "@/components/charts/ExpenseCategoriesStackedChart";
import { ExpenseDonutChart } from "@/components/charts/ExpenseDonutChart";
import { NetWorthLineChart } from "@/components/charts/NetWorthLineChart";
import { AssetAllocationDonut } from "@/components/charts/AssetAllocationDonut";
import { LiabilitiesStackedChart } from "@/components/charts/LiabilitiesStackedChart";

type IncomeKey = (typeof INCOME_FIELDS)[number]["key"];
type ExpenseKey = (typeof EXPENSE_FIELDS)[number]["key"];
type LiabilityKey = (typeof LIABILITY_FIELDS)[number]["key"];

function emptyIncomeSeries(labels: string[]): Record<IncomeKey, number[]> {
  const o = {} as Record<IncomeKey, number[]>;
  for (const f of INCOME_FIELDS) o[f.key] = labels.map(() => 0);
  return o;
}

function emptyExpenseSeries(labels: string[]): Record<ExpenseKey, number[]> {
  const o = {} as Record<ExpenseKey, number[]>;
  for (const f of EXPENSE_FIELDS) o[f.key] = labels.map(() => 0);
  return o;
}

function emptyLiabilitySeries(labels: string[]): Record<LiabilityKey, number[]> {
  const o = {} as Record<LiabilityKey, number[]>;
  for (const f of LIABILITY_FIELDS) o[f.key] = labels.map(() => 0);
  return o;
}

function expenseTotals(entries: Entry[]): Record<ExpenseKey, number> {
  const t = {} as Record<ExpenseKey, number>;
  for (const f of EXPENSE_FIELDS) t[f.key] = 0;
  for (const e of entries) {
    for (const f of EXPENSE_FIELDS) {
      t[f.key] += n(e[f.key]);
    }
  }
  return t;
}

function latestAssetValues(e: Entry | undefined): Record<
  "asset_cash" | "asset_btc" | "asset_equities" | "asset_retirement" | "asset_other",
  number
> {
  if (!e) {
    return {
      asset_cash: 0,
      asset_btc: 0,
      asset_equities: 0,
      asset_retirement: 0,
      asset_other: 0,
    };
  }
  return {
    asset_cash: n(e.asset_cash),
    asset_btc: n(e.asset_btc),
    asset_equities: n(e.asset_equities),
    asset_retirement: n(e.asset_retirement),
    asset_other: n(e.asset_other),
  };
}

export default function DashboardClient({
  entries,
  email,
}: {
  entries: Entry[];
  email: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<YearFilter>("all");

  const filtered = useMemo(
    () => filterByYear(entries, filter),
    [entries, filter],
  );

  const labels = useMemo(
    () => filtered.map((e) => monthLabel(e.year, e.month)),
    [filtered],
  );

  const showYearDivider = filter === "all";
  const first2026Index = useMemo(() => {
    if (!showYearDivider) return null;
    return yearTransitionIndex(filtered);
  }, [filtered, showYearDivider]);

  const summary = useMemo(() => buildSummary(filtered), [filtered]);

  const chartRows = useMemo(() => {
    const income = filtered.map((e) => n(e.income_net));
    const expenses = filtered.map((e) => totalExpenses(e));
    const netIncome = filtered.map((e) => n(e.income_net) - totalExpenses(e));
    const btc = filtered.map((e) => n(e.sav_btc));
    const ira = filtered.map((e) => n(e.sav_ira));
    const fund = filtered.map((e) => n(e.sav_fund));
    const savingsRate = filtered.map((e) => {
      const r = savingsRatePercent(e);
      return r === null ? null : clampRate(r);
    });
    const expenseRate = filtered.map((e) => {
      const r = expenseRatePercent(e);
      return r === null ? null : clampRate(r);
    });

    const incSeries = emptyIncomeSeries(labels);
    filtered.forEach((e, i) => {
      for (const f of INCOME_FIELDS) {
        incSeries[f.key][i] = n(e[f.key]);
      }
    });

    const expSeries = emptyExpenseSeries(labels);
    filtered.forEach((e, i) => {
      for (const f of EXPENSE_FIELDS) {
        expSeries[f.key][i] = n(e[f.key]);
      }
    });

    const assets = filtered.map((e) => totalAssets(e));
    const liabilities = filtered.map((e) => totalLiabilities(e));
    const nw = filtered.map((e) => netWorth(e));

    const liabSeries = emptyLiabilitySeries(labels);
    filtered.forEach((e, i) => {
      for (const f of LIABILITY_FIELDS) {
        liabSeries[f.key][i] = n(e[f.key]);
      }
    });

    return {
      income,
      expenses,
      netIncome,
      btc,
      ira,
      fund,
      savingsRate,
      expenseRate,
      incSeries,
      expSeries,
      assets,
      liabilities,
      nw,
      liabSeries,
      expenseDonutTotals: expenseTotals(filtered),
      assetDonut: latestAssetValues(filtered[filtered.length - 1]),
    };
  }, [filtered, labels]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-full pb-16">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-medium tracking-tight text-foreground">
              M & K{" "}
              <span className="italic text-accent">Finances</span>
            </span>
            {email ? (
              <span className="hidden text-xs text-muted sm:inline">{email}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-border bg-surface p-0.5">
              {(["all", "2025", "2026"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-accent/20 text-accent"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "All" : f}
                </button>
              ))}
            </div>
            <Link
              href="/entry"
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent/40 hover:text-accent"
            >
              Add / Edit Month
            </Link>
            <Link
              href="/import"
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent/40 hover:text-accent"
            >
              Import Data
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-accent-red/50 hover:text-accent-red"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <SummaryCard label="Net Worth" value={formatCurrency(summary.netWorth)} />
          <SummaryCard
            label="NW Change"
            value={
              summary.nwChange === null
                ? "—"
                : formatCurrency(summary.nwChange)
            }
            accent={summary.nwChange !== null && summary.nwChange >= 0 ? "teal" : "red"}
          />
          <SummaryCard
            label="Income After Tax"
            value={formatCurrency(summary.incomeAfterTax)}
          />
          <SummaryCard
            label="Net Income Kept"
            value={formatCurrency(summary.netIncomeKept)}
          />
          <SummaryCard
            label="Total Invested"
            value={formatCurrency(summary.totalInvested)}
          />
          <SummaryCard
            label="Total Expenses"
            value={formatCurrency(summary.totalExpenses)}
          />
          <SummaryCard
            label="Avg Expense Rate"
            value={formatPercent(summary.avgExpenseRate)}
          />
          <SummaryCard
            label="Months Tracked"
            value={String(summary.monthsTracked)}
          />
        </section>

        {filtered.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted">
            No entries for this filter yet.{" "}
            <Link href="/entry" className="text-accent underline-offset-2 hover:underline">
              Add a month
            </Link>
            .
          </p>
        ) : (
          <>
            <ChartCard title="Income vs expenses (monthly)">
              <IncomeVsExpensesChart
                labels={labels}
                income={chartRows.income}
                expenses={chartRows.expenses}
                netIncome={chartRows.netIncome}
                first2026Index={first2026Index}
                showYearDivider={showYearDivider}
              />
            </ChartCard>

            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard title="Savings (stacked)">
                <SavingsStackedChart
                  labels={labels}
                  btc={chartRows.btc}
                  ira={chartRows.ira}
                  fund={chartRows.fund}
                  first2026Index={first2026Index}
                  showYearDivider={showYearDivider}
                />
              </ChartCard>
              <ChartCard title="Savings & expense rate % (clamped ±300)">
                <SavingsExpenseRateChart
                  labels={labels}
                  savingsRate={chartRows.savingsRate}
                  expenseRate={chartRows.expenseRate}
                  first2026Index={first2026Index}
                  showYearDivider={showYearDivider}
                />
              </ChartCard>
            </div>

            <ChartCard title="Income sources (stacked)">
              <IncomeSourcesStackedChart
                labels={labels}
                series={chartRows.incSeries}
                first2026Index={first2026Index}
                showYearDivider={showYearDivider}
              />
            </ChartCard>

            <ChartCard title="Expense categories (stacked)">
              <ExpenseCategoriesStackedChart
                labels={labels}
                series={chartRows.expSeries}
                first2026Index={first2026Index}
                showYearDivider={showYearDivider}
              />
            </ChartCard>

            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard title="Expense categories (period totals)">
                <ExpenseDonutChart totals={chartRows.expenseDonutTotals} />
              </ChartCard>
              <ChartCard title="Asset allocation (latest month in filter)">
                <AssetAllocationDonut values={chartRows.assetDonut} />
              </ChartCard>
            </div>

            <ChartCard title="Net worth">
              <NetWorthLineChart
                labels={labels}
                assets={chartRows.assets}
                liabilities={chartRows.liabilities}
                netWorth={chartRows.nw}
                first2026Index={first2026Index}
                showYearDivider={showYearDivider}
              />
            </ChartCard>

            <ChartCard title="Liabilities (stacked)">
              <LiabilitiesStackedChart
                labels={labels}
                series={chartRows.liabSeries}
                first2026Index={first2026Index}
                showYearDivider={showYearDivider}
              />
            </ChartCard>
          </>
        )}

        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="font-display mb-3 text-lg font-medium text-foreground">
            Monthly detail
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="sticky left-0 z-[1] bg-surface py-2 pr-3">Period</th>
                  <th className="py-2 pr-3">Income (net)</th>
                  <th className="py-2 pr-3">Expenses</th>
                  <th className="py-2 pr-3">Net</th>
                  <th className="py-2 pr-3">Savings</th>
                  <th className="py-2 pr-3">NW</th>
                  <th className="py-2 pr-3">Assets</th>
                  <th className="py-2 pr-3">Liabilities</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-border/80">
                    <td className="sticky left-0 bg-surface py-2 pr-3 text-foreground">
                      {monthLabel(e.year, e.month)}
                    </td>
                    <td className="py-2 pr-3">{formatCurrency(e.income_net)}</td>
                    <td className="py-2 pr-3">{formatCurrency(totalExpenses(e))}</td>
                    <td className="py-2 pr-3 text-accent">
                      {formatCurrency(n(e.income_net) - totalExpenses(e))}
                    </td>
                    <td className="py-2 pr-3">
                      {formatCurrency(totalSavingsContributions(e))}
                    </td>
                    <td className="py-2 pr-3">{formatCurrency(netWorth(e))}</td>
                    <td className="py-2 pr-3">{formatCurrency(totalAssets(e))}</td>
                    <td className="py-2 pr-3">{formatCurrency(totalLiabilities(e))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "teal" | "red";
}) {
  const color =
    accent === "teal"
      ? "text-accent-teal"
      : accent === "red"
        ? "text-accent-red"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={`mt-1 text-sm font-medium tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="font-display mb-4 text-base font-medium text-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}
