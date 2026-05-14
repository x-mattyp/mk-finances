"use client";

import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { CHART_FONT, yearDividerPluginBar } from "@/lib/chart-theme";
import { tooltipDollarLabel } from "@/components/charts/tooltip-helpers";
import "@/components/charts/chart-init";

const MUTED = "#7a7870";
const GRID = "rgba(255,255,255,0.05)";

type Props = {
  labels: string[];
  income: number[];
  expenses: number[];
  netIncome: number[];
  first2026Index: number | null;
  showYearDivider: boolean;
};

export function IncomeVsExpensesChart({
  labels,
  income,
  expenses,
  netIncome,
  first2026Index,
  showYearDivider,
}: Props) {
  const plugins = useMemo(
    () => (showYearDivider ? [yearDividerPluginBar(first2026Index)] : []),
    [showYearDivider, first2026Index],
  );

  const options = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          grid: { color: GRID },
          ticks: { color: MUTED, maxRotation: 45, minRotation: 0, font: { size: 11, family: CHART_FONT } },
        },
        y: {
          position: "left",
          beginAtZero: true,
          grid: { color: GRID },
          ticks: {
            color: MUTED,
            font: { size: 11, family: CHART_FONT },
            callback: (v) =>
              typeof v === "number" ? `$${(v / 1000).toFixed(0)}k` : "",
          },
        },
        y2: {
          position: "right",
          grid: { display: false, drawOnChartArea: false },
          ticks: {
            color: MUTED,
            font: { size: 11, family: CHART_FONT },
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
    }),
    [],
  );

  const datasets = useMemo(
    () => [
      {
        label: "Income after tax",
        data: income,
        backgroundColor: "#60d4b8",
        borderRadius: 3,
        order: 2,
        yAxisID: "y",
      },
      {
        label: "Total expenses",
        data: expenses,
        backgroundColor: "#f06060",
        borderRadius: 3,
        order: 2,
        yAxisID: "y",
      },
      {
        type: "line" as const,
        label: "Net income",
        data: netIncome,
        borderColor: "#c8f060",
        backgroundColor: "rgba(200,240,96,0.15)",
        borderWidth: 2,
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5,
        order: 1,
        yAxisID: "y2",
      },
    ],
    [income, expenses, netIncome],
  );

  return (
    <div className="h-72 w-full">
      <Chart
        type="bar"
        plugins={plugins}
        options={options}
        data={{ labels, datasets } as ChartData<"bar", number[], string>}
      />
    </div>
  );
}
