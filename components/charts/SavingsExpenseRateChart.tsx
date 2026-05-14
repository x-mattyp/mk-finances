"use client";

import { Chart } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { yearDividerPluginLine } from "@/lib/chart-theme";
import { formatPercent } from "@/lib/format";
import "@/components/charts/chart-init";

const options: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  scales: {
    x: {
      grid: { color: "rgba(255,255,255,0.05)" },
      ticks: { color: "#7a7870", maxRotation: 45 },
    },
    y: {
      min: -300,
      max: 300,
      grid: { color: "rgba(255,255,255,0.05)" },
      ticks: {
        color: "#7a7870",
        callback: (v) => (typeof v === "number" ? `${v}%` : ""),
      },
    },
  },
  plugins: {
    legend: { position: "top", labels: { color: "#7a7870" } },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const y = ctx.parsed.y;
          if (y === null || y === undefined) return `${ctx.dataset.label}: —`;
          return `${ctx.dataset.label}: ${formatPercent(y)}`;
        },
      },
    },
  },
};

type Props = {
  labels: string[];
  savingsRate: (number | null)[];
  expenseRate: (number | null)[];
  first2026Index: number | null;
  showYearDivider: boolean;
};

export function SavingsExpenseRateChart({
  labels,
  savingsRate,
  expenseRate,
  first2026Index,
  showYearDivider,
}: Props) {
  const plugins = showYearDivider ? [yearDividerPluginLine(first2026Index)] : [];
  return (
    <div className="h-72 w-full">
      <Chart
        type="line"
        plugins={plugins}
        options={options}
        data={{
          labels,
          datasets: [
            {
              label: "Savings rate %",
              data: savingsRate,
              borderColor: "#c8f060",
              backgroundColor: "rgba(200,240,96,0.1)",
              tension: 0.25,
              spanGaps: true,
              pointRadius: 3,
            },
            {
              label: "Expense rate %",
              data: expenseRate,
              borderColor: "#f0b460",
              backgroundColor: "rgba(240,180,96,0.08)",
              tension: 0.25,
              spanGaps: true,
              pointRadius: 3,
            },
          ],
        }}
      />
    </div>
  );
}
