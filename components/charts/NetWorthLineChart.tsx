"use client";

import { Chart } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { yearDividerPluginLine } from "@/lib/chart-theme";
import { tooltipDollarLabel } from "@/components/charts/tooltip-helpers";
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
      grid: { color: "rgba(255,255,255,0.05)" },
      ticks: {
        color: "#7a7870",
        callback: (v) =>
          typeof v === "number" ? `$${(v / 1000).toFixed(0)}k` : "",
      },
    },
  },
  plugins: {
    legend: { position: "top", labels: { color: "#7a7870" } },
    tooltip: {
      callbacks: {
        label: (ctx) => tooltipDollarLabel(ctx as never),
      },
    },
  },
};

type Props = {
  labels: string[];
  assets: number[];
  liabilities: number[];
  netWorth: number[];
  first2026Index: number | null;
  showYearDivider: boolean;
};

export function NetWorthLineChart({
  labels,
  assets,
  liabilities,
  netWorth,
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
              label: "Assets",
              data: assets,
              borderColor: "#60d4b8",
              backgroundColor: "rgba(96,212,184,0.08)",
              tension: 0.25,
              fill: false,
              pointRadius: 3,
            },
            {
              label: "Liabilities",
              data: liabilities,
              borderColor: "#f06060",
              backgroundColor: "rgba(240,96,96,0.08)",
              tension: 0.25,
              fill: false,
              pointRadius: 3,
            },
            {
              label: "Net worth",
              data: netWorth,
              borderColor: "#c8f060",
              backgroundColor: "rgba(200,240,96,0.1)",
              tension: 0.25,
              fill: false,
              borderWidth: 2,
              pointRadius: 3,
            },
          ],
        }}
      />
    </div>
  );
}
