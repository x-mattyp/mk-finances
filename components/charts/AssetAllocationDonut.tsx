"use client";

import { Chart } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { ASSET_FIELDS } from "@/types/entry";
import { formatCurrencyTooltip } from "@/lib/format";
import "@/components/charts/chart-init";

const colors = ["#60d4b8", "#f0b460", "#a08cf0", "#c8f060", "#7a7870"];

const options: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "right",
      labels: { color: "#7a7870", boxWidth: 10 },
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
  values: Record<(typeof ASSET_FIELDS)[number]["key"], number>;
};

export function AssetAllocationDonut({ values }: Props) {
  const data = ASSET_FIELDS.map((f) => values[f.key]);
  const labels = ASSET_FIELDS.map((f) => f.label);
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
