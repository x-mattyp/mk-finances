"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Chart } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { formatCurrency, formatCurrencyTooltip } from "@/lib/format";
import { tooltipDollarLabel } from "@/components/charts/tooltip-helpers";
import "@/components/charts/chart-init";

const MUTED = "#7a7870";
const GRID = "rgba(255,255,255,0.05)";
const ACCENT = "#c8f060";
const TEAL = "#60d4b8";

type Props = {
  email: string;
  initialCurrentBalance: number;
  initialAverageNetIncome: number;
};

type AmortizationRow = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
};

function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function formatInputCurrency(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function loanAmountFromPayment(
  monthlyPayment: number,
  annualRate: number,
  years: number,
) {
  const months = years * 12;
  if (monthlyPayment <= 0 || months <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return monthlyPayment * months;
  return (
    monthlyPayment *
    (1 - (1 + monthlyRate) ** -months) /
    monthlyRate
  );
}

function buildAmortization(
  principal: number,
  annualRate: number,
  years: number,
  monthlyPayment: number,
): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  const monthlyRate = annualRate / 100 / 12;
  let balance = principal;

  for (let month = 1; month <= years * 12 && balance > 0.01; month++) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(balance, Math.max(0, monthlyPayment - interest));
    balance = Math.max(0, balance - principalPaid);
    rows.push({
      month,
      payment: principalPaid + interest,
      principal: principalPaid,
      interest,
      balance,
    });
  }

  return rows;
}

function CurrencyInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        value={formatInputCurrency(value)}
        onChange={(e) => onChange(parseCurrencyInput(e.target.value))}
        inputMode="decimal"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent/60"
      />
      {hint ? <span className="mt-1 block text-[10px] text-muted">{hint}</span> : null}
    </label>
  );
}

function StatCard({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "accent" | "amber";
  sub?: string;
}) {
  const color =
    tone === "good"
      ? "text-accent"
      : tone === "bad"
        ? "text-accent-red"
        : tone === "amber"
          ? "text-accent-amber"
          : tone === "accent"
            ? "text-accent"
            : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-background/40 p-6">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={`mt-1 whitespace-nowrap text-lg font-medium tabular-nums ${color}`}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-[10px] text-muted">{sub}</p> : null}
    </div>
  );
}

const savingsChartOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  scales: {
    x: {
      grid: { color: GRID },
      ticks: { color: MUTED, maxRotation: 45 },
    },
    y: {
      grid: { color: GRID },
      ticks: {
        color: MUTED,
        callback: (v) =>
          typeof v === "number" ? `$${(v / 1000).toFixed(0)}k` : "",
      },
    },
  },
  plugins: {
    legend: { position: "top", labels: { color: MUTED } },
    tooltip: {
      callbacks: {
        label: (ctx) => tooltipDollarLabel(ctx as never),
      },
    },
  },
};

export default function HouseFundClient({
  email,
  initialCurrentBalance,
  initialAverageNetIncome,
}: Props) {
  const [homePrice, setHomePrice] = useState(900000);
  const [closingCostPct, setClosingCostPct] = useState(3);
  const [annualRate, setAnnualRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [annualPropertyTax, setAnnualPropertyTax] = useState(14400);
  const [annualInsurance, setAnnualInsurance] = useState(3000);
  const [targetMonthly, setTargetMonthly] = useState(6000);
  const [currentBalance, setCurrentBalance] = useState(initialCurrentBalance);
  const [savingsRate, setSavingsRate] = useState(20);
  const [monthlyNetIncome, setMonthlyNetIncome] = useState(
    Math.round(initialAverageNetIncome),
  );
  const [showFullAmortization, setShowFullAmortization] = useState(false);

  const monthlyPropertyTax = annualPropertyTax / 12;
  const monthlyInsurance = annualInsurance / 12;
  const maxPrincipalInterest =
    targetMonthly - monthlyPropertyTax - monthlyInsurance;
  const mathWorks = maxPrincipalInterest > 0 && homePrice > 0;
  const requiredLoanAmount = mathWorks
    ? loanAmountFromPayment(maxPrincipalInterest, annualRate, loanTerm)
    : 0;
  const requiredDownPayment = homePrice - requiredLoanAmount;
  const downPaymentPct = homePrice > 0 ? (requiredDownPayment / homePrice) * 100 : 0;
  const closingCosts = homePrice * (closingCostPct / 100);
  const totalCashNeeded = requiredDownPayment + closingCosts;
  const principalInterest = mathWorks ? maxPrincipalInterest : 0;
  const loanAmount = Math.max(0, requiredLoanAmount);
  const remainingToSave = Math.max(0, totalCashNeeded - currentBalance);
  const monthlySavings = (savingsRate / 100) * monthlyNetIncome;
  const monthsToGoal =
    remainingToSave <= 0 ? 0 : monthlySavings > 0 ? remainingToSave / monthlySavings : Infinity;
  const targetDate =
    Number.isFinite(monthsToGoal) ? addMonths(new Date(), Math.ceil(monthsToGoal)) : null;

  const amortizationRows = useMemo(
    () => buildAmortization(loanAmount, annualRate, loanTerm, principalInterest),
    [loanAmount, annualRate, loanTerm, principalInterest],
  );

  const savingsProjection = useMemo(() => {
    const months = Number.isFinite(monthsToGoal)
      ? Math.min(360, Math.max(12, Math.ceil(monthsToGoal) + 12))
      : 60;
    const start = new Date();
    const labels: string[] = [];
    const savings: number[] = [];
    const target: number[] = [];
    const buyPoint: (number | null)[] = [];
    const buyIndex = Number.isFinite(monthsToGoal) ? Math.ceil(monthsToGoal) : null;

    for (let i = 0; i <= months; i++) {
      labels.push(formatMonthYear(addMonths(start, i)));
      const projected = currentBalance + monthlySavings * i;
      savings.push(projected);
      target.push(totalCashNeeded);
      buyPoint.push(buyIndex !== null && i === buyIndex ? projected : null);
    }

    return { labels, savings, target, buyPoint };
  }, [currentBalance, monthlySavings, monthsToGoal, totalCashNeeded]);

  const chartData = useMemo<ChartData<"line", (number | null)[], string>>(
    () => ({
      labels: savingsProjection.labels,
      datasets: [
        {
          label: "Projected savings",
          data: savingsProjection.savings,
          borderColor: TEAL,
          backgroundColor: "rgba(96,212,184,0.08)",
          tension: 0.25,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: "Cash needed",
          data: savingsProjection.target,
          borderColor: ACCENT,
          backgroundColor: "rgba(200,240,96,0.08)",
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: "Buy date",
          data: savingsProjection.buyPoint,
          borderColor: ACCENT,
          backgroundColor: ACCENT,
          showLine: false,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    }),
    [savingsProjection],
  );

  const visibleRows = showFullAmortization
    ? amortizationRows
    : amortizationRows.slice(0, 12);

  const downPaymentTone: "good" | "amber" | "bad" =
    !mathWorks || downPaymentPct > 20
      ? "bad"
      : downPaymentPct < 10
        ? "amber"
        : "good";
  const downPaymentStatus =
    !mathWorks
      ? "Target payment is below tax + insurance."
      : downPaymentPct > 20
        ? "Over 20% down payment needed."
        : downPaymentPct < 10
          ? "Under 10% down payment needed."
          : "Within the 10–20% target range.";

  return (
    <div className="min-h-full pb-16">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="font-display text-xl font-medium tracking-tight text-foreground"
            >
              M & K <span className="italic text-accent">Finances</span>
            </Link>
            {email ? (
              <span className="hidden text-xs text-muted sm:inline">{email}</span>
            ) : null}
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/house"
              className="rounded-md border border-accent/40 bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent"
            >
              House
            </Link>
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
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            House Fund
          </p>
          <h1 className="font-display mt-1 text-3xl font-medium text-foreground">
            Mortgage & savings calculator
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Tune the purchase assumptions, monthly payment target, and savings plan
            to see your likely buy date and first-year mortgage breakdown.
          </p>
        </section>

        <section className="rounded-lg border border-accent/30 bg-surface p-5 shadow-[0_0_40px_rgba(200,240,96,0.04)]">
          <label className="block">
            <span className="mb-2 block text-[10px] font-medium uppercase tracking-wide text-accent">
              Target total monthly payment
            </span>
            <input
              value={formatInputCurrency(targetMonthly)}
              onChange={(e) => setTargetMonthly(parseCurrencyInput(e.target.value))}
              inputMode="decimal"
              className="w-full rounded-lg border border-accent/40 bg-background px-4 py-4 text-3xl font-medium tracking-tight text-accent outline-none transition-colors focus:border-accent sm:text-5xl"
            />
          </label>
          <p className="mt-2 text-xs text-muted">
            This target drives the maximum P&I budget, loan amount, and required
            down payment below.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-lg border border-border bg-surface p-4">
            <h2 className="font-display mb-4 text-base font-medium text-foreground">
              Primary inputs
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <CurrencyInput
                label="Home price"
                value={homePrice}
                onChange={setHomePrice}
              />
              <label className="block">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted">
                  Annual interest rate
                </span>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={0.125}
                    value={annualRate}
                    onChange={(e) => setAnnualRate(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground outline-none transition-colors focus:border-accent/60"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                    %
                  </span>
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted">
                  Loan term
                </span>
                <select
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(parseInt(e.target.value, 10))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent/60"
                >
                  {[10, 15, 20, 25, 30].map((years) => (
                    <option key={years} value={years}>
                      {years} years
                    </option>
                  ))}
                </select>
              </label>
              <CurrencyInput
                label="Annual property tax"
                value={annualPropertyTax}
                onChange={setAnnualPropertyTax}
                hint="Entered as $/year"
              />
              <CurrencyInput
                label="Annual insurance"
                value={annualInsurance}
                onChange={setAnnualInsurance}
                hint="Entered as $/year"
              />
              <label className="block">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted">
                  Closing costs
                </span>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={closingCostPct}
                    onChange={(e) =>
                      setClosingCostPct(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground outline-none transition-colors focus:border-accent/60"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                    %
                  </span>
                </div>
                <span className="mt-1 block text-[10px] text-muted">
                  = {formatCurrency(closingCosts)}
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-medium text-foreground">
                  Payment breakdown
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Target payment backs into loan capacity and required cash.
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs ${
                  downPaymentTone === "good"
                    ? "border-accent/30 bg-accent/10 text-accent"
                    : downPaymentTone === "amber"
                      ? "border-accent-amber/30 bg-accent-amber/10 text-accent-amber"
                      : "border-accent-red/30 bg-accent-red/10 text-accent-red"
                }`}
              >
                {Number.isFinite(downPaymentPct) ? downPaymentPct.toFixed(1) : "—"}%
                down
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-md bg-background/40 px-3 py-2">
                <span className="text-muted">Target</span>
                <span className="font-medium text-accent tabular-nums">
                  {formatCurrency(targetMonthly)}/mo
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-background/40 px-3 py-2">
                <span className="text-muted">− Monthly tax</span>
                <span className="tabular-nums">
                  {formatCurrency(monthlyPropertyTax)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-background/40 px-3 py-2">
                <span className="text-muted">− Monthly insurance</span>
                <span className="tabular-nums">
                  {formatCurrency(monthlyInsurance)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border border-accent/20 bg-accent/5 px-3 py-2">
                <span className="text-muted">= P&I budget</span>
                <span
                  className={`font-medium tabular-nums ${
                    maxPrincipalInterest > 0 ? "text-accent" : "text-accent-red"
                  }`}
                >
                  {formatCurrency(maxPrincipalInterest)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-background/40 px-3 py-2">
                <span className="text-muted">= Required loan amount</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(requiredLoanAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-background/40 px-3 py-2">
                <span className="text-muted">= Down payment needed</span>
                <span
                  className={`font-medium tabular-nums ${
                    downPaymentTone === "good"
                      ? "text-accent"
                      : downPaymentTone === "amber"
                        ? "text-accent-amber"
                        : "text-accent-red"
                  }`}
                >
                  {formatCurrency(requiredDownPayment)}
                </span>
              </div>
            </div>

            <p
              className={`mt-3 text-xs ${
                downPaymentTone === "good"
                  ? "text-accent"
                  : downPaymentTone === "amber"
                    ? "text-accent-amber"
                    : "text-accent-red"
              }`}
            >
              {downPaymentStatus}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <StatCard
                label="Monthly tax"
                value={formatCurrency(monthlyPropertyTax)}
                sub="Annual ÷ 12"
              />
              <StatCard
                label="Monthly insurance"
                value={formatCurrency(monthlyInsurance)}
                sub="Annual ÷ 12"
              />
              <StatCard
                label="Required down payment"
                value={formatCurrency(requiredDownPayment)}
                tone={downPaymentTone}
              />
              <StatCard
                label="Total cash needed"
                value={formatCurrency(totalCashNeeded)}
                tone="accent"
                sub="Down payment + closing costs"
              />
            </div>
          </div>
        </section>

        <section className="grid items-stretch gap-6 lg:grid-cols-2">
          <div className="min-w-[320px] rounded-lg border border-border bg-surface p-6">
            <h2 className="font-display mb-4 text-base font-medium text-foreground">
              Savings plan
            </h2>
            <div className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <StatCard
                  label="Total cash needed"
                  value={formatCurrency(totalCashNeeded)}
                  tone="accent"
                  sub="Down payment + closing costs"
                />
                <StatCard
                  label="Remaining to save"
                  value={formatCurrency(remainingToSave)}
                  tone={remainingToSave <= 0 ? "good" : undefined}
                />
              </div>

              <CurrencyInput
                label="Current house fund"
                value={currentBalance}
                onChange={setCurrentBalance}
                hint="Loaded from the latest Fund entry, editable here."
              />
              <CurrencyInput
                label="Avg monthly net income"
                value={monthlyNetIncome}
                onChange={setMonthlyNetIncome}
                hint="Average of the latest six income entries, editable here."
              />

              <label className="block py-2">
                <span className="mb-4 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-muted">
                  <span>Savings rate</span>
                  <span className="text-accent">{savingsRate}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={savingsRate}
                  onChange={(e) => setSavingsRate(parseInt(e.target.value, 10))}
                  className="my-2 w-full accent-[#c8f060]"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <StatCard
                  label="Monthly savings"
                  value={formatCurrency(monthlySavings)}
                  tone="accent"
                />
                <StatCard
                  label="Months to goal"
                  value={
                    Number.isFinite(monthsToGoal)
                      ? monthsToGoal <= 0
                        ? "Ready now"
                        : monthsToGoal.toFixed(1)
                      : "—"
                  }
                  tone={remainingToSave <= 0 ? "good" : undefined}
                />
                <div className="sm:col-span-2">
                  <StatCard
                    label="Target date"
                    value={targetDate ? formatMonthYear(targetDate) : "Set savings rate"}
                    tone={targetDate ? "good" : "bad"}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-medium text-foreground">
                  Savings projection
                </h2>
                <p className="mt-1 text-xs text-muted">
                  The highlighted point is where projected savings crosses the cash target.
                </p>
              </div>
              {targetDate ? (
                <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">
                  Buy date: {formatMonthYear(targetDate)}
                </span>
              ) : null}
            </div>
            <div className="h-80 w-full">
              <Chart type="line" options={savingsChartOptions} data={chartData} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-medium text-foreground">
                Mortgage amortization
              </h2>
              <p className="mt-1 text-xs text-muted">
                First 12 months are shown by default; expand for the full {loanTerm}-year schedule.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFullAmortization((open) => !open)}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-accent/40 hover:text-accent"
            >
              {showFullAmortization ? "Show first 12" : "Show full schedule"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-3">Month</th>
                  <th className="py-2 pr-3">Payment</th>
                  <th className="py-2 pr-3">Principal</th>
                  <th className="py-2 pr-3">Interest</th>
                  <th className="py-2 pr-3">Remaining balance</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.month} className="border-b border-border/80">
                    <td className="py-2 pr-3 text-foreground">Month {row.month}</td>
                    <td className="py-2 pr-3">{formatCurrencyTooltip(row.payment)}</td>
                    <td className="py-2 pr-3 text-accent">
                      {formatCurrencyTooltip(row.principal)}
                    </td>
                    <td className="py-2 pr-3 text-accent-red">
                      {formatCurrencyTooltip(row.interest)}
                    </td>
                    <td className="py-2 pr-3">{formatCurrencyTooltip(row.balance)}</td>
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
