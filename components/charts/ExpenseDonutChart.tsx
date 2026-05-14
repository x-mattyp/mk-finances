"use client";

import { Chart } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { EXPENSE_FIELDS } from "@/types/entry";
import { formatCurrencyTooltip } from "@/lib/format";
import "@/components/charts/chart-init";

const colors = [
  "#60d4b8",
  "#a08cf0",
  "#f0b460",
  "#c8f060",
  "#f06060",
  "#60d4b8",
  "#a08cf0",
  "#f0b460",
  "#c8f060",
  "#f06060",
  "#7a7870",
];

const options: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "right",
      labels: { color: "#7a7870", boxWidth: 10, font: { size: 10 } },
    },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const v = ctx.parsed;
          const n = typeof v === "number" ? v : 0;
          return `${ctx.label}: ${formatCurrencyTooltip(n)}`;
        },
      },
    },
  },
};

type Props = {
  totals: Record<(typeof EXPENSE_FIELDS)[number]["key"], number>;
};

export function ExpenseDonutChart({ totals }: Props) {
  const data = EXPENSE_FIELDS.map((f) => totals[f.key]);
  const labels = EXPENSE_FIELDS.map((f) => f.label);
  return (
    <div className="h-72 w-full max-w-md mx-auto">
      <Chart
        type="doughnut"
        options={options}
        data={{
          labels,
          datasets: [
            {
              data,
              backgroundColor: colors,
              borderColor: "#161714",
              borderWidth: 2,
            },
          ],
        }}
      />
    </div>
  );
}
