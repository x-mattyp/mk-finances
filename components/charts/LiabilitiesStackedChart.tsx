"use client";

import { Chart } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { yearDividerPluginBar } from "@/lib/chart-theme";
import { LIABILITY_FIELDS } from "@/types/entry";
import { tooltipDollarLabel } from "@/components/charts/tooltip-helpers";
import "@/components/charts/chart-init";

const barColors = ["#f06060", "#f0b460", "#a08cf0"];

const baseOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      stacked: true,
      grid: { color: "rgba(255,255,255,0.05)" },
      ticks: { color: "#7a7870", maxRotation: 45 },
    },
    y: {
      stacked: true,
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
  series: Record<(typeof LIABILITY_FIELDS)[number]["key"], number[]>;
  first2026Index: number | null;
  showYearDivider: boolean;
};

export function LiabilitiesStackedChart({
  labels,
  series,
  first2026Index,
  showYearDivider,
}: Props) {
  const plugins = showYearDivider ? [yearDividerPluginBar(first2026Index)] : [];
  return (
    <div className="h-72 w-full">
      <Chart
        type="bar"
        plugins={plugins}
        options={baseOptions}
        data={{
          labels,
          datasets: LIABILITY_FIELDS.map((f, i) => ({
            label: f.label,
            data: series[f.key],
            backgroundColor: barColors[i],
            borderRadius: 3,
          })),
        }}
      />
    </div>
  );
}
