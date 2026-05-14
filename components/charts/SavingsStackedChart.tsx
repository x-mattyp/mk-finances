"use client";

import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { yearDividerPluginBar } from "@/lib/chart-theme";
import {
  monthlySavingsTotals,
  percentileNearest,
  savingsOverflowTotalLabelsPlugin,
} from "@/components/charts/savings-overflow-plugin";
import { tooltipDollarLabel } from "@/components/charts/tooltip-helpers";
import { SAVINGS_FIELDS } from "@/types/entry";
import "@/components/charts/chart-init";

const COLORS = ["#f0b460", "#a08cf0", "#60d4b8"] as const;

type Props = {
  labels: string[];
  btc: number[];
  ira: number[];
  fund: number[];
  first2026Index: number | null;
  showYearDivider: boolean;
};

export function SavingsStackedChart({
  labels,
  btc,
  ira,
  fund,
  first2026Index,
  showYearDivider,
}: Props) {
  const totals = useMemo(() => monthlySavingsTotals(btc, ira, fund), [btc, ira, fund]);

  const yMax = useMemo(() => {
    const p90 = percentileNearest(totals, 90);
    return Math.max(p90, 1);
  }, [totals]);

  const hasOverflow = useMemo(
    () => totals.some((t) => Number.isFinite(t) && t > yMax),
    [totals, yMax],
  );

  const overflowPlugin = useMemo(
    () => savingsOverflowTotalLabelsPlugin({ totals, yMax }),
    [totals, yMax],
  );

  const plugins = useMemo(() => {
    const list = [];
    if (showYearDivider) list.push(yearDividerPluginBar(first2026Index));
    list.push(overflowPlugin);
    return list;
  }, [overflowPlugin, showYearDivider, first2026Index]);

  const options = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: hasOverflow ? 18 : 0 },
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { color: "#7a7870", maxRotation: 45, font: { size: 11 } },
        },
        y: {
          stacked: true,
          min: 0,
          max: yMax,
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: {
            color: "#7a7870",
            font: { size: 11 },
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
    }),
    [yMax, hasOverflow],
  );

  return (
    <div className="h-72 w-full">
      <Chart
        type="bar"
        plugins={plugins}
        options={options}
        data={{
          labels,
          datasets: [
            {
              label: SAVINGS_FIELDS[0].label,
              data: btc,
              backgroundColor: COLORS[0],
              borderRadius: 3,
              stack: "s",
            },
            {
              label: SAVINGS_FIELDS[1].label,
              data: ira,
              backgroundColor: COLORS[1],
              borderRadius: 3,
              stack: "s",
            },
            {
              label: SAVINGS_FIELDS[2].label,
              data: fund,
              backgroundColor: COLORS[2],
              borderRadius: 3,
              stack: "s",
            },
          ],
        }}
      />
    </div>
  );
}
